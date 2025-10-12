const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  type: {
    type: String,
    enum: ['direct', 'group', 'support', 'announcement'],
    default: 'direct'
  },

  // Group conversation details
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },

  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  avatar: {
    type: String // URL to group avatar
  },

  // Conversation settings
  settings: {
    isPrivate: {
      type: Boolean,
      default: true
    },
    
    allowInvites: {
      type: Boolean,
      default: false
    },
    
    muteNotifications: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      mutedUntil: Date
    }],
    
    pinnedMessages: [{
      message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      },
      pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      pinnedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Auto-delete messages after X days (0 = never)
    autoDeleteDays: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Conversation roles (for group chats)
  roles: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Last message reference
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  lastActivity: {
    type: Date,
    default: Date.now
  },

  // Creation info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Archive status
  archivedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    archivedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Conversation analytics
  analytics: {
    messageCount: {
      type: Number,
      default: 0
    },
    
    lastMessageAt: Date,
    
    participantActivity: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      lastSeen: Date,
      messageCount: {
        type: Number,
        default: 0
      }
    }]
  },

  // Conversation tags
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Integration settings
  integrations: {
    // Link to related content
    relatedTrack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Track'
    },
    
    relatedDemo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DemoSubmission'
    },
    
    // Business context
    businessContext: {
      type: String,
      enum: ['collaboration', 'support', 'feedback', 'contract', 'general']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ConversationSchema.index({ participants: 1, updatedAt: -1 });
ConversationSchema.index({ type: 1, updatedAt: -1 });
ConversationSchema.index({ lastActivity: -1 });
ConversationSchema.index({ 'archivedBy.user': 1 });

// Virtual for participant count
ConversationSchema.virtual('participantCount').get(function() {
  return this.participants ? this.participants.length : 0;
});

// Virtual for unread count (requires user context)
ConversationSchema.virtual('unreadCount').get(function() {
  // This will be calculated and added in the route handlers
  return this._unreadCount || 0;
});

// Virtual for display name (for direct messages)
ConversationSchema.virtual('displayName').get(function() {
  if (this.type === 'direct' && this.participants.length === 2) {
    // This will be set in route handlers based on the other participant
    return this._displayName || 'Direct Message';
  }
  return this.name || 'Group Chat';
});

// Virtual for conversation status
ConversationSchema.virtual('isActive').get(function() {
  // Consider conversation active if there's been activity in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.lastActivity > thirtyDaysAgo;
});

// Methods
ConversationSchema.methods.addParticipant = function(userId, addedBy) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    
    // Add to roles if it's a group conversation
    if (this.type === 'group') {
      this.roles.push({
        user: userId,
        role: 'member',
        assignedBy: addedBy
      });
    }
    
    // Initialize analytics for new participant
    this.analytics.participantActivity.push({
      user: userId,
      lastSeen: new Date(),
      messageCount: 0
    });
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

ConversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.toString() !== userId.toString());
  this.roles = this.roles.filter(r => r.user.toString() !== userId.toString());
  this.analytics.participantActivity = this.analytics.participantActivity.filter(
    a => a.user.toString() !== userId.toString()
  );
  
  return this.save();
};

ConversationSchema.methods.updateRole = function(userId, newRole, updatedBy) {
  const roleEntry = this.roles.find(r => r.user.toString() === userId.toString());
  
  if (roleEntry) {
    roleEntry.role = newRole;
    roleEntry.assignedBy = updatedBy;
    roleEntry.assignedAt = new Date();
  } else {
    this.roles.push({
      user: userId,
      role: newRole,
      assignedBy: updatedBy
    });
  }
  
  return this.save();
};

ConversationSchema.methods.getUserRole = function(userId) {
  const roleEntry = this.roles.find(r => r.user.toString() === userId.toString());
  return roleEntry ? roleEntry.role : 'member';
};

ConversationSchema.methods.canUserPerformAction = function(userId, action) {
  if (this.type === 'direct') return true; // In direct chats, both can do everything
  
  const userRole = this.getUserRole(userId);
  
  switch (action) {
    case 'send_message':
      return true; // All participants can send messages
    
    case 'add_participant':
      return ['owner', 'admin'].includes(userRole) || this.settings.allowInvites;
    
    case 'remove_participant':
      return ['owner', 'admin'].includes(userRole);
    
    case 'change_settings':
      return ['owner', 'admin'].includes(userRole);
    
    case 'delete_conversation':
      return userRole === 'owner';
    
    default:
      return false;
  }
};

ConversationSchema.methods.isArchived = function(userId) {
  return this.archivedBy.some(archive => archive.user.toString() === userId.toString());
};

ConversationSchema.methods.archiveFor = function(userId) {
  if (!this.isArchived(userId)) {
    this.archivedBy.push({
      user: userId,
      archivedAt: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

ConversationSchema.methods.unarchiveFor = function(userId) {
  this.archivedBy = this.archivedBy.filter(archive => 
    archive.user.toString() !== userId.toString()
  );
  return this.save();
};

ConversationSchema.methods.isMuted = function(userId) {
  const muteEntry = this.settings.muteNotifications.find(mute => 
    mute.user.toString() === userId.toString()
  );
  
  if (!muteEntry) return false;
  if (!muteEntry.mutedUntil) return true; // Permanently muted
  
  return muteEntry.mutedUntil > new Date();
};

ConversationSchema.methods.muteFor = function(userId, duration = null) {
  // Remove existing mute
  this.settings.muteNotifications = this.settings.muteNotifications.filter(mute =>
    mute.user.toString() !== userId.toString()
  );
  
  // Add new mute
  const muteEntry = { user: userId };
  if (duration) {
    muteEntry.mutedUntil = new Date(Date.now() + duration);
  }
  
  this.settings.muteNotifications.push(muteEntry);
  return this.save();
};

ConversationSchema.methods.unmuteFor = function(userId) {
  this.settings.muteNotifications = this.settings.muteNotifications.filter(mute =>
    mute.user.toString() !== userId.toString()
  );
  return this.save();
};

ConversationSchema.methods.updateActivity = function(userId) {
  this.lastActivity = new Date();
  
  // Update participant activity
  const activity = this.analytics.participantActivity.find(a => 
    a.user.toString() === userId.toString()
  );
  
  if (activity) {
    activity.lastSeen = new Date();
    activity.messageCount++;
  } else {
    this.analytics.participantActivity.push({
      user: userId,
      lastSeen: new Date(),
      messageCount: 1
    });
  }
  
  this.analytics.messageCount++;
  return this.save();
};

// Static methods
ConversationSchema.statics.findByParticipants = function(participantIds) {
  return this.findOne({
    participants: { $all: participantIds, $size: participantIds.length },
    type: 'direct'
  });
};

ConversationSchema.statics.findUserConversations = function(userId, includeArchived = false) {
  const filter = { participants: userId };
  
  if (!includeArchived) {
    filter['archivedBy.user'] = { $ne: userId };
  }
  
  return this.find(filter)
    .populate('participants', 'username displayName profileImage isOnline lastSeen')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });
};

// Pre-save middleware
ConversationSchema.pre('save', function(next) {
  if (this.isModified('participants') || this.isNew) {
    // Ensure creator is in participants
    if (!this.participants.includes(this.createdBy)) {
      this.participants.push(this.createdBy);
    }
    
    // For new group conversations, make creator the owner
    if (this.isNew && this.type === 'group') {
      this.roles.push({
        user: this.createdBy,
        role: 'owner'
      });
    }
  }
  
  next();
});

module.exports = mongoose.model('Conversation', ConversationSchema);