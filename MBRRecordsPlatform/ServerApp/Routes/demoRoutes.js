const express = require('express');
const router = express.Router();
const { authenticateToken, requireArtist } = require('../Middleware/authMiddleware');
const { uploadMiddleware, validateFile } = require('../Middleware/fileUpload');
const { asyncHandler } = require('../Middleware/errorHandler');
const DemoSubmission = require('../Models/DemoSubmission');
const User = require('../Models/User');

/**
 * @route   POST /api/demos/submit
 * @desc    Submit demo for review
 * @access  Private
 */
router.post('/submit',
  authenticateToken,
  uploadMiddleware('demo'),
  validateFile,
  asyncHandler(async (req, res) => {
    const {
      artistName,
      trackTitle,
      genre,
      description,
      socialLinks,
      contactInfo,
      submissionType,
      hasLabel,
      previousReleases
    } = req.body;

    // Validate required fields
    if (!artistName || !trackTitle || !genre || !description) {
      return res.status(400).json({
        success: false,
        message: 'Artist name, track title, genre, and description are required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one audio file is required'
      });
    }

    // Check if user has already submitted a demo in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSubmission = await DemoSubmission.findOne({
      submitter: req.user._id,
      createdAt: { $gte: thirtyDaysAgo },
      status: { $in: ['pending', 'under_review'] }
    });

    if (recentSubmission) {
      return res.status(429).json({
        success: false,
        message: 'You can only submit one demo every 30 days. Please wait before submitting again.',
        nextSubmissionDate: new Date(recentSubmission.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    // Process uploaded files
    const audioFiles = [];
    const artworkFiles = [];

    req.files.forEach(file => {
      if (file.mimetype.startsWith('audio/')) {
        audioFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        });
      } else if (file.mimetype.startsWith('image/')) {
        artworkFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        });
      }
    });

    if (audioFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one audio file is required'
      });
    }

    // Create demo submission
    const demoSubmission = new DemoSubmission({
      submitter: req.user._id,
      artistName,
      trackTitle,
      genre: genre.split(',').map(g => g.trim()),
      description,
      submissionType: submissionType || 'label_signing',
      
      files: {
        audio: audioFiles,
        artwork: artworkFiles
      },
      
      metadata: {
        socialLinks: socialLinks ? JSON.parse(socialLinks) : {},
        contactInfo: contactInfo ? JSON.parse(contactInfo) : {},
        hasLabel: hasLabel === 'true',
        previousReleases: previousReleases ? JSON.parse(previousReleases) : []
      },
      
      submissionInfo: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        submissionDate: new Date()
      },
      
      status: 'pending'
    });

    await demoSubmission.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.demosSubmitted': 1 },
      $push: { 'activity.demoSubmissions': demoSubmission._id }
    });

    res.status(201).json({
      success: true,
      message: 'Demo submitted successfully! We will review it within 7-14 business days.',
      data: {
        submissionId: demoSubmission._id,
        status: demoSubmission.status,
        estimatedReviewTime: '7-14 business days'
      }
    });
  })
);

/**
 * @route   GET /api/demos/my-submissions
 * @desc    Get user's demo submissions
 * @access  Private
 */
router.get('/my-submissions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const submissions = await DemoSubmission.find({ submitter: req.user._id })
      .select('-files.audio.path -files.artwork.path') // Exclude file paths for security
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DemoSubmission.countDocuments({ submitter: req.user._id });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalSubmissions: total,
          hasMore: page < Math.ceil(total / limit)
        }
      }
    });
  })
);

/**
 * @route   GET /api/demos/:id
 * @desc    Get specific demo submission
 * @access  Private (Owner or Admin)
 */
