const express = require('express');
const router = express.Router();
const { authenticateToken, requireArtist } = require('../Middleware/authMiddleware');
const royaltyService = require('../Services/royaltyService');
const { asyncHandler } = require('../Middleware/errorHandler');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route POST /api/royalties/calculate/streaming
 * @desc Calculate streaming royalties for a track
 * @access Private (Artists only)
 */
router.post('/calculate/streaming', requireArtist, asyncHandler(async (req, res) => {
  const { trackId, platform, streamCount, period } = req.body;

  if (!trackId || !platform || !streamCount) {
    return res.status(400).json({
      success: false,
      message: 'Track ID, platform, and stream count are required'
    });
  }

  const royaltyData = await royaltyService.calculateStreamingRoyalties(
    trackId,
    platform,
    streamCount,
    period
  );

  res.json({
    success: true,
    message: 'Streaming royalties calculated successfully',
    data: royaltyData
  });
}));

/**
 * @route POST /api/royalties/calculate/download
 * @desc Calculate download royalties for a track
 * @access Private (Artists only)
 */
router.post('/calculate/download', requireArtist, asyncHandler(async (req, res) => {
  const { trackId, platform, downloadCount, pricePerUnit } = req.body;

  if (!trackId || !platform || !downloadCount || !pricePerUnit) {
    return res.status(400).json({
      success: false,
      message: 'Track ID, platform, download count, and price per unit are required'
    });
  }

  const royaltyData = await royaltyService.calculateDownloadRoyalties(
    trackId,
    platform,
    downloadCount,
    pricePerUnit
  );

  res.json({
    success: true,
    message: 'Download royalties calculated successfully',
    data: royaltyData
  });
}));

/**
 * @route POST /api/royalties/calculate/licensing
 * @desc Calculate licensing royalties for a track
 * @access Private (Artists only)
 */
router.post('/calculate/licensing', requireArtist, asyncHandler(async (req, res) => {
  const { trackId, licenseType, licenseFee, territory } = req.body;

  if (!trackId || !licenseType || !licenseFee) {
    return res.status(400).json({
      success: false,
      message: 'Track ID, license type, and license fee are required'
    });
  }

  const royaltyData = await royaltyService.calculateLicensingRoyalties(
    trackId,
    licenseType,
    licenseFee,
    territory
  );

  res.json({
    success: true,
    message: 'Licensing royalties calculated successfully',
    data: royaltyData
  });
}));

/**
 * @route GET /api/royalties/report
 * @desc Generate comprehensive royalty report
 * @access Private (Artists only)
 */
router.get('/report', requireArtist, asyncHandler(async (req, res) => {
  const { period, startDate, endDate } = req.query;

  const report = await royaltyService.generateRoyaltyReport(
    req.user._id,
    period,
    startDate,
    endDate
  );

  res.json({
    success: true,
    data: report
  });
}));

/**
 * @route POST /api/royalties/payment
 * @desc Process royalty payment
 * @access Private (Artists only)
 */
router.post('/payment', requireArtist, asyncHandler(async (req, res) => {
  const { amount, paymentMethod } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid payment amount is required'
    });
  }

  const payment = await royaltyService.processRoyaltyPayments(
    req.user._id,
    amount,
    paymentMethod
  );

  res.json({
    success: true,
    message: 'Payment processed successfully',
    data: payment
  });
}));

/**
 * @route GET /api/royalties/analytics
 * @desc Get revenue analytics
 * @access Private (Artists only)
 */
router.get('/analytics', requireArtist, asyncHandler(async (req, res) => {
  const { timeframe } = req.query;

  const analytics = await royaltyService.getRevenueAnalytics(
    req.user._id,
    timeframe
  );

  res.json({
    success: true,
    data: analytics
  });
}));

/**
 * @route GET /api/royalties/track/:trackId
 * @desc Get royalty history for a specific track
 * @access Private (Artists only)
 */
router.get('/track/:trackId', requireArtist, asyncHandler(async (req, res) => {
  const { trackId } = req.params;

  // Verify track ownership
  const Track = require('../Models/Track');
  const track = await Track.findById(trackId);

  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  if (track.artist.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only view royalties for your own tracks'
    });
  }

  // Get royalty calculations for this track
  const RoyaltyCalculation = require('mongoose').model('RoyaltyCalculation');
  const royalties = await RoyaltyCalculation.find({ trackId })
    .sort({ calculatedAt: -1 })
    .limit(100);

  // Calculate totals
  const totals = royalties.reduce((acc, royalty) => {
    acc.totalRevenue += royalty.netRevenue || 0;
    acc.totalStreams += royalty.streams || 0;
    acc.totalDownloads += royalty.downloads || 0;
    return acc;
  }, {
    totalRevenue: 0,
    totalStreams: 0,
    totalDownloads: 0
  });

  res.json({
    success: true,
    data: {
      trackId,
      trackTitle: track.title,
      artist: track.artist,
      royalties,
      totals,
      count: royalties.length
    }
  });
}));

/**
 * @route GET /api/royalties/payments
 * @desc Get payment history
 * @access Private (Artists only)
 */
router.get('/payments', requireArtist, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const Payment = require('mongoose').model('Payment');
  const payments = await Payment.find({ userId: req.user._id })
    .sort({ initiatedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Payment.countDocuments({ userId: req.user._id });

  res.json({
    success: true,
    data: {
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * @route GET /api/royalties/rates
 * @desc Get current royalty rates
 * @access Private
 */
router.get('/rates', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      streaming: royaltyService.royaltyModels.streaming,
      downloads: royaltyService.royaltyModels.downloads,
      licensing: royaltyService.royaltyModels.licensing,
      distributionSplits: royaltyService.distributionSplits,
      lastUpdated: new Date().toISOString()
    }
  });
}));

/**
 * @route POST /api/royalties/bulk-calculate
 * @desc Bulk calculate royalties for multiple tracks/platforms
 * @access Private (Artists only)
 */
router.post('/bulk-calculate', requireArtist, asyncHandler(async (req, res) => {
  const { calculations } = req.body;

  if (!Array.isArray(calculations) || calculations.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Calculations array is required'
    });
  }

  const results = [];
  const errors = [];

  for (const calc of calculations) {
    try {
      let result;

      switch (calc.type) {
        case 'streaming':
          result = await royaltyService.calculateStreamingRoyalties(
            calc.trackId,
            calc.platform,
            calc.streamCount,
            calc.period
          );
          break;

        case 'download':
          result = await royaltyService.calculateDownloadRoyalties(
            calc.trackId,
            calc.platform,
            calc.downloadCount,
            calc.pricePerUnit
          );
          break;

        case 'licensing':
          result = await royaltyService.calculateLicensingRoyalties(
            calc.trackId,
            calc.licenseType,
            calc.licenseFee,
            calc.territory
          );
          break;

        default:
          throw new Error(`Unsupported calculation type: ${calc.type}`);
      }

      results.push(result);
    } catch (error) {
      errors.push({
        calculation: calc,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    message: `Bulk calculation completed: ${results.length} successful, ${errors.length} failed`,
    data: {
      successful: results,
      failed: errors,
      summary: {
        total: calculations.length,
        successful: results.length,
        failed: errors.length
      }
    }
  });
}));

module.exports = router;