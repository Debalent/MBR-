const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  content: {
    type: String,
    required: true,
    maxlength: 2000
  },

  type: {
    type: String,
    enum: ['text', 'image', 'audio', 'file', 'track_share', 'system'],
    default: 'text'
  },

  // Additional data based on message type
  metadata: {
    // For file/image messages
    fileName: String,
    fileSize: Number,
    filePath: String,
    mimeType: String,
    
    // For track sharing
    trackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Track'
    },
    
    // For image messages
    dimensions: {
      width: Number,
      height: Number
    },
    
    // For audio messages
    duration: Number,
    
    // For system messages
    systemType: {
      type: String,
      enum: ['user_joined', 'user_left', 'conversation_created', 'track_shared']
    }
  },

  // Message status
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      required: true
    }
  }],

  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    deliveredAt: {
      type: Date,
      required: true
    }
  }],

  // Message editing
  isEdited: {
    type: Boolean,
    default: false
  },

  editedAt: Date,

  // Message deletion
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: Date,

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Reply functionality
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // Reactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Message priority (for system messages)
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ content: 'text' }); // Text search index
MessageSchema.index({ 'readBy.user': 1, 'readBy.readAt': -1 });

// Virtual for read count
MessageSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Virtual for delivery count
MessageSchema.virtual('deliveryCount').get(function() {
  return this.deliveredTo ? this.deliveredTo.length : 0;
});

// Virtual for reaction summary
MessageSchema.virtual('reactionSummary').get(function() {
  if (!this.reactions || this.reactions.length === 0) return {};
  
  const summary = {};
  this.reactions.forEach(reaction => {
    if (summary[reaction.emoji]) {
      summary[reaction.emoji]++;
    } else {
      summary[reaction.emoji] = 1;
    }
  });
  
  return summary;
});

// Methods
MessageSchema.methods.markAsReadBy = function(userId) {
  const alreadyRead = this.readBy.some(read => read.user.toString() === userId.toString());
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

MessageSchema.methods.markAsDeliveredTo = function(userId) {
  const alreadyDelivered = this.deliveredTo.some(delivery => 
    delivery.user.toString() === userId.toString()
  );
  
  if (!alreadyDelivered) {
    this.deliveredTo.push({
      user: userId,
      deliveredAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

MessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

MessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString()
  );
  
  return this.save();
};

MessageSchema.methods.canBeEditedBy = function(userId) {
  if (this.sender.toString() !== userId.toString()) return false;
  if (this.isDeleted) return false;
  
  // Can only edit within 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.createdAt > fifteenMinutesAgo;
};

MessageSchema.methods.canBeDeletedBy = function(userId) {
  return this.sender.toString() === userId.toString() && !this.isDeleted;
};

// Static methods
MessageSchema.statics.getUnreadCount = function(userId, conversationId = null) {
  const filter = {
    sender: { $ne: userId },
    'readBy.user': { $ne: userId }
  };
  
  if (conversationId) {
    filter.conversation = conversationId;
  }
  
  return this.countDocuments(filter);
};

MessageSchema.statics.markConversationAsRead = function(userId, conversationId) {
  return this.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId }
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    }
  );
};

MessageSchema.statics.searchMessages = function(userId, query, conversationId = null) {
  const filter = {
    content: { $regex: query, $options: 'i' },
    isDeleted: { $ne: true }
  };
  
  if (conversationId) {
    filter.conversation = conversationId;
  }
  
  return this.find(filter)
    .populate('sender', 'username displayName profileImage')
    .populate('conversation', 'participants')
    .sort({ createdAt: -1 })
    .limit(50);
};

// Pre-save middleware
MessageSchema.pre('save', function(next) {
  // Auto-mark sender as having read their own message
  if (this.isNew) {
    const senderRead = this.readBy.some(read => 
      read.user.toString() === this.sender.toString()
    );
    
    if (!senderRead) {
      this.readBy.push({
        user: this.sender,
        readAt: new Date()
      });
    }
  }
  
  next();
});

module.exports = mongoose.model('Message', MessageSchema);