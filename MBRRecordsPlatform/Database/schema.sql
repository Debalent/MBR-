-- MBR Records Platform Database Schema
-- MongoDB equivalent schema for documentation purposes

-- Users Collection
{
  "_id": ObjectId,
  "name": String,
  "email": String (unique, indexed),
  "password": String (hashed),
  "avatar": String,
  "role": String (enum: ['user', 'artist', 'admin']),
  "isEmailVerified": Boolean,
  "emailVerificationToken": String,
  "passwordResetToken": String,
  "passwordResetExpires": Date,
  "profile": {
    "bio": String,
    "location": String,
    "website": String,
    "socialLinks": {
      "instagram": String,
      "twitter": String,
      "facebook": String,
      "youtube": String,
      "spotify": String,
      "soundcloud": String
    },
    "genres": [String],
    "instruments": [String],
    "collaborationInterests": Boolean
  },
  "preferences": {
    "emailNotifications": Boolean,
    "pushNotifications": Boolean,
    "marketingEmails": Boolean,
    "playlistPrivacy": String (enum: ['public', 'private', 'friends']),
    "profileVisibility": String (enum: ['public', 'private'])
  },
  "stats": {
    "totalListens": Number,
    "totalLikes": Number,
    "totalFollowers": Number,
    "totalFollowing": Number,
    "totalPlaylists": Number,
    "totalTracks": Number
  },
  "subscription": {
    "plan": String (enum: ['free', 'premium', 'artist', 'label']),
    "startDate": Date,
    "endDate": Date,
    "stripeCustomerId": String,
    "stripeSubscriptionId": String
  },
  "lastActive": Date,
  "isActive": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}

-- Tracks Collection
{
  "_id": ObjectId,
  "title": String,
  "artist": ObjectId (ref: 'User'),
  "featuredArtists": [ObjectId] (ref: 'User'),
  "album": ObjectId (ref: 'Album'),
  "genre": String,
  "subGenres": [String],
  "description": String,
  "lyrics": String,
  "duration": Number,
  "bpm": Number,
  "key": String,
  "mood": String,
  "tags": [String],
  "audioFile": {
    "url": String,
    "filename": String,
    "size": Number,
    "format": String,
    "quality": String,
    "cloudinaryId": String
  },
  "artwork": {
    "url": String,
    "filename": String,
    "cloudinaryId": String
  },
  "waveform": {
    "url": String,
    "peaks": [Number]
  },
  "stats": {
    "plays": Number,
    "likes": Number,
    "downloads": Number,
    "shares": Number,
    "comments": Number,
    "playlists": Number
  },
  "pricing": {
    "isFree": Boolean,
    "price": Number,
    "currency": String,
    "licensing": String
  },
  "availability": {
    "isPublic": Boolean,
    "releaseDate": Date,
    "expirationDate": Date,
    "territories": [String],
    "platforms": [String]
  },
  "collaboration": {
    "isOpen": Boolean,
    "collaborators": [{
      "user": ObjectId (ref: 'User'),
      "role": String,
      "contribution": String
    }],
    "requestedRoles": [String]
  },
  "metadata": {
    "recordingDate": Date,
    "recordingLocation": String,
    "producer": String,
    "engineer": String,
    "mixer": String,
    "masteredBy": String,
    "label": String,
    "catalogNumber": String,
    "isrc": String,
    "copyright": String,
    "publishingRights": String
  },
  "socialProof": {
    "verified": Boolean,
    "featured": Boolean,
    "trending": Boolean,
    "editorsPick": Boolean
  },
  "analytics": {
    "uniqueListeners": Number,
    "averageListenDuration": Number,
    "skipRate": Number,
    "completionRate": Number,
    "peakListeners": {
      "count": Number,
      "date": Date
    },
    "demographics": {
      "ageGroups": {
        "18-24": Number,
        "25-34": Number,
        "35-44": Number,
        "45-54": Number,
        "55+": Number
      },
      "countries": [{
        "country": String,
        "count": Number
      }],
      "cities": [{
        "city": String,
        "count": Number
      }]
    }
  },
  "flags": {
    "isExplicit": Boolean,
    "hasContentWarning": Boolean,
    "isInstrumental": Boolean,
    "isRemix": Boolean,
    "isLive": Boolean,
    "isDemo": Boolean
  },
  "createdAt": Date,
  "updatedAt": Date
}

