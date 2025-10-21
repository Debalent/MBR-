const crypto = require('crypto');
const { ApiError } = require('../Middleware/errorHandler');

/**
 * Professional Metadata Standards Service
 * Implements ISRC, UPC, and other industry-standard metadata management
 */

class MetadataService {
  constructor() {
    this.isrcRegistry = new Map(); // In production, use a proper database
    this.upcRegistry = new Map();
    this.metadataStandards = {
      isrc: {
        format: 'CC-XXX-YY-NNNNN',
        length: 12,
        description: 'International Standard Recording Code'
      },
      upc: {
        format: 'NNNNNNNNNNNNN',
        length: 12,
        description: 'Universal Product Code'
      },
      ean: {
        format: 'NNNNNNNNNNNNN',
        length: 13,
        description: 'European Article Number'
      },
      grid: {
        format: 'A1-BBBB-CC-DD-EEE',
        length: 18,
        description: 'Global Release Identifier'
      },
      iswc: {
        format: 'T-XXXXXXX-X',
        length: 11,
        description: 'International Standard Musical Work Code'
      }
    };
  }

  /**
   * Generate ISRC (International Standard Recording Code)
   */
  generateISRC(countryCode = 'US', registrantCode, year = null, designationCode = null) {
    try {
      // Validate country code (ISO 3166-1 alpha-2)
      if (!countryCode || countryCode.length !== 2) {
        throw new ApiError('Invalid country code. Must be 2 characters (ISO 3166-1 alpha-2)', 400);
      }

      // Use default registrant code if not provided (MBR Records)
      if (!registrantCode) {
        registrantCode = 'MBR';
      }

      // Validate registrant code (3 characters)
      if (registrantCode.length !== 3) {
        throw new ApiError('Registrant code must be exactly 3 characters', 400);
      }

      // Use current year if not provided
      if (!year) {
        year = new Date().getFullYear().toString().slice(-2);
      }

      // Generate designation code (5 digits) if not provided
      if (!designationCode) {
        designationCode = this.generateUniqueCode(5, this.isrcRegistry);
      }

      // Format: CC-XXX-YY-NNNNN
      const isrc = `${countryCode}-${registrantCode}-${year}-${designationCode}`;

      // Validate uniqueness
      if (this.isrcRegistry.has(isrc)) {
        throw new ApiError('ISRC already exists. Please try again.', 409);
      }

      // Store in registry
      this.isrcRegistry.set(isrc, {
        generatedAt: new Date(),
        status: 'active'
      });

      return {
        isrc,
        countryCode,
        registrantCode,
        year,
        designationCode,
        formatted: isrc,
        standard: 'ISRC',
        description: this.metadataStandards.isrc.description
      };
    } catch (error) {
      throw new ApiError(`ISRC generation failed: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Generate UPC (Universal Product Code)
   */
  generateUPC(type = 'album', baseCode = null) {
    try {
      let upc;

      if (baseCode) {
        // Use provided base code and calculate check digit
        upc = this.calculateUPC(baseCode);
      } else {
        // Generate random 11-digit code + check digit
        const randomCode = this.generateUniqueCode(11, this.upcRegistry);
        upc = this.calculateUPC(randomCode);
      }

      // Validate uniqueness
      if (this.upcRegistry.has(upc)) {
        throw new ApiError('UPC already exists. Please try again.', 409);
      }

      // Store in registry
      this.upcRegistry.set(upc, {
        type,
        generatedAt: new Date(),
        status: 'active'
      });

      return {
        upc,
        type,
        formatted: upc,
        standard: 'UPC',
        description: this.metadataStandards.upc.description
      };
    } catch (error) {
      throw new ApiError(`UPC generation failed: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Calculate UPC check digit
   */
  calculateUPC(baseCode) {
    if (baseCode.length !== 11 && baseCode.length !== 12) {
      throw new ApiError('UPC base code must be 11 or 12 digits', 400);
    }

    const digits = baseCode.toString().split('').map(Number);

    // If already 12 digits, validate check digit
    if (digits.length === 12) {
      const calculatedCheck = this.calculateUPCCheckDigit(digits.slice(0, 11));
      if (calculatedCheck !== digits[11]) {
        throw new ApiError('Invalid UPC check digit', 400);
      }
      return baseCode;
    }

    // Calculate check digit for 11-digit code
    const checkDigit = this.calculateUPCCheckDigit(digits);
    return baseCode + checkDigit.toString();
  }

  /**
   * Calculate UPC check digit using standard algorithm
   */
  calculateUPCCheckDigit(digits) {
    let sum = 0;

    // Sum odd positions (1-based indexing)
    for (let i = 0; i < 11; i += 2) {
      sum += digits[i];
    }

    // Multiply by 3
    sum *= 3;

    // Add even positions
    for (let i = 1; i < 10; i += 2) {
      sum += digits[i];
    }

    // Find next multiple of 10
    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;

    return checkDigit;
  }

  /**
   * Generate EAN (European Article Number)
   */
  generateEAN(countryCode = '000', baseCode = null) {
    try {
      let ean;

      if (baseCode) {
        ean = this.calculateEAN(baseCode);
      } else {
        // Generate 12-digit code with country prefix + check digit
        const randomPart = this.generateUniqueCode(9, new Map());
        const fullCode = countryCode + randomPart;
        ean = this.calculateEAN(fullCode);
      }

      return {
        ean,
        countryCode,
        formatted: ean,
        standard: 'EAN',
        description: this.metadataStandards.ean.description
      };
    } catch (error) {
      throw new ApiError(`EAN generation failed: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Calculate EAN check digit
   */
  calculateEAN(baseCode) {
    if (baseCode.length !== 12 && baseCode.length !== 13) {
      throw new ApiError('EAN base code must be 12 or 13 digits', 400);
    }

    const digits = baseCode.toString().split('').map(Number);

    if (digits.length === 13) {
      const calculatedCheck = this.calculateEANCheckDigit(digits.slice(0, 12));
      if (calculatedCheck !== digits[12]) {
        throw new ApiError('Invalid EAN check digit', 400);
      }
      return baseCode;
    }

    const checkDigit = this.calculateEANCheckDigit(digits);
    return baseCode + checkDigit.toString();
  }

  /**
   * Calculate EAN check digit
   */
  calculateEANCheckDigit(digits) {
    let sum = 0;

    // Sum digits with alternating weights (1, 3, 1, 3, ...)
    for (let i = 0; i < 12; i++) {
      const weight = (i % 2 === 0) ? 1 : 3;
      sum += digits[i] * weight;
    }

    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;

    return checkDigit;
  }

  /**
   * Generate ISWC (International Standard Musical Work Code)
   */
  generateISWC(workId = null) {
    try {
      // Generate 9-digit work ID if not provided
      if (!workId) {
        workId = this.generateUniqueCode(9, new Map());
      }

      // Calculate check digit
      const checkDigit = this.calculateISWCCheckDigit(workId);

      // Format: T-XXXXXXX-X
      const iswc = `T-${workId}-${checkDigit}`;

      return {
        iswc,
        workId,
        checkDigit,
        formatted: iswc,
        standard: 'ISWC',
        description: this.metadataStandards.iswc.description
      };
    } catch (error) {
      throw new ApiError(`ISWC generation failed: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Calculate ISWC check digit
   */
  calculateISWCCheckDigit(workId) {
    const digits = workId.toString().split('').map(Number);
    let sum = 0;

    // Weight digits from right to left (starting with weight 2)
    for (let i = digits.length - 1; i >= 0; i--) {
      const weight = (digits.length - i) + 1; // 2, 3, 4, ..., 10
      sum += digits[i] * weight;
    }

    const remainder = sum % 11;
    const checkDigit = remainder === 10 ? 'X' : remainder.toString();

    return checkDigit;
  }

  /**
   * Generate GRID (Global Release Identifier)
   */
  generateGRID(type = 'album', registrantCode = 'MBR') {
    try {
      // Generate components
      const segment1 = type.charAt(0).toUpperCase();
      const segment2 = registrantCode.padEnd(4, '0').substring(0, 4);
      const segment3 = this.generateUniqueCode(2, new Map());
      const segment4 = this.generateUniqueCode(3, new Map());

      // Format: A1-BBBB-CC-DD-EEE
      const grid = `${segment1}1-${segment2}-${segment3}-${segment4.slice(0, 2)}-${segment4.slice(2)}`;

      return {
        grid,
        type,
        registrantCode,
        formatted: grid,
        standard: 'GRID',
        description: this.metadataStandards.grid.description
      };
    } catch (error) {
      throw new ApiError(`GRID generation failed: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Generate unique numeric code
   */
  generateUniqueCode(length, registry) {
    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
      const code = Math.floor(Math.random() * Math.pow(10, length))
        .toString()
        .padStart(length, '0');

      if (!registry.has(code)) {
        return code;
      }

      attempts++;
    }

    throw new ApiError(`Could not generate unique ${length}-digit code after ${maxAttempts} attempts`, 500);
  }

  /**
   * Validate metadata code
   */
  validateCode(type, code) {
    try {
      switch (type.toLowerCase()) {
        case 'isrc':
          return this.validateISRC(code);
        case 'upc':
          return this.validateUPC(code);
        case 'ean':
          return this.validateEAN(code);
        case 'iswc':
          return this.validateISWC(code);
        case 'grid':
          return this.validateGRID(code);
        default:
          throw new ApiError(`Unsupported metadata type: ${type}`, 400);
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate ISRC format
   */
  validateISRC(isrc) {
    const isrcRegex = /^[A-Z]{2}-[A-Z0-9]{3}-\d{2}-\d{5}$/;
    const isValid = isrcRegex.test(isrc);

    return {
      valid: isValid,
      format: this.metadataStandards.isrc.format,
      description: this.metadataStandards.isrc.description
    };
  }

  /**
   * Validate UPC format and check digit
   */
  validateUPC(upc) {
    try {
      const digits = upc.toString().split('').map(Number);

      if (digits.length !== 12) {
        return { valid: false, error: 'UPC must be 12 digits' };
      }

      const calculatedCheck = this.calculateUPCCheckDigit(digits.slice(0, 11));
      const isValid = calculatedCheck === digits[11];

      return {
        valid: isValid,
        format: this.metadataStandards.upc.format,
        description: this.metadataStandards.upc.description
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate EAN format and check digit
   */
  validateEAN(ean) {
    try {
      const digits = ean.toString().split('').map(Number);

      if (digits.length !== 13) {
        return { valid: false, error: 'EAN must be 13 digits' };
      }

      const calculatedCheck = this.calculateEANCheckDigit(digits.slice(0, 12));
      const isValid = calculatedCheck === digits[12];

      return {
        valid: isValid,
        format: this.metadataStandards.ean.format,
        description: this.metadataStandards.ean.description
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate ISWC format
   */
  validateISWC(iswc) {
    const iswcRegex = /^T-\d{9}-[\dX]$/;
    const isValid = iswcRegex.test(iswc);

    return {
      valid: isValid,
      format: this.metadataStandards.iswc.format,
      description: this.metadataStandards.iswc.description
    };
  }

  /**
   * Validate GRID format
   */
  validateGRID(grid) {
    const gridRegex = /^[A-Z]1-[A-Z0-9]{4}-\d{2}-\d{2}-\d{3}$/;
    const isValid = gridRegex.test(grid);

    return {
      valid: isValid,
      format: this.metadataStandards.grid.format,
      description: this.metadataStandards.grid.description
    };
  }

  /**
   * Bulk generate metadata for release
   */
  async generateReleaseMetadata(releaseData) {
    try {
      const metadata = {
        generatedAt: new Date(),
        release: {}
      };

      // Generate ISRC for each track
      if (releaseData.tracks && Array.isArray(releaseData.tracks)) {
        metadata.release.tracks = [];

        for (const track of releaseData.tracks) {
          const trackMetadata = {
            title: track.title,
            isrc: this.generateISRC(
              releaseData.countryCode,
              releaseData.registrantCode,
              releaseData.year
            )
          };

          // Generate ISWC for composition if provided
          if (track.composition) {
            trackMetadata.iswc = this.generateISWC();
          }

          metadata.release.tracks.push(trackMetadata);
        }
      }

      // Generate UPC/EAN for release
      if (releaseData.type === 'album' || releaseData.type === 'single') {
        metadata.release.upc = this.generateUPC(releaseData.type);
        metadata.release.ean = this.generateEAN(releaseData.countryCode);
      }

      // Generate GRID for release
      metadata.release.grid = this.generateGRID(releaseData.type);

      return metadata;
    } catch (error) {
      throw new ApiError(`Release metadata generation failed: ${error.message}`, 500);
    }
  }

  /**
   * Get metadata standards information
   */
  getStandards() {
    return {
      standards: this.metadataStandards,
      supported: Object.keys(this.metadataStandards),
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = new MetadataService();