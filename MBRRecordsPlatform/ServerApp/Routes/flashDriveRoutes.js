const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../Middleware/authMiddleware');
const { asyncHandler } = require('../Middleware/errorHandler');
const FlashDriveExtractor = require('../Utils/FlashDriveExtractor');
const Track = require('../Models/Track');
const User = require('../Models/User');
const path = require('path');

// Initialize extractor
const extractor = new FlashDriveExtractor(path.join(__dirname, '../..'));

/**
 * @route   GET /api/flash-drive/scan
 * @desc    Scan for available removable drives
 * @access  Private (Admin only)
 */
router.get('/scan',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    console.log('🔍 Scanning for removable drives...');
    
    const drives = await extractor.scanForDrives();
    
    res.json({
      success: true,
      message: `Found ${drives.length} removable drive(s)`,
      data: {
        drives,
        timestamp: new Date().toISOString()
      }
    });
  })
);

/**
 * @route   POST /api/flash-drive/preview
 * @desc    Preview audio files on a drive without extracting
 * @access  Private (Admin only)
 */
router.post('/preview',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { drivePath, maxDepth = 5 } = req.body;
    
    if (!drivePath) {
      return res.status(400).json({
        success: false,
        message: 'Drive path is required'
      });
    }

    console.log(`🔍 Previewing audio files on ${drivePath}...`);
    
    try {
      const audioFiles = await extractor.findAudioFiles(drivePath, maxDepth);
      
      // Group by directory for better organization
      const filesByDirectory = audioFiles.reduce((acc, file) => {
        const dir = file.directory;
        if (!acc[dir]) acc[dir] = [];
        acc[dir].push({
          name: file.name,
          extension: file.extension,
          relativePath: file.relativePath,
          path: file.path
        });
        return acc;
      }, {});

      // Get summary statistics
      const summary = {
        totalFiles: audioFiles.length,
        byFormat: audioFiles.reduce((acc, file) => {
          acc[file.extension] = (acc[file.extension] || 0) + 1;
          return acc;
        }, {}),
        directories: Object.keys(filesByDirectory).length
      };

      res.json({
        success: true,
        message: `Found ${audioFiles.length} audio files`,
        data: {
          summary,
          filesByDirectory,
          drivePath,
          scannedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error previewing drive:', error);
      res.status(500).json({
        success: false,
        message: 'Error accessing drive',
        error: error.message
      });
    }
  })
);

/**
 * @route   POST /api/flash-drive/extract
 * @desc    Extract and process audio files from flash drive
 * @access  Private (Admin only)
 */
router.post('/extract',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { 
      drivePath, 
      artistId = null,
      options = {
        convertToWav: true,
        generateWaveform: true,
        createPreview: true,
        extractMetadata: true,
        batchSize: 3
      },
      filter = null
    } = req.body;
    
    if (!drivePath) {
      return res.status(400).json({
        success: false,
        message: 'Drive path is required'
      });
    }

    console.log(`🚀 Starting extraction from ${drivePath}...`);
    
    try {
      // Create filter function if provided
      let filterFunction = null;
      if (filter) {
        if (filter.extensions) {
          filterFunction = (file) => filter.extensions.includes(file.extension);
        }
        if (filter.namePattern) {
          const regex = new RegExp(filter.namePattern, 'i');
          filterFunction = (file) => regex.test(file.name);
        }
        if (filter.directories) {
          filterFunction = (file) => filter.directories.some(dir => 
            file.directory.toLowerCase().includes(dir.toLowerCase())
          );
        }
      }

      // Set up progress tracking
      let progressData = {
        started: new Date().toISOString(),
        completed: 0,
        total: 0,
        percentage: 0,
        currentFile: null
      };

      const progressCallback = (completed, total, percentage) => {
        progressData = {
          ...progressData,
          completed,
          total,
          percentage,
          lastUpdate: new Date().toISOString()
        };
      };

      // Start extraction
      const result = await extractor.extractFromDrive(drivePath, {
        ...options,
        progress: progressCallback,
        filter: filterFunction
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          data: result
        });
      }

      // Generate track entries for database
      const trackEntries = extractor.generateTrackEntries(result, artistId);

      res.json({
        success: true,
        message: result.message,
        data: {
          extractionSummary: result.summary,
          trackEntries,
          processedFiles: result.results.length,
          successfulFiles: result.results.filter(r => r.errors.length === 0).length,
          failedFiles: result.results.filter(r => r.errors.length > 0).length,
          progress: progressData
        }
      });

    } catch (error) {
      console.error('Error during extraction:', error);
      res.status(500).json({
        success: false,
        message: 'Extraction failed',
        error: error.message
      });
    }
  })
);

