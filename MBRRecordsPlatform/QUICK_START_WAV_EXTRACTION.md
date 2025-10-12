# 🎵 WAV File Extraction - Quick Start Guide

## ✅ System Ready!

Your MBR Records platform now has a complete WAV file extraction system that can automatically find and copy WAV files from flash drives to your local project folder.

## 🚀 How to Extract WAV Files (3 Easy Methods)

### Method 1: One-Click Batch File (Easiest) 
1. **Connect your flash drive** with WAV files
2. **Double-click** `ServerApp/extract-wav-files.bat`
3. **Follow the prompts** - it will automatically find and extract all WAV files

### Method 2: Command Line (Recommended for Power Users)
1. **Open Command Prompt** in the ServerApp folder
2. **Run the extraction script**:
   ```
   node extractWavFiles.js
   ```
3. **Watch the progress** as it scans drives and extracts files

### Method 3: Web Interface (Most Features)
1. **Start the server**: `npm start` in the project root
2. **Open browser**: `http://localhost:3000`
3. **Login as admin** (use the demo login button)
4. **Go to Flash Drive Manager** from the sidebar
5. **Use the advanced web interface** for detailed control

## 📁 Where Your Files Will Be Saved

All extracted WAV files go into the `extracted-audio` folder:

```
MBRRecordsPlatform/
└── extracted-audio/
    ├── originals/     ← Original WAV files copied from flash drive
    ├── processed/     ← Processed/optimized WAV files  
    ├── metadata/      ← JSON files with track information
    └── waveforms/     ← Visual waveform images
```

## 🔍 What Gets Extracted

For every WAV file found, the system automatically:

✅ **Copies the original file** (unchanged)  
✅ **Creates an optimized version** (for platform use)  
✅ **Extracts metadata** (artist, title, duration, etc.)  
✅ **Generates a waveform image** (for visual display)  

## 📊 Example Output

When you run the extraction, you'll see:

```
🎵 MBR Records - Flash Drive WAV Extraction Tool
==================================================
📁 Project root: C:\Users\Admin\OneDrive\Documents\MBR-\MBRRecordsPlatform
📁 Local extraction path: C:\Users\Admin\OneDrive\Documents\MBR-\MBRRecordsPlatform\extracted-audio

🔍 Scanning for available drives...
✅ Found 1 drive(s):
  1. E: - USB Drive (7.2 GB)

🔍 Scanning drive E: for audio files...
  Found 5 WAV file(s) to extract:
    1. Song1.wav (4.2 MB)
    2. Demo_Track.wav (3.8 MB)
    3. New_Beat.wav (5.1 MB)

🚀 Starting extraction from drive E:...
📊 Progress: 3/3 files (100%)

✅ Drive E: extraction complete:
  • Successfully processed: 3 files
  • Failed: 0 files

📁 Files saved to:
  • Originals: C:\Users\Admin\OneDrive\Documents\MBR-\MBRRecordsPlatform\extracted-audio\originals
  • Processed WAV: C:\Users\Admin\OneDrive\Documents\MBR-\MBRRecordsPlatform\extracted-audio\processed
  • Metadata: C:\Users\Admin\OneDrive\Documents\MBR-\MBRRecordsPlatform\extracted-audio\metadata
  • Waveforms: C:\Users\Admin\OneDrive\Documents\MBR-\MBRRecordsPlatform\extracted-audio\waveforms

🎉 Extraction Complete!
📊 Total Summary:
  • Files extracted: 3
  • Total size: 13.1 MB
```

## 🛠 Test Your Setup

Before extracting files, test that everything is working:

```
cd ServerApp
node testExtraction.js
```

This will verify:
- ✅ All folders are created correctly
- ✅ Dependencies are installed
- ✅ Flash drives can be detected
- ✅ System is ready to extract

## 🔧 Troubleshooting

**Flash drive not detected?**
- Make sure it's properly connected
- Check it shows up in Windows Explorer
- Try unplugging and reconnecting

**Permission errors?**
- Run Command Prompt as Administrator
- Check the flash drive isn't write-protected

**No WAV files found?**
- Verify WAV files exist on the drive
- Check file extensions are exactly `.wav`

## 💡 Pro Tips

1. **Organize your flash drive** with clear folder names before extraction
2. **Use descriptive filenames** - they'll be preserved in the extracted copies
3. **Check the metadata files** to see what information was extracted
4. **Keep originals safe** - the system copies files, doesn't move them

## 🎯 Next Steps

After extracting WAV files:

1. **Review extracted files** in the `extracted-audio` folder
2. **Check metadata** files for track information  
3. **Use the web interface** to import files into the platform database
4. **Organize and tag** your music collection

---

**Ready to extract WAV files from your flash drive?**  
Just connect your drive and run one of the extraction methods above! 🎵