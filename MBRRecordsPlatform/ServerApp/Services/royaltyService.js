const mongoose = require('mongoose');
const { ApiError } = require('../Middleware/errorHandler');

/**
 * Royalty and Revenue Tracking Service
 * Handles complex royalty calculations, revenue distribution, and financial reporting
 */

class RoyaltyService {
  constructor() {
    this.royaltyModels = {
      // Standard music industry royalty rates
      streaming: {
        spotify: 0.0033, // ~$0.0033 per stream
        apple: 0.0056,  // ~$0.0056 per stream
        youtube: 0.0007, // ~$0.0007 per stream
        deezer: 0.0064,  // ~$0.0064 per stream
        tidal: 0.0125,   // ~$0.0125 per stream (HiFi)
        amazon: 0.0040   // ~$0.0040 per stream
      },
      downloads: {
        itunes: 0.70,    // 70% of sale price
        amazon: 0.65,    // 65% of sale price
        google: 0.52     // 52% of sale price
      },
      licensing: {
        sync: 0.50,      // 50% for sync licensing
        master: 0.75,    // 75% for master licensing
        publishing: 0.85 // 85% for publishing
      }
    };

    this.distributionSplits = {
      artist: 0.70,     // 70% to artist
      label: 0.20,      // 20% to label
      publisher: 0.10   // 10% to publisher
    };
  }

  /**
   * Calculate royalties for a track based on streaming data
   */
  async calculateStreamingRoyalties(trackId, platform, streamCount, period = 'monthly') {
    try {
      const Track = mongoose.model('Track');
      const track = await Track.findById(trackId);

      if (!track) {
        throw new ApiError('Track not found', 404);
      }

      const rate = this.royaltyModels.streaming[platform];
      if (!rate) {
        throw new ApiError(`Unsupported platform: ${platform}`, 400);
      }

      const grossRevenue = streamCount * rate;
      const netRevenue = this.applyPlatformFees(grossRevenue, platform);

      // Calculate splits
      const splits = this.calculateRevenueSplits(netRevenue, track);

      const royaltyData = {
        trackId,
        platform,
        period,
        streams: streamCount,
        ratePerStream: rate,
        grossRevenue,
        netRevenue,
        splits,
        totalArtistShare: splits.artist,
        calculatedAt: new Date(),
        status: 'calculated'
      };

      // Store royalty calculation
      await this.storeRoyaltyCalculation(royaltyData);

      return royaltyData;
    } catch (error) {
      throw new ApiError(`Royalty calculation failed: ${error.message}`, 500);
    }
  }

  /**
   * Calculate download royalties
   */
  async calculateDownloadRoyalties(trackId, platform, downloadCount, pricePerUnit) {
    try {
      const Track = mongoose.model('Track');
      const track = await Track.findById(trackId);

      if (!track) {
        throw new ApiError('Track not found', 404);
      }

      const rate = this.royaltyModels.downloads[platform];
      if (!rate) {
        throw new ApiError(`Unsupported platform: ${platform}`, 400);
      }

      const grossRevenue = downloadCount * pricePerUnit;
      const royaltyAmount = grossRevenue * rate;
      const netRevenue = this.applyPlatformFees(royaltyAmount, platform);

      const splits = this.calculateRevenueSplits(netRevenue, track);

      const royaltyData = {
        trackId,
        platform,
        type: 'download',
        downloads: downloadCount,
        pricePerUnit,
        royaltyRate: rate,
        grossRevenue,
        netRevenue,
        splits,
        totalArtistShare: splits.artist,
        calculatedAt: new Date(),
        status: 'calculated'
      };

      await this.storeRoyaltyCalculation(royaltyData);

      return royaltyData;
    } catch (error) {
      throw new ApiError(`Download royalty calculation failed: ${error.message}`, 500);
    }
  }

