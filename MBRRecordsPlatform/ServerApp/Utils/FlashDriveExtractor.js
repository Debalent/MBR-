const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const mm = require('music-metadata');
const { v4: uuidv4 } = require('uuid');

class FlashDriveAudioExtractor {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.audioDestination = path.join(projectRoot, 'Assets', 'Audio', 'Tracks');
    this.metadataDestination = path.join(projectRoot, 'Assets', 'Audio', 'Metadata');
    this.tempDirectory = path.join(projectRoot, 'temp', 'extraction');
    
    // Local extraction folders
    this.localExtractionPath = path.join(projectRoot, 'extracted-audio');
    this.originalsPath = path.join(this.localExtractionPath, 'originals');
    this.processedPath = path.join(this.localExtractionPath, 'processed');
    this.localMetadataPath = path.join(this.localExtractionPath, 'metadata');
    this.waveformsPath = path.join(this.localExtractionPath, 'waveforms');
    
    // Supported audio formats
    this.supportedFormats = ['.wav', '.mp3', '.flac', '.m4a', '.aac', '.ogg'];
    this.preferredFormat = '.wav';
    
    // Initialize directories
    this.initializeDirectories();
  }

  async initializeDirectories() {
    const directories = [
      this.audioDestination,
      this.metadataDestination,
      this.tempDirectory,
      path.join(this.projectRoot, 'Assets', 'Audio', 'Waveforms'),
      path.join(this.projectRoot, 'Assets', 'Audio', 'Previews'),
      path.join(this.projectRoot, 'Assets', 'Audio', 'Artwork'),
      // Local extraction directories
      this.localExtractionPath,
      this.originalsPath,
      this.processedPath,
      this.localMetadataPath,
      this.waveformsPath
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    }
  }

  /**
   * Scan for available drives (Windows)
   */
  async scanForDrives() {
    try {
      const drives = [];
      
      // Get all drive letters on Windows
      for (let drive = 65; drive <= 90; drive++) {
        const driveLetter = String.fromCharCode(drive) + ':';
        const drivePath = driveLetter + '\\';
        
        try {
          await fs.access(drivePath);
          const stats = await fs.stat(drivePath);
          
          // Check if it's a removable drive (basic heuristic)
          const driveInfo = {
            letter: driveLetter,
            path: drivePath,
            isRemovable: await this.isRemovableDrive(driveLetter),
            label: await this.getDriveLabel(driveLetter)
          };
          
          drives.push(driveInfo);
        } catch (error) {
          // Drive not accessible, skip
          continue;
        }
      }
      
      return drives.filter(drive => drive.isRemovable);
    } catch (error) {
      console.error('Error scanning drives:', error);
      return [];
    }
  }

  async isRemovableDrive(driveLetter) {
    try {
      // Use PowerShell to check drive type
      const command = `powershell "Get-WmiObject -Class Win32_LogicalDisk -Filter \\"DeviceID='${driveLetter}'\\" | Select-Object DriveType"`;
      const result = execSync(command, { encoding: 'utf8' });
      
      // DriveType 2 = Removable disk, 3 = Local disk
      return result.includes('2');
    } catch (error) {
      return false;
    }
  }

  async getDriveLabel(driveLetter) {
    try {
      const command = `powershell "Get-WmiObject -Class Win32_LogicalDisk -Filter \\"DeviceID='${driveLetter}'\\" | Select-Object VolumeName"`;
      const result = execSync(command, { encoding: 'utf8' });
      const match = result.match(/VolumeName\\s*:\\s*(.+)/);
      return match ? match[1].trim() : 'Unnamed Drive';
    } catch (error) {
      return 'Unknown Drive';
    }
  }

  /**
   * Recursively find all audio files in a directory
   */
  async findAudioFiles(directory, maxDepth = 10, currentDepth = 0) {
    if (currentDepth >= maxDepth) return [];
    
    const audioFiles = [];
    
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        
        if (item.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findAudioFiles(fullPath, maxDepth, currentDepth + 1);
          audioFiles.push(...subFiles);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (this.supportedFormats.includes(ext)) {
            audioFiles.push({
              path: fullPath,
              name: item.name,
              extension: ext,
              directory: directory,
              relativePath: path.relative(directory, fullPath)
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${directory}:`, error.message);
    }
    
    return audioFiles;
  }

  /**
   * Extract metadata from audio file
   */
  async extractMetadata(filePath) {
    try {
      const metadata = await mm.parseFile(filePath);
      const stats = await fs.stat(filePath);
      
      return {
        title: metadata.common.title || path.parse(filePath).name,
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        genre: metadata.common.genre ? metadata.common.genre.join(', ') : 'Unknown',
        year: metadata.common.year || null,
        duration: metadata.format.duration || 0,
        bitrate: metadata.format.bitrate || 0,
        sampleRate: metadata.format.sampleRate || 0,
        channels: metadata.format.numberOfChannels || 0,
        format: metadata.format.container || 'Unknown',
        fileSize: stats.size,
        createdDate: stats.birthtime,
        modifiedDate: stats.mtime,
        codec: metadata.format.codec || 'Unknown',
        lossless: metadata.format.lossless || false
      };
    } catch (error) {
      console.error(`Error extracting metadata from ${filePath}:`, error.message);
      
      // Return basic metadata if extraction fails
      const stats = await fs.stat(filePath);
      return {
        title: path.parse(filePath).name,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        genre: 'Unknown',
        year: null,
        duration: 0,
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        format: path.extname(filePath).substring(1),
        fileSize: stats.size,
        createdDate: stats.birthtime,
        modifiedDate: stats.mtime,
        codec: 'Unknown',
        lossless: false
      };
    }
  }

  /**
   * Convert audio file to WAV if needed
   */
  async convertToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(2)
        .on('end', () => {
          console.log(`✅ Converted ${path.basename(inputPath)} to WAV`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`❌ Error converting ${path.basename(inputPath)}:`, error.message);
          reject(error);
        })
        .save(outputPath);
    });
  }

  /**
   * Generate waveform data
   */
  async generateWaveform(audioPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .complexFilter([
          '[0:a]showwavespic=s=800x200:colors=0xff6b35[waveform]'
        ])
        .outputOptions(['-map', '[waveform]'])
        .output(outputPath)
        .on('end', () => {
          console.log(`✅ Generated waveform for ${path.basename(audioPath)}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`❌ Error generating waveform:`, error.message);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Create preview clip (first 30 seconds)
   */
  async createPreview(audioPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .duration(30)
        .audioBitrate(128)
        .format('mp3')
        .on('end', () => {
          console.log(`✅ Created preview for ${path.basename(audioPath)}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`❌ Error creating preview:`, error.message);
          reject(error);
        })
        .save(outputPath);
    });
  }

  /**
   * Process a single audio file
   */
  async processAudioFile(fileInfo, options = {}) {
    const { 
      convertToWav = true, 
      generateWaveform = true, 
      createPreview = true,
      extractMetadata = true 
    } = options;

    const fileId = uuidv4();
    const baseName = path.parse(fileInfo.name).name;
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    
    const result = {
      id: fileId,
      originalFile: fileInfo,
      processedFiles: {},
      metadata: null,
      errors: []
    };

    try {
      // Copy original file to local extraction folder
      console.log(`📁 Copying original file ${fileInfo.name} to local folder...`);
      const originalLocalPath = path.join(this.originalsPath, `${sanitizedName}_${fileId}${fileInfo.extension}`);
      await fs.copyFile(fileInfo.path, originalLocalPath);
      result.processedFiles.originalLocal = originalLocalPath;

      // Extract metadata
      if (extractMetadata) {
        console.log(`📊 Extracting metadata from ${fileInfo.name}...`);
        result.metadata = await this.extractMetadata(fileInfo.path);
        
        // Save metadata to JSON file (both locations)
        const metadataPath = path.join(this.metadataDestination, `${sanitizedName}_${fileId}.json`);
        const localMetadataPath = path.join(this.localMetadataPath, `${sanitizedName}_${fileId}.json`);
        
        const metadataContent = JSON.stringify(result.metadata, null, 2);
        await fs.writeFile(metadataPath, metadataContent);
        await fs.writeFile(localMetadataPath, metadataContent);
        
        result.processedFiles.metadata = metadataPath;
        result.processedFiles.localMetadata = localMetadataPath;
      }

      // Convert to WAV if needed or copy if already WAV
      if (convertToWav) {
        const wavPath = path.join(this.audioDestination, `${sanitizedName}_${fileId}.wav`);
        const localWavPath = path.join(this.processedPath, `${sanitizedName}_${fileId}.wav`);
        
        if (fileInfo.extension.toLowerCase() === '.wav') {
          console.log(`📁 Copying WAV file ${fileInfo.name}...`);
          await fs.copyFile(fileInfo.path, wavPath);
          await fs.copyFile(fileInfo.path, localWavPath);
        } else {
          console.log(`🔄 Converting ${fileInfo.name} to WAV...`);
          await this.convertToWav(fileInfo.path, wavPath);
          await this.convertToWav(fileInfo.path, localWavPath);
        }
        
        result.processedFiles.wav = wavPath;
        result.processedFiles.localWav = localWavPath;
      }

      // Generate waveform image
      if (generateWaveform && result.processedFiles.wav) {
        const waveformPath = path.join(this.projectRoot, 'Assets', 'Audio', 'Waveforms', `${sanitizedName}_${fileId}.png`);
        const localWaveformPath = path.join(this.waveformsPath, `${sanitizedName}_${fileId}.png`);
        
        try {
          await this.generateWaveform(result.processedFiles.wav, waveformPath);
          await this.generateWaveform(result.processedFiles.localWav || result.processedFiles.wav, localWaveformPath);
          result.processedFiles.waveform = waveformPath;
          result.processedFiles.localWaveform = localWaveformPath;
        } catch (error) {
          result.errors.push(`Waveform generation failed: ${error.message}`);
        }
      }

      // Create preview clip
      if (createPreview && result.processedFiles.wav) {
        const previewPath = path.join(this.projectRoot, 'Assets', 'Audio', 'Previews', `${sanitizedName}_${fileId}_preview.mp3`);
        try {
          await this.createPreview(result.processedFiles.wav, previewPath);
          result.processedFiles.preview = previewPath;
        } catch (error) {
          result.errors.push(`Preview creation failed: ${error.message}`);
        }
      }

      console.log(`✅ Successfully processed ${fileInfo.name}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${fileInfo.name}:`, error.message);
      result.errors.push(`Processing failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Extract all audio files from a drive
   */
  async extractFromDrive(drivePath, options = {}) {
    const {
      batchSize = 5,
      progress = null,
      filter = null
    } = options;

    console.log(`\n🔍 Scanning drive ${drivePath} for audio files...`);
    
    // Find all audio files
    const audioFiles = await this.findAudioFiles(drivePath);
    
    if (audioFiles.length === 0) {
      console.log('❌ No audio files found on the drive.');
      return { success: false, message: 'No audio files found', results: [] };
    }

    console.log(`📁 Found ${audioFiles.length} audio files`);

    // Apply filter if provided
    const filesToProcess = filter ? audioFiles.filter(filter) : audioFiles;
    
    if (filesToProcess.length === 0) {
      console.log('❌ No audio files match the filter criteria.');
      return { success: false, message: 'No files match filter', results: [] };
    }

    console.log(`🎵 Processing ${filesToProcess.length} audio files...\n`);

    // Process files in batches
    const results = [];
    const totalFiles = filesToProcess.length;
    
    for (let i = 0; i < totalFiles; i += batchSize) {
      const batch = filesToProcess.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalFiles / batchSize);
      
      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)...`);
      
      // Process batch in parallel
      const batchPromises = batch.map(file => this.processAudioFile(file, options));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            id: uuidv4(),
            originalFile: null,
            processedFiles: {},
            metadata: null,
            errors: [`Batch processing failed: ${result.reason.message}`]
          });
        }
      }

      // Report progress
      const processed = Math.min(i + batchSize, totalFiles);
      const percentage = Math.round((processed / totalFiles) * 100);
      console.log(`📊 Progress: ${processed}/${totalFiles} files (${percentage}%)`);
      
      if (progress) {
        progress(processed, totalFiles, percentage);
      }
    }

    // Generate summary
    const successful = results.filter(r => r.errors.length === 0);
    const failed = results.filter(r => r.errors.length > 0);

    console.log(`\n🎉 Extraction complete!`);
    console.log(`✅ Successfully processed: ${successful.length} files`);
    console.log(`❌ Failed to process: ${failed.length} files`);

    // Save extraction summary
    const summary = {
      timestamp: new Date().toISOString(),
      source: drivePath,
      totalFound: audioFiles.length,
      totalProcessed: filesToProcess.length,
      successful: successful.length,
      failed: failed.length,
      results: results
    };

    const summaryPath = path.join(this.metadataDestination, `extraction_summary_${Date.now()}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📋 Summary saved to: ${summaryPath}`);

    return {
      success: true,
      message: `Processed ${successful.length}/${totalFiles} files successfully`,
      summary,
      results
    };
  }

  /**
   * Generate track entries for the database
   */
  generateTrackEntries(extractionResults, artistId = null) {
    const tracks = [];
    
    for (const result of extractionResults.results) {
      if (result.errors.length === 0 && result.metadata) {
        const track = {
          title: result.metadata.title,
          artist: {
            user: artistId,
            name: result.metadata.artist
          },
          album: result.metadata.album,
          genre: result.metadata.genre.split(', ').filter(g => g !== 'Unknown'),
          audioFile: {
            filename: path.basename(result.processedFiles.wav || ''),
            originalName: result.originalFile.name,
            size: result.metadata.fileSize,
            duration: result.metadata.duration,
            format: 'audio/wav',
            path: result.processedFiles.wav,
            sampleRate: result.metadata.sampleRate,
            bitrate: result.metadata.bitrate,
            channels: result.metadata.channels
          },
          metadata: {
            extractedFrom: 'flash_drive',
            originalPath: result.originalFile.path,
            extractionId: result.id,
            codec: result.metadata.codec,
            lossless: result.metadata.lossless
          },
          waveformData: result.processedFiles.waveform,
          previewFile: result.processedFiles.preview,
          status: 'draft',
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        tracks.push(track);
      }
    }
    
    return tracks;
  }
}

module.exports = FlashDriveAudioExtractor;