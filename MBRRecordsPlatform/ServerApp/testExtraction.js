const path = require('path');
const fs = require('fs').promises;

async function testExtractionSetup() {
  console.log('🧪 Testing WAV Extraction Setup');
  console.log('================================');

  const projectRoot = path.join(__dirname, '..');
  const extractedAudioPath = path.join(projectRoot, 'extracted-audio');

  try {
    // Test 1: Check if extraction folders exist
    console.log('📁 Checking extraction folders...');
    
    const folders = [
      path.join(extractedAudioPath, 'originals'),
      path.join(extractedAudioPath, 'processed'),
      path.join(extractedAudioPath, 'metadata'),
      path.join(extractedAudioPath, 'waveforms')
    ];

    for (const folder of folders) {
      try {
        await fs.access(folder);
        console.log(`  ✅ ${path.relative(projectRoot, folder)}`);
      } catch {
        console.log(`  ❌ ${path.relative(projectRoot, folder)} - Missing!`);
      }
    }

    // Test 2: Check if FlashDriveExtractor can be loaded
    console.log('\n🔧 Testing FlashDriveExtractor...');
    try {
      const FlashDriveAudioExtractor = require('./Utils/FlashDriveExtractor');
      const extractor = new FlashDriveAudioExtractor(projectRoot);
      console.log('  ✅ FlashDriveExtractor loaded successfully');
      console.log(`  📁 Local extraction path: ${extractor.localExtractionPath}`);
    } catch (error) {
      console.log('  ❌ FlashDriveExtractor failed to load:', error.message);
    }

    // Test 3: Check available drives (non-blocking)
    console.log('\n💾 Checking for removable drives...');
    try {
      const FlashDriveAudioExtractor = require('./Utils/FlashDriveExtractor');
      const extractor = new FlashDriveAudioExtractor(projectRoot);
      const drives = await extractor.scanAvailableDrives();
      
      if (drives.length > 0) {
        console.log(`  ✅ Found ${drives.length} drive(s):`);
        drives.forEach(drive => {
          console.log(`    - ${drive.letter}: ${drive.label || 'Unlabeled'} (${drive.size || 'Unknown size'})`);
        });
      } else {
        console.log('  ⚠️  No removable drives detected');
        console.log('     (This is normal if no flash drive is connected)');
      }
    } catch (error) {
      console.log('  ❌ Drive scanning failed:', error.message);
    }

    // Test 4: Verify dependencies
    console.log('\n📦 Checking dependencies...');
    const dependencies = [
      'fs',
      'path',
      'music-metadata',
      'fluent-ffmpeg',
      'uuid'
    ];

    for (const dep of dependencies) {
      try {
        require(dep);
        console.log(`  ✅ ${dep}`);
      } catch {
        console.log(`  ❌ ${dep} - Not installed!`);
      }
    }

    console.log('\n🎉 Setup verification complete!');
    console.log('\n💡 To extract WAV files:');
    console.log('   1. Connect a flash drive with WAV files');
    console.log('   2. Run: node extractWavFiles.js');
    console.log('   3. Or double-click: extract-wav-files.bat');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test if called directly
if (require.main === module) {
  testExtractionSetup();
}

module.exports = { testExtractionSetup };