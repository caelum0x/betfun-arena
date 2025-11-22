/**
 * Score validation for Play Solana
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate score before submission
 */
export function validateScore(score: number): ValidationResult {
  // Score must be positive
  if (score < 0) {
    return {
      valid: false,
      error: "Score must be non-negative",
    };
  }

  // Score must be finite
  if (!isFinite(score)) {
    return {
      valid: false,
      error: "Score must be a finite number",
    };
  }

  // Score must be reasonable (not too large)
  const MAX_SCORE = Number.MAX_SAFE_INTEGER;
  if (score > MAX_SCORE) {
    return {
      valid: false,
      error: "Score exceeds maximum value",
    };
  }

  return { valid: true };
}

/**
 * Validate wallet address
 */
export function validateWallet(wallet: string): ValidationResult {
  if (!wallet || typeof wallet !== "string") {
    return {
      valid: false,
      error: "Wallet address is required",
    };
  }

  // Basic Solana address validation
  if (wallet.length < 32 || wallet.length > 44) {
    return {
      valid: false,
      error: "Invalid wallet address format",
    };
  }

  // Check for valid base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(wallet)) {
    return {
      valid: false,
      error: "Wallet address contains invalid characters",
    };
  }

  return { valid: true };
}

/**
 * Validate metadata
 */
export function validateMetadata(metadata?: Record<string, any>): ValidationResult {
  if (metadata === undefined || metadata === null) {
    return { valid: true }; // Metadata is optional
  }

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      valid: false,
      error: "Metadata must be an object",
    };
  }

  // Check metadata size (prevent huge payloads)
  const metadataStr = JSON.stringify(metadata);
  const MAX_METADATA_SIZE = 10000; // 10KB
  if (metadataStr.length > MAX_METADATA_SIZE) {
    return {
      valid: false,
      error: "Metadata exceeds maximum size",
    };
  }

  return { valid: true };
}

/**
 * Validate all score submission parameters
 */
export function validateScoreSubmission(
  wallet: string,
  score: number,
  metadata?: Record<string, any>
): ValidationResult {
  const walletValidation = validateWallet(wallet);
  if (!walletValidation.valid) {
    return walletValidation;
  }

  const scoreValidation = validateScore(score);
  if (!scoreValidation.valid) {
    return scoreValidation;
  }

  const metadataValidation = validateMetadata(metadata);
  if (!metadataValidation.valid) {
    return metadataValidation;
  }

  return { valid: true };
}