router.get('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const submission = await DemoSubmission.findById(req.params.id)
      .populate('submitter', 'username displayName email profileImage')
      .populate('reviewer', 'username displayName');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Demo submission not found'
      });
    }

    // Check access - only submitter or admin can view
    const isOwner = submission.submitter._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Remove file paths if not admin
    const responseData = submission.toObject();
    if (!isAdmin) {
      responseData.files.audio = responseData.files.audio.map(file => ({
        ...file,
        path: undefined
      }));
      responseData.files.artwork = responseData.files.artwork.map(file => ({
        ...file,
        path: undefined
      }));
    }

    res.json({
      success: true,
      data: responseData
    });
  })
);

/**
 * @route   DELETE /api/demos/:id
 * @desc    Delete demo submission (only if pending)
 * @access  Private (Owner only)
 */
router.delete('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const submission = await DemoSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Demo submission not found'
      });
    }

    // Check ownership
    if (submission.submitter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Can only delete pending submissions
    if (submission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete submission that is already under review or processed'
      });
    }

    await DemoSubmission.findByIdAndDelete(req.params.id);

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.demosSubmitted': -1 },
      $pull: { 'activity.demoSubmissions': submission._id }
    });

    res.json({
      success: true,
      message: 'Demo submission deleted successfully'
    });
  })
);

/**
 * @route   GET /api/demos/submission-guidelines
 * @desc    Get demo submission guidelines
 * @access  Public
 */
router.get('/submission-guidelines', (req, res) => {
  res.json({
    success: true,
    data: {
      guidelines: {
        audioRequirements: {
          formats: ['MP3 (320kbps)', 'WAV (24-bit)', 'FLAC'],
          maxFileSize: '50MB per file',
          maxFiles: 5,
          minDuration: '2 minutes',
          maxDuration: '10 minutes'
        },
        artworkRequirements: {
          formats: ['JPG', 'PNG', 'WebP'],
          minResolution: '1000x1000px',
          maxFileSize: '10MB',
          recommended: '3000x3000px for best quality'
        },
        submissionRules: [
          'Original content only - no covers or remixes without proper clearance',
          'High-quality audio production required',
          'Professional mastering preferred',
          'One submission per artist every 30 days',
          'Response time: 7-14 business days',
          'No guarantee of signing or release'
        ],
        genres: [
          'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Blues',
          'Reggae', 'Country', 'Folk', 'Alternative', 'Indie', 'Classical'
        ],
        tips: [
          'Include social media links and streaming statistics',
          'Provide detailed track description and inspiration',
          'Submit your best work - quality over quantity',
          'Ensure all vocals are clear and properly mixed',
          'Include any press coverage or notable achievements'
        ]
      },
      contact: {
        email: 'demos@mbrrecords.com',
        submissionPortal: '/submit-demo',
        faq: '/demo-faq'
      }
    }
  });
});

/**
 * @route   GET /api/demos/stats
 * @desc    Get demo submission statistics
 * @access  Private
 */
router.get('/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userStats = await DemoSubmission.aggregate([
      { $match: { submitter: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      total: 0,
      pending: 0,
      under_review: 0,
      accepted: 0,
      rejected: 0,
      feedback_requested: 0
    };

    userStats.forEach(stat => {
      stats[stat._id] = stat.count;
      stats.total += stat.count;
    });

    // Calculate acceptance rate
    const processed = stats.accepted + stats.rejected;
    const acceptanceRate = processed > 0 ? ((stats.accepted / processed) * 100).toFixed(1) : 0;

    // Get last submission date
    const lastSubmission = await DemoSubmission.findOne(
      { submitter: req.user._id },
      { createdAt: 1 },
      { sort: { createdAt: -1 } }
    );

    // Check if user can submit new demo
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const canSubmit = !lastSubmission || 
      lastSubmission.createdAt < thirtyDaysAgo ||
      !['pending', 'under_review'].includes(lastSubmission.status);

    res.json({
      success: true,
      data: {
        submissions: stats,
        acceptanceRate: parseFloat(acceptanceRate),
        lastSubmissionDate: lastSubmission?.createdAt,
        canSubmitNew: canSubmit,
        nextSubmissionDate: canSubmit ? null : 
          new Date(lastSubmission.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  })
);

module.exports = router;