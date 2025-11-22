import * as geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

// ========== RISK SCORING ==========

export interface FraudCheckContext {
  wallet: string;
  ip: string;
  userAgent: string;
  amount: number;
  timestamp: number;
  // Historical data
  previousTransactions?: Transaction[];
  accountAge?: number; // in days
}

export interface Transaction {
  amount: number;
  timestamp: number;
  type: 'bet' | 'claim' | 'create';
  ip?: string;
}

export interface RiskScore {
  score: number; // 0-100 (higher = more risky)
  level: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  requiresReview: boolean;
  requiresVerification: boolean;
  blocked: boolean;
}

/**
 * Assess fraud risk for a transaction
 */
export function assessFraudRisk(context: FraudCheckContext): RiskScore {
  let score = 0;
  const flags: string[] = [];

  // 1. VPN/Proxy Detection
  const geo = geoip.lookup(context.ip);
  if (isVPN(context.ip)) {
    score += 20;
    flags.push('VPN/Proxy detected');
  }

  // 2. Location Risk
  if (geo) {
    const restrictedCountries = ['XX', 'YY']; // Add country codes
    if (restrictedCountries.includes(geo.country)) {
      score += 50;
      flags.push(`Restricted country: ${geo.country}`);
    }
  }

  // 3. User Agent Analysis
  const ua = new UAParser(context.userAgent);
  if (!ua.getBrowser().name || !ua.getOS().name) {
    score += 15;
    flags.push('Suspicious user agent');
  }

  // 4. Velocity Checks
  if (context.previousTransactions) {
    const recentTxs = context.previousTransactions.filter(
      tx => context.timestamp - tx.timestamp < 3600000 // Last hour
    );

    // Too many transactions in short time
    if (recentTxs.length > 10) {
      score += 25;
      flags.push('High transaction velocity');
    }

    // Rapid IP changes
    const uniqueIPs = new Set(recentTxs.map(tx => tx.ip).filter(Boolean));
    if (uniqueIPs.size > 3) {
      score += 20;
      flags.push('Multiple IPs in short timeframe');
    }
  }

  // 5. Amount Analysis
  const sol = context.amount / 1e9;
  if (sol > 100) {
    score += 15;
    flags.push('Large transaction amount');
  }

  // 6. New Account Risk
  if (context.accountAge !== undefined && context.accountAge < 1) {
    score += 10;
    flags.push('New account (< 24 hours)');
  }

  // 7. Pattern Detection
  if (context.previousTransactions) {
    // Check for suspicious patterns
    const amounts = context.previousTransactions.map(tx => tx.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Sudden large increase
    if (context.amount > avgAmount * 5) {
      score += 15;
      flags.push('Unusual transaction amount');
    }

    // Repeated exact amounts (possible automation)
    const duplicates = amounts.filter(a => a === context.amount).length;
    if (duplicates > 3) {
      score += 10;
      flags.push('Repeated transaction pattern');
    }
  }

  // Determine risk level and actions
  const level = 
    score >= 75 ? 'critical' :
    score >= 50 ? 'high' :
    score >= 25 ? 'medium' : 'low';

  return {
    score,
    level,
    flags,
    requiresReview: score >= 50,
    requiresVerification: score >= 75,
    blocked: score >= 90,
  };
}

/**
 * Check if IP is likely a VPN/Proxy
 */
function isVPN(ip: string): boolean {
  // Basic check - in production, use a VPN detection service
  const vpnRanges = [
    // Add known VPN IP ranges
  ];

  // Check against known VPN providers
  const vpnProviders = [
    'digitalocean', 'linode', 'vultr', 'ovh',
    // Add more VPN/hosting providers
  ];

  const geo = geoip.lookup(ip);
  if (geo?.org) {
    const orgLower = geo.org.toLowerCase();
    if (vpnProviders.some(provider => orgLower.includes(provider))) {
      return true;
    }
  }

  return false;
}

// ========== BEHAVIORAL ANALYSIS ==========

export interface BehaviorPattern {
  wallet: string;
  patterns: {
    avgBetAmount: number;
    avgBetFrequency: number; // bets per day
    preferredOutcomes: Map<string, number>;
    activeHours: number[]; // 0-23
    winRate: number;
  };
  anomalies: string[];
}

/**
 * Analyze user behavior for anomalies
 */
export function analyzeBehavior(
  transactions: Transaction[],
  currentTx: Transaction
): BehaviorPattern {
  const anomalies: string[] = [];

  // Calculate averages
  const avgAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length;
  
  // Time-based analysis
  const txsPerDay = transactions.length / Math.max(1, 
    (Date.now() - transactions[0].timestamp) / (24 * 60 * 60 * 1000)
  );

  // Check for anomalies
  if (currentTx.amount > avgAmount * 10) {
    anomalies.push('Transaction amount significantly higher than average');
  }

  const recentTxCount = transactions.filter(
    tx => currentTx.timestamp - tx.timestamp < 24 * 60 * 60 * 1000
  ).length;

  if (recentTxCount > txsPerDay * 5) {
    anomalies.push('Unusual spike in transaction frequency');
  }

  return {
    wallet: '', // Set from context
    patterns: {
      avgBetAmount: avgAmount,
      avgBetFrequency: txsPerDay,
      preferredOutcomes: new Map(),
      activeHours: [],
      winRate: 0,
    },
    anomalies,
  };
}

// ========== WALLET REPUTATION ==========

export interface WalletReputation {
  wallet: string;
  trustScore: number; // 0-100 (higher = more trusted)
  flags: string[];
  verificationLevel: 'none' | 'basic' | 'verified' | 'trusted';
  history: {
    totalTransactions: number;
    totalVolume: number;
    accountAge: number;
    disputes: number;
    successfulClaims: number;
  };
}

/**
 * Calculate wallet reputation score
 */
export function calculateWalletReputation(
  wallet: string,
  history: any
): WalletReputation {
  let trustScore = 50; // Start neutral
  const flags: string[] = [];

  // Positive factors
  if (history.accountAge > 30) trustScore += 10;
  if (history.accountAge > 90) trustScore += 10;
  if (history.totalTransactions > 10) trustScore += 10;
  if (history.totalTransactions > 50) trustScore += 10;
  if (history.successfulClaims > 5) trustScore += 10;

  // Negative factors
  if (history.disputes > 0) {
    trustScore -= history.disputes * 10;
    flags.push(`${history.disputes} disputes`);
  }

  // Clamp score
  trustScore = Math.max(0, Math.min(100, trustScore));

  // Determine verification level
  const verificationLevel =
    trustScore >= 80 ? 'trusted' :
    trustScore >= 60 ? 'verified' :
    trustScore >= 40 ? 'basic' : 'none';

  return {
    wallet,
    trustScore,
    flags,
    verificationLevel,
    history,
  };
}

// ========== TRANSACTION MONITORING ==========

export interface SuspiciousActivity {
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendedAction: 'allow' | 'flag' | 'review' | 'block';
}

/**
 * Real-time transaction monitoring
 */
export function monitorTransaction(
  context: FraudCheckContext
): SuspiciousActivity {
  const riskScore = assessFraudRisk(context);
  const detected = riskScore.score >= 25;

  const severity =
    riskScore.score >= 75 ? 'high' :
    riskScore.score >= 50 ? 'medium' : 'low';

  const recommendedAction =
    riskScore.blocked ? 'block' :
    riskScore.requiresVerification ? 'review' :
    riskScore.requiresReview ? 'flag' : 'allow';

  return {
    detected,
    severity,
    reasons: riskScore.flags,
    recommendedAction,
  };
}

// ========== EXPORTS ==========

export default {
  assessFraudRisk,
  analyzeBehavior,
  calculateWalletReputation,
  monitorTransaction,
};

