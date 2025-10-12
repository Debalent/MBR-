const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Track title is required'],
    trim: true,
    maxLength: [100, 'Title cannot exceed 100 characters']
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artist is required']
  },
  featuredArtists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  album: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album',
    default: null
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    enum: [
      'Hip Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Blues',
      'Country', 'Folk', 'Classical', 'Reggae', 'Funk', 'Soul',
      'Ambient', 'Techno', 'House', 'Dubstep', 'Indie', 'Alternative',
      'Punk', 'Metal', 'Gospel', 'World', 'Other'
    ]
  },
  subGenres: [{
    type: String,
    maxLength: [50, 'Sub-genre cannot exceed 50 characters']
  }],
  description: {
    type: String,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  lyrics: {
    type: String,
    maxLength: [10000, 'Lyrics cannot exceed 10000 characters']
  },
  duration: {
    type: Number, // Duration in seconds
    required: [true, 'Track duration is required'],
    min: [1, 'Duration must be at least 1 second']
  },
  bpm: {
    type: Number,
    min: [50, 'BPM must be at least 50'],
    max: [200, 'BPM cannot exceed 200']
  },
  key: {
    type: String,
    enum: [
      'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb',
      'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
      'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'
    ]
  },
  mood: {
    type: String,
    enum: [
      'Happy', 'Sad', 'Energetic', 'Calm', 'Angry', 'Romantic',
      'Melancholic', 'Uplifting', 'Dark', 'Peaceful', 'Aggressive',
      'Nostalgic', 'Dreamy', 'Mysterious', 'Playful'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    maxLength: [30, 'Tag cannot exceed 30 characters']
  }],
  audioFile: {
    url: {
      type: String,
      required: [true, 'Audio file URL is required']
    },
    filename: {
      type: String,
      required: [true, 'Audio filename is required']
    },
    size: {
      type: Number,
      required: [true, 'Audio file size is required']
    },
    format: {
      type: String,
      required: [true, 'Audio format is required'],
      enum: ['mp3', 'wav', 'flac', 'm4a', 'aac']
    },
    quality: {
      type: String,
      enum: ['128kbps', '192kbps', '256kbps', '320kbps', 'lossless'],
      default: '320kbps'
    },
    cloudinaryId: String
  },
  artwork: {
    url: {
      type: String,
      default: null
    },
    filename: String,
    cloudinaryId: String
  },
  waveform: {
    url: String,
    peaks: [Number] // Array of waveform peak values
  },
  stats: {
    plays: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    playlists: {
      type: Number,
      default: 0
    }
  },
  pricing: {
    isFree: {
      type: Boolean,
      default: true
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    },
    licensing: {
      type: String,
      enum: ['standard', 'premium', 'exclusive', 'royalty-free'],
      default: 'standard'
    }
  },
  availability: {
    isPublic: {
      type: Boolean,
      default: true
    },
    releaseDate: {
      type: Date,
      default: Date.now
    },
    expirationDate: {
      type: Date,
      default: null
    },
    territories: [{
      type: String,
      default: ['worldwide']
    }],
    platforms: [{
      type: String,
      enum: ['mbr', 'spotify', 'apple', 'youtube', 'soundcloud', 'bandcamp'],
      default: ['mbr']
    }]
  },
  collaboration: {
    isOpen: {
      type: Boolean,
      default: false
    },
    collaborators: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['producer', 'vocalist', 'instrumentalist', 'songwriter', 'mixer', 'other']
      },
      contribution: String
    }],
    requestedRoles: [{
      type: String,
      enum: ['producer', 'vocalist', 'instrumentalist', 'songwriter', 'mixer', 'other']
    }]
  },
  metadata: {
    recordingDate: Date,
    recordingLocation: String,
    producer: String,
    engineer: String,
    mixer: String,
    masteredBy: String,
    label: String,
    catalogNumber: String,
    isrc: String,
    copyright: String,
    publishingRights: String
  },
  socialProof: {
    verified: {
      type: Boolean,
      default: false
    },
    featured: {
      type: Boolean,
      default: false
    },
    trending: {
      type: Boolean,
      default: false
    },
    editorsPick: {
      type: Boolean,
      default: false
    }
  },
  analytics: {
    uniqueListeners: {
      type: Number,
      default: 0
    },
    averageListenDuration: {
      type: Number,
      default: 0
    },
    skipRate: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    peakListeners: {
      count: {
        type: Number,
        default: 0
      },
      date: Date
    },
    demographics: {
      ageGroups: {
        '18-24': { type: Number, default: 0 },
        '25-34': { type: Number, default: 0 },
        '35-44': { type: Number, default: 0 },
        '45-54': { type: Number, default: 0 },
        '55+': { type: Number, default: 0 }
      },
      countries: [{
        country: String,
        count: Number
      }],
      cities: [{
        city: String,
        count: Number
      }]
    }
  },
  flags: {
    isExplicit: {
      type: Boolean,
      default: false
    },
    hasContentWarning: {
      type: Boolean,
      default: false
    },
    isInstrumental: {
      type: Boolean,
      default: false
    },
    isRemix: {
      type: Boolean,
      default: false
    },
    isLive: {
      type: Boolean,
      default: false
    },
    isDemo: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
trackSchema.index({ artist: 1 });
trackSchema.index({ genre: 1 });
trackSchema.index({ 'stats.plays': -1 });
trackSchema.index({ 'stats.likes': -1 });
trackSchema.index({ createdAt: -1 });
trackSchema.index({ 'availability.releaseDate': -1 });
trackSchema.index({ title: 'text', description: 'text', tags: 'text' });
trackSchema.index({ 'socialProof.featured': 1 });
trackSchema.index({ 'socialProof.trending': 1 });

// Virtual for formatted duration
trackSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = Math.floor(this.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for play count in K/M format
trackSchema.virtual('formattedPlays').get(function() {
  const plays = this.stats.plays;
  if (plays >= 1000000) {
    return `${(plays / 1000000).toFixed(1)}M`;
  } else if (plays >= 1000) {
    return `${(plays / 1000).toFixed(1)}K`;
  }
  return plays.toString();
});

// Virtual for artist name
trackSchema.virtual('artistName', {
  ref: 'User',
  localField: 'artist',
  foreignField: '_id',
  justOne: true,
  options: { select: 'name' }
});

// Method to increment play count
trackSchema.methods.incrementPlays = function(userId = null) {
  this.stats.plays += 1;
  this.analytics.uniqueListeners += 1; // Simplified - in real app, check if user is unique
  return this.save({ validateBeforeSave: false });
};

// Method to increment likes
trackSchema.methods.incrementLikes = function() {
  this.stats.likes += 1;
  return this.save({ validateBeforeSave: false });
};

// Method to decrement likes
trackSchema.methods.decrementLikes = function() {
  this.stats.likes = Math.max(0, this.stats.likes - 1);
  return this.save({ validateBeforeSave: false });
};

// Method to check if track is available
trackSchema.methods.isAvailable = function() {
  const now = new Date();
  return this.availability.isPublic &&
         this.availability.releaseDate <= now &&
         (!this.availability.expirationDate || this.availability.expirationDate > now);
};

// Static method to get trending tracks
trackSchema.statics.getTrending = function(limit = 10) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return this.find({
    'availability.isPublic': true,
    'availability.releaseDate': { $lte: new Date() },
    createdAt: { $gte: thirtyDaysAgo }
  })
  .sort({ 'stats.plays': -1, 'stats.likes': -1 })
  .limit(limit)
  .populate('artist', 'name avatar')
  .populate('featuredArtists', 'name avatar');
};

// Static method to get featured tracks
trackSchema.statics.getFeatured = function(limit = 10) {
  return this.find({
    'availability.isPublic': true,
    'availability.releaseDate': { $lte: new Date() },
    'socialProof.featured': true
  })
  .sort({ 'stats.plays': -1 })
  .limit(limit)
  .populate('artist', 'name avatar')
  .populate('featuredArtists', 'name avatar');
};

// Static method to get new releases
trackSchema.statics.getNewReleases = function(limit = 10) {
  return this.find({
    'availability.isPublic': true,
    'availability.releaseDate': { $lte: new Date() }
  })
  .sort({ 'availability.releaseDate': -1 })
  .limit(limit)
  .populate('artist', 'name avatar')
  .populate('featuredArtists', 'name avatar');
};

// Static method to search tracks
trackSchema.statics.searchTracks = function(query, options = {}) {
  const {
    genre,
    mood,
    bpm,
    duration,
    sort = '-stats.plays',
    limit = 20,
    skip = 0
  } = options;

  const searchQuery = {
    'availability.isPublic': true,
    'availability.releaseDate': { $lte: new Date() }
  };

  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }

  // Genre filter
  if (genre) {
    searchQuery.genre = genre;
  }

  // Mood filter
  if (mood) {
    searchQuery.mood = mood;
  }

  // BPM range filter
  if (bpm) {
    searchQuery.bpm = {
      $gte: bpm.min || 0,
      $lte: bpm.max || 200
    };
  }

  // Duration range filter
  if (duration) {
    searchQuery.duration = {
      $gte: duration.min || 0,
      $lte: duration.max || 3600
    };
  }

  return this.find(searchQuery)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('artist', 'name avatar')
    .populate('featuredArtists', 'name avatar');
};

// Pre-save middleware to update analytics
trackSchema.pre('save', function(next) {
  if (this.isModified('stats.plays') && this.stats.plays > 0) {
    // Update completion rate (simplified calculation)
    this.analytics.completionRate = Math.min(100, (this.stats.plays / this.analytics.uniqueListeners) * 100);
  }
  next();
});

module.exports = mongoose.model('Track', trackSchema);