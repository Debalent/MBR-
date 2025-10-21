const mongoose = require('mongoose');
const { ApiError } = require('../Middleware/errorHandler');
const crypto = require('crypto');

/**
 * Contract Management and Legal Workflow Service
 * Handles contract creation, digital signatures, legal workflows, and compliance
 */

class ContractService {
  constructor() {
    this.contractTypes = {
      recording: {
        template: 'recording_agreement',
        requiredFields: ['artist', 'label', 'tracks', 'royaltyRate', 'term', 'territory']
      },
      distribution: {
        template: 'distribution_agreement',
        requiredFields: ['artist', 'distributor', 'platforms', 'royaltyRate', 'term', 'territory']
      },
      licensing: {
        template: 'licensing_agreement',
        requiredFields: ['licensor', 'licensee', 'content', 'licenseType', 'fee', 'term', 'territory']
      },
      publishing: {
        template: 'publishing_agreement',
        requiredFields: ['writer', 'publisher', 'works', 'royaltyRate', 'term']
      },
      management: {
        template: 'management_agreement',
        requiredFields: ['artist', 'manager', 'commission', 'term', 'services']
      },
      collaboration: {
        template: 'collaboration_agreement',
        requiredFields: ['parties', 'project', 'contributions', 'revenueSplit', 'term']
      }
    };

    this.contractStatuses = {
      draft: 'Draft',
      pending_signature: 'Pending Signature',
      signed: 'Signed',
      active: 'Active',
      terminated: 'Terminated',
      expired: 'Expired',
      disputed: 'Disputed'
    };
  }

