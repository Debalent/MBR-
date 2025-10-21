const express = require('express');
const router = express.Router();
const { authenticateToken, requireArtist } = require('../Middleware/authMiddleware');
const contractService = require('../Services/contractService');
const { asyncHandler } = require('../Middleware/errorHandler');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route POST /api/contracts
 * @desc Create a new contract
 * @access Private (Artists only)
 */
router.post('/', requireArtist, asyncHandler(async (req, res) => {
  const contractData = req.body;

  // Validate contract terms
  const validation = contractService.validateContractTerms(contractData.type, contractData.terms);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'Contract validation failed',
      errors: validation.errors
    });
  }

  const contract = await contractService.createContract(contractData);

  res.status(201).json({
    success: true,
    message: 'Contract created successfully',
    data: contract
  });
}));

/**
 * @route POST /api/contracts/:contractId/send-for-signature
 * @desc Send contract for signature
 * @access Private (Artists only)
 */
router.post('/:contractId/send-for-signature', requireArtist, asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { signerEmail, signerRole } = req.body;

  if (!signerEmail || !signerRole) {
    return res.status(400).json({
      success: false,
      message: 'Signer email and role are required'
    });
  }

  const result = await contractService.sendForSignature(contractId, signerEmail, signerRole);

  res.json({
    success: true,
    message: 'Signature request sent successfully',
    data: result
  });
}));

/**
 * @route POST /api/contracts/sign/:signatureToken
 * @desc Sign contract with digital signature
 * @access Public (with valid token)
 */
router.post('/sign/:signatureToken', asyncHandler(async (req, res) => {
  const { signatureToken } = req.params;
  const signatureData = {
    ...req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const result = await contractService.signContract(signatureToken, signatureData);

  res.json({
    success: true,
    message: 'Contract signed successfully',
    data: result
  });
}));

/**
 * @route GET /api/contracts/:contractId
 * @desc Get contract details
 * @access Private (Contract parties only)
 */
router.get('/:contractId', asyncHandler(async (req, res) => {
  const { contractId } = req.params;

  const contract = await contractService.getContract(contractId);

  if (!contract) {
    return res.status(404).json({
      success: false,
      message: 'Contract not found'
    });
  }

  // Check if user is a party to this contract
  const isParty = contract.parties.some(party =>
    party.userId === req.user._id.toString() || party.email === req.user.email
  );

  if (!isParty && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You are not a party to this contract.'
    });
  }

  res.json({
    success: true,
    data: contract
  });
}));

/**
 * @route GET /api/contracts
 * @desc Get user's contracts
 * @access Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const { type, status, page = 1, limit = 20 } = req.query;

  const filters = {
    type,
    status,
    limit: parseInt(limit),
    page: parseInt(page)
  };

  const contracts = await contractService.getUserContracts(req.user._id, filters);

  res.json({
    success: true,
    data: {
      contracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: contracts.length
      }
    }
  });
}));

/**
 * @route PUT /api/contracts/:contractId/terminate
 * @desc Terminate a contract
 * @access Private (Contract parties only)
 */
router.put('/:contractId/terminate', requireArtist, asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Termination reason is required'
    });
  }

  const contract = await contractService.getContract(contractId);

  if (!contract) {
    return res.status(404).json({
      success: false,
      message: 'Contract not found'
    });
  }

  // Check if user is authorized to terminate
  const isAuthorized = contract.parties.some(party =>
    party.userId === req.user._id.toString() && (party.role === 'artist' || party.role === 'label')
  );

  if (!isAuthorized && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to terminate this contract'
    });
  }

  const terminationData = {
    reason,
    performedBy: req.user._id
  };

  const result = await contractService.terminateContract(contractId, terminationData);

  res.json({
    success: true,
    message: 'Contract terminated successfully',
    data: result
  });
}));

/**
 * @route GET /api/contracts/types
 * @desc Get available contract types and templates
 * @access Private
 */
router.get('/types', asyncHandler(async (req, res) => {
  const contractTypes = Object.keys(contractService.contractTypes).map(type => ({
    type,
    template: contractService.contractTypes[type].template,
    requiredFields: contractService.contractTypes[type].requiredFields,
    description: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ') + ' Agreement'
  }));

  res.json({
    success: true,
    data: {
      contractTypes,
      statuses: contractService.contractStatuses
    }
  });
}));

