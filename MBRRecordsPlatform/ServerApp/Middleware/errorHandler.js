/**
 * Global Error Handler Middleware
 * Handles all errors thrown in the application and returns consistent error responses
 */

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404,
      success: false
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = {
      message,
      statusCode: 400,
      success: false,
      field
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    
    error = {
      message: 'Validation Error',
      statusCode: 400,
      success: false,
      errors
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      statusCode: 401,
      success: false
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      statusCode: 401,
      success: false
    };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File too large',
      statusCode: 413,
      success: false,
      maxSize: '50MB'
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = {
      message: 'Too many files uploaded',
      statusCode: 413,
      success: false
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      message: 'Unexpected file field',
      statusCode: 400,
      success: false
    };
  }

  // Stripe errors
  if (err.type === 'StripeCardError') {
    error = {
      message: err.message,
      statusCode: 400,
      success: false,
      type: 'payment_error'
    };
  }

  if (err.type === 'StripeInvalidRequestError') {
    error = {
      message: 'Payment request invalid',
      statusCode: 400,
      success: false,
      type: 'payment_error'
    };
  }

  // Database connection errors
  if (err.message && err.message.includes('ECONNREFUSED')) {
    error = {
      message: 'Database connection failed',
      statusCode: 503,
      success: false,
      type: 'database_error'
    };
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests, please try again later',
      statusCode: 429,
      success: false,
      retryAfter: err.retryAfter || '15 minutes'
    };
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = {
      message: 'CORS policy violation',
      statusCode: 403,
      success: false,
      type: 'cors_error'
    };
  }

  // Permission denied errors
  if (err.code === 'EACCES' || err.code === 'EPERM') {
    error = {
      message: 'Permission denied',
      statusCode: 403,
      success: false
    };
  }

  // Network timeout errors
  if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    error = {
      message: 'Network error occurred',
      statusCode: 503,
      success: false,
      type: 'network_error'
    };
  }

  // Default error response
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    ...(error.errors && { errors: error.errors }),
    ...(error.field && { field: error.field }),
    ...(error.type && { type: error.type }),
    ...(error.retryAfter && { retryAfter: error.retryAfter }),
    ...(error.maxSize && { maxSize: error.maxSize })
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      originalError: err.name,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    };
  }

  // Add request ID for tracking
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation Error Handler
 * Handles express-validator errors
 */
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  next();
};

/**
 * Database Error Handler
 * Specifically handles MongoDB/Mongoose errors
 */
const handleDatabaseError = (err, req, res, next) => {
  // MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable',
      type: 'database_error',
      retryAfter: '5 minutes'
    });
  }

  // MongoDB timeout errors
  if (err.name === 'MongoTimeoutError') {
    return res.status(504).json({
      success: false,
      message: 'Database operation timed out',
      type: 'database_error'
    });
  }

  // MongoDB authentication errors
  if (err.name === 'MongoAuthenticationError') {
    return res.status(500).json({
      success: false,
      message: 'Database authentication failed',
      type: 'database_error'
    });
  }

  next(err);
};

/**
 * Security Error Handler
 * Handles security-related errors
 */
const handleSecurityError = (err, req, res, next) => {
  // CSRF token errors
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      type: 'security_error'
    });
  }

  // Content Security Policy violations
  if (err.message && err.message.includes('CSP')) {
    return res.status(400).json({
      success: false,
      message: 'Content Security Policy violation',
      type: 'security_error'
    });
  }

  next(err);
};

/**
 * API Error Class
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, type = null) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.success = false;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  handleValidationErrors,
  handleDatabaseError,
  handleSecurityError,
  ApiError
};