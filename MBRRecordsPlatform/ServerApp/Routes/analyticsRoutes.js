const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../Middleware/authMiddleware');
const { asyncHandler } = require('../Middleware/errorHandler');
const Track = require('../Models/Track');
const User = require('../Models/User');

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get user analytics dashboard
 * @access  Private
 */
router.get('/dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { period = '30' } = req.query; // days
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // User's tracks
    const userTracks = await Track.find({
      'artist.user': req.user._id
    }).select('analytics likes comments');

    // Calculate totals
    const totalPlays = userTracks.reduce((sum, track) => sum + track.analytics.totalPlays, 0);
    const totalLikes = userTracks.reduce((sum, track) => sum + track.likes.length, 0);
    const totalComments = userTracks.reduce((sum, track) => sum + track.comments.length, 0);

    // Get plays over time
    const playsOverTime = await Track.aggregate([
      {
        $match: {
          'artist.user': req.user._id,
          'analytics.playHistory.timestamp': { $gte: startDate }
        }
      },
      { $unwind: '$analytics.playHistory' },
      {
        $match: {
          'analytics.playHistory.timestamp': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$analytics.playHistory.timestamp"
            }
          },
          plays: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top performing tracks
    const topTracks = userTracks
      .sort((a, b) => b.analytics.totalPlays - a.analytics.totalPlays)
      .slice(0, 5)
      .map(track => ({
        id: track._id,
        title: track.title,
        plays: track.analytics.totalPlays,
        likes: track.likes.length,
        comments: track.comments.length
      }));

    // Engagement rate
    const engagementRate = totalPlays > 0 
      ? ((totalLikes + totalComments) / totalPlays * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalPlays,
          totalLikes,
          totalComments,
          totalTracks: userTracks.length,
          engagementRate: parseFloat(engagementRate)
        },
        playsOverTime,
        topTracks,
        period: parseInt(period)
      }
    });
  })
);

/**
 * @route   GET /api/analytics/track/:id
 * @desc    Get detailed track analytics
 * @access  Private (Track owner only)
 */
router.get('/track/:id',
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

    // Plays over time
    const playsByDay = track.analytics.playHistory.reduce((acc, play) => {
      const date = play.timestamp.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Geographic data
    const playsByLocation = track.analytics.playHistory.reduce((acc, play) => {
      if (play.location) {
        acc[play.location] = (acc[play.location] || 0) + 1;
      }
      return acc;
    }, {});

    // Device/platform data
    const playsByDevice = track.analytics.playHistory.reduce((acc, play) => {
      if (play.userAgent) {
        // Simple device detection
        let device = 'Unknown';
        if (play.userAgent.includes('Mobile')) device = 'Mobile';
        else if (play.userAgent.includes('Tablet')) device = 'Tablet';
        else device = 'Desktop';
        
        acc[device] = (acc[device] || 0) + 1;
      }
      return acc;
    }, {});

    // Completion rate
    const completedPlays = track.analytics.playHistory.filter(play => 
      play.duration && play.duration > (track.audioFile.duration * 0.8)
    ).length;
    
    const completionRate = track.analytics.totalPlays > 0 
      ? (completedPlays / track.analytics.totalPlays * 100).toFixed(2)
      : 0;

    // Peak listening times
    const listeningTimes = track.analytics.playHistory.map(play => 
      new Date(play.timestamp).getHours()
    );
    
    const timeDistribution = listeningTimes.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        trackInfo: {
          id: track._id,
          title: track.title,
          artist: track.artist.name,
          releaseDate: track.releaseDate
        },
        overview: {
          totalPlays: track.analytics.totalPlays,
          weeklyPlays: track.analytics.weeklyPlays,
          monthlyPlays: track.analytics.monthlyPlays,
          likes: track.likes.length,
          comments: track.comments.length,
          shares: track.analytics.shares || 0,
          completionRate: parseFloat(completionRate)
        },
        charts: {
          playsByDay: Object.entries(playsByDay).map(([date, plays]) => ({
            date,
            plays
          })),
          playsByLocation: Object.entries(playsByLocation)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([location, plays]) => ({ location, plays })),
          playsByDevice: Object.entries(playsByDevice).map(([device, plays]) => ({
            device,
            plays
          })),
          timeDistribution: Object.entries(timeDistribution).map(([hour, plays]) => ({
            hour: parseInt(hour),
            plays
          }))
        }
      }
    });
  })
);

