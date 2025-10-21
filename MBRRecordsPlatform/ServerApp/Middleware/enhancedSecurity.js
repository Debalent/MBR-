const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Models/User');

/**
 * Enhanced Security Middleware
 * Implements advanced security features for industry-grade protection
 */

// Security configuration
const SECURITY_CONFIG = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordHistoryCount: 5,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  mfaRequired: process.env.MFA_REQUIRED === 'true'
};

/**
 * Advanced password validation
 */
const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain repeated characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Account lockout protection
 */
const accountLockoutProtection = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next();
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next();
    }

    // Check if account is locked
    if (user.accountLocked && user.lockoutExpires > new Date()) {
      const remainingTime = Math.ceil((user.lockoutExpires - new Date()) / 1000 / 60);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to too many failed login attempts. Try again in ${remainingTime} minutes.`,
        lockoutExpires: user.lockoutExpires
      });
    }

    // Reset lockout if expired
    if (user.accountLocked && user.lockoutExpires <= new Date()) {
      user.accountLocked = false;
      user.loginAttempts = 0;
      user.lockoutExpires = null;
      await user.save({ validateBeforeSave: false });
    }

    req.userAccount = user;
    next();
  } catch (error) {
    console.error('Account lockout protection error:', error);
    next();
  }
};

/**
 * Failed login attempt tracking
 */
const trackFailedLogin = async (user, ip) => {
  try {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    user.lastFailedLogin = new Date();
    user.lastFailedLoginIP = ip;

    // Lock account if too many attempts
    if (user.loginAttempts >= SECURITY_CONFIG.maxLoginAttempts) {
      user.accountLocked = true;
      user.lockoutExpires = new Date(Date.now() + SECURITY_CONFIG.lockoutDuration);
    }

    await user.save({ validateBeforeSave: false });

    // Log security event
    console.log(`Security Event: Failed login attempt for user ${user.email} from IP ${ip}. Attempt ${user.loginAttempts}/${SECURITY_CONFIG.maxLoginAttempts}`);
  } catch (error) {
    console.error('Failed login tracking error:', error);
  }
};

/**
 * Successful login tracking
 */
const trackSuccessfulLogin = async (user, ip, userAgent) => {
  try {
    user.loginAttempts = 0;
    user.accountLocked = false;
    user.lockoutExpires = null;
    user.lastLogin = new Date();
    user.lastLoginIP = ip;
    user.lastLoginUserAgent = userAgent;

    // Track login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }

    user.loginHistory.unshift({
      timestamp: new Date(),
      ip,
      userAgent,
      successful: true
    });

    // Keep only last 10 login records
    if (user.loginHistory.length > 10) {
      user.loginHistory = user.loginHistory.slice(0, 10);
    }

    await user.save({ validateBeforeSave: false });
  } catch (error) {
    console.error('Successful login tracking error:', error);
  }
};

/**
 * Password history validation
 */
const checkPasswordHistory = async (userId, newPassword) => {
  try {
    const user = await User.findById(userId).select('+passwordHistory');

    if (!user.passwordHistory) {
      return { isValid: true };
    }

    // Check if new password matches any recent passwords
    for (const oldPasswordHash of user.passwordHistory) {
      const isMatch = await bcrypt.compare(newPassword, oldPasswordHash);
      if (isMatch) {
        return {
          isValid: false,
          message: 'New password cannot be the same as any of your last 5 passwords'
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Password history check error:', error);
    return { isValid: false, message: 'Error checking password history' };
  }
};

/**
 * Update password history
 */
const updatePasswordHistory = async (userId, newPasswordHash) => {
  try {
    const user = await User.findById(userId);

    if (!user.passwordHistory) {
      user.passwordHistory = [];
    }

    // Add new password hash to history
    user.passwordHistory.unshift(newPasswordHash);

    // Keep only last N passwords
    if (user.passwordHistory.length > SECURITY_CONFIG.passwordHistoryCount) {
      user.passwordHistory = user.passwordHistory.slice(0, SECURITY_CONFIG.passwordHistoryCount);
    }

    await user.save({ validateBeforeSave: false });
  } catch (error) {
    console.error('Password history update error:', error);
  }
};

/**
 * Session security validation
 */
const validateSessionSecurity = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next();
    }

    // Decode token without verification to check expiry
    const decoded = jwt.decode(token);
    if (!decoded) {
      return next();
    }

    // Check if session has expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please login again.',
        type: 'session_expired'
      });
    }

    // Check session timeout
    if (decoded.iat && (Date.now() - decoded.iat * 1000) > SECURITY_CONFIG.sessionTimeout) {
      return res.status(401).json({
        success: false,
        message: 'Session has timed out. Please login again.',
        type: 'session_timeout'
      });
    }

    next();
  } catch (error) {
    console.error('Session security validation error:', error);
    next();
  }
};

/**
 * Suspicious activity detection
 */
const detectSuspiciousActivity = (req, res, next) => {
  try {
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const currentTime = Date.now();

    // Simple rate limiting per IP (in production, use Redis)
    if (!global.requestTracker) {
      global.requestTracker = new Map();
    }

    const requests = global.requestTracker.get(clientIP) || [];
    const recentRequests = requests.filter(time => currentTime - time < 60000); // Last minute

    if (recentRequests.length > 100) { // More than 100 requests per minute
      console.log(`Security Alert: High frequency requests from IP ${clientIP}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        type: 'rate_limit_exceeded'
      });
    }

    recentRequests.push(currentTime);
    global.requestTracker.set(clientIP, recentRequests);

    // Check for suspicious user agents
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /exploit/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      console.log(`Security Alert: Suspicious user agent from IP ${clientIP}: ${userAgent}`);
      // Don't block, just log for now
    }

    next();
  } catch (error) {
    console.error('Suspicious activity detection error:', error);
    next();
  }
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "media-src 'self' https: blob:; " +
    "connect-src 'self' ws: wss: https:; " +
    "frame-src 'none'; " +
    "object-src 'none';"
  );

  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

/**
 * API key validation for external services
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required'
    });
  }

  // In production, validate against database
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!validKeys.includes(apiKey)) {
    console.log(`Security Alert: Invalid API key attempt from IP ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  next();
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS vectors
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

module.exports = {
  validatePasswordStrength,
  accountLockoutProtection,
  trackFailedLogin,
  trackSuccessfulLogin,
  checkPasswordHistory,
  updatePasswordHistory,
  validateSessionSecurity,
  detectSuspiciousActivity,
  securityHeaders,
  validateApiKey,
  sanitizeInput,
  SECURITY_CONFIG
};