-- Artists Collection (Extended User profiles)
{
  "_id": ObjectId,
  "user": ObjectId (ref: 'User'),
  "stageName": String,
  "biography": String,
  "formed": Date,
  "members": [{
    "name": String,
    "role": String,
    "instruments": [String]
  }],
  "discography": {
    "albums": [ObjectId] (ref: 'Album'),
    "singles": [ObjectId] (ref: 'Track'),
    "collaborations": [ObjectId] (ref: 'Track')
  },
  "achievements": [{
    "title": String,
    "description": String,
    "date": Date,
    "category": String
  }],
  "booking": {
    "available": Boolean,
    "rate": Number,
    "currency": String,
    "contact": String,
    "requirements": String
  },
  "verification": {
    "isVerified": Boolean,
    "verifiedBy": ObjectId (ref: 'User'),
    "verificationDate": Date,
    "documents": [String]
  },
  "createdAt": Date,
  "updatedAt": Date
}

-- Demo Submissions Collection
{
  "_id": ObjectId,
  "submittedBy": ObjectId (ref: 'User'),
  "title": String,
  "artist": String,
  "genre": String,
  "description": String,
  "audioFile": {
    "url": String,
    "filename": String,
    "size": Number,
    "format": String,
    "cloudinaryId": String
  },
  "artwork": {
    "url": String,
    "filename": String,
    "cloudinaryId": String
  },
  "contactInfo": {
    "email": String,
    "phone": String,
    "socialMedia": String
  },
  "status": String (enum: ['pending', 'reviewing', 'approved', 'rejected']),
  "reviewedBy": ObjectId (ref: 'User'),
  "reviewDate": Date,
  "reviewNotes": String,
  "feedback": String,
  "rating": Number,
  "tags": [String],
  "metadata": {
    "bpm": Number,
    "key": String,
    "duration": Number,
    "recordingDate": Date,
    "equipment": String
  },
  "createdAt": Date,
  "updatedAt": Date
}

-- Messages Collection (Chat System)
{
  "_id": ObjectId,
  "conversation": ObjectId (ref: 'Conversation'),
  "sender": ObjectId (ref: 'User'),
  "content": String,
  "messageType": String (enum: ['text', 'audio', 'image', 'file', 'track']),
  "attachments": [{
    "type": String,
    "url": String,
    "filename": String,
    "size": Number
  }],
  "isRead": Boolean,
  "readAt": Date,
  "isEdited": Boolean,
  "editedAt": Date,
  "reactions": [{
    "user": ObjectId (ref: 'User'),
    "emoji": String,
    "createdAt": Date
  }],
  "replyTo": ObjectId (ref: 'Message'),
  "createdAt": Date,
  "updatedAt": Date
}

-- Conversations Collection
{
  "_id": ObjectId,
  "participants": [ObjectId] (ref: 'User'),
  "type": String (enum: ['direct', 'group']),
  "name": String,
  "description": String,
  "avatar": String,
  "lastMessage": ObjectId (ref: 'Message'),
  "lastActivity": Date,
  "isActive": Boolean,
  "settings": {
    "notifications": Boolean,
    "allowInvites": Boolean,
    "isPublic": Boolean
  },
  "createdBy": ObjectId (ref: 'User'),
  "admins": [ObjectId] (ref: 'User'),
  "createdAt": Date,
  "updatedAt": Date
}

