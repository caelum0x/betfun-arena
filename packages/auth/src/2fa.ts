import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

// ========== 2FA SETUP ==========

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  uri: string;
}

/**
 * Generate 2FA secret and QR code for user
 */
export async function generate2FASecret(
  userIdentifier: string,
  issuer: string = 'BetFun Arena'
): Promise<TwoFactorSetup> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: userIdentifier,
    issuer,
    length: 32,
  });

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate OTP auth URL');
  }

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  // Generate backup codes
  const backupCodes = generateBackupCodes(8);

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes,
    uri: secret.otpauth_url,
  };
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = Array.from({ length: 8 }, () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
}

// ========== 2FA VERIFICATION ==========

/**
 * Verify TOTP token
 */
export function verify2FAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before/after
  });
}

/**
 * Verify backup code
 */
export function verifyBackupCode(
  code: string,
  validCodes: string[],
  usedCodes: string[]
): { valid: boolean; remainingCodes: string[] } {
  const normalizedCode = code.toUpperCase().replace(/\s/g, '');
  
  // Check if code is valid and not used
  const isValid = validCodes.includes(normalizedCode) && !usedCodes.includes(normalizedCode);
  
  if (isValid) {
    return {
      valid: true,
      remainingCodes: validCodes.filter(c => c !== normalizedCode && !usedCodes.includes(c)),
    };
  }
  
  return {
    valid: false,
    remainingCodes: validCodes.filter(c => !usedCodes.includes(c)),
  };
}

// ========== 2FA STATUS ==========

export interface TwoFactorStatus {
  enabled: boolean;
  verified: boolean;
  backupCodesRemaining: number;
  lastVerified?: Date;
}

/**
 * Get 2FA status for user
 */
export function get2FAStatus(
  hasSecret: boolean,
  hasVerified: boolean,
  validCodes: string[],
  usedCodes: string[],
  lastVerified?: Date
): TwoFactorStatus {
  return {
    enabled: hasSecret,
    verified: hasVerified,
    backupCodesRemaining: validCodes.filter(c => !usedCodes.includes(c)).length,
    lastVerified,
  };
}

// ========== RECOVERY ==========

/**
 * Generate new backup codes (for recovery)
 */
export function regenerateBackupCodes(): string[] {
  return generateBackupCodes(8);
}

/**
 * Disable 2FA (requires backup code or admin action)
 */
export function disable2FA(
  backupCode: string,
  validCodes: string[],
  usedCodes: string[]
): boolean {
  const verification = verifyBackupCode(backupCode, validCodes, usedCodes);
  return verification.valid;
}

// ========== UTILITIES ==========

/**
 * Format secret for display (grouped)
 */
export function formatSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join('-') || secret;
}

/**
 * Validate token format
 */
export function isValidTokenFormat(token: string): boolean {
  // TOTP tokens are 6 digits
  return /^\d{6}$/.test(token);
}

/**
 * Validate backup code format
 */
export function isValidBackupCodeFormat(code: string): boolean {
  // Backup codes are 8 alphanumeric characters (with optional dash)
  return /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(code);
}

// ========== TIME-BASED ==========

/**
 * Get current TOTP token (for testing)
 */
export function getCurrentToken(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
}

/**
 * Get remaining time for current token
 */
export function getTokenTimeRemaining(): number {
  const period = 30; // TOTP period in seconds
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}

// ========== EXPORTS ==========

export default {
  generate2FASecret,
  generateBackupCodes,
  verify2FAToken,
  verifyBackupCode,
  get2FAStatus,
  regenerateBackupCodes,
  disable2FA,
  formatSecret,
  isValidTokenFormat,
  isValidBackupCodeFormat,
  getCurrentToken,
  getTokenTimeRemaining,
};

