const express = require('express');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../Middleware/authMiddleware');
const {
  dataAccessRequest,
  dataPortabilityRequest,
  dataErasureRequest,
  dataRectificationRequest,
  manageConsent
} = require('../Middleware/gdprCompliance');

const router = express.Router();

// Rate limiting for GDPR requests (stricter limits)
const gdprLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each user to 5 GDPR requests per hour
  message: {
    success: false,
    message: 'Too many GDPR requests. Please try again later.',
    retryAfter: 60 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user?.role === 'admin' // Admins can bypass
});

// Apply rate limiting to all GDPR routes
router.use(gdprLimiter);

// @desc    Request access to personal data (GDPR Article 15)
// @route   GET /api/gdpr/data-access
// @access  Private
router.get('/data-access', authMiddleware.authenticateToken, dataAccessRequest);

// @desc    Request data portability (GDPR Article 20)
// @route   GET /api/gdpr/data-portability
// @access  Private
router.get('/data-portability', authMiddleware.authenticateToken, dataPortabilityRequest);

// @desc    Request data erasure (GDPR Article 17 - Right to be Forgotten)
// @route   DELETE /api/gdpr/data-erasure
// @access  Private
router.delete('/data-erasure', authMiddleware.authenticateToken, dataErasureRequest);

// @desc    Request data rectification (GDPR Article 16)
// @route   PUT /api/gdpr/data-rectification
// @access  Private
router.put('/data-rectification', authMiddleware.authenticateToken, dataRectificationRequest);

// @desc    Manage data processing consent
// @route   POST /api/gdpr/consent
// @access  Private
router.post('/consent', authMiddleware.authenticateToken, manageConsent);

// @desc    Get current consent status
// @route   GET /api/gdpr/consent
// @access  Private
router.get('/consent', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const user = await require('../Models/User').findById(req.user._id);

    res.json({
      success: true,
      consent: user.consent || {},
      gdpr_status: {
        consent_given: req.cookies?.gdpr_consent === 'accepted',
        necessary_only: req.cookies?.gdpr_consent === 'necessary',
        consent_required: !req.cookies?.gdpr_consent
      }
    });
  } catch (error) {
    console.error('Get consent status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consent status'
    });
  }
});

// @desc    Withdraw consent for specific processing
// @route   DELETE /api/gdpr/consent/:type
// @access  Private
router.delete('/consent/:type', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const user = await require('../Models/User').findById(req.user._id);

    if (!user.consent || !user.consent[type]) {
      return res.status(404).json({
        success: false,
        message: 'Consent not found for this processing type'
      });
    }

    // Revoke consent
    user.consent[type] = {
      granted: false,
      timestamp: new Date(),
      ip: req.ip
    };

    await user.save();

    res.json({
      success: true,
      message: `Consent withdrawn for ${type}`,
      consent: user.consent
    });
  } catch (error) {
    console.error('Withdraw consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw consent'
    });
  }
});

// @desc    Get GDPR information and rights
// @route   GET /api/gdpr/info
// @access  Public
router.get('/info', (req, res) => {
  res.json({
    success: true,
    gdpr_info: {
      controller: {
        name: 'MBR Records',
        contact: 'privacy@mbrrecords.com',
        address: 'Privacy Office, MBR Records, [Address]'
      },
      rights: [
        'Right to access your personal data',
        'Right to data portability',
        'Right to rectification',
        'Right to erasure (right to be forgotten)',
        'Right to restrict processing',
        'Right to object to processing',
        'Rights related to automated decision making'
      ],
      data_categories: [
        'Personal identification information',
        'Contact information',
        'Profile and preference data',
        'Usage and analytics data',
        'Payment information',
        'Content and media files'
      ],
      legal_basis: [
        'Consent',
        'Contract performance',
        'Legitimate interests',
        'Legal obligation'
      ],
      retention_periods: {
        user_data: '7 years or until account deletion',
        analytics: '2 years',
        logs: '90 days',
        temporary_files: '7 days'
      }
    }
  });
});

// @desc    Submit GDPR complaint or concern
// @route   POST /api/gdpr/complaint
// @access  Private
router.post('/complaint', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { subject, description, category } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required'
      });
    }

    // In production, this would create a support ticket
    const complaint = {
      id: require('crypto').randomBytes(16).toString('hex'),
      userId: req.user._id,
      subject,
      description,
      category: category || 'general',
      status: 'received',
      submittedAt: new Date(),
      ip: req.ip
    };

    // Log complaint for processing
    console.log('GDPR Complaint received:', complaint);

    // Send confirmation email (would be implemented)
    // await sendComplaintConfirmationEmail(req.user.email, complaint.id);

    res.status(201).json({
      success: true,
      message: 'GDPR complaint submitted successfully',
      complaint_id: complaint.id,
      estimated_response: '30 days'
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit complaint'
    });
  }
});

// @desc    Check GDPR request status
// @route   GET /api/gdpr/status/:requestId
// @access  Private
router.get('/status/:requestId', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    // In production, this would query a GDPR requests database
    // For now, return mock status
    const mockStatus = {
      request_id: requestId,
      type: 'data_access', // Would be determined from database
      status: 'processing',
      submitted_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      estimated_completion: new Date(Date.now() + 2592000000).toISOString(), // 30 days
      updates: [
        {
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: 'received',
          message: 'Request received and logged'
        },
        {
          timestamp: new Date().toISOString(),
          status: 'processing',
          message: 'Request is being processed'
        }
      ]
    };

    res.json({
      success: true,
      request_status: mockStatus
    });
  } catch (error) {
    console.error('Check request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check request status'
    });
  }
});

module.exports = router;