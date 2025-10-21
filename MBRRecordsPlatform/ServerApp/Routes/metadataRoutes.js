const express = require('express');
const router = express.Router();
const { authenticateToken, requireArtist } = require('../Middleware/authMiddleware');
const metadataService = require('../Services/metadataService');
const { asyncHandler } = require('../Middleware/errorHandler');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route POST /api/metadata/isrc
 * @desc Generate ISRC for a track
 * @access Private (Artists only)
 */
router.post('/isrc', requireArtist, asyncHandler(async (req, res) => {
  const { countryCode, registrantCode, year } = req.body;

  const isrc = metadataService.generateISRC(countryCode, registrantCode, year);

  res.json({
    success: true,
    message: 'ISRC generated successfully',
    data: isrc
  });
}));

/**
 * @route POST /api/metadata/upc
 * @desc Generate UPC for a release
 * @access Private (Artists only)
 */
router.post('/upc', requireArtist, asyncHandler(async (req, res) => {
  const { type, baseCode } = req.body;

  const upc = metadataService.generateUPC(type, baseCode);

  res.json({
    success: true,
    message: 'UPC generated successfully',
    data: upc
  });
}));

/**
 * @route POST /api/metadata/ean
 * @desc Generate EAN for a release
 * @access Private (Artists only)
 */
router.post('/ean', requireArtist, asyncHandler(async (req, res) => {
  const { countryCode, baseCode } = req.body;

  const ean = metadataService.generateEAN(countryCode, baseCode);

  res.json({
    success: true,
    message: 'EAN generated successfully',
    data: ean
  });
}));

/**
 * @route POST /api/metadata/iswc
 * @desc Generate ISWC for a musical work
 * @access Private (Artists only)
 */
router.post('/iswc', requireArtist, asyncHandler(async (req, res) => {
  const { workId } = req.body;

  const iswc = metadataService.generateISWC(workId);

  res.json({
    success: true,
    message: 'ISWC generated successfully',
    data: iswc
  });
}));

/**
 * @route POST /api/metadata/grid
 * @desc Generate GRID for a release
 * @access Private (Artists only)
 */
router.post('/grid', requireArtist, asyncHandler(async (req, res) => {
  const { type, registrantCode } = req.body;

  const grid = metadataService.generateGRID(type, registrantCode);

  res.json({
    success: true,
    message: 'GRID generated successfully',
    data: grid
  });
}));

/**
 * @route POST /api/metadata/release
 * @desc Generate complete metadata for a release
 * @access Private (Artists only)
 */
router.post('/release', requireArtist, asyncHandler(async (req, res) => {
  const { tracks, type, countryCode, registrantCode, year } = req.body;

  if (!tracks || !Array.isArray(tracks)) {
    return res.status(400).json({
      success: false,
      message: 'Tracks array is required'
    });
  }

  const releaseData = {
    tracks,
    type: type || 'album',
    countryCode: countryCode || 'US',
    registrantCode: registrantCode || 'MBR',
    year
  };

  const metadata = await metadataService.generateReleaseMetadata(releaseData);

  res.json({
    success: true,
    message: 'Release metadata generated successfully',
    data: metadata
  });
}));

/**
 * @route POST /api/metadata/validate
 * @desc Validate metadata code
 * @access Private
 */
router.post('/validate', asyncHandler(async (req, res) => {
  const { type, code } = req.body;

  if (!type || !code) {
    return res.status(400).json({
      success: false,
      message: 'Type and code are required'
    });
  }

  const validation = metadataService.validateCode(type, code);

  res.json({
    success: true,
    data: {
      type,
      code,
      ...validation
    }
  });
}));

/**
 * @route GET /api/metadata/standards
 * @desc Get metadata standards information
 * @access Private
 */
router.get('/standards', asyncHandler(async (req, res) => {
  const standards = metadataService.getStandards();

  res.json({
    success: true,
    data: standards
  });
}));

/**
 * @route POST /api/metadata/bulk
 * @desc Bulk generate metadata codes
 * @access Private (Artists only)
 */
