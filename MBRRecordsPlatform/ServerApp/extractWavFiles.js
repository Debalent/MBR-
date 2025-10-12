#!/usr/bin/env node

/**
 * Flash Drive WAV Extraction Script
 * Scans flash drives for WAV files and extracts them to local project folder
 */

const path = require('path');
const FlashDriveAudioExtractor = require('./Utils/FlashDriveExtractor');

async function main() {
  console.log('🎵 MBR Records - Flash Drive WAV Extraction Tool');
  console.log('=' .repeat(50));

  try {
    // Initialize the extractor
    const projectRoot = path.dirname(__dirname); // Go up one level from ServerApp
    const extractor = new FlashDriveAudioExtractor(projectRoot);

    console.log('📁 Project root:', projectRoot);
    console.log('📁 Local extraction path:', extractor.localExtractionPath);
    console.log('');

    // Scan for available drives
    console.log('🔍 Scanning for available drives...');
    const drives = await extractor.scanAvailableDrives();
    
    if (drives.length === 0) {
      console.log('❌ No removable drives found.');
      console.log('💡 Make sure your flash drive is connected and properly mounted.');
      return;
    }

    console.log(`✅ Found ${drives.length} drive(s):`);
    drives.forEach((drive, index) => {
      console.log(`  ${index + 1}. ${drive.letter} - ${drive.label || 'Unlabeled'} (${drive.size})`);
    });
    console.log('');

    // For demo purposes, scan all drives automatically
    // In production, you might want to prompt user to select a drive
    let totalFilesExtracted = 0;
    let totalSize = 0;

    for (const drive of drives) {
      console.log(`🔍 Scanning drive ${drive.letter} for audio files...`);
      
      try {
        const audioFiles = await extractor.scanForAudioFiles(drive.letter);
        
        if (audioFiles.length === 0) {
          console.log(`  No audio files found on drive ${drive.letter}`);
          continue;
        }

        console.log(`  Found ${audioFiles.length} audio file(s):`);
        
        // Filter for WAV files specifically
        const wavFiles = audioFiles.filter(file => 
          file.extension.toLowerCase() === '.wav'
        );

        if (wavFiles.length === 0) {
          console.log('  No WAV files found on this drive.');
          continue;
        }

        console.log(`  Found ${wavFiles.length} WAV file(s) to extract:`);
        wavFiles.forEach((file, index) => {
          console.log(`    ${index + 1}. ${file.name} (${file.sizeFormatted})`);
        });

        // Extract the WAV files
        console.log(`\n🚀 Starting extraction from drive ${drive.letter}...`);
        
        const extractionOptions = {
          convertToWav: true,
          generateWaveform: true,
          createPreview: false, // Skip previews for faster processing
          extractMetadata: true,
          batchSize: 3 // Process 3 files at a time
        };

        const results = await extractor.extractFromDrive(drive.letter, extractionOptions, (progress) => {
          process.stdout.write(`\r📊 Progress: ${progress.processed}/${progress.total} files (${Math.round(progress.percentage)}%)`);
        });

        console.log('\n');
        
        // Summary for this drive
        const successful = results.filter(r => r.errors.length === 0);
        const failed = results.filter(r => r.errors.length > 0);

        console.log(`✅ Drive ${drive.letter} extraction complete:`);
        console.log(`  • Successfully processed: ${successful.length} files`);
        console.log(`  • Failed: ${failed.length} files`);

        if (failed.length > 0) {
          console.log('  ❌ Failed files:');
          failed.forEach(result => {
            console.log(`    - ${result.originalFile.name}: ${result.errors[0]}`);
          });
        }

        // Add to totals
        totalFilesExtracted += successful.length;
        const driveSize = successful.reduce((sum, result) => sum + result.originalFile.size, 0);
        totalSize += driveSize;

        // Show where files were saved
        if (successful.length > 0) {
          console.log('\n📁 Files saved to:');
          console.log(`  • Originals: ${extractor.originalsPath}`);
          console.log(`  • Processed WAV: ${extractor.processedPath}`);
          console.log(`  • Metadata: ${extractor.localMetadataPath}`);
          console.log(`  • Waveforms: ${extractor.waveformsPath}`);
        }

      } catch (error) {
        console.error(`❌ Error processing drive ${drive.letter}:`, error.message);
      }

      console.log(''); // Empty line between drives
    }

    // Final summary
    console.log('🎉 Extraction Complete!');
    console.log('=' .repeat(50));
    console.log(`📊 Total Summary:`);
    console.log(`  • Files extracted: ${totalFilesExtracted}`);
    console.log(`  • Total size: ${formatBytes(totalSize)}`);
    console.log(`  • Local folder: ${extractor.localExtractionPath}`);
    
    if (totalFilesExtracted > 0) {
      console.log('\n💡 Next steps:');
      console.log('  1. Check the extracted-audio folder for your files');
      console.log('  2. Review metadata files for track information');
      console.log('  3. Use the Flash Drive Manager in the web interface for advanced features');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, formatBytes };