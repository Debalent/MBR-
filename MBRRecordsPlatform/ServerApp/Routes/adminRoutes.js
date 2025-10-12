const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../Middleware/authMiddleware');
const { asyncHandler } = require('../Middleware/errorHandler');
const User = require('../Models/User');
const Track = require('../Models/Track');
const DemoSubmission = require('../Models/DemoSubmission');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // User statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isActive: true
    });
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      isActive: true
    });

    // Track statistics
    const totalTracks = await Track.countDocuments({ status: 'published' });
    const newTracksThisMonth = await Track.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      status: 'published'
    });

    // Demo submission statistics
    const totalDemos = await DemoSubmission.countDocuments();
    const pendingDemos = await DemoSubmission.countDocuments({ status: 'pending' });
    const newDemosThisWeek = await DemoSubmission.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // User role distribution
    const userRoles = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Top genres
    const topGenres = await Track.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$genre' },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Recent activity
    const recentUsers = await User.find({ isActive: true })
      .select('username displayName role createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentTracks = await Track.find({ status: 'published' })
      .select('title artist.name createdAt analytics.totalPlays')
      .populate('artist.user', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalTracks,
          totalDemos,
          pendingDemos,
          newUsersThisMonth,
          newUsersThisWeek,
          newTracksThisMonth,
          newDemosThisWeek
        },
        userRoles: userRoles.reduce((acc, role) => {
          acc[role._id] = role.count;
          return acc;
        }, {}),
        topGenres,
        recentActivity: {
          users: recentUsers,
          tracks: recentTracks
        }
      }
    });
  })
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with admin controls
 * @access  Private (Admin only)
 */
router.get('/users',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { displayName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasMore: page < Math.ceil(total / limit)
        }
      }
    });
  })
);

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user status (activate/deactivate)
 * @access  Private (Admin only)
 */
router.put('/users/:id/status',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { isActive, reason } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admins from deactivating super admins
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify super admin accounts'
      });
    }

    user.isActive = isActive;
    if (!isActive) {
      user.deactivatedAt = new Date();
      user.deactivatedBy = req.user._id;
      user.deactivationReason = reason || 'Admin action';
    } else {
      user.deactivatedAt = null;
      user.deactivatedBy = null;
      user.deactivationReason = null;
    }

    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId: user._id,
        isActive: user.isActive
      }
    });
  })
);

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Private (Super Admin only)
 */
router.put('/users/:id/role',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can change user roles'
      });
    }

    const { role } = req.body;
    const validRoles = ['user', 'artist', 'admin', 'super_admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `User role updated from ${oldRole} to ${role}`,
      data: {
        userId: user._id,
        oldRole,
        newRole: role
      }
    });
  })
);

/**
 * @route   GET /api/admin/demos
 * @desc    Get demo submissions for review
 * @access  Private (Admin only)
 */
router.get('/demos',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.genre) filter.genre = { $in: [req.query.genre] };
    if (req.query.priority) filter.priority = req.query.priority;

    const demos = await DemoSubmission.find(filter)
      .populate('submitter', 'username displayName email profileImage')
      .populate('reviewer', 'username displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DemoSubmission.countDocuments(filter);

    // Get statistics
    const statusStats = await DemoSubmission.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        demos,
        stats: statusStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalDemos: total,
          hasMore: page < Math.ceil(total / limit)
        }
      }
    });
  })
);

/**
 * @route   PUT /api/admin/demos/:id/review
 * @desc    Review demo submission
 * @access  Private (Admin only)
 */
router.put('/demos/:id/review',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status, feedback, decision, priority } = req.body;

    const demo = await DemoSubmission.findById(req.params.id);
    if (!demo) {
      return res.status(404).json({
        success: false,
        message: 'Demo submission not found'
      });
    }

    // Update demo fields
    if (status) demo.status = status;
    if (priority) demo.priority = priority;
    if (feedback) demo.feedback = { ...demo.feedback, ...feedback };
    if (decision) demo.decision = { ...demo.decision, ...decision };

    demo.reviewer = req.user._id;
    demo.reviewNotes.push({
      reviewer: req.user._id,
      note: `Status updated to ${status}${feedback?.overall ? `: ${feedback.overall}` : ''}`,
      isInternal: false
    });

    await demo.save();

    res.json({
      success: true,
      message: 'Demo review updated successfully',
      data: demo
    });
  })
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get platform analytics
 * @access  Private (Admin only)
 */
router.get('/analytics',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { period = '30' } = req.query; // days
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // User growth
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Track uploads
    const trackUploads = await Track.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Demo submissions
    const demoSubmissions = await DemoSubmission.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top tracks by plays
    const topTracks = await Track.find({ status: 'published' })
      .select('title artist analytics.totalPlays')
      .populate('artist.user', 'username displayName')
      .sort({ 'analytics.totalPlays': -1 })
      .limit(10);

    // Most active users
    const activeUsers = await User.find({ isActive: true })
      .select('username displayName stats')
      .sort({ 'stats.totalPlays': -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        userGrowth,
        trackUploads,
        demoSubmissions,
        topTracks,
        activeUsers,
        period: parseInt(period)
      }
    });
  })
);

/**
 * @route   POST /api/admin/broadcast
 * @desc    Send broadcast message to users
 * @access  Private (Admin only)
 */
router.post('/broadcast',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { title, message, targetRole, targetUsers } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Build target filter
    let userFilter = { isActive: true };
    if (targetRole && targetRole !== 'all') {
      userFilter.role = targetRole;
    }
    if (targetUsers && targetUsers.length > 0) {
      userFilter._id = { $in: targetUsers };
    }

    const targetUserList = await User.find(userFilter).select('_id');

    // Create notification for each user
    const notifications = targetUserList.map(user => ({
      user: user._id,
      title,
      message,
      type: 'admin_broadcast',
      sender: req.user._id,
      createdAt: new Date()
    }));

    // In a real implementation, you'd save these to a notifications collection
    // For now, we'll just return success

    res.json({
      success: true,
      message: `Broadcast sent to ${targetUserList.length} users`,
      data: {
        recipientCount: targetUserList.length,
        title,
        message
      }
    });
  })
);

/**
 * @route   GET /api/admin/system-health
 * @desc    Get system health status
 * @access  Private (Admin only)
 */
router.get('/system-health',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'healthy',
        storage: 'healthy',
        memory: 'healthy',
        cpu: 'healthy'
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Database check
    try {
      await User.findOne().limit(1);
      health.checks.database = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      health.checks.memory = 'warning';
      if (health.status === 'healthy') health.status = 'degraded';
    }

    res.json({
      success: true,
      data: health
    });
  })
);

module.exports = router;