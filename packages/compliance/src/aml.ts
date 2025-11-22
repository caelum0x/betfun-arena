import axios, { AxiosInstance } from 'axios';

// ========== AML SCREENING ==========

/**
 * Anti-Money Laundering (AML) Screening Service
 * Compatible with Chainalysis, Elliptic, TRM Labs, etc.
 */

export enum AMLProvider {
  CHAINALYSIS = 'chainalysis',
  ELLIPTIC = 'elliptic',
  TRM_LABS = 'trm',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SEVERE = 'severe',
}

export interface AMLConfig {
  provider: AMLProvider;
  apiKey: string;
  network: 'solana' | 'ethereum' | 'bitcoin';
}

export interface AMLScreeningResult {
  address: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  flags: string[];
  sanctions: boolean;
  pep: boolean; // Politically Exposed Person
  adverseMedia: boolean;
  darknetActivity: boolean;
  mixerExposure: boolean;
  ransomwareExposure: boolean;
  scamExposure: boolean;
  category?: string;
  details?: any;
  screenedAt: Date;
}

export interface TransactionScreening {
  transactionId: string;
  sourceAddress: string;
  destinationAddress: string;
  amount: number;
  riskAssessment: AMLScreeningResult;
  approved: boolean;
  requiresReview: boolean;
  blockedReason?: string;
}

// ========== AML CLIENT ==========

export class AMLClient {
  private client: AxiosInstance;
  private config: AMLConfig;

  constructor(config: AMLConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: this.getBaseUrl(),
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  private getBaseUrl(): string {
    const urls = {
      [AMLProvider.CHAINALYSIS]: 'https://api.chainalysis.com/api/kyt/v2',
      [AMLProvider.ELLIPTIC]: 'https://api.elliptic.co/v2',
      [AMLProvider.TRM_LABS]: 'https://api.trmlabs.com/public/v2',
    };

    return urls[this.config.provider];
  }

  /**
   * Screen a wallet address for AML risk
   */
  async screenAddress(address: string): Promise<AMLScreeningResult> {
    try {
      // Implementation varies by provider
      // This is a generic template for Chainalysis-style API

      const response = await this.client.post('/addresses/screen', {
        address,
        network: this.config.network,
      });

      const data = response.data;

      const result: AMLScreeningResult = {
        address,
        riskLevel: this.calculateRiskLevel(data.riskScore || 0, data.alerts || []),
        riskScore: data.riskScore || 0,
        flags: this.extractFlags(data),
        sanctions: data.sanctions || false,
        pep: data.pep || false,
        adverseMedia: data.adverseMedia || false,
        darknetActivity: this.checkExposure(data, 'darknet'),
        mixerExposure: this.checkExposure(data, 'mixer'),
        ransomwareExposure: this.checkExposure(data, 'ransomware'),
        scamExposure: this.checkExposure(data, 'scam'),
        category: data.category,
        details: data.details,
        screenedAt: new Date(),
      };

      return result;
    } catch (error: any) {
      // Fallback to basic screening if API fails
      console.error('AML screening failed, using fallback:', error.message);
      return this.fallbackScreening(address);
    }
  }

  /**
   * Screen a transaction
   */
  async screenTransaction(
    transactionId: string,
    sourceAddress: string,
    destinationAddress: string,
    amount: number
  ): Promise<TransactionScreening> {
    // Screen both source and destination
    const [sourceResult, destResult] = await Promise.all([
      this.screenAddress(sourceAddress),
      this.screenAddress(destinationAddress),
    ]);

    // Determine overall risk
    const highestRisk = this.getHighestRisk(sourceResult, destResult);
    
    const approved = highestRisk.riskLevel !== RiskLevel.SEVERE &&
                    !highestRisk.sanctions;
    
    const requiresReview = highestRisk.riskLevel === RiskLevel.HIGH ||
                          highestRisk.pep;

    let blockedReason: string | undefined;
    if (!approved) {
      if (highestRisk.sanctions) {
        blockedReason = 'Sanctioned address detected';
      } else if (highestRisk.riskLevel === RiskLevel.SEVERE) {
        blockedReason = 'Severe risk level detected';
      }
    }

    return {
      transactionId,
      sourceAddress,
      destinationAddress,
      amount,
      riskAssessment: highestRisk,
      approved,
      requiresReview,
      blockedReason,
    };
  }

  /**
   * Batch screen multiple addresses
   */
  async screenAddressesBatch(addresses: string[]): Promise<AMLScreeningResult[]> {
    try {
      const response = await this.client.post('/addresses/screen/batch', {
        addresses,
        network: this.config.network,
      });

      return response.data.results.map((result: any) => ({
        address: result.address,
        riskLevel: this.calculateRiskLevel(result.riskScore, result.alerts),
        riskScore: result.riskScore || 0,
        flags: this.extractFlags(result),
        sanctions: result.sanctions || false,
        pep: result.pep || false,
        adverseMedia: result.adverseMedia || false,
        darknetActivity: this.checkExposure(result, 'darknet'),
        mixerExposure: this.checkExposure(result, 'mixer'),
        ransomwareExposure: this.checkExposure(result, 'ransomware'),
        scamExposure: this.checkExposure(result, 'scam'),
        screenedAt: new Date(),
      }));
    } catch (error) {
      // Fallback to individual screening
      return Promise.all(addresses.map(addr => this.screenAddress(addr)));
    }
  }

  // ========== HELPER METHODS ==========

  private calculateRiskLevel(score: number, alerts: any[]): RiskLevel {
    if (score >= 75 || alerts.some((a: any) => a.severity === 'critical')) {
      return RiskLevel.SEVERE;
    }
    if (score >= 50 || alerts.some((a: any) => a.severity === 'high')) {
      return RiskLevel.HIGH;
    }
    if (score >= 25) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }

  private extractFlags(data: any): string[] {
    const flags: string[] = [];
    
    if (data.sanctions) flags.push('Sanctioned Address');
    if (data.pep) flags.push('Politically Exposed Person');
    if (data.adverseMedia) flags.push('Adverse Media');
    if (this.checkExposure(data, 'darknet')) flags.push('Darknet Activity');
    if (this.checkExposure(data, 'mixer')) flags.push('Mixer Usage');
    if (this.checkExposure(data, 'ransomware')) flags.push('Ransomware');
    if (this.checkExposure(data, 'scam')) flags.push('Scam Involvement');
    if (data.stolen) flags.push('Stolen Funds');
    
    return flags;
  }

  private checkExposure(data: any, type: string): boolean {
    return data.exposures?.some((e: any) => e.type === type) || false;
  }

  private getHighestRisk(
    result1: AMLScreeningResult,
    result2: AMLScreeningResult
  ): AMLScreeningResult {
    const riskOrder = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 1,
      [RiskLevel.HIGH]: 2,
      [RiskLevel.SEVERE]: 3,
    };

    return riskOrder[result1.riskLevel] >= riskOrder[result2.riskLevel]
      ? result1
      : result2;
  }

