const mongoose = require('mongoose');

const DemoSubmissionSchema = new mongoose.Schema({
  // Submitter information
  submitter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Basic submission details
  artistName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  trackTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  genre: [{
    type: String,
    required: true,
    enum: [
      'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Blues',
      'Reggae', 'Country', 'Folk', 'Alternative', 'Indie', 'Classical',
      'Afrobeats', 'Latin', 'World', 'Gospel', 'Funk', 'Soul', 'Other'
    ]
  }],

  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },

  submissionType: {
    type: String,
    enum: ['label_signing', 'distribution', 'promotion', 'collaboration', 'feedback'],
    default: 'label_signing'
  },

  // File attachments
  files: {
    audio: [{
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      size: { type: Number, required: true },
      mimetype: { type: String, required: true },
      path: { type: String, required: true },
      duration: { type: Number }, // in seconds
      uploadedAt: { type: Date, default: Date.now }
    }],
    
    artwork: [{
      filename: { type: String },
      originalName: { type: String },
      size: { type: Number },
      mimetype: { type: String },
      path: { type: String },
      dimensions: {
        width: Number,
        height: Number
      },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },

  // Additional metadata
  metadata: {
    socialLinks: {
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      facebook: { type: String, trim: true },
      youtube: { type: String, trim: true },
      soundcloud: { type: String, trim: true },
      spotify: { type: String, trim: true },
      website: { type: String, trim: true }
    },

    contactInfo: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      manager: { type: String, trim: true },
      label: { type: String, trim: true }
    },

    streamingStats: {
      spotifyMonthlyListeners: { type: Number, min: 0 },
      youtubeTotalViews: { type: Number, min: 0 },
      soundcloudFollowers: { type: Number, min: 0 },
      instagramFollowers: { type: Number, min: 0 }
    },

    hasLabel: {
      type: Boolean,
      default: false
    },

    previousReleases: [{
      title: String,
      year: Number,
      platform: String,
      streams: Number
    }],

    pressFeatures: [{
      publication: String,
      title: String,
      url: String,
      date: Date
    }],

    livePerformances: [{
      venue: String,
      city: String,
      date: Date,
      audience: Number
    }]
  },

  // Review process
  status: {
    type: String,
    enum: [
      'pending',           // Just submitted
      'under_review',      // Being reviewed by A&R team
      'feedback_requested', // Need more info from artist
      'accepted',          // Approved for signing/distribution
      'rejected',          // Not accepted
      'on_hold',          // Pending further consideration
      'archived'          // Archived submission
    ],
    default: 'pending',
    index: true
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Review details
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  reviewNotes: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    note: {
      type: String,
      required: true,
      maxlength: 2000
    },
    isInternal: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  feedback: {
    overall: {
      type: String,
      maxlength: 2000
    },
    production: {
      score: { type: Number, min: 1, max: 10 },
      comments: { type: String, maxlength: 1000 }
    },
    songwriting: {
      score: { type: Number, min: 1, max: 10 },
      comments: { type: String, maxlength: 1000 }
    },
    vocals: {
      score: { type: Number, min: 1, max: 10 },
      comments: { type: String, maxlength: 1000 }
    },
    commercial: {
      score: { type: Number, min: 1, max: 10 },
      comments: { type: String, maxlength: 1000 }
    },
    originality: {
      score: { type: Number, min: 1, max: 10 },
      comments: { type: String, maxlength: 1000 }
    }
  },

  // Decision and next steps
  decision: {
    finalDecision: {
      type: String,
      enum: ['accept', 'reject', 'conditional', 'refer']
    },
    decisionDate: Date,
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reasonCode: {
      type: String,
      enum: [
        'high_quality',
        'commercial_potential',
        'unique_sound',
        'strong_vocals',
        'excellent_production',
        'market_fit',
        'low_quality',
        'poor_production',
        'not_commercial',
        'oversaturated_genre',
        'weak_vocals',
        'not_original',
        'technical_issues',
        'incomplete_submission'
      ]
    },
    nextSteps: String,
    contractOffered: {
      type: Boolean,
      default: false
    },
    advanceOffered: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    }
  },

  // Communication history
  communications: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'meeting', 'message'],
      required: true
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    subject: String,
    content: String,
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      filename: String,
      path: String,
      size: Number
    }]
  }],

  // Submission tracking
  submissionInfo: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    submissionDate: {
      type: Date,
      default: Date.now
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['website', 'email', 'social_media', 'referral', 'other'],
      default: 'website'
    }
  },

  // Analytics and tracking
  analytics: {
    viewCount: { type: Number, default: 0 },
    playCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    
    viewHistory: [{
      viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now },
      duration: Number, // seconds spent viewing
      ip: String
    }],

    playHistory: [{
      listener: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      trackIndex: Number, // which track was played
      timestamp: { type: Date, default: Date.now },
      duration: Number, // how long they listened
      completed: Boolean // did they listen to the end
    }]
  },

  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  internalTags: [{
    type: String,
    enum: [
      'priority', 'follow_up', 'potential', 'talented', 'needs_work',
      'commercial', 'artistic', 'niche', 'trending', 'viral_potential'
    ]
  }],

  // Workflow and reminders
  reminders: [{
    type: {
      type: String,
      enum: ['follow_up', 'review_deadline', 'callback', 'decision_due']
    },
    date: Date,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Audit trail
  auditLog: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
DemoSubmissionSchema.index({ submitter: 1, createdAt: -1 });
DemoSubmissionSchema.index({ status: 1, createdAt: -1 });
DemoSubmissionSchema.index({ reviewer: 1, status: 1 });
DemoSubmissionSchema.index({ 'submissionInfo.submissionDate': -1 });
DemoSubmissionSchema.index({ priority: 1, status: 1 });
DemoSubmissionSchema.index({ genre: 1, status: 1 });
DemoSubmissionSchema.index({ tags: 1 });

// Virtual for total file size
DemoSubmissionSchema.virtual('totalFileSize').get(function() {
  let total = 0;
  this.files.audio.forEach(file => total += file.size);
  this.files.artwork.forEach(file => total += file.size);
  return total;
});

// Virtual for submission age
DemoSubmissionSchema.virtual('submissionAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Virtual for review duration
DemoSubmissionSchema.virtual('reviewDuration').get(function() {
  if (this.decision && this.decision.decisionDate) {
    return Math.floor((this.decision.decisionDate - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for overall feedback score
DemoSubmissionSchema.virtual('overallScore').get(function() {
  if (!this.feedback) return null;
  
  const scores = [
    this.feedback.production?.score,
    this.feedback.songwriting?.score,
    this.feedback.vocals?.score,
    this.feedback.commercial?.score,
    this.feedback.originality?.score
  ].filter(score => score !== undefined);
  
  if (scores.length === 0) return null;
  
  return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
});

// Pre-save middleware
DemoSubmissionSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.submissionInfo.lastModified = new Date();
  }
  next();
});

// Methods
DemoSubmissionSchema.methods.addReviewNote = function(reviewerId, note, isInternal = true) {
  this.reviewNotes.push({
    reviewer: reviewerId,
    note,
    isInternal,
    createdAt: new Date()
  });
  return this.save();
};

DemoSubmissionSchema.methods.updateStatus = function(newStatus, reviewerId, note = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add audit log entry
  this.auditLog.push({
    action: `status_changed_from_${oldStatus}_to_${newStatus}`,
    performedBy: reviewerId,
    details: { oldStatus, newStatus, note }
  });
  
  // Add review note if provided
  if (note) {
    this.addReviewNote(reviewerId, note, true);
  }
  
  return this.save();
};

DemoSubmissionSchema.methods.canBeEditedBy = function(userId) {
  // Only submitter can edit pending submissions
  return this.status === 'pending' && this.submitter.toString() === userId.toString();
};

DemoSubmissionSchema.methods.canBeViewedBy = function(userId, userRole) {
  // Submitter can always view their own submissions
  if (this.submitter.toString() === userId.toString()) {
    return true;
  }
  
  // Admin and A&R can view all submissions
  if (['admin', 'super_admin', 'a_and_r'].includes(userRole)) {
    return true;
  }
  
  return false;
};

// Static methods
DemoSubmissionSchema.statics.getSubmissionStats = async function(dateRange = 30) {
  const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
  
  return await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgReviewTime: {
          $avg: {
            $cond: [
              { $and: [
                { $ne: ['$decision.decisionDate', null] },
                { $ne: ['$createdAt', null] }
              ]},
              { $divide: [
                { $subtract: ['$decision.decisionDate', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]},
              null
            ]
          }
        }
      }
    }
  ]);
};

DemoSubmissionSchema.statics.getTopGenres = async function(limit = 10) {
  return await this.aggregate([
    { $unwind: '$genre' },
    { $group: { _id: '$genre', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('DemoSubmission', DemoSubmissionSchema);