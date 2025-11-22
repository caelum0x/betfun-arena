import axios, { AxiosInstance } from 'axios';

// ========== KYC INTEGRATION ==========

/**
 * KYC Provider Interface
 * Compatible with Sumsub, Onfido, Jumio, Persona, etc.
 */

export enum KYCProvider {
  SUMSUB = 'sumsub',
  ONFIDO = 'onfido',
  JUMIO = 'jumio',
  PERSONA = 'persona',
}

export enum KYCLevel {
  NONE = 'none',
  BASIC = 'basic',         // < $1k/day
  INTERMEDIATE = 'intermediate', // < $10k/day
  ADVANCED = 'advanced',   // < $100k/day
  INSTITUTIONAL = 'institutional', // Unlimited
}

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESUBMISSION_REQUIRED = 'resubmission_required',
}

export interface KYCConfig {
  provider: KYCProvider;
  apiKey: string;
  apiSecret?: string;
  webhookSecret?: string;
  sandboxMode?: boolean;
}

export interface KYCUser {
  wallet: string;
  email?: string;
  phoneNumber?: string;
  externalUserId?: string;
}

export interface KYCVerification {
  id: string;
  userId: string;
  level: KYCLevel;
  status: KYCStatus;
  verificationUrl?: string;
  documents?: KYCDocument[];
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  expiresAt?: Date;
  rejectionReason?: string;
}

export interface KYCDocument {
  type: 'id_card' | 'passport' | 'drivers_license' | 'proof_of_address' | 'selfie';
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: Date;
}

export interface KYCLimits {
  dailyLimit: number; // in USD
  monthlyLimit: number;
  transactionLimit: number;
  withdrawalLimit: number;
}

// ========== KYC CLIENT ==========

export class KYCClient {
  private client: AxiosInstance;
  private config: KYCConfig;