  /**
   * Calculate licensing royalties
   */
  async calculateLicensingRoyalties(trackId, licenseType, licenseFee, territory = 'worldwide') {
    try {
      const Track = mongoose.model('Track');
      const track = await Track.findById(trackId);

      if (!track) {
        throw new ApiError('Track not found', 404);
      }

      const rate = this.royaltyModels.licensing[licenseType];
      if (!rate) {
        throw new ApiError(`Unsupported license type: ${licenseType}`, 400);
      }

      const royaltyAmount = licenseFee * rate;
      const netRevenue = this.applyTaxes(royaltyAmount, territory);

      const splits = this.calculateRevenueSplits(netRevenue, track);

      const royaltyData = {
        trackId,
        type: 'licensing',
        licenseType,
        territory,
        licenseFee,
        royaltyRate: rate,
        netRevenue,
        splits,
        totalArtistShare: splits.artist,
        calculatedAt: new Date(),
        status: 'calculated'
      };

      await this.storeRoyaltyCalculation(royaltyData);

      return royaltyData;
    } catch (error) {
      throw new ApiError(`Licensing royalty calculation failed: ${error.message}`, 500);
    }
  }

  /**
   * Apply platform fees and deductions
   */
  applyPlatformFees(revenue, platform) {
    const platformFees = {
      spotify: 0.30,    // 30% platform fee
      apple: 0.30,      // 30% platform fee
      youtube: 0.30,    // 30% platform fee
      deezer: 0.25,     // 25% platform fee
      tidal: 0.20,      // 20% platform fee
      amazon: 0.25      // 25% platform fee
    };

    const fee = platformFees[platform] || 0.30;
    return revenue * (1 - fee);
  }

  /**
   * Apply taxes based on territory
   */
  applyTaxes(amount, territory) {
    // Simplified tax calculation - in production, use proper tax service
    const taxRates = {
      'us': 0.20,       // 20% US withholding
      'eu': 0.15,       // 15% EU withholding
      'worldwide': 0.10 // 10% average worldwide
    };

    const taxRate = taxRates[territory] || taxRates.worldwide;
    return amount * (1 - taxRate);
  }

  /**
   * Calculate revenue splits among stakeholders
   */
  calculateRevenueSplits(netRevenue, track) {
    const baseSplits = { ...this.distributionSplits };

    // Adjust splits based on track ownership and agreements
    if (track.collaboration && track.collaboration.isOpen) {
      // For collaborative tracks, split among collaborators
      const collaborators = track.collaboration.collaborators || [];
      const collaboratorCount = collaborators.length + 1; // +1 for main artist

      baseSplits.artist = (baseSplits.artist / collaboratorCount);
      // Add individual collaborator splits
      baseSplits.collaborators = collaborators.map(() => baseSplits.artist);
    }

    // Apply publishing splits if applicable
    if (track.metadata && track.metadata.publishingRights) {
      baseSplits.publisher = netRevenue * baseSplits.publisher;
    }

    return {
      artist: netRevenue * baseSplits.artist,
      label: netRevenue * baseSplits.label,
      publisher: baseSplits.publisher,
      collaborators: baseSplits.collaborators || []
    };
  }