  /**
   * Create a new contract
   */
  async createContract(contractData) {
    try {
      const { type, parties, terms, metadata } = contractData;

      if (!this.contractTypes[type]) {
        throw new ApiError(`Unsupported contract type: ${type}`, 400);
      }

      // Validate required fields
      const requiredFields = this.contractTypes[type].requiredFields;
      const missingFields = requiredFields.filter(field => !contractData[field]);

      if (missingFields.length > 0) {
        throw new ApiError(`Missing required fields: ${missingFields.join(', ')}`, 400);
      }

      // Generate contract ID
      const contractId = this.generateContractId(type);

      // Create contract object
      const contract = {
        contractId,
        type,
        template: this.contractTypes[type].template,
        parties,
        terms,
        metadata: {
          ...metadata,
          createdAt: new Date(),
          status: 'draft',
          version: 1
        },
        signatures: [],
        history: [{
          action: 'created',
          timestamp: new Date(),
          details: 'Contract created'
        }]
      };

      // Store contract
      const savedContract = await this.storeContract(contract);

      return savedContract;
    } catch (error) {
      throw new ApiError(`Contract creation failed: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Generate unique contract ID
   */
  generateContractId(type) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const typePrefix = type.substring(0, 3).toUpperCase();

    return `MBR-${typePrefix}-${timestamp}-${random}`;
  }

  /**
   * Send contract for signature
   */
  async sendForSignature(contractId, signerEmail, signerRole) {
    try {
      const contract = await this.getContract(contractId);

      if (!contract) {
        throw new ApiError('Contract not found', 404);
      }

      if (contract.metadata.status !== 'draft') {
        throw new ApiError('Contract must be in draft status to send for signature', 400);
      }

      // Generate signature request
      const signatureRequest = {
        id: crypto.randomUUID(),
        email: signerEmail,
        role: signerRole,
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        signatureToken: crypto.randomBytes(32).toString('hex')
      };

      // Update contract
      await this.updateContract(contractId, {
        $set: { 'metadata.status': 'pending_signature' },
        $push: { signatures: signatureRequest }
      });

      // Send signature request email (implementation would call email service)
      await this.sendSignatureRequestEmail(signerEmail, contract, signatureRequest);

      return {
        contractId,
        signatureRequest,
        message: 'Signature request sent successfully'
      };
    } catch (error) {
      throw new ApiError(`Failed to send for signature: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Sign contract digitally
   */
  async signContract(contractId, signatureToken, signatureData) {
    try {
      const contract = await this.getContract(contractId);

      if (!contract) {
        throw new ApiError('Contract not found', 404);
      }

      // Find signature request
      const signatureRequest = contract.signatures.find(sig => sig.signatureToken === signatureToken);

      if (!signatureRequest) {
        throw new ApiError('Invalid signature token', 401);
      }

      if (signatureRequest.status !== 'pending') {
        throw new ApiError('Signature request is not pending', 400);
      }

      if (new Date() > signatureRequest.expiresAt) {
        throw new ApiError('Signature request has expired', 400);
      }

      // Create digital signature
      const digitalSignature = {
        ...signatureData,
        signedAt: new Date(),
        ipAddress: signatureData.ipAddress,
        userAgent: signatureData.userAgent,
        signatureHash: this.generateSignatureHash(signatureData)
      };

      // Update signature request
      await this.updateContract(contractId, {
        $set: {
          'signatures.$[elem].status': 'signed',
          'signatures.$[elem].signedAt': new Date(),
          'signatures.$[elem].signature': digitalSignature
        }
      }, {
        arrayFilters: [{ 'elem.signatureToken': signatureToken }]
      });

      // Check if all required signatures are complete
      const updatedContract = await this.getContract(contractId);
      const allSigned = this.checkAllSignaturesComplete(updatedContract);

      if (allSigned) {
        await this.activateContract(contractId);
      }

      return {
        contractId,
        status: allSigned ? 'active' : 'pending_signature',
        signature: digitalSignature
      };
    } catch (error) {
      throw new ApiError(`Contract signing failed: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Check if all required signatures are complete
   */
  checkAllSignaturesComplete(contract) {
    const requiredRoles = ['artist', 'label']; // Basic requirement
    const signedRoles = contract.signatures
      .filter(sig => sig.status === 'signed')
      .map(sig => sig.role);

    return requiredRoles.every(role => signedRoles.includes(role));
  }

  /**
   * Activate contract
   */
  async activateContract(contractId) {
    try {
      await this.updateContract(contractId, {
        $set: {
          'metadata.status': 'active',
          'metadata.activatedAt': new Date()
        },
        $push: {
          history: {
            action: 'activated',
            timestamp: new Date(),
            details: 'All required signatures received, contract activated'
          }
        }
      });

      // Trigger contract activation workflows
      await this.triggerContractActivation(contractId);

      return { contractId, status: 'active' };
    } catch (error) {
      throw new ApiError(`Contract activation failed: ${error.message}`, 500);
    }
  }

  /**
   * Terminate contract
   */
  async terminateContract(contractId, terminationData) {
    try {
      const contract = await this.getContract(contractId);

      if (!contract) {
        throw new ApiError('Contract not found', 404);
      }

      if (!['active', 'disputed'].includes(contract.metadata.status)) {
        throw new ApiError('Contract must be active or disputed to terminate', 400);
      }

      await this.updateContract(contractId, {
        $set: {
          'metadata.status': 'terminated',
          'metadata.terminatedAt': new Date(),
          'metadata.terminationReason': terminationData.reason
        },
        $push: {
          history: {
            action: 'terminated',
            timestamp: new Date(),
            details: `Contract terminated: ${terminationData.reason}`,
            performedBy: terminationData.performedBy
          }
        }
      });

      return { contractId, status: 'terminated' };
    } catch (error) {
      throw new ApiError(`Contract termination failed: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Get contract by ID
   */
  async getContract(contractId) {
    const Contract = mongoose.model('Contract') ||
      mongoose.model('Contract', new mongoose.Schema({
        contractId: { type: String, unique: true },
        type: String,
        template: String,
        parties: [Object],
        terms: Object,
        metadata: Object,
        signatures: [Object],
        history: [Object]
      }));

    return await Contract.findOne({ contractId });
  }

  /**
   * Update contract
   */
  async updateContract(contractId, updateData, options = {}) {
    const Contract = mongoose.model('Contract');
    return await Contract.findOneAndUpdate(
      { contractId },
      updateData,
      { ...options, new: true }
    );
  }

  /**
   * Store contract in database
   */
  async storeContract(contractData) {
    const Contract = mongoose.model('Contract') ||
      mongoose.model('Contract', new mongoose.Schema({
        contractId: { type: String, unique: true },
        type: String,
        template: String,
        parties: [Object],
        terms: Object,
        metadata: Object,
        signatures: [Object],
        history: [Object]
      }));

    const contract = new Contract(contractData);
    return await contract.save();
  }

  /**
   * Generate signature hash for verification
   */
  generateSignatureHash(signatureData) {
    const hashData = {
      contractId: signatureData.contractId,
      signerEmail: signatureData.signerEmail,
      signedAt: signatureData.signedAt,
      ipAddress: signatureData.ipAddress
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Send signature request email
   */
  async sendSignatureRequestEmail(email, contract, signatureRequest) {
    // Implementation would integrate with email service
    console.log(`Sending signature request to ${email} for contract ${contract.contractId}`);

    // In production, this would send an actual email with signature link
    // const signatureLink = `${process.env.CLIENT_URL}/contracts/sign/${signatureRequest.signatureToken}`;
  }

  /**
   * Trigger contract activation workflows
   */
  async triggerContractActivation(contractId) {
    const contract = await this.getContract(contractId);

    // Trigger different workflows based on contract type
    switch (contract.type) {
      case 'recording':
        await this.activateRecordingContract(contract);
        break;
      case 'distribution':
        await this.activateDistributionContract(contract);
        break;
      case 'licensing':
        await this.activateLicensingContract(contract);
        break;
      case 'publishing':
        await this.activatePublishingContract(contract);
        break;
    }
  }

  /**
   * Activate recording contract workflows
   */
  async activateRecordingContract(contract) {
    // Update track ownership and royalty splits
    const tracks = contract.terms.tracks || [];

    for (const trackId of tracks) {
      const Track = mongoose.model('Track');
      await Track.findByIdAndUpdate(trackId, {
        $set: {
          'metadata.contractId': contract.contractId,
          'metadata.label': contract.parties.find(p => p.role === 'label')?.name,
          'metadata.recordingContract': {
            royaltyRate: contract.terms.royaltyRate,
            term: contract.terms.term,
            territory: contract.terms.territory
          }
        }
      });
    }
  }

  /**
   * Activate distribution contract workflows
   */
  async activateDistributionContract(contract) {
    // Enable distribution for specified tracks/platforms
    const tracks = contract.terms.tracks || [];
    const platforms = contract.terms.platforms || [];

    for (const trackId of tracks) {
      const Track = mongoose.model('Track');
      await Track.findByIdAndUpdate(trackId, {
        $set: {
          'metadata.distributionContract': {
            contractId: contract.contractId,
            distributor: contract.parties.find(p => p.role === 'distributor')?.name,
            platforms,
            royaltyRate: contract.terms.royaltyRate,
            term: contract.terms.term
          }
        }
      });
    }
  }

  /**
   * Activate licensing contract workflows
   */
  async activateLicensingContract(contract) {
    // Create licensing permissions and track usage
    const content = contract.terms.content || [];

    // Implementation would create licensing records and permissions
    console.log(`Activated licensing contract for content: ${content.join(', ')}`);
  }

  /**
   * Activate publishing contract workflows
   */
  async activatePublishingContract(contract) {
    // Update publishing rights and royalty splits
    const works = contract.terms.works || [];

    for (const workId of works) {
      // Implementation would update work publishing information
      console.log(`Activated publishing contract for work: ${workId}`);
    }
  }

  /**
   * Get contracts for user
   */
  async getUserContracts(userId, filters = {}) {
    const Contract = mongoose.model('Contract');

    const query = {
      $or: [
        { 'parties.userId': userId },
        { 'parties.email': { $exists: true } } // For external parties
      ]
    };

    if (filters.type) query.type = filters.type;
    if (filters.status) query['metadata.status'] = filters.status;

    return await Contract.find(query)
      .sort({ 'metadata.createdAt': -1 })
      .limit(filters.limit || 50);
  }

  /**
   * Validate contract terms
   */
  validateContractTerms(type, terms) {
    const validations = {
      recording: this.validateRecordingTerms,
      distribution: this.validateDistributionTerms,
      licensing: this.validateLicensingTerms,
      publishing: this.validatePublishingTerms,
      management: this.validateManagementTerms,
      collaboration: this.validateCollaborationTerms
    };

    const validator = validations[type];
    if (!validator) {
      throw new ApiError(`No validator available for contract type: ${type}`, 400);
    }

    return validator.call(this, terms);
  }

  /**
   * Validate recording contract terms
   */
  validateRecordingTerms(terms) {
    const errors = [];

    if (!terms.royaltyRate || terms.royaltyRate < 0 || terms.royaltyRate > 1) {
      errors.push('Royalty rate must be between 0 and 1');
    }

    if (!terms.term || terms.term < 1) {
      errors.push('Term must be at least 1 year');
    }

    if (!terms.territory || !Array.isArray(terms.territory)) {
      errors.push('Territory must be specified as an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate distribution contract terms
   */
  validateDistributionTerms(terms) {
    const errors = [];

    if (!terms.platforms || !Array.isArray(terms.platforms)) {
      errors.push('Platforms must be specified as an array');
    }

    if (!terms.royaltyRate || terms.royaltyRate < 0 || terms.royaltyRate > 1) {
      errors.push('Royalty rate must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate licensing contract terms
   */
  validateLicensingTerms(terms) {
    const errors = [];

    if (!terms.licenseType || !['sync', 'master', 'publishing'].includes(terms.licenseType)) {
      errors.push('License type must be sync, master, or publishing');
    }

    if (!terms.fee || terms.fee < 0) {
      errors.push('License fee must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate publishing contract terms
   */
  validatePublishingTerms(terms) {
    const errors = [];

    if (!terms.royaltyRate || terms.royaltyRate < 0 || terms.royaltyRate > 1) {
      errors.push('Royalty rate must be between 0 and 1');
    }

    if (!terms.works || !Array.isArray(terms.works)) {
      errors.push('Works must be specified as an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate management contract terms
   */
  validateManagementTerms(terms) {
    const errors = [];

    if (!terms.commission || terms.commission < 0 || terms.commission > 1) {
      errors.push('Commission must be between 0 and 1');
    }

    if (!terms.services || !Array.isArray(terms.services)) {
      errors.push('Services must be specified as an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate collaboration contract terms
   */
  validateCollaborationTerms(terms) {
    const errors = [];

    if (!terms.contributions || !Array.isArray(terms.contributions)) {
      errors.push('Contributions must be specified as an array');
    }

    if (!terms.revenueSplit || typeof terms.revenueSplit !== 'object') {
      errors.push('Revenue split must be specified as an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ContractService();