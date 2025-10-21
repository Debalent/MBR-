const express = require('express');
const router = express.Router();
const { authenticateToken, requireArtist } = require('../Middleware/authMiddleware');
const distributionService = require('../Services/distributionService');
const { asyncHandler } = require('../Middleware/errorHandler');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route POST /api/distribution/authenticate/:platform
 * @desc Authenticate with a streaming platform
 * @access Private (Artists only)
 */
router.post('/authenticate/:platform', requireArtist, asyncHandler(async (req, res) => {
  const { platform } = req.params;

  const authResult = await distributionService.authenticate(platform);

  res.json({
    success: true,
    message: `Successfully authenticated with ${platform}`,
    data: authResult
  });
}));

/**
 * @route POST /api/distribution/upload/:platform
 * @desc Upload track to a streaming platform
 * @access Private (Artists only)
 */
router.post('/upload/:platform', requireArtist, asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { trackId, authToken } = req.body;

  if (!trackId) {
    return res.status(400).json({
      success: false,
      message: 'Track ID is required'
    });
  }

  // Get track data from database
  const Track = require('../Models/Track');
  const track = await Track.findById(trackId);

  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Verify ownership
  if (track.artist.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only distribute your own tracks'
    });
  }

  const uploadResult = await distributionService.uploadTrack(platform, track, authToken);

  // Update track with distribution info
  await Track.findByIdAndUpdate(trackId, {
    $push: {
      'metadata.distribution': {
        platform,
        uploadId: uploadResult.id,
        url: uploadResult.url,
        status: uploadResult.status,
        uploadedAt: new Date()
      }
    }
  });

  res.json({
    success: true,
    message: `Track uploaded to ${platform} successfully`,
    data: uploadResult
  });
}));

/**
 * @route POST /api/distribution/distribute/:partner
 * @desc Distribute track through a distribution partner
 * @access Private (Artists only)
 */
router.post('/distribute/:partner', requireArtist, asyncHandler(async (req, res) => {
  const { partner } = req.params;
  const { trackId } = req.body;

  if (!trackId) {
    return res.status(400).json({
      success: false,
      message: 'Track ID is required'
    });
  }

  // Get track data
  const Track = require('../Models/Track');
  const track = await Track.findById(trackId);

  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Verify ownership
  if (track.artist.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only distribute your own tracks'
    });
  }

  const distributionResult = await distributionService.distributeThroughPartner(
    partner,
    track,
    req.user._id
  );

  // Update track with distribution info
  await Track.findByIdAndUpdate(trackId, {
    $push: {
      'metadata.distribution': distributionResult
    }
  });

  res.json({
    success: true,
    message: `Track submitted for distribution through ${partner}`,
    data: distributionResult
  });
}));

/**
 * @route GET /api/distribution/status/:partner/:releaseId
 * @desc Get distribution status from a partner
 * @access Private (Artists only)
 */
router.get('/status/:partner/:releaseId', requireArtist, asyncHandler(async (req, res) => {
  const { partner, releaseId } = req.params;

  const statusResult = await distributionService.getDistributionStatus(partner, releaseId);

  res.json({
    success: true,
    data: statusResult
  });
}));

/**
 * @route POST /api/distribution/bulk
 * @desc Bulk distribute track to multiple platforms
 * @access Private (Artists only)
 */
router.post('/bulk', requireArtist, asyncHandler(async (req, res) => {
  const { trackId, platforms } = req.body;

  if (!trackId || !platforms || !Array.isArray(platforms)) {
    return res.status(400).json({
      success: false,
      message: 'Track ID and platforms array are required'
    });
  }

  // Get track data
  const Track = require('../Models/Track');
  const track = await Track.findById(trackId);

  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Verify ownership
  if (track.artist.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only distribute your own tracks'
    });
  }

  const bulkResult = await distributionService.bulkDistribute(track, platforms, req.user._id);

  // Update track with bulk distribution results
  const distributionUpdates = bulkResult.successful.map(result => ({
    platform: result.platform,
    uploadId: result.uploadId,
    url: result.url,
    status: 'uploaded',
    uploadedAt: new Date()
  }));

  await Track.findByIdAndUpdate(trackId, {
    $push: {
      'metadata.distribution': { $each: distributionUpdates }
    }
  });

  res.json({
    success: true,
    message: `Bulk distribution completed: ${bulkResult.successCount}/${bulkResult.totalPlatforms} platforms`,
    data: bulkResult
  });
}));

/**
 * @route GET /api/distribution/platforms
 * @desc Get list of available distribution platforms
 * @access Private
 */
router.get('/platforms', asyncHandler(async (req, res) => {
  const platforms = Object.keys(distributionService.distributors).map(platform => ({
    name: platform,
    displayName: platform.charAt(0).toUpperCase() + platform.slice(1),
    supported: true,
    requiresAuth: true
  }));

  const partners = Object.keys(distributionService.distributionPartners).map(partner => ({
    name: partner,
    displayName: partner.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    type: 'distributor',
    supported: true
  }));

  res.json({
    success: true,
    data: {
      streamingPlatforms: platforms,
      distributionPartners: partners
    }
  });
}));

/**
 * @route GET /api/distribution/track/:trackId
 * @desc Get distribution history for a track
 * @access Private (Artists only)
 */
router.get('/track/:trackId', requireArtist, asyncHandler(async (req, res) => {
  const { trackId } = req.params;

  // Get track data
  const Track = require('../Models/Track');
  const track = await Track.findById(trackId);

  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Verify ownership
  if (track.artist.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only view distribution history for your own tracks'
    });
  }

  const distributionHistory = track.metadata?.distribution || [];

  res.json({
    success: true,
    data: {
      trackId,
      title: track.title,
      artist: track.artist,
      distributionHistory
    }
  });
}));

/**
 * @route POST /api/distribution/sync/:platform
 * @desc Sync track data with a platform
 * @access Private (Artists only)
 */
router.post('/sync/:platform', requireArtist, asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { trackId, platformTrackId } = req.body;

  if (!trackId || !platformTrackId) {
    return res.status(400).json({
      success: false,
      message: 'Track ID and platform track ID are required'
    });
  }

  // Get track data
  const Track = require('../Models/Track');
  const track = await Track.findById(trackId);

  if (!track) {
    return res.status(404).json({
      success: false,
      message: 'Track not found'
    });
  }

  // Verify ownership
  if (track.artist.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only sync your own tracks'
    });
  }

  // In a real implementation, this would sync metadata, stats, etc. from the platform
  // For now, we'll just update the local record
  await Track.findByIdAndUpdate(trackId, {
    $set: {
      'metadata.distribution.$[elem].lastSynced': new Date(),
      'metadata.distribution.$[elem].syncStatus': 'completed'
    }
  }, {
    arrayFilters: [{ 'elem.platform': platform, 'elem.uploadId': platformTrackId }]
  });

  res.json({
    success: true,
    message: `Track synced with ${platform} successfully`
  });
}));

module.exports = router;