  /**
   * Generate comprehensive royalty report
   */
  async generateRoyaltyReport(userId, period = 'monthly', startDate, endDate) {
    try {
      const RoyaltyCalculation = mongoose.model('RoyaltyCalculation');

      const query = {
        $or: [
          { 'splits.artist': { $exists: true } },
          { 'splits.collaborators': { $exists: true } }
        ]
      };

      if (startDate && endDate) {
        query.calculatedAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const calculations = await RoyaltyCalculation.find(query);

      // Aggregate by platform and type
      const summary = {
        totalRevenue: 0,
        totalStreams: 0,
        totalDownloads: 0,
        byPlatform: {},
        byType: {},
        period,
        generatedAt: new Date()
      };

      calculations.forEach(calc => {
        summary.totalRevenue += calc.netRevenue || 0;

        if (calc.streams) summary.totalStreams += calc.streams;
        if (calc.downloads) summary.totalDownloads += calc.downloads;

        // Group by platform
        if (!summary.byPlatform[calc.platform]) {
          summary.byPlatform[calc.platform] = {
            revenue: 0,
            streams: 0,
            downloads: 0
          };
        }

        summary.byPlatform[calc.platform].revenue += calc.netRevenue || 0;
        summary.byPlatform[calc.platform].streams += calc.streams || 0;
        summary.byPlatform[calc.platform].downloads += calc.downloads || 0;

        // Group by type
        const type = calc.type || 'streaming';
        if (!summary.byType[type]) {
          summary.byType[type] = { revenue: 0, count: 0 };
        }

        summary.byType[type].revenue += calc.netRevenue || 0;
        summary.byType[type].count += 1;
      });

      return summary;
    } catch (error) {
      throw new ApiError(`Report generation failed: ${error.message}`, 500);
    }
  }

  /**
   * Process royalty payments
   */
  async processRoyaltyPayments(userId, amount, paymentMethod = 'bank_transfer') {
    try {
      // In production, integrate with payment processors like Stripe, PayPal, etc.
      const paymentData = {
        userId,
        amount,
        paymentMethod,
        status: 'pending',
        initiatedAt: new Date()
      };

      // Store payment record
      await this.storePaymentRecord(paymentData);

      // Simulate payment processing
      // In production, this would call actual payment APIs
      const processedPayment = {
        ...paymentData,
        status: 'completed',
        processedAt: new Date(),
        transactionId: `mbr_royalty_${Date.now()}`,
        fees: this.calculatePaymentFees(amount, paymentMethod)
      };

      await this.updatePaymentRecord(processedPayment);

      return processedPayment;
    } catch (error) {
      throw new ApiError(`Payment processing failed: ${error.message}`, 500);
    }
  }

  /**
   * Calculate payment processing fees
   */
  calculatePaymentFees(amount, method) {
    const feeRates = {
      bank_transfer: 0.0025, // 0.25%
      paypal: 0.029,         // 2.9% + $0.30
      stripe: 0.029,         // 2.9% + $0.30
      wise: 0.0035           // 0.35%
    };

    const rate = feeRates[method] || 0.03;
    const baseFee = ['paypal', 'stripe'].includes(method) ? 0.30 : 0;

    return (amount * rate) + baseFee;
  }

  /**
   * Store royalty calculation in database
   */
  async storeRoyaltyCalculation(data) {
    const RoyaltyCalculation = mongoose.model('RoyaltyCalculation') ||
      mongoose.model('RoyaltyCalculation', new mongoose.Schema({
        trackId: mongoose.Schema.Types.ObjectId,
        platform: String,
        type: { type: String, default: 'streaming' },
        period: String,
        streams: Number,
        downloads: Number,
        ratePerStream: Number,
        pricePerUnit: Number,
        royaltyRate: Number,
        grossRevenue: Number,
        netRevenue: Number,
        splits: Object,
        totalArtistShare: Number,
        calculatedAt: { type: Date, default: Date.now },
        status: { type: String, default: 'calculated' }
      }));

    const calculation = new RoyaltyCalculation(data);
    await calculation.save();

    return calculation;
  }

  /**
   * Store payment record
   */
  async storePaymentRecord(data) {
    const Payment = mongoose.model('Payment') ||
      mongoose.model('Payment', new mongoose.Schema({
        userId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        paymentMethod: String,
        status: { type: String, default: 'pending' },
        initiatedAt: { type: Date, default: Date.now },
        processedAt: Date,
        transactionId: String,
        fees: Number
      }));

    const payment = new Payment(data);
    await payment.save();

    return payment;
  }

  /**
   * Update payment record
   */
  async updatePaymentRecord(data) {
    const Payment = mongoose.model('Payment');
    await Payment.findByIdAndUpdate(data._id, data);
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(userId, timeframe = '30d') {
    try {
      const RoyaltyCalculation = mongoose.model('RoyaltyCalculation');

      const startDate = this.getStartDateForTimeframe(timeframe);

      const analytics = await RoyaltyCalculation.aggregate([
        {
          $match: {
            calculatedAt: { $gte: startDate },
            $or: [
              { 'splits.artist': { $gt: 0 } },
              { 'splits.collaborators.0': { $exists: true } }
            ]
          }
        },
        {
          $group: {
            _id: {
              platform: '$platform',
              type: '$type',
              period: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$calculatedAt'
                }
              }
            },
            totalRevenue: { $sum: '$netRevenue' },
            totalStreams: { $sum: '$streams' },
            totalDownloads: { $sum: '$downloads' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.period': -1 }
        }
      ]);

      return {
        timeframe,
        startDate,
        endDate: new Date(),
        analytics,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new ApiError(`Analytics generation failed: ${error.message}`, 500);
    }
  }

  /**
   * Get start date for timeframe
   */
  getStartDateForTimeframe(timeframe) {
    const now = new Date();
    const timeframes = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const days = timeframes[timeframe] || 30;
    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  }
}

module.exports = new RoyaltyService();