  private fallbackScreening(address: string): AMLScreeningResult {
    // Basic fallback when API is unavailable
    return {
      address,
      riskLevel: RiskLevel.LOW,
      riskScore: 0,
      flags: ['Screening unavailable - using fallback'],
      sanctions: false,
      pep: false,
      adverseMedia: false,
      darknetActivity: false,
      mixerExposure: false,
      ransomwareExposure: false,
      scamExposure: false,
      screenedAt: new Date(),
    };
  }
}

// ========== AML POLICY ENFORCEMENT ==========

export class AMLPolicyService {
  /**
   * Determine if transaction should be blocked
   */
  static shouldBlockTransaction(screening: TransactionScreening): boolean {
    return !screening.approved;
  }

  /**
   * Determine if transaction requires manual review
   */
  static requiresManualReview(screening: TransactionScreening): boolean {
    return screening.requiresReview;
  }

  /**
   * Get recommended action for screening result
   */
  static getRecommendedAction(result: AMLScreeningResult): {
    action: 'approve' | 'review' | 'block';
    reason: string;
  } {
    if (result.sanctions) {
      return {
        action: 'block',
        reason: 'Address is on sanctions list',
      };
    }

    if (result.riskLevel === RiskLevel.SEVERE) {
      return {
        action: 'block',
        reason: 'Severe risk level detected',
      };
    }

    if (result.riskLevel === RiskLevel.HIGH || result.pep) {
      return {
        action: 'review',
        reason: 'High risk requires manual review',
      };
    }

    return {
      action: 'approve',
      reason: 'Risk within acceptable limits',
    };
  }
}

// ========== EXPORTS ==========

export default {
  AMLClient,
  AMLPolicyService,
  AMLProvider,
  RiskLevel,
};

