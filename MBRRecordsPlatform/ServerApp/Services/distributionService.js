const axios = require('axios');
const crypto = require('crypto');
const { ApiError } = require('../Middleware/errorHandler');

/**
 * Music Distribution Service
 * Handles integrations with major streaming platforms and distributors
 */

class DistributionService {
  constructor() {
    this.distributors = {
      spotify: {
        apiUrl: 'https://api.spotify.com/v1',
        authUrl: 'https://accounts.spotify.com/api/token',
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET
      },
      apple: {
        apiUrl: 'https://api.music.apple.com/v1',
        authUrl: 'https://api.music.apple.com/v1/oauth/token',
        keyId: process.env.APPLE_KEY_ID,
        teamId: process.env.APPLE_TEAM_ID,
        privateKey: process.env.APPLE_PRIVATE_KEY
      },
      youtube: {
        apiUrl: 'https://www.googleapis.com/youtube/v3',
        authUrl: 'https://oauth2.googleapis.com/token',
        clientId: process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET
      },
      deezer: {
        apiUrl: 'https://api.deezer.com',
        authUrl: 'https://connect.deezer.com/oauth/access_token.php',
        appId: process.env.DEEZER_APP_ID,
        secretKey: process.env.DEEZER_SECRET_KEY
      },
      tidal: {
        apiUrl: 'https://openapi.tidal.com/v2',
        authUrl: 'https://auth.tidal.com/v1/oauth2/token',
        clientId: process.env.TIDAL_CLIENT_ID,
        clientSecret: process.env.TIDAL_CLIENT_SECRET
      },
      amazon: {
        apiUrl: 'https://music.amazon.com/api',
        authUrl: 'https://api.amazon.com/auth/o2/token',
        clientId: process.env.AMAZON_CLIENT_ID,
        clientSecret: process.env.AMAZON_CLIENT_SECRET
      }
    };

    this.distributionPartners = {
      distrokid: {
        apiUrl: 'https://api.distrokid.com/v1',
        apiKey: process.env.DISTROKID_API_KEY
      },
      tunecore: {
        apiUrl: 'https://api.tunecore.com/v1',
        apiKey: process.env.TUNECORE_API_KEY
      },
      cd_baby: {
        apiUrl: 'https://api.cdbaby.com/v1',
        apiKey: process.env.CD_BABY_API_KEY
      },
      awal: {
        apiUrl: 'https://api.awal.com/v1',
        apiKey: process.env.AWAL_API_KEY
      }
    };
  }

  /**
   * Authenticate with a streaming platform
   */
  async authenticate(platform) {
    try {
      const config = this.distributors[platform];
      if (!config) {
        throw new ApiError(`Unsupported platform: ${platform}`, 400);
      }

      let authResponse;

      switch (platform) {
        case 'spotify':
          authResponse = await this.authenticateSpotify(config);
          break;
        case 'apple':
          authResponse = await this.authenticateApple(config);
          break;
        case 'youtube':
          authResponse = await this.authenticateYouTube(config);
          break;
        case 'deezer':
          authResponse = await this.authenticateDeezer(config);
          break;
        case 'tidal':
          authResponse = await this.authenticateTidal(config);
          break;
        case 'amazon':
          authResponse = await this.authenticateAmazon(config);
          break;
        default:
          throw new ApiError(`Authentication not implemented for ${platform}`, 501);
      }

      return authResponse;
    } catch (error) {
      throw new ApiError(`Authentication failed for ${platform}: ${error.message}`, 500);
    }
  }

  /**
   * Upload track to a streaming platform
   */
  async uploadTrack(platform, trackData, authToken) {
    try {
      const config = this.distributors[platform];
      if (!config) {
        throw new ApiError(`Unsupported platform: ${platform}`, 400);
      }

      let uploadResponse;

      switch (platform) {
        case 'spotify':
          uploadResponse = await this.uploadToSpotify(trackData, authToken);
          break;
        case 'apple':
          uploadResponse = await this.uploadToApple(trackData, authToken);
          break;
        case 'youtube':
          uploadResponse = await this.uploadToYouTube(trackData, authToken);
          break;
        case 'deezer':
          uploadResponse = await this.uploadToDeezer(trackData, authToken);
          break;
        case 'tidal':
          uploadResponse = await this.uploadToTidal(trackData, authToken);
          break;
        case 'amazon':
          uploadResponse = await this.uploadToAmazon(trackData, authToken);
          break;
        default:
          throw new ApiError(`Upload not implemented for ${platform}`, 501);
      }

      return uploadResponse;
    } catch (error) {
      throw new ApiError(`Upload failed for ${platform}: ${error.message}`, 500);
    }
  }