/**
 * @route POST /api/contracts/:contractId/validate
 * @desc Validate contract terms
 * @access Private
 */
router.post('/:contractId/validate', asyncHandler(async (req, res) => {
  const { type, terms } = req.body;

  if (!type || !terms) {
    return res.status(400).json({
      success: false,
      message: 'Contract type and terms are required'
    });
  }

  const validation = contractService.validateContractTerms(type, terms);

  res.json({
    success: true,
    data: {
      type,
      valid: validation.valid,
      errors: validation.errors
    }
  });
}));

/**
 * @route GET /api/contracts/:contractId/history
 * @desc Get contract history/audit trail
 * @access Private (Contract parties only)
 */
router.get('/:contractId/history', asyncHandler(async (req, res) => {
  const { contractId } = req.params;

  const contract = await contractService.getContract(contractId);

  if (!contract) {
    return res.status(404).json({
      success: false,
      message: 'Contract not found'
    });
  }

  // Check if user is a party to this contract
  const isParty = contract.parties.some(party =>
    party.userId === req.user._id.toString() || party.email === req.user.email
  );

  if (!isParty && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You are not a party to this contract.'
    });
  }

  res.json({
    success: true,
    data: {
      contractId,
      history: contract.history || []
    }
  });
}));

/**
 * @route POST /api/contracts/:contractId/duplicate
 * @desc Create a duplicate contract with new terms
 * @access Private (Artists only)
 */
router.post('/:contractId/duplicate', requireArtist, asyncHandler(async (req, res) => {
  const { contractId } = req.params;
  const { modifications } = req.body;

  const originalContract = await contractService.getContract(contractId);

  if (!originalContract) {
    return res.status(404).json({
      success: false,
      message: 'Original contract not found'
    });
  }

  // Check if user is authorized
  const isAuthorized = originalContract.parties.some(party =>
    party.userId === req.user._id.toString()
  );

  if (!isAuthorized && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to duplicate this contract'
    });
  }

  // Create duplicate with modifications
  const duplicateData = {
    ...originalContract,
    contractId: undefined, // Will be generated
    metadata: {
      ...originalContract.metadata,
      status: 'draft',
      createdAt: new Date(),
      version: (originalContract.metadata.version || 1) + 1,
      parentContractId: contractId
    },
    signatures: [],
    history: [{
      action: 'duplicated',
      timestamp: new Date(),
      details: `Duplicated from contract ${contractId}`,
      performedBy: req.user._id
    }]
  };

  // Apply modifications
  if (modifications) {
    if (modifications.terms) {
      duplicateData.terms = { ...duplicateData.terms, ...modifications.terms };
    }
    if (modifications.parties) {
      duplicateData.parties = modifications.parties;
    }
  }

  const duplicateContract = await contractService.createContract(duplicateData);

  res.status(201).json({
    success: true,
    message: 'Contract duplicated successfully',
    data: duplicateContract
  });
}));

/**
 * @route GET /api/contracts/templates/:type
 * @desc Get contract template for a specific type
 * @access Private
 */
router.get('/templates/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;

  if (!contractService.contractTypes[type]) {
    return res.status(404).json({
      success: false,
      message: 'Contract template not found'
    });
  }

  const template = contractService.contractTypes[type];

  // In a real implementation, this would load actual template content
  const templateContent = {
    type,
    template: template.template,
    requiredFields: template.requiredFields,
    sampleTerms: contractService.getSampleTerms(type)
  };

  res.json({
    success: true,
    data: templateContent
  });
}));

/**
 * Get sample terms for contract type
 */
contractService.getSampleTerms = function(type) {
  const samples = {
    recording: {
      royaltyRate: 0.15,
      term: 5,
      territory: ['worldwide'],
      advance: 10000,
      marketingBudget: 5000
    },
    distribution: {
      platforms: ['spotify', 'apple', 'youtube', 'deezer'],
      royaltyRate: 0.75,
      term: 3,
      territory: ['worldwide'],
      exclusivity: true
    },
    licensing: {
      licenseType: 'sync',
      fee: 5000,
      term: 1,
      territory: ['worldwide'],
      usage: 'film_soundtrack'
    },
    publishing: {
      royaltyRate: 0.75,
      term: 5,
      works: [],
      advance: 5000,
      controlledCompositionClause: true
    }
  };

  return samples[type] || {};
};

module.exports = router;