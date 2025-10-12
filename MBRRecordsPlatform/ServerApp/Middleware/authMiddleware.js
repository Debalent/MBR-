const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../Models/User');

/**
 * Authentication middleware for protecting routes
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-auth-token'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - user not found.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated.'
      });
    }

    // Check if email is verified for sensitive operations
    if (req.path.includes('/admin') || req.path.includes('/upload')) {
      if (!user.emailVerified) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your email to access this feature.'
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

/**
 * Socket authentication middleware
 */
const authenticateSocket = async (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      throw new Error('Invalid user');
    }

    return user;
  } catch (error) {
    throw new Error('Socket authentication failed');
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Admin access middleware
 */
const requireAdmin = authorize('admin', 'super_admin');

/**
 * Artist access middleware
 */
const requireArtist = authorize('artist', 'admin', 'super_admin');

/**
 * Subscription check middleware
 */
const requireSubscription = (subscriptionTypes = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Admin users bypass subscription checks
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      return next();
    }

    // Check if user has active subscription
    if (!req.user.subscription || !req.user.subscription.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required.',
        upgradeUrl: '/subscription/upgrade'
      });
    }

    // Check specific subscription types if provided
    if (subscriptionTypes.length > 0) {
      if (!subscriptionTypes.includes(req.user.subscription.type)) {
        return res.status(403).json({
          success: false,
          message: 'Higher subscription tier required.',
          required: subscriptionTypes,
          current: req.user.subscription.type,
          upgradeUrl: '/subscription/upgrade'
        });
      }
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-auth-token'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Rate limiting bypass for verified users
 */
const rateLimitBypass = (req, res, next) => {
  if (req.user) {
    // Premium subscribers get higher limits
    if (req.user.subscription && req.user.subscription.type === 'premium') {
      req.rateLimit = { limit: 1000, remaining: 999 };
    }
    // Admin users bypass rate limiting
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      req.rateLimit = { limit: Infinity, remaining: Infinity };
    }
  }
  next();
};

/**
 * Content ownership verification
 */
const verifyOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const Model = require(`../Models/${model}`);
      
      const item = await Model.findById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${model} not found.`
        });
      }

      // Admin users can access anything
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        req.item = item;
        return next();
      }

      // Check ownership
      const ownerId = item.user || item.artist || item.owner || item.createdBy;
      if (ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own content.'
        });
      }

      req.item = item;
      next();
    } catch (error) {
      console.error('Ownership verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying ownership.'
      });
    }
  };
};

/**
 * API key authentication for external services
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required.'
    });
  }

  // In production, validate against database
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key.'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authenticateSocket,
  authorize,
  requireAdmin,
  requireArtist,
  requireSubscription,
  optionalAuth,
  rateLimitBypass,
  verifyOwnership,
  authenticateApiKey
};