  /**
   * Distribute track through a distribution partner
   */
  async distributeThroughPartner(partner, trackData, userId) {
    try {
      const config = this.distributionPartners[partner];
      if (!config) {
        throw new ApiError(`Unsupported distribution partner: ${partner}`, 400);
      }

      const distributionData = this.formatTrackForDistribution(trackData, partner);

      const response = await axios.post(`${config.apiUrl}/releases`, distributionData, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'X-User-ID': userId
        }
      });

      return {
        partner,
        releaseId: response.data.releaseId,
        status: 'submitted',
        submittedAt: new Date(),
        platforms: response.data.platforms || [],
        expectedReleaseDate: response.data.releaseDate
      };
    } catch (error) {
      throw new ApiError(`Distribution failed through ${partner}: ${error.message}`, 500);
    }
  }

  /**
   * Get distribution status
   */
  async getDistributionStatus(partner, releaseId) {
    try {
      const config = this.distributionPartners[partner];
      if (!config) {
        throw new ApiError(`Unsupported distribution partner: ${partner}`, 400);
      }

      const response = await axios.get(`${config.apiUrl}/releases/${releaseId}/status`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });

      return {
        partner,
        releaseId,
        status: response.data.status,
        platforms: response.data.platforms || [],
        lastUpdated: response.data.lastUpdated,
        issues: response.data.issues || []
      };
    } catch (error) {
      throw new ApiError(`Failed to get status from ${partner}: ${error.message}`, 500);
    }
  }

  /**
   * Bulk distribute to multiple platforms
   */
  async bulkDistribute(trackData, platforms, userId) {
    const results = [];
    const errors = [];

    for (const platform of platforms) {
      try {
        // Authenticate with platform
        const auth = await this.authenticate(platform);

        // Upload track
        const uploadResult = await this.uploadTrack(platform, trackData, auth.accessToken);

        results.push({
          platform,
          status: 'success',
          uploadId: uploadResult.id,
          url: uploadResult.url
        });
      } catch (error) {
        errors.push({
          platform,
          error: error.message
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      totalPlatforms: platforms.length,
      successCount: results.length,
      failureCount: errors.length
    };
  }

  /**
   * Format track data for distribution
   */
  formatTrackForDistribution(trackData, partner) {
    const baseData = {
      title: trackData.title,
      artist: trackData.artist,
      album: trackData.album,
      genre: trackData.genre,
      releaseDate: trackData.releaseDate,
      duration: trackData.duration,
      isrc: trackData.metadata?.isrc,
      upc: trackData.metadata?.upc,
      explicit: trackData.flags?.isExplicit || false,
      lyrics: trackData.lyrics,
      artwork: trackData.artwork?.url,
      audioFile: trackData.audioFile?.url
    };

    // Partner-specific formatting
    switch (partner) {
      case 'distrokid':
        return {
          ...baseData,
          stores: ['spotify', 'apple', 'youtube', 'deezer', 'amazon'],
          pricing: {
            worldwide: trackData.pricing?.price || 0.99,
            currency: trackData.pricing?.currency || 'USD'
          }
        };

      case 'tunecore':
        return {
          ...baseData,
          territories: trackData.availability?.territories || ['worldwide'],
          royaltyRate: 0.85 // 85% royalty rate
        };

      case 'cd_baby':
        return {
          ...baseData,
          distributionType: 'digital',
          marketing: trackData.collaboration?.isOpen || false
        };

      case 'awal':
        return {
          ...baseData,
          label: 'MBR Records',
          marketingBudget: 'standard',
          syncLicensing: true
        };

      default:
        return baseData;
    }
  }

  /**
   * Platform-specific authentication methods
   */
  async authenticateSpotify(config) {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await axios.post(config.authUrl, 'grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in
    };
  }

  async authenticateApple(config) {
    // Apple Music API authentication (simplified)
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: config.teamId,
      iat: now,
      exp: now + 3600
    };

    // In production, use proper JWT signing with private key
    const token = 'apple_jwt_token_placeholder';

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 3600
    };
  }

  async authenticateYouTube(config) {
    // YouTube API authentication
    const response = await axios.post(config.authUrl, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials'
    });

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in
    };
  }

  async authenticateDeezer(config) {
    const response = await axios.get(config.authUrl, {
      params: {
        app_id: config.appId,
        secret: config.secretKey,
        output: 'json'
      }
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  }

  async authenticateTidal(config) {
    const response = await axios.post(config.authUrl, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials'
    });

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in
    };
  }

  async authenticateAmazon(config) {
    const response = await axios.post(config.authUrl, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials'
    });

    return {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in
    };
  }

  /**
   * Platform-specific upload methods (simplified implementations)
   */
  async uploadToSpotify(trackData, accessToken) {
    // Spotify Web API upload (simplified)
    const response = await axios.post(`${this.distributors.spotify.apiUrl}/tracks`, {
      name: trackData.title,
      artists: [{ name: trackData.artist }],
      album: { name: trackData.album },
      duration_ms: trackData.duration * 1000,
      explicit: trackData.flags?.isExplicit || false
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      id: response.data.id,
      url: response.data.external_urls.spotify,
      status: 'uploaded'
    };
  }

  async uploadToApple(trackData, accessToken) {
    // Apple Music API upload (simplified)
    const response = await axios.post(`${this.distributors.apple.apiUrl}/catalog/us/songs`, {
      attributes: {
        name: trackData.title,
        artistName: trackData.artist,
        albumName: trackData.album,
        durationInMillis: trackData.duration * 1000,
        contentRating: trackData.flags?.isExplicit ? 'explicit' : 'clean'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      id: response.data.data[0].id,
      url: response.data.data[0].attributes.url,
      status: 'uploaded'
    };
  }

  async uploadToYouTube(trackData, accessToken) {
    // YouTube Music API upload (simplified)
    const response = await axios.post(`${this.distributors.youtube.apiUrl}/videos`, {
      snippet: {
        title: trackData.title,
        description: `By ${trackData.artist} - ${trackData.description || ''}`,
        tags: trackData.tags || [],
        categoryId: '10' // Music category
      },
      status: {
        privacyStatus: 'unlisted' // Start as unlisted for review
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        part: 'snippet,status'
      }
    });

    return {
      id: response.data.id,
      url: `https://www.youtube.com/watch?v=${response.data.id}`,
      status: 'uploaded'
    };
  }

  async uploadToDeezer(trackData, accessToken) {
    // Deezer API upload (simplified)
    const response = await axios.post(`${this.distributors.deezer.apiUrl}/track`, {
      title: trackData.title,
      artist: trackData.artist,
      album: trackData.album,
      duration: trackData.duration
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      id: response.data.id,
      url: `https://www.deezer.com/track/${response.data.id}`,
      status: 'uploaded'
    };
  }

  async uploadToTidal(trackData, accessToken) {
    // Tidal API upload (simplified)
    const response = await axios.post(`${this.distributors.tidal.apiUrl}/tracks`, {
      title: trackData.title,
      artists: [trackData.artist],
      album: { title: trackData.album },
      duration: trackData.duration,
      explicit: trackData.flags?.isExplicit || false
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      id: response.data.id,
      url: `https://tidal.com/track/${response.data.id}`,
      status: 'uploaded'
    };
  }

  async uploadToAmazon(trackData, accessToken) {
    // Amazon Music API upload (simplified)
    const response = await axios.post(`${this.distributors.amazon.apiUrl}/tracks`, {
      title: trackData.title,
      artist: trackData.artist,
      album: trackData.album,
      duration: trackData.duration,
      genre: trackData.genre
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      id: response.data.id,
      url: `https://www.amazon.com/music/player/${response.data.id}`,
      status: 'uploaded'
    };
  }
}

module.exports = new DistributionService();