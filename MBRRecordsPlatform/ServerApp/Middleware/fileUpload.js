const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

// Ensure upload directories exist
const ensureDirectoryExists = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// File type validators
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const audioFileFilter = (req, file, cb) => {
  const allowedTypes = /mp3|wav|flac|m4a|aac|ogg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (mp3, wav, flac, m4a, aac, ogg)'));
  }
};

// Storage configuration for different file types
const createStorage = (destination, filenameGenerator = null) => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../../uploads', destination);
      await ensureDirectoryExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      if (filenameGenerator) {
        cb(null, filenameGenerator(req, file));
      } else {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
      }
    }
  });
};

// Profile image upload configuration
const profileImageStorage = createStorage('profiles', (req, file) => {
  const extension = path.extname(file.originalname);
  return `profile-${req.user._id}-${Date.now()}${extension}`;
});

const profileImageUpload = multer({
  storage: profileImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: imageFileFilter
});

// Track artwork upload configuration
const artworkStorage = createStorage('artwork', (req, file) => {
  const extension = path.extname(file.originalname);
  return `artwork-${uuidv4()}${extension}`;
});

const artworkUpload = multer({
  storage: artworkStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: imageFileFilter
});

// Audio track upload configuration
const trackStorage = createStorage('tracks', (req, file) => {
  const extension = path.extname(file.originalname);
  return `track-${uuidv4()}${extension}`;
});

const trackUpload = multer({
  storage: trackStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  },
  fileFilter: audioFileFilter
});

// Demo submission upload configuration
const demoStorage = createStorage('demos', (req, file) => {
  const extension = path.extname(file.originalname);
  return `demo-${uuidv4()}${extension}`;
});

const demoUpload = multer({
  storage: demoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Allow both audio and image files for demos
    const audioTypes = /mp3|wav|flac|m4a|aac|ogg/;
    const imageTypes = /jpeg|jpg|png|gif|webp/;
    const extension = path.extname(file.originalname).toLowerCase();
    
    const isAudio = audioTypes.test(extension) || file.mimetype.startsWith('audio/');
    const isImage = imageTypes.test(extension) || file.mimetype.startsWith('image/');
    
    if (isAudio || isImage) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and image files are allowed for demo submissions'));
    }
  }
});

// Generic file upload configuration
const genericStorage = createStorage('files');

const genericUpload = multer({
  storage: genericStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 10
  }
});

// Image processing middleware
const processImage = async (req, res, next) => {
  if (!req.file || !req.file.mimetype.startsWith('image/')) {
    return next();
  }

  try {
    const inputPath = req.file.path;
    const outputPath = inputPath.replace(/\.[^/.]+$/, '_processed.webp');
    
    // Process image with sharp
    await sharp(inputPath)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Update file info
    req.file.processedPath = outputPath;
    req.file.processedMimetype = 'image/webp';
    
    next();
  } catch (error) {
    console.error('Image processing error:', error);
    next(error);
  }
};

// Audio processing middleware
const processAudio = async (req, res, next) => {
  if (!req.file || !req.file.mimetype.startsWith('audio/')) {
    return next();
  }

  try {
    const inputPath = req.file.path;
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    
    // Generate waveform and preview
    const waveformPath = path.join(outputDir, `${baseName}_waveform.json`);
    const previewPath = path.join(outputDir, `${baseName}_preview.mp3`);

    // Create 30-second preview
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .duration(30)
        .audioBitrate(128)
        .format('mp3')
        .on('end', resolve)
        .on('error', reject)
        .save(previewPath);
    });

    // Get audio metadata
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    // Update file info
    req.file.previewPath = previewPath;
    req.file.waveformPath = waveformPath;
    req.file.metadata = metadata;
    req.file.duration = metadata.format.duration;
    
    next();
  } catch (error) {
    console.error('Audio processing error:', error);
    next(error);
  }
};

// File cleanup middleware
const cleanupFiles = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Clean up temporary files on response
    if (req.files) {
      req.files.forEach(file => {
        if (file.path && res.statusCode >= 400) {
          fs.unlink(file.path).catch(console.error);
        }
      });
    } else if (req.file && res.statusCode >= 400) {
      fs.unlink(req.file.path).catch(console.error);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Upload middleware with file type detection
const uploadMiddleware = (uploadType = 'generic') => {
  const uploaders = {
    profile: profileImageUpload.single('profileImage'),
    artwork: artworkUpload.single('artwork'),
    track: trackUpload.single('track'),
    demo: demoUpload.array('files', 5),
    generic: genericUpload.array('files', 10)
  };

  return [
    uploaders[uploadType] || uploaders.generic,
    cleanupFiles,
    (req, res, next) => {
      // Add upload type to request
      req.uploadType = uploadType;
      next();
    }
  ];
};

// File validation middleware
const validateFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const files = req.files || [req.file];
  
  for (const file of files) {
    // Check file size
    if (file.size === 0) {
      return res.status(400).json({
        success: false,
        message: 'Empty file uploaded'
      });
    }

    // Check for potentially malicious files
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const extension = path.extname(file.originalname).toLowerCase();
    
    if (suspiciousExtensions.includes(extension)) {
      return res.status(400).json({
        success: false,
        message: 'File type not allowed for security reasons'
      });
    }
  }

  next();
};

// Generate file URL helper
const generateFileUrl = (req, filePath) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const relativePath = path.relative(path.join(__dirname, '../../'), filePath);
  return `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
};

module.exports = {
  uploadMiddleware,
  processImage,
  processAudio,
  validateFile,
  cleanupFiles,
  generateFileUrl,
  // Individual upload configurations
  profileImageUpload,
  artworkUpload,
  trackUpload,
  demoUpload,
  genericUpload
};