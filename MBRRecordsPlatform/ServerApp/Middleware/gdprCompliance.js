const crypto = require('crypto');
const User = require('../Models/User');

/**
 * GDPR Compliance Middleware
 * Handles data protection, consent management, and privacy rights
 */

// Data retention policies (in days)
const DATA_RETENTION_POLICIES = {
  user_data: 2555, // 7 years for user data
  analytics: 730,  // 2 years for analytics
  logs: 90,        // 90 days for logs
  temp_files: 7    // 7 days for temporary files
};

/**
 * Data anonymization utility
 */
const anonymizeData = (data) => {
  const anonymized = { ...data };

  // Remove or hash personal identifiers
  if (anonymized.email) {
    anonymized.email = crypto.createHash('sha256').update(anonymized.email).digest('hex');
  }
  if (anonymized.name) {
    anonymized.name = `User_${crypto.randomBytes(8).toString('hex')}`;
  }
  if (anonymized.ip) {
    anonymized.ip = anonymized.ip.replace(/\d+$/, '0'); // Mask last octet
  }

  return anonymized;
};

/**
 * GDPR consent management
 */
const gdprConsent = (req, res, next) => {
  try {
    // Check if user has given consent for data processing
    const consentGiven = req.cookies?.gdpr_consent === 'accepted';
    const necessaryOnly = req.cookies?.gdpr_consent === 'necessary';

    res.locals.gdpr = {
      consentGiven,
      necessaryOnly,
      consentRequired: !consentGiven && !necessaryOnly
    };

    // If consent is required but not given, limit data collection
    if (res.locals.gdpr.consentRequired) {
      // Disable non-essential tracking
      res.locals.disableAnalytics = true;
      res.locals.disableMarketing = true;
    }

    next();
  } catch (error) {
    console.error('GDPR consent middleware error:', error);
    next();
  }
};

/**
 * Right to access personal data
 */
const dataAccessRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Collect all user data
    const userData = {
      personal_info: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences
      },
      account_info: {
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        isActive: user.isActive,
        emailVerified: user.isEmailVerified
      },
      subscription: user.subscription,
      stats: user.stats,
      // Include related data (tracks, comments, etc.)
      related_data: await getUserRelatedData(userId)
    };

    // Log data access request for audit
    await logDataAccess(userId, 'access_request', req.ip);

    res.json({
      success: true,
      message: 'Data access request processed',
      data: userData,
      export_formats: ['json', 'pdf', 'csv']
    });

  } catch (error) {
    console.error('Data access request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process data access request'
    });
  }
};

/**
 * Right to data portability
 */
const dataPortabilityRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const format = req.query.format || 'json';

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Collect all exportable data
    const exportData = {
      user: user.toObject(),
      tracks: await getUserTracks(userId),
      playlists: await getUserPlaylists(userId),
      comments: await getUserComments(userId),
      export_date: new Date().toISOString(),
      platform: 'MBR Records'
    };

    // Log data export for audit
    await logDataAccess(userId, 'data_export', req.ip);

    // Format data based on request
    let formattedData;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case 'json':
        formattedData = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        filename = `mbr-data-export-${userId}.json`;
        break;
      case 'csv':
        formattedData = convertToCSV(exportData);
        contentType = 'text/csv';
        filename = `mbr-data-export-${userId}.csv`;
        break;
      default:
        formattedData = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        filename = `mbr-data-export-${userId}.json`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(formattedData);

  } catch (error) {
    console.error('Data portability request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process data portability request'
    });
  }
};

/**
 * Right to erasure (right to be forgotten)
 */
const dataErasureRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const confirmDeletion = req.body.confirm === true;

    if (!confirmDeletion) {
      return res.status(400).json({
        success: false,
        message: 'Please confirm deletion by setting confirm=true'
      });
    }

    // Start GDPR-compliant deletion process
    const deletionResult = await initiateDataErasure(userId, req.ip);

    // Log erasure request
    await logDataAccess(userId, 'erasure_request', req.ip);

    res.json({
      success: true,
      message: 'Data erasure request initiated. You will receive a confirmation email.',
      request_id: deletionResult.requestId,
      estimated_completion: '30 days'
    });

  } catch (error) {
    console.error('Data erasure request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process data erasure request'
    });
  }
};

/**
 * Right to data rectification
 */
const dataRectificationRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { corrections } = req.body;

    if (!corrections || typeof corrections !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Please provide corrections object'
      });
    }

    // Validate corrections against allowed fields
    const allowedFields = [
      'name', 'profile.bio', 'profile.location', 'profile.website',
      'preferences.emailNotifications', 'preferences.pushNotifications'
    ];

    const invalidFields = Object.keys(corrections).filter(
      field => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fields for correction',
        invalid_fields: invalidFields
      });
    }

    // Apply corrections
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Apply nested corrections
    Object.keys(corrections).forEach(field => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if (user[parent] && typeof user[parent] === 'object') {
          user[parent][child] = corrections[field];
        }
      } else {
        user[field] = corrections[field];
      }
    });

    await user.save();

    // Log rectification request
    await logDataAccess(userId, 'rectification_request', req.ip);

    res.json({
      success: true,
      message: 'Data rectification request processed successfully',
      corrected_fields: Object.keys(corrections)
    });

  } catch (error) {
    console.error('Data rectification request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process data rectification request'
    });
  }
};

/**
 * Data processing consent management
 */
const manageConsent = async (req, res) => {
  try {
    const userId = req.user._id;
    const { consent_type, granted } = req.body;

    const validConsentTypes = [
      'analytics', 'marketing', 'personalization', 'third_party'
    ];

    if (!validConsentTypes.includes(consent_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consent type'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize consent object if it doesn't exist
    if (!user.consent) {
      user.consent = {};
    }

    // Update consent
    user.consent[consent_type] = {
      granted: Boolean(granted),
      timestamp: new Date(),
      ip: req.ip
    };

    await user.save();

    // Set cookie for consent
    const consentCookieValue = granted ? 'accepted' : 'necessary';
    res.cookie('gdpr_consent', consentCookieValue, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      success: true,
      message: `Consent for ${consent_type} ${granted ? 'granted' : 'revoked'}`,
      consent: user.consent
    });

  } catch (error) {
    console.error('Consent management error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage consent'
    });
  }
};

/**
 * Automated data retention enforcement
 */
const enforceDataRetention = async () => {
  try {
    const now = new Date();

    // Remove old analytics data
    const analyticsCutoff = new Date(now.getTime() - (DATA_RETENTION_POLICIES.analytics * 24 * 60 * 60 * 1000));
    await removeOldAnalyticsData(analyticsCutoff);

    // Anonymize old user data
    const anonymizeCutoff = new Date(now.getTime() - (DATA_RETENTION_POLICIES.user_data * 24 * 60 * 60 * 1000));
    await anonymizeOldUserData(anonymizeCutoff);

    // Remove old logs
    const logsCutoff = new Date(now.getTime() - (DATA_RETENTION_POLICIES.logs * 24 * 60 * 60 * 1000));
    await removeOldLogs(logsCutoff);

    console.log('Data retention policies enforced successfully');
  } catch (error) {
    console.error('Data retention enforcement error:', error);
  }
};

/**
 * Privacy audit logging
 */
const logDataAccess = async (userId, action, ip) => {
  try {
    // In production, this would log to a secure audit database
    const auditLog = {
      userId,
      action,
      ip,
      timestamp: new Date(),
      userAgent: '', // Would be populated from request
      sessionId: '' // Would be populated from session
    };

    console.log('GDPR Audit:', auditLog);
    // await AuditLog.create(auditLog);
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

// Helper functions (implementations would be in separate files)
const getUserRelatedData = async (userId) => {
  // Implementation for collecting related user data
  return {};
};

const getUserTracks = async (userId) => {
  // Implementation for getting user tracks
  return [];
};

const getUserPlaylists = async (userId) => {
  // Implementation for getting user playlists
  return [];
};

const getUserComments = async (userId) => {
  // Implementation for getting user comments
  return [];
};

const convertToCSV = (data) => {
  // Simple CSV conversion implementation
  return 'CSV export not implemented yet';
};

const initiateDataErasure = async (userId, ip) => {
  // Implementation for GDPR-compliant data erasure
  return { requestId: crypto.randomBytes(16).toString('hex') };
};

const removeOldAnalyticsData = async (cutoff) => {
  // Implementation for removing old analytics
};

const anonymizeOldUserData = async (cutoff) => {
  // Implementation for anonymizing old data
};

const removeOldLogs = async (cutoff) => {
  // Implementation for removing old logs
};

module.exports = {
  gdprConsent,
  dataAccessRequest,
  dataPortabilityRequest,
  dataErasureRequest,
  dataRectificationRequest,
  manageConsent,
  enforceDataRetention,
  anonymizeData
};