router.post('/bulk', requireArtist, asyncHandler(async (req, res) => {
  const { requests } = req.body;

  if (!Array.isArray(requests)) {
    return res.status(400).json({
      success: false,
      message: 'Requests array is required'
    });
  }

  const results = [];
  const errors = [];

  for (const request of requests) {
    try {
      let result;

      switch (request.type.toLowerCase()) {
        case 'isrc':
          result = metadataService.generateISRC(
            request.countryCode,
            request.registrantCode,
            request.year
          );
          break;

        case 'upc':
          result = metadataService.generateUPC(request.releaseType, request.baseCode);
          break;

        case 'ean':
          result = metadataService.generateEAN(request.countryCode, request.baseCode);
          break;

        case 'iswc':
          result = metadataService.generateISWC(request.workId);
          break;

        case 'grid':
          result = metadataService.generateGRID(request.releaseType, request.registrantCode);
          break;

        default:
          throw new Error(`Unsupported metadata type: ${request.type}`);
      }

      results.push({
        request,
        result
      });
    } catch (error) {
      errors.push({
        request,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    message: `Bulk metadata generation completed: ${results.length} successful, ${errors.length} failed`,
    data: {
      successful: results,
      failed: errors,
      summary: {
        total: requests.length,
        successful: results.length,
        failed: errors.length
      }
    }
  });
}));

/**
 * @route GET /api/metadata/track/:trackId
 * @desc Get metadata for a specific track
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
      message: 'You can only view metadata for your own tracks'
    });
  }

  const metadata = track.metadata || {};

  res.json({
    success: true,
    data: {
      trackId,
      title: track.title,
      artist: track.artist,
      metadata: {
        isrc: metadata.isrc,
        iswc: metadata.iswc,
        bpm: metadata.bpm,
        key: metadata.key,
        duration: metadata.duration,
        recordingDate: metadata.recordingDate,
        recordingLocation: metadata.recordingLocation,
        producer: metadata.producer,
        engineer: metadata.engineer,
        mixer: metadata.mixer,
        masteredBy: metadata.masteredBy,
        label: metadata.label,
        catalogNumber: metadata.catalogNumber,
        copyright: metadata.copyright,
        publishingRights: metadata.publishingRights
      }
    }
  });
}));

/**
 * @route PUT /api/metadata/track/:trackId
 * @desc Update metadata for a specific track
 * @access Private (Artists only)
 */
router.put('/track/:trackId', requireArtist, asyncHandler(async (req, res) => {
  const { trackId } = req.params;
  const metadataUpdates = req.body;

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
      message: 'You can only update metadata for your own tracks'
    });
  }

  // Validate metadata codes if provided
  if (metadataUpdates.isrc) {
    const validation = metadataService.validateCode('isrc', metadataUpdates.isrc);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ISRC format',
        error: validation.error
      });
    }
  }

  if (metadataUpdates.upc) {
    const validation = metadataService.validateCode('upc', metadataUpdates.upc);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPC format',
        error: validation.error
      });
    }
  }

  // Update track metadata
  await Track.findByIdAndUpdate(trackId, {
    $set: {
      'metadata': { ...track.metadata, ...metadataUpdates },
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Track metadata updated successfully'
  });
}));

/**
 * @route POST /api/metadata/auto-generate/:trackId
 * @desc Auto-generate missing metadata for a track
 * @access Private (Artists only)
 */
router.post('/auto-generate/:trackId', requireArtist, asyncHandler(async (req, res) => {
  const { trackId } = req.params;
  const { countryCode, registrantCode } = req.body;

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
      message: 'You can only generate metadata for your own tracks'
    });
  }

  const generatedMetadata = {};

  // Generate ISRC if missing
  if (!track.metadata?.isrc) {
    generatedMetadata.isrc = metadataService.generateISRC(
      countryCode || 'US',
      registrantCode || 'MBR'
    );
  }

  // Generate ISWC if missing and it's a composition
  if (!track.metadata?.iswc && track.lyrics) {
    generatedMetadata.iswc = metadataService.generateISWC();
  }

  // Update track with generated metadata
  if (Object.keys(generatedMetadata).length > 0) {
    await Track.findByIdAndUpdate(trackId, {
      $set: {
        'metadata': { ...track.metadata, ...generatedMetadata },
        updatedAt: new Date()
      }
    });
  }

  res.json({
    success: true,
    message: 'Metadata auto-generated successfully',
    data: generatedMetadata
  });
}));

module.exports = router;