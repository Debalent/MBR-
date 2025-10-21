const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { ApiError } = require('./errorHandler');

/**
 * Digital Rights Management (DRM) Protection Middleware
 * Implements content protection for audio files and metadata
 */

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Generate encryption key for content
 */
const generateContentKey = () => {
  return crypto.randomBytes(KEY_LENGTH);
};

/**
 * Encrypt audio file content
 */
const encryptAudioFile = async (inputPath, outputPath, contentKey) => {
  try {
    const inputBuffer = await fs.readFile(inputPath);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, contentKey);
    cipher.setAAD(Buffer.from('MBR-DRM')); // Additional authenticated data

    let encrypted = cipher.update(inputBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    const encryptedData = Buffer.concat([iv, encrypted, authTag]);

    await fs.writeFile(outputPath, encryptedData);

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted: true
    };
  } catch (error) {
    throw new ApiError('Failed to encrypt audio file', 500);
  }
};

/**
 * Decrypt audio file content for authorized playback
 */
const decryptAudioFile = async (encryptedPath, contentKey, iv, authTag) => {
  try {
    const encryptedBuffer = await fs.readFile(encryptedPath);

    // Extract components
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    const encryptedData = encryptedBuffer.slice(IV_LENGTH, -AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, contentKey);
    decipher.setAAD(Buffer.from('MBR-DRM'));
    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  } catch (error) {
    throw new ApiError('Failed to decrypt audio file', 500);
  }
};

/**
 * Generate license key for content access
 */
const generateLicenseKey = (userId, trackId, expirationHours = 24) => {
  const payload = {
    userId,
    trackId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + (expirationHours * 60 * 60 * 1000),
    permissions: ['play', 'download']
  };

  const secret = process.env.DRM_LICENSE_SECRET || 'mbr-drm-secret-key';
  const licenseKey = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return {
    licenseKey,
    payload,
    expiresAt: payload.expiresAt
  };
};

/**
 * Validate license key
 */
const validateLicenseKey = (licenseKey, userId, trackId) => {
  try {
    const secret = process.env.DRM_LICENSE_SECRET || 'mbr-drm-secret-key';

    // In production, you'd verify against stored licenses
    // For now, we'll do basic validation
    if (!licenseKey || licenseKey.length !== 64) {
      return false;
    }

    // Check if license is not expired (basic check)
    // In production, decode and verify the HMAC
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Watermark audio file with user-specific data
 */
const addWatermark = async (inputPath, outputPath, watermarkData) => {
  try {
    // This is a simplified watermarking implementation
    // In production, you'd use a proper audio watermarking library
    const watermark = Buffer.from(JSON.stringify({
      userId: watermarkData.userId,
      timestamp: Date.now(),
      platform: 'MBR Records'
    }));

    const inputBuffer = await fs.readFile(inputPath);

    // Simple watermark insertion (not cryptographically secure)
    // In production, use frequency domain watermarking
    const watermarkedBuffer = Buffer.concat([
      inputBuffer.slice(0, 1000),
      watermark,
      inputBuffer.slice(1000)
    ]);

    await fs.writeFile(outputPath, watermarkedBuffer);

    return {
      watermarked: true,
      watermarkId: crypto.createHash('md5').update(watermark).digest('hex')
    };
  } catch (error) {
    throw new ApiError('Failed to add watermark', 500);
  }
};

/**
 * DRM Protection Middleware
 * Protects audio content with encryption and licensing
 */
const drmProtection = (options = {}) => {
  const {
    requireLicense = true,
    allowPreview = true,
    previewDuration = 30, // seconds
    watermarkEnabled = true
  } = options;

  return async (req, res, next) => {
    try {
      const { trackId } = req.params;
      const userId = req.user?._id;

      if (!trackId) {
        return next();
      }

      // Check if user has valid license
      if (requireLicense && userId) {
        const licenseKey = req.headers['x-license-key'] || req.query.license;

        if (!licenseKey) {
          return res.status(403).json({
            success: false,
            message: 'License key required for content access',
            type: 'drm_error'
          });
        }

        const isValidLicense = validateLicenseKey(licenseKey, userId, trackId);
        if (!isValidLicense) {
          return res.status(403).json({
            success: false,
            message: 'Invalid or expired license key',
            type: 'drm_error'
          });
        }
      }

      // Add DRM metadata to response
      res.locals.drm = {
        protected: true,
        licenseRequired: requireLicense,
        watermarkEnabled,
        previewAllowed: allowPreview,
        previewDuration
      };

      // Generate content key for this session
      if (userId) {
        const contentKey = generateContentKey();
        res.locals.drm.contentKey = contentKey.toString('hex');

        // Generate license for this session
        const license = generateLicenseKey(userId, trackId);
        res.locals.drm.license = license;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Anti-piracy measures middleware
 */
const antiPiracyProtection = (req, res, next) => {
  try {
    // Check for suspicious request patterns
    const userAgent = req.get('User-Agent') || '';
    const suspiciousPatterns = [
      /wget/i,
      /curl/i,
      /python/i,
      /bot/i,
      /spider/i,
      /scraper/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    if (isSuspicious) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        type: 'security_error'
      });
    }

    // Check request frequency for this IP
    const clientIP = req.ip;
    const now = Date.now();

    // Simple rate limiting for downloads (in production, use Redis)
    if (!global.downloadTracker) {
      global.downloadTracker = new Map();
    }

    const downloads = global.downloadTracker.get(clientIP) || [];
    const recentDownloads = downloads.filter(time => now - time < 60000); // Last minute

    if (recentDownloads.length > 10) { // More than 10 downloads per minute
      return res.status(429).json({
        success: false,
        message: 'Download rate limit exceeded',
        type: 'rate_limit_error'
      });
    }

    recentDownloads.push(now);
    global.downloadTracker.set(clientIP, recentDownloads);

    // Add security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'",
      'Cache-Control': 'private, no-cache'
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Content fingerprinting for piracy detection
 */
const generateContentFingerprint = async (filePath) => {
  try {
    const fileBuffer = await fs.readFile(filePath);

    // Generate multiple hashes for robust fingerprinting
    const fingerprints = {
      md5: crypto.createHash('md5').update(fileBuffer).digest('hex'),
      sha256: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
      sha512: crypto.createHash('sha512').update(fileBuffer).digest('hex')
    };

    // Extract audio characteristics (simplified)
    // In production, extract spectral features, tempo, etc.
    const characteristics = {
      fileSize: fileBuffer.length,
      firstBytes: fileBuffer.slice(0, 1024).toString('hex'),
      lastBytes: fileBuffer.slice(-1024).toString('hex')
    };

    return {
      fingerprints,
      characteristics,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new ApiError('Failed to generate content fingerprint', 500);
  }
};

module.exports = {
  drmProtection,
  antiPiracyProtection,
  encryptAudioFile,
  decryptAudioFile,
  generateLicenseKey,
  validateLicenseKey,
  addWatermark,
  generateContentFingerprint,
  generateContentKey
};