const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireArtist } = require('../Middleware/authMiddleware');
const { uploadMiddleware, processAudio, processImage, validateFile } = require('../Middleware/fileUpload');
const { asyncHandler } = require('../Middleware/errorHandler');
const Track = require('../Models/Track');
const User = require('../Models/User');

/**
 * @route   GET /api/tracks
 * @desc    Get all tracks with filtering and pagination
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Build filter object
  const filter = { isPublic: true, status: 'published' };
  
  // Genre filter
  if (req.query.genre) {
    filter.genre = { $in: req.query.genre.split(',') };
  }

  // Search filter
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { 'artist.name': { $regex: req.query.search, $options: 'i' } },
      { tags: { $in: [req.query.search] } }
    ];
  }

  // Date filter
  if (req.query.dateFrom || req.query.dateTo) {
    filter.releaseDate = {};
    if (req.query.dateFrom) filter.releaseDate.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.releaseDate.$lte = new Date(req.query.dateTo);
  }

  // Sort options
  let sortOptions = {};
  switch (req.query.sort) {
    case 'popular':
      sortOptions = { 'analytics.totalPlays': -1 };
      break;
    case 'recent':
      sortOptions = { releaseDate: -1 };
      break;
    case 'trending':
      sortOptions = { 'analytics.weeklyPlays': -1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  const tracks = await Track.find(filter)
    .populate('artist.user', 'username displayName profileImage')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Track.countDocuments(filter);

  res.json({
    success: true,
    data: {
      tracks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTracks: total,
        hasMore: page < Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * @route   GET /api/tracks/:id
 * @desc    Get single track by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const track = await Track.findById(req.params.id)
    .populate('artist.user', 'username displayName profileImage followers')
    .populate('collaborators.user', 'username displayName profileImage')
    .populate('comments.user', 'username displayName profileImage');

  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Check if track is accessible
  if (!track.isPublic && track.status !== 'published') {
    // Only owner, collaborators, and admins can access private/unpublished tracks
    if (!req.user || 
        (track.artist.user.toString() !== req.user._id.toString() &&
         !track.collaborators.some(c => c.user.toString() === req.user._id.toString()) &&
         req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this track'
      });
    }
  }

  // Increment play count if not the owner
  if (!req.user || track.artist.user.toString() !== req.user._id.toString()) {
    await Track.findByIdAndUpdate(req.params.id, {
      $inc: { 
        'analytics.totalPlays': 1,
        'analytics.weeklyPlays': 1,
        'analytics.monthlyPlays': 1
      },
      $push: {
        'analytics.playHistory': {
          timestamp: new Date(),
          userId: req.user?._id,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      }
    });
  }

  res.json({
    success: true,
    data: track
  });
}));

/**
 * @route   POST /api/tracks
 * @desc    Create new track
 * @access  Private (Artists only)
 */
router.post('/', 
  authenticateToken,
  requireArtist,
  uploadMiddleware('track'),
  validateFile,
  processAudio,
  asyncHandler(async (req, res) => {
    const {
      title,
      description,
      genre,
      tags,
      lyrics,
      isPublic,
      allowDownloads,
      price,
      collaborators
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required'
      });
    }

    // Create track object
    const trackData = {
      title,
      description,
      genre: genre?.split(',').map(g => g.trim()) || [],
      tags: tags?.split(',').map(t => t.trim()) || [],
      lyrics,
      isPublic: isPublic === 'true',
      allowDownloads: allowDownloads === 'true',
      price: price ? parseFloat(price) : 0,
      
      // Audio file info
      audioFile: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        duration: req.file.duration,
        format: req.file.mimetype,
        path: req.file.path
      },

      // Artist info
      artist: {
        user: req.user._id,
        name: req.user.displayName || req.user.username
      },

      // Metadata from audio processing
      ...(req.file.metadata && { metadata: req.file.metadata }),
      ...(req.file.previewPath && { previewFile: req.file.previewPath }),
      ...(req.file.waveformPath && { waveformData: req.file.waveformPath }),

      status: 'draft'
    };

    // Add collaborators if provided
    if (collaborators) {
      try {
        const collaboratorData = JSON.parse(collaborators);
        trackData.collaborators = collaboratorData.map(collab => ({
          user: collab.userId,
          role: collab.role || 'collaborator',
          percentage: collab.percentage || 0
        }));
      } catch (error) {
        console.error('Error parsing collaborators:', error);
      }
    }

    const track = new Track(trackData);
    await track.save();

    // Populate track data for response
    await track.populate('artist.user', 'username displayName profileImage');

    res.status(201).json({
      success: true,
      message: 'Track created successfully',
      data: track
    });
  })
);

/**
 * @route   PUT /api/tracks/:id
 * @desc    Update track
 * @access  Private (Owner/Collaborators only)
 */
router.put('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    // Check ownership or collaboration
    const isOwner = track.artist.user.toString() === req.user._id.toString();
    const isCollaborator = track.collaborators.some(c => 
      c.user.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isOwner && !isCollaborator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update allowed fields
    const updateFields = [
      'title', 'description', 'genre', 'tags', 'lyrics', 
      'isPublic', 'allowDownloads', 'price', 'status'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'genre' || field === 'tags') {
          track[field] = req.body[field].split(',').map(item => item.trim());
        } else {
          track[field] = req.body[field];
        }
      }
    });

    track.updatedAt = new Date();
    await track.save();

    res.json({
      success: true,
      message: 'Track updated successfully',
      data: track
    });
  })
);

/**
 * @route   DELETE /api/tracks/:id
 * @desc    Delete track
 * @access  Private (Owner only)
 */
router.delete('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    // Check ownership
    const isOwner = track.artist.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Track.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Track deleted successfully'
    });
  })
);

/**
 * @route   POST /api/tracks/:id/like
 * @desc    Like/Unlike track
 * @access  Private
 */
router.post('/:id/like',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    const userId = req.user._id;
    const alreadyLiked = track.likes.includes(userId);

    if (alreadyLiked) {
      // Unlike
      track.likes.pull(userId);
      await User.findByIdAndUpdate(userId, {
        $pull: { likedTracks: track._id }
      });
    } else {
      // Like
      track.likes.push(userId);
      await User.findByIdAndUpdate(userId, {
        $addToSet: { likedTracks: track._id }
      });
    }

    track.analytics.totalLikes = track.likes.length;
    await track.save();

    res.json({
      success: true,
      message: alreadyLiked ? 'Track unliked' : 'Track liked',
      data: {
        liked: !alreadyLiked,
        totalLikes: track.likes.length
      }
    });
  })
);

/**
 * @route   POST /api/tracks/:id/comment
 * @desc    Add comment to track
 * @access  Private
 */
router.post('/:id/comment',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { content, timestamp } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    const newComment = {
      user: req.user._id,
      content: content.trim(),
      timestamp: timestamp || 0,
      createdAt: new Date()
    };

    track.comments.push(newComment);
    await track.save();

    // Populate the new comment
    await track.populate('comments.user', 'username displayName profileImage');
    const addedComment = track.comments[track.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: addedComment
    });
  })
);

/**
 * @route   GET /api/tracks/:id/analytics
 * @desc    Get track analytics
 * @access  Private (Owner/Collaborators only)
 */
router.get('/:id/analytics',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    // Check access
    const isOwner = track.artist.user.toString() === req.user._id.toString();
    const isCollaborator = track.collaborators.some(c => 
      c.user.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isOwner && !isCollaborator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        analytics: track.analytics,
        totalLikes: track.likes.length,
        totalComments: track.comments.length,
        engagementRate: track.analytics.totalPlays > 0 
          ? ((track.likes.length + track.comments.length) / track.analytics.totalPlays * 100).toFixed(2)
          : 0
      }
    });
  })
);

module.exports = router;