/**
 * @route   POST /api/analytics/track/:id/play
 * @desc    Record a play event
 * @access  Public (with optional auth)
 */
router.post('/track/:id/play',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { duration, startTime, endTime, location, referrer } = req.body;

    const track = await Track.findById(req.params.id);
    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    // Don't count plays from the track owner
    if (req.user && track.artist.user.toString() === req.user._id.toString()) {
      return res.json({
        success: true,
        message: 'Play not counted (owner)'
      });
    }

    // Check for recent plays from same IP to prevent spam
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentPlay = track.analytics.playHistory.find(play => 
      play.ip === req.ip && play.timestamp > fiveMinutesAgo
    );

    if (recentPlay) {
      return res.json({
        success: true,
        message: 'Play not counted (too recent)'
      });
    }

    // Record the play
    const playData = {
      timestamp: new Date(),
      userId: req.user?._id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      duration: duration || null,
      startTime: startTime || 0,
      endTime: endTime || null,
      location: location || null,
      referrer: referrer || req.get('Referrer')
    };

    track.analytics.playHistory.push(playData);
    track.analytics.totalPlays += 1;
    track.analytics.weeklyPlays += 1;
    track.analytics.monthlyPlays += 1;

    await track.save();

    // Update user stats if authenticated
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'stats.totalPlays': 1 }
      });
    }

    res.json({
      success: true,
      message: 'Play recorded successfully'
    });
  })
);

/**
 * @route   GET /api/analytics/platform
 * @desc    Get platform-wide analytics (public stats)
 * @access  Public
 */
router.get('/platform', asyncHandler(async (req, res) => {
  // Get public platform statistics
  const totalTracks = await Track.countDocuments({ 
    status: 'published', 
    isPublic: true 
  });
  
  const totalArtists = await User.countDocuments({ 
    role: 'artist', 
    isActive: true 
  });

  const totalPlays = await Track.aggregate([
    { $match: { status: 'published', isPublic: true } },
    { $group: { _id: null, total: { $sum: '$analytics.totalPlays' } } }
  ]);

  const topGenres = await Track.aggregate([
    { $match: { status: 'published', isPublic: true } },
    { $unwind: '$genre' },
    { $group: { _id: '$genre', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTracks = await Track.countDocuments({
    status: 'published',
    isPublic: true,
    createdAt: { $gte: thirtyDaysAgo }
  });

  const recentArtists = await User.countDocuments({
    role: 'artist',
    isActive: true,
    createdAt: { $gte: thirtyDaysAgo }
  });

  res.json({
    success: true,
    data: {
      platform: {
        totalTracks,
        totalArtists,
        totalPlays: totalPlays[0]?.total || 0,
        recentTracks,
        recentArtists
      },
      topGenres,
      lastUpdated: new Date().toISOString()
    }
  });
}));

/**
 * @route   GET /api/analytics/trending
 * @desc    Get trending tracks and artists
 * @access  Public
 */
router.get('/trending', asyncHandler(async (req, res) => {
  const { period = '7' } = req.query; // days
  const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

  // Trending tracks (based on recent plays)
  const trendingTracks = await Track.find({
    status: 'published',
    isPublic: true,
    'analytics.playHistory.timestamp': { $gte: startDate }
  })
  .select('title artist analytics.weeklyPlays likes artwork')
  .populate('artist.user', 'username displayName profileImage')
  .sort({ 'analytics.weeklyPlays': -1 })
  .limit(20);

  // Trending artists (based on follower growth and plays)
  const trendingArtists = await User.find({
    role: 'artist',
    isActive: true,
    updatedAt: { $gte: startDate }
  })
  .select('username displayName profileImage stats genres')
  .sort({ 'stats.followers': -1, 'stats.totalPlays': -1 })
  .limit(20);

  // Most liked tracks this period
  const mostLiked = await Track.aggregate([
    { 
      $match: { 
        status: 'published', 
        isPublic: true,
        createdAt: { $gte: startDate }
      } 
    },
    {
      $addFields: {
        likeCount: { $size: '$likes' }
      }
    },
    { $sort: { likeCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: 'artist.user',
        foreignField: '_id',
        as: 'artistInfo'
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      trending: {
        tracks: trendingTracks,
        artists: trendingArtists,
        mostLiked
      },
      period: parseInt(period),
      lastUpdated: new Date().toISOString()
    }
  });
}));

module.exports = router;