-- Fan Pages Collection
{
  "_id": ObjectId,
  "owner": ObjectId (ref: 'User'),
  "artist": ObjectId (ref: 'User'),
  "title": String,
  "description": String,
  "banner": String,
  "content": [{
    "type": String (enum: ['text', 'image', 'video', 'audio', 'poll']),
    "content": Mixed,
    "createdAt": Date
  }],
  "followers": [ObjectId] (ref: 'User'),
  "isActive": Boolean,
  "settings": {
    "allowComments": Boolean,
    "moderateComments": Boolean,
    "allowSharing": Boolean
  },
  "stats": {
    "totalFollowers": Number,
    "totalPosts": Number,
    "totalLikes": Number,
    "totalComments": Number
  },
  "createdAt": Date,
  "updatedAt": Date
}

-- Playlists Collection
{
  "_id": ObjectId,
  "name": String,
  "description": String,
  "creator": ObjectId (ref: 'User'),
  "tracks": [{
    "track": ObjectId (ref: 'Track'),
    "addedAt": Date,
    "addedBy": ObjectId (ref: 'User')
  }],
  "artwork": String,
  "isPublic": Boolean,
  "isCollaborative": Boolean,
  "collaborators": [ObjectId] (ref: 'User'),
  "followers": [ObjectId] (ref: 'User'),
  "tags": [String],
  "category": String,
  "stats": {
    "totalTracks": Number,
    "totalDuration": Number,
    "totalPlays": Number,
    "totalLikes": Number,
    "totalFollowers": Number
  },
  "createdAt": Date,
  "updatedAt": Date
}

-- Notifications Collection
{
  "_id": ObjectId,
  "recipient": ObjectId (ref: 'User'),
  "sender": ObjectId (ref: 'User'),
  "type": String,
  "title": String,
  "message": String,
  "data": Mixed,
  "isRead": Boolean,
  "readAt": Date,
  "actionUrl": String,
  "priority": String (enum: ['low', 'normal', 'high', 'urgent']),
  "category": String,
  "expiresAt": Date,
  "createdAt": Date
}

-- Analytics Collection
{
  "_id": ObjectId,
  "entityType": String (enum: ['track', 'artist', 'user', 'playlist']),
  "entityId": ObjectId,
  "eventType": String,
  "data": Mixed,
  "userId": ObjectId (ref: 'User'),
  "sessionId": String,
  "ipAddress": String,
  "userAgent": String,
  "location": {
    "country": String,
    "city": String,
    "coordinates": [Number]
  },
  "timestamp": Date,
  "createdAt": Date
}

-- Indexes for optimal performance:

-- Users Collection Indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "profile.genres": 1 })
db.users.createIndex({ "createdAt": -1 })
db.users.createIndex({ "lastActive": -1 })

-- Tracks Collection Indexes
db.tracks.createIndex({ "artist": 1 })
db.tracks.createIndex({ "genre": 1 })
db.tracks.createIndex({ "stats.plays": -1 })
db.tracks.createIndex({ "stats.likes": -1 })
db.tracks.createIndex({ "createdAt": -1 })
db.tracks.createIndex({ "availability.releaseDate": -1 })
db.tracks.createIndex({ "socialProof.featured": 1 })
db.tracks.createIndex({ "socialProof.trending": 1 })
db.tracks.createIndex({ 
  "title": "text", 
  "description": "text", 
  "tags": "text" 
})

-- Messages Collection Indexes
db.messages.createIndex({ "conversation": 1, "createdAt": -1 })
db.messages.createIndex({ "sender": 1 })
db.messages.createIndex({ "isRead": 1 })

-- Conversations Collection Indexes
db.conversations.createIndex({ "participants": 1 })
db.conversations.createIndex({ "lastActivity": -1 })

-- Demo Submissions Collection Indexes
db.demosubmissions.createIndex({ "submittedBy": 1 })
db.demosubmissions.createIndex({ "status": 1 })
db.demosubmissions.createIndex({ "createdAt": -1 })

-- Analytics Collection Indexes
db.analytics.createIndex({ "entityType": 1, "entityId": 1 })
db.analytics.createIndex({ "eventType": 1 })
db.analytics.createIndex({ "timestamp": -1 })
db.analytics.createIndex({ "userId": 1 })