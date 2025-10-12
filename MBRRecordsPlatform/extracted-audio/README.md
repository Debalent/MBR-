# WAV File Extraction System

This system automatically extracts WAV audio files from flash drives and organizes them in your local MBR Records project folder.

## 📁 Folder Structure

After extraction, your files will be organized in the `extracted-audio` folder:

```
extracted-audio/
├── originals/          # Original WAV files from flash drive
├── processed/          # Processed/converted WAV files
├── metadata/           # JSON metadata files for each track
└── waveforms/          # Generated waveform images
```

## 🚀 How to Extract WAV Files

### Method 1: Command Line Script (Recommended)

1. **Connect your flash drive** to your computer
2. **Navigate to the ServerApp folder**:
   ```bash
   cd C:\Users\Admin\OneDrive\Documents\MBR-\MBRRecordsPlatform\ServerApp
   ```
3. **Run the extraction script**:
   ```bash
   node extractWavFiles.js
   ```

### Method 2: Windows Batch File (Easy)

1. **Connect your flash drive** to your computer
2. **Double-click** `extract-wav-files.bat` in the ServerApp folder
3. **Follow the prompts** in the command window

### Method 3: Web Interface (Advanced)

1. **Start the server**:
   ```bash
   npm start
   ```
2. **Open your browser** to `http://localhost:3000`
3. **Login as admin** using the demo login
4. **Navigate to Flash Drive Manager** from the sidebar
5. **Use the web interface** for advanced extraction options

## 📊 What Gets Extracted

For each WAV file found, the system will:

- ✅ **Copy original file** to `extracted-audio/originals/`
- ✅ **Process and optimize** WAV file to `extracted-audio/processed/`
- ✅ **Extract metadata** (artist, title, duration, etc.) to `extracted-audio/metadata/`
- ✅ **Generate waveform** visualization to `extracted-audio/waveforms/`

## 🔍 File Naming Convention

Files are renamed using this pattern:
```
{sanitized_original_name}_{unique_id}.{extension}
```

Example:
- Original: `My Song (Demo).wav`
- Extracted: `My_Song_Demo_a1b2c3d4-e5f6-7890-abcd-ef1234567890.wav`

## 📋 Supported Features

### Audio Formats
- **Primary**: WAV files (main focus)
- **Secondary**: MP3, FLAC, M4A, AAC, OGG (converted to WAV)

### Metadata Extraction
- Track title and artist
- Album information
- Duration and bitrate
- Sample rate and channels
- File size and format details

### Processing Options
- Audio format conversion
- Waveform generation
- Metadata preservation
- Batch processing
- Progress tracking

## 🛠 Troubleshooting

### Flash Drive Not Detected
- Ensure the drive is properly connected
- Check that the drive appears in Windows Explorer
- Try unplugging and reconnecting the drive
- Restart the extraction script

### Permission Errors
- Run Command Prompt as Administrator
- Check that the flash drive is not write-protected
- Ensure you have write permissions to the project folder

### No WAV Files Found
- Verify WAV files exist on the flash drive
- Check file extensions (must be .wav)
- Try accessing files manually first

### Processing Errors
- Check console output for specific error messages
- Ensure sufficient disk space for extraction
- Verify audio files are not corrupted

## 📁 Output Locations

All extracted files are saved to:
```
C:\Users\Admin\OneDrive\Documents\MBR-\MBRRecordsPlatform\extracted-audio\
```

### Folder Descriptions

**originals/**: Exact copies of original WAV files from flash drive
**processed/**: Optimized WAV files ready for platform use  
**metadata/**: JSON files containing track information
**waveforms/**: PNG images of audio waveforms

## 🔧 Advanced Configuration

You can modify extraction behavior by editing the options in `extractWavFiles.js`:

```javascript
const extractionOptions = {
  convertToWav: true,        // Convert non-WAV files to WAV
  generateWaveform: true,    // Create waveform visualizations
  createPreview: false,      // Generate preview clips
  extractMetadata: true,     // Extract audio metadata
  batchSize: 3              // Number of files to process simultaneously
};
```

## 📞 Support

If you encounter issues:

1. **Check the console output** for error messages
2. **Verify file permissions** and disk space
3. **Try extracting individual files** to isolate problems
4. **Review the log files** in the temp directory

## 🔄 Integration with MBR Platform

Extracted files are automatically organized for integration with the MBR Records platform:

- Files are structured for easy import into the music database
- Metadata is formatted for platform compatibility
- Waveforms are ready for web display
- All files maintain proper naming conventions

The extracted files can be imported into the platform database using the web interface or API endpoints.