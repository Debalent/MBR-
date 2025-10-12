const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password by default
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'artist', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  profile: {
    bio: {
      type: String,
      maxLength: [500, 'Bio cannot exceed 500 characters']
    },
    location: {
      type: String,
      maxLength: [100, 'Location cannot exceed 100 characters']
    },
    website: {
      type: String,
      maxLength: [200, 'Website URL cannot exceed 200 characters']
    },
    socialLinks: {
      instagram: String,
      twitter: String,
      facebook: String,
      youtube: String,
      spotify: String,
      soundcloud: String
    },
    genres: [{
      type: String,
      enum: [
        'Hip Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Blues',
        'Country', 'Folk', 'Classical', 'Reggae', 'Funk', 'Soul',
        'Ambient', 'Techno', 'House', 'Dubstep', 'Indie', 'Alternative',
        'Punk', 'Metal', 'Gospel', 'World', 'Other'
      ]
    }],
    instruments: [String],
    collaborationInterests: {
      type: Boolean,
      default: false
    }
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    },
    playlistPrivacy: {
      type: String,
      enum: ['public', 'private', 'friends'],
      default: 'public'
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    }
  },
  stats: {
    totalListens: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalFollowers: {
      type: Number,
      default: 0
    },
    totalFollowing: {
      type: Number,
      default: 0
    },
    totalPlaylists: {
      type: Number,
      default: 0
    },
    totalTracks: {
      type: Number,
      default: 0
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'artist', 'label'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    stripeCustomerId: {
      type: String,
      default: null
    },
    stripeSubscriptionId: {
      type: String,
      default: null
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'profile.genres': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActive: -1 });

// Virtual for user's full profile
userSchema.virtual('fullProfile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    role: this.role,
    profile: this.profile,
    stats: this.stats,
    subscription: this.subscription,
    preferences: this.preferences,
    createdAt: this.createdAt,
    lastActive: this.lastActive
  };
});

// Virtual for public profile (excluding sensitive data)
userSchema.virtual('publicProfile').get(function() {
  return {
    id: this._id,
    name: this.name,
    avatar: this.avatar,
    role: this.role,
    profile: {
      bio: this.profile.bio,
      location: this.profile.location,
      website: this.profile.website,
      socialLinks: this.profile.socialLinks,
      genres: this.profile.genres,
      instruments: this.profile.instruments,
      collaborationInterests: this.profile.collaborationInterests
    },
    stats: this.stats,
    createdAt: this.createdAt
  };
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update lastActive on login
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save({ validateBeforeSave: false });
};

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  return verificationToken;
};

// Check if user is premium
userSchema.methods.isPremium = function() {
  return ['premium', 'artist', 'label'].includes(this.subscription.plan) &&
         this.subscription.endDate &&
         this.subscription.endDate > new Date();
};

// Increment user stats
userSchema.methods.incrementStat = function(statName, value = 1) {
  if (this.stats[statName] !== undefined) {
    this.stats[statName] += value;
    return this.save({ validateBeforeSave: false });
  }
  throw new Error(`Invalid stat name: ${statName}`);
};

// Static method to find users by genre
userSchema.statics.findByGenre = function(genre) {
  return this.find({
    'profile.genres': genre,
    isActive: true,
    'preferences.profileVisibility': 'public'
  });
};

// Static method to get user stats
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [
              { $gte: ['$lastActive', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        premiumUsers: {
          $sum: {
            $cond: [
              { $in: ['$subscription.plan', ['premium', 'artist', 'label']] },
              1,
              0
            ]
          }
        },
        artistUsers: {
          $sum: {
            $cond: [{ $eq: ['$role', 'artist'] }, 1, 0]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    artistUsers: 0
  };
};

module.exports = mongoose.model('User', userSchema);