  constructor(config: KYCConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: this.getBaseUrl(),
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private getBaseUrl(): string {
    const urls = {
      [KYCProvider.SUMSUB]: this.config.sandboxMode
        ? 'https://api.sumsub.com'
        : 'https://api.sumsub.com',
      [KYCProvider.ONFIDO]: this.config.sandboxMode
        ? 'https://api.eu.onfido.com/v3.6'
        : 'https://api.onfido.com/v3.6',
      [KYCProvider.JUMIO]: 'https://netverify.com/api/v4',
      [KYCProvider.PERSONA]: 'https://withpersona.com/api/v1',
    };

    return urls[this.config.provider];
  }

  /**
   * Create KYC verification for user
   */
  async createVerification(
    user: KYCUser,
    level: KYCLevel
  ): Promise<KYCVerification> {
    try {
      // Implementation varies by provider
      // This is a generic template

      const response = await this.client.post('/applicants', {
        externalUserId: user.wallet,
        email: user.email,
        levelName: this.mapLevelToProvider(level),
        metadata: {
          wallet: user.wallet,
        },
      });

      const verification: KYCVerification = {
        id: response.data.id,
        userId: user.wallet,
        level,
        status: KYCStatus.NOT_STARTED,
        verificationUrl: response.data.redirectUrl || this.generateVerificationUrl(response.data.id),
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return verification;
    } catch (error: any) {
      throw new Error(`KYC verification creation failed: ${error.message}`);
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(verificationId: string): Promise<KYCStatus> {
    try {
      const response = await this.client.get(`/applicants/${verificationId}/status`);
      return this.mapProviderStatus(response.data.reviewStatus);
    } catch (error: any) {
      throw new Error(`Failed to get verification status: ${error.message}`);
    }
  }

  /**
   * Get user verification details
   */
  async getUserVerification(userId: string): Promise<KYCVerification | null> {
    try {
      const response = await this.client.get(`/applicants`, {
        params: { externalUserId: userId },
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      const applicant = response.data.items[0];
      return {
        id: applicant.id,
        userId,
        level: this.mapProviderLevel(applicant.levelName),
        status: this.mapProviderStatus(applicant.reviewStatus),
        createdAt: new Date(applicant.createdAt),
        updatedAt: new Date(applicant.updatedAt),
      };
    } catch (error: any) {
      console.error('Failed to get user verification:', error);
      return null;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Implementation varies by provider
    // This is a placeholder
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(event: any): Promise<void> {
    // Handle status updates from KYC provider
    console.log('KYC webhook received:', event);
    // Update database, send notifications, etc.
  }

  // ========== HELPER METHODS ==========

  private mapLevelToProvider(level: KYCLevel): string {
    const mappings = {
      [KYCLevel.NONE]: 'none',
      [KYCLevel.BASIC]: 'basic-kyc-level',
      [KYCLevel.INTERMEDIATE]: 'intermediate-kyc-level',
      [KYCLevel.ADVANCED]: 'advanced-kyc-level',
      [KYCLevel.INSTITUTIONAL]: 'institutional-kyc-level',
    };
    return mappings[level];
  }

  private mapProviderStatus(status: string): KYCStatus {
    const statusMap: Record<string, KYCStatus> = {
      'init': KYCStatus.NOT_STARTED,
      'pending': KYCStatus.PENDING,
      'queued': KYCStatus.IN_REVIEW,
      'completed': KYCStatus.APPROVED,
      'approved': KYCStatus.APPROVED,
      'rejected': KYCStatus.REJECTED,
      'retry': KYCStatus.RESUBMISSION_REQUIRED,
    };

    return statusMap[status.toLowerCase()] || KYCStatus.PENDING;
  }

  private mapProviderLevel(levelName: string): KYCLevel {
    if (levelName.includes('basic')) return KYCLevel.BASIC;
    if (levelName.includes('intermediate')) return KYCLevel.INTERMEDIATE;
    if (levelName.includes('advanced')) return KYCLevel.ADVANCED;
    if (levelName.includes('institutional')) return KYCLevel.INSTITUTIONAL;
    return KYCLevel.NONE;
  }

  private generateVerificationUrl(applicantId: string): string {
    // Generate provider-specific verification URL
    return `${this.getBaseUrl()}/verify/${applicantId}`;
  }
}

// ========== KYC LIMITS & ENFORCEMENT ==========

export class KYCLimitsService {
  /**
   * Get transaction limits based on KYC level
   */
  static getLimits(level: KYCLevel): KYCLimits {
    const limits: Record<KYCLevel, KYCLimits> = {
      [KYCLevel.NONE]: {
        dailyLimit: 0,
        monthlyLimit: 0,
        transactionLimit: 0,
        withdrawalLimit: 0,
      },
      [KYCLevel.BASIC]: {
        dailyLimit: 1000, // $1k/day
        monthlyLimit: 10000, // $10k/month
        transactionLimit: 100, // $100/tx
        withdrawalLimit: 500, // $500/day
      },
      [KYCLevel.INTERMEDIATE]: {
        dailyLimit: 10000,
        monthlyLimit: 100000,
        transactionLimit: 1000,
        withdrawalLimit: 5000,
      },
      [KYCLevel.ADVANCED]: {
        dailyLimit: 100000,
        monthlyLimit: 1000000,
        transactionLimit: 10000,
        withdrawalLimit: 50000,
      },
      [KYCLevel.INSTITUTIONAL]: {
        dailyLimit: Infinity,
        monthlyLimit: Infinity,
        transactionLimit: Infinity,
        withdrawalLimit: Infinity,
      },
    };

    return limits[level];
  }

  /**
   * Check if transaction is within limits
   */
  static async checkTransactionLimits(
    userId: string,
    amount: number,
    level: KYCLevel,
    currentDailyVolume: number,
    currentMonthlyVolume: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const limits = this.getLimits(level);

    // Check transaction limit
    if (amount > limits.transactionLimit) {
      return {
        allowed: false,
        reason: `Transaction exceeds ${level} level limit of $${limits.transactionLimit}`,
      };
    }

    // Check daily limit
    if (currentDailyVolume + amount > limits.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit of $${limits.dailyLimit} would be exceeded`,
      };
    }

    // Check monthly limit
    if (currentMonthlyVolume + amount > limits.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly limit of $${limits.monthlyLimit} would be exceeded`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get required KYC level for amount
   */
  static getRequiredLevel(amount: number): KYCLevel {
    if (amount <= 100) return KYCLevel.BASIC;
    if (amount <= 1000) return KYCLevel.INTERMEDIATE;
    if (amount <= 10000) return KYCLevel.ADVANCED;
    return KYCLevel.INSTITUTIONAL;
  }
}

// ========== EXPORTS ==========

export default {
  KYCClient,
  KYCLimitsService,
  KYCProvider,
  KYCLevel,
  KYCStatus,
};