/**
 * @route   POST /api/flash-drive/import-tracks
 * @desc    Import processed tracks to database
 * @access  Private (Admin only)
 */
router.post('/import-tracks',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { 
      trackEntries, 
      artistId = null, 
      defaultStatus = 'draft',
      makePublic = false 
    } = req.body;
    
    if (!trackEntries || !Array.isArray(trackEntries)) {
      return res.status(400).json({
        success: false,
        message: 'Track entries array is required'
      });
    }

    console.log(`📥 Importing ${trackEntries.length} tracks to database...`);
    
    try {
      const importResults = [];
      const errors = [];

      for (const [index, trackData] of trackEntries.entries()) {
        try {
          // Set default values
          const finalTrackData = {
            ...trackData,
            status: defaultStatus,
            isPublic: makePublic,
            artist: {
              ...trackData.artist,
              user: artistId || trackData.artist.user
            }
          };

          // Validate required artist
          if (!finalTrackData.artist.user) {
            throw new Error('Artist ID is required for track import');
          }

          // Verify artist exists
          const artist = await User.findById(finalTrackData.artist.user);
          if (!artist) {
            throw new Error(`Artist with ID ${finalTrackData.artist.user} not found`);
          }

          // Create track
          const track = new Track(finalTrackData);
          await track.save();

          // Update artist stats
          await User.findByIdAndUpdate(artistId, {
            $inc: { 'stats.tracksUploaded': 1 }
          });

          importResults.push({
            index,
            success: true,
            trackId: track._id,
            title: track.title,
            artist: track.artist.name
          });

          console.log(`✅ Imported: ${track.title} by ${track.artist.name}`);

        } catch (error) {
          console.error(`❌ Failed to import track ${index + 1}:`, error.message);
          
          errors.push({
            index,
            title: trackData.title || 'Unknown',
            error: error.message
          });

          importResults.push({
            index,
            success: false,
            error: error.message,
            title: trackData.title || 'Unknown'
          });
        }
      }

      const successful = importResults.filter(r => r.success);
      const failed = importResults.filter(r => !r.success);

      console.log(`🎉 Import complete: ${successful.length} successful, ${failed.length} failed`);

      res.json({
        success: true,
        message: `Imported ${successful.length}/${trackEntries.length} tracks successfully`,
        data: {
          imported: successful.length,
          failed: failed.length,
          total: trackEntries.length,
          results: importResults,
          errors: failed.length > 0 ? errors : undefined
        }
      });

    } catch (error) {
      console.error('Error during import:', error);
      res.status(500).json({
        success: false,
        message: 'Import failed',
        error: error.message
      });
    }
  })
);

/**
 * @route   GET /api/flash-drive/extraction-history
 * @desc    Get history of flash drive extractions
 * @access  Private (Admin only)
 */
router.get('/extraction-history',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const fs = require('fs').promises;
    const metadataDir = path.join(__dirname, '../..', 'Assets', 'Audio', 'Metadata');
    
    try {
      const files = await fs.readdir(metadataDir);
      const summaryFiles = files.filter(file => file.startsWith('extraction_summary_'));
      
      const history = [];
      
      for (const file of summaryFiles.slice(0, 20)) { // Last 20 extractions
        try {
          const filePath = path.join(metadataDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const summary = JSON.parse(content);
          
          history.push({
            filename: file,
            timestamp: summary.timestamp,
            source: summary.source,
            totalFound: summary.totalFound,
            successful: summary.successful,
            failed: summary.failed,
            summary: {
              totalProcessed: summary.totalProcessed,
              successRate: summary.totalProcessed > 0 
                ? Math.round((summary.successful / summary.totalProcessed) * 100) 
                : 0
            }
          });
        } catch (error) {
          console.error(`Error reading summary file ${file}:`, error.message);
        }
      }
      
      // Sort by timestamp (newest first)
      history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.json({
        success: true,
        data: {
          history,
          total: history.length
        }
      });
      
    } catch (error) {
      console.error('Error reading extraction history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to read extraction history',
        error: error.message
      });
    }
  })
);

/**
 * @route   DELETE /api/flash-drive/cleanup
 * @desc    Clean up temporary extraction files
 * @access  Private (Admin only)
 */
router.delete('/cleanup',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { olderThanDays = 7 } = req.body;
    
    try {
      const fs = require('fs').promises;
      const tempDir = path.join(__dirname, '../..', 'temp', 'extraction');
      
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      const files = await fs.readdir(tempDir);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      console.log(`🧹 Cleaned up ${deletedCount} temporary files`);
      
      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} temporary files older than ${olderThanDays} days`,
        data: {
          deletedFiles: deletedCount,
          cutoffDate: cutoffDate.toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: error.message
      });
    }
  })
);

module.exports = router;