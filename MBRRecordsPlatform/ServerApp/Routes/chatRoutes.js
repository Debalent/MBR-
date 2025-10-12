const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middleware/authMiddleware');
const { asyncHandler } = require('../Middleware/errorHandler');
const Message = require('../Models/Message');
const Conversation = require('../Models/Conversation');
const User = require('../Models/User');

/**
 * @route   GET /api/chat/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get('/conversations',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'username displayName profileImage isOnline lastSeen')
    .populate('lastMessage')
    .sort({ updatedAt: -1 })
    .lean();

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: req.user._id },
          readBy: { $not: { $elemMatch: { user: req.user._id } } }
        });

        return {
          ...conv,
          unreadCount,
          otherParticipant: conv.participants.find(p => p._id.toString() !== req.user._id.toString())
        };
      })
    );

    res.json({
      success: true,
      data: conversationsWithUnread
    });
  })
);

/**
 * @route   POST /api/chat/conversations
 * @desc    Create new conversation
 * @access  Private
 */
router.post('/conversations',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { participantId, message } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID is required'
      });
    }

    if (participantId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself'
      });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
      type: 'direct'
    });

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [req.user._id, participantId],
        type: 'direct',
        createdBy: req.user._id
      });
      await conversation.save();
    }

    // Send initial message if provided
    if (message && message.trim()) {
      const newMessage = new Message({
        conversation: conversation._id,
        sender: req.user._id,
        content: message.trim(),
        type: 'text'
      });
      await newMessage.save();

      conversation.lastMessage = newMessage._id;
      conversation.updatedAt = new Date();
      await conversation.save();
    }

    // Populate conversation data
    await conversation.populate('participants', 'username displayName profileImage isOnline');

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation
    });
  })
);

/**
 * @route   GET /api/chat/conversations/:id/messages
 * @desc    Get messages in a conversation
 * @access  Private
 */
router.get('/conversations/:id/messages',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Get messages
    const messages = await Message.find({ conversation: id })
      .populate('sender', 'username displayName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date()
          }
        }
      }
    );

    const total = await Message.countDocuments({ conversation: id });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalMessages: total,
          hasMore: page < Math.ceil(total / limit)
        }
      }
    });
  })
);

/**
 * @route   POST /api/chat/conversations/:id/messages
 * @desc    Send message in conversation
 * @access  Private
 */
router.post('/conversations/:id/messages',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, type = 'text', metadata = {} } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Create message
    const message = new Message({
      conversation: id,
      sender: req.user._id,
      content: content.trim(),
      type,
      metadata,
      readBy: [{
        user: req.user._id,
        readAt: new Date()
      }]
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Populate message data
    await message.populate('sender', 'username displayName profileImage');

    res.status(201).json({
      success: true,
      data: message
    });
  })
);

/**
 * @route   PUT /api/chat/messages/:id
 * @desc    Edit message
 * @access  Private
 */
router.put('/messages/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Check if message can be edited (within 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({
        success: false,
        message: 'Message can only be edited within 15 minutes of sending'
      });
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate('sender', 'username displayName profileImage');

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });
  })
);

/**
 * @route   DELETE /api/chat/messages/:id
 * @desc    Delete message
 * @access  Private
 */
router.delete('/messages/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Soft delete - mark as deleted
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  })
);

/**
 * @route   POST /api/chat/conversations/:id/typing
 * @desc    Send typing indicator
 * @access  Private
 */
router.post('/conversations/:id/typing',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { isTyping } = req.body;

    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Emit typing event via Socket.IO (handled in socket handlers)
    req.app.get('io').to(req.params.id).emit('user_typing', {
      userId: req.user._id,
      username: req.user.username,
      isTyping
    });

    res.json({
      success: true,
      message: 'Typing indicator sent'
    });
  })
);

/**
 * @route   GET /api/chat/search
 * @desc    Search messages and conversations
 * @access  Private
 */
router.get('/search',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { q, conversationId } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchFilter = {
      content: { $regex: q, $options: 'i' },
      isDeleted: { $ne: true }
    };

    // If searching within specific conversation
    if (conversationId) {
      // Verify user has access to the conversation
      const hasAccess = await Conversation.findOne({
        _id: conversationId,
        participants: req.user._id
      });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      searchFilter.conversation = conversationId;
    } else {
      // Search only in user's conversations
      const userConversations = await Conversation.find({
        participants: req.user._id
      }).select('_id');

      searchFilter.conversation = {
        $in: userConversations.map(c => c._id)
      };
    }

    const messages = await Message.find(searchFilter)
      .populate('sender', 'username displayName profileImage')
      .populate('conversation', 'participants type')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: {
        messages,
        total: messages.length
      }
    });
  })
);

module.exports = router;