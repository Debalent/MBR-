const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, optionalAuth } = require('../Middleware/authMiddleware');
const { uploadMiddleware, processImage, validateFile } = require('../Middleware/fileUpload');
const { asyncHandler } = require('../Middleware/errorHandler');
const User = require('../Models/User');
const Track = require('../Models/Track');

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', 
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('following', 'username displayName profileImage')
      .populate('followers', 'username displayName profileImage');

    res.json({
      success: true,
      data: user
    });
  })
);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  authenticateToken,
  uploadMiddleware('profile'),
  processImage,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    const updateFields = [
      'displayName', 'bio', 'location', 'website', 'genres',
      'socialLinks', 'contactEmail', 'isAvailableForCollabs'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'genres') {
          user[field] = req.body[field].split(',').map(g => g.trim());
        } else if (field === 'socialLinks') {
          try {
            user[field] = JSON.parse(req.body[field]);
          } catch (error) {
            console.error('Error parsing social links:', error);
          }
        } else {
          user[field] = req.body[field];
        }
      }
    });

    // Handle profile image upload
    if (req.file) {
      user.profileImage = req.file.processedPath || req.file.path;
    }

    user.updatedAt = new Date();
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    });
  })
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile by ID
 * @access  Public
 */
router.get('/:id', 
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .select('-password -email -phone -lastLogin -emailVerified')
      .populate('followers', 'username displayName profileImage')
      .populate('following', 'username displayName profileImage');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's public tracks
    const tracks = await Track.find({
      'artist.user': user._id,
      isPublic: true,
      status: 'published'
    }).select('title genre releaseDate analytics.totalPlays likes artwork')
      .sort({ releaseDate: -1 })
      .limit(10);

    // Calculate profile completion
    const profileFields = ['displayName', 'bio', 'profileImage', 'genres', 'location'];
    const completedFields = profileFields.filter(field => user[field] && user[field].length > 0);
    const profileCompletion = Math.round((completedFields.length / profileFields.length) * 100);

    const responseData = {
      ...user.toObject(),
      tracks,
      profileCompletion,
      isFollowing: req.user ? user.followers.some(f => f._id.toString() === req.user._id.toString()) : false
    };

    res.json({
      success: true,
      data: responseData
    });
  })
);

/**
 * @route   POST /api/users/:id/follow
 * @desc    Follow/Unfollow user
 * @access  Private
 */
router.post('/:id/follow',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isFollowing = currentUser.following.includes(targetUser._id);

    if (isFollowing) {
      // Unfollow
      currentUser.following.pull(targetUser._id);
      targetUser.followers.pull(currentUser._id);
      
      // Update stats
      currentUser.stats.following = Math.max(0, currentUser.stats.following - 1);
      targetUser.stats.followers = Math.max(0, targetUser.stats.followers - 1);
    } else {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
      
      // Update stats
      currentUser.stats.following += 1;
      targetUser.stats.followers += 1;
    }

    await Promise.all([currentUser.save(), targetUser.save()]);

    res.json({
      success: true,
      message: isFollowing ? 'User unfollowed' : 'User followed',
      data: {
        isFollowing: !isFollowing,
        followersCount: targetUser.stats.followers
      }
    });
  })
);

/**
 * @route   GET /api/users/:id/tracks
 * @desc    Get user's tracks
 * @access  Public
 */
router.get('/:id/tracks',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build filter - only show public tracks unless it's the user's own profile
    const filter = { 'artist.user': user._id };
    
    if (!req.user || req.user._id.toString() !== user._id.toString()) {
      filter.isPublic = true;
      filter.status = 'published';
    }

    const tracks = await Track.find(filter)
      .populate('artist.user', 'username displayName profileImage')
      .sort({ releaseDate: -1 })
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
  })
);

/**
 * @route   GET /api/users/:id/liked-tracks
 * @desc    Get user's liked tracks
 * @access  Private (own profile only unless public)
 */
router.get('/:id/liked-tracks',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow viewing own liked tracks or if user has made them public
    if (req.user._id.toString() !== user._id.toString() && !user.publicLikes) {
      return res.status(403).json({
        success: false,
        message: 'This user\'s liked tracks are private'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const likedTracks = await Track.find({
      _id: { $in: user.likedTracks },
      isPublic: true,
      status: 'published'
    })
    .populate('artist.user', 'username displayName profileImage')
    .sort({ 'likes.createdAt': -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const total = user.likedTracks.length;

    res.json({
      success: true,
      data: {
        tracks: likedTracks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalTracks: total,
          hasMore: page < Math.ceil(total / limit)
        }
      }
    });
  })
);

/**
 * @route   GET /api/users/search
 * @desc    Search users
 * @access  Public
 */
router.get('/search',
  asyncHandler(async (req, res) => {
    const { q, type, genre, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build search filter
    const filter = {
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    };

    // Filter by user type
    if (type && type !== 'all') {
      filter.role = type;
    }

    // Filter by genre
    if (genre && genre !== 'all') {
      filter.genres = { $in: [genre] };
    }

    const users = await User.find(filter)
      .select('username displayName profileImage bio role genres stats location')
      .sort({ 'stats.followers': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasMore: parseInt(page) < Math.ceil(total / parseInt(limit))
        }
      }
    });
  })
);

/**
 * @route   PUT /api/users/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/settings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const allowedSettings = [
      'privacy.profileVisibility',
      'privacy.showEmail',
      'privacy.showLastSeen',
      'notifications.email',
      'notifications.push',
      'notifications.marketing',
      'publicLikes',
      'isAvailableForCollabs'
    ];

    allowedSettings.forEach(setting => {
      if (req.body[setting] !== undefined) {
        const keys = setting.split('.');
        if (keys.length === 2) {
          if (!user[keys[0]]) user[keys[0]] = {};
          user[keys[0]][keys[1]] = req.body[setting];
        } else {
          user[setting] = req.body[setting];
        }
      }
    });

    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        privacy: user.privacy,
        notifications: user.notifications,
        publicLikes: user.publicLikes,
        isAvailableForCollabs: user.isAvailableForCollabs
      }
    });
  })
);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation required'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Soft delete - mark as inactive instead of hard delete
    user.isActive = false;
    user.deletedAt = new Date();
    user.email = `deleted_${user._id}@deleted.com`;
    user.username = `deleted_${user._id}`;
    
    await user.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  })
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    // Get detailed track statistics
    const trackStats = await Track.aggregate([
      { $match: { 'artist.user': user._id } },
      {
        $group: {
          _id: null,
          totalTracks: { $sum: 1 },
          totalPlays: { $sum: '$analytics.totalPlays' },
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } },
          avgPlays: { $avg: '$analytics.totalPlays' }
        }
      }
    ]);

    const stats = trackStats.length > 0 ? trackStats[0] : {
      totalTracks: 0,
      totalPlays: 0,
      totalLikes: 0,
      totalComments: 0,
      avgPlays: 0
    };

    res.json({
      success: true,
      data: {
        profile: user.stats,
        tracks: stats,
        engagement: {
          followersGrowth: 0, // Calculate growth over time
          playsGrowth: 0,     // Calculate growth over time
          engagementRate: stats.totalPlays > 0 
            ? ((stats.totalLikes + stats.totalComments) / stats.totalPlays * 100).toFixed(2)
            : 0
        }
      }
    });
  })
);

module.exports = router;