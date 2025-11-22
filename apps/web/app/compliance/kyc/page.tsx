'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ========== KYC PAGE ==========

interface KYCVerification {
  id: string;
  level: 'none' | 'basic' | 'intermediate' | 'advanced' | 'institutional';
  status: 'not_started' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'resubmission_required';
  verificationUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  rejectionReason?: string;
}

export default function KYCPage() {
  const { publicKey } = useWallet();
  const [verification, setVerification] = useState<KYCVerification | null>(null);
  const [loading, setLoading] = useState(false);

  const startVerification = async (level: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/kyc/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey?.toBase58(),
          level,
        }),
      });

      const data = await response.json();
      setVerification(data.verification);

      // Redirect to verification URL
      if (data.verification.verificationUrl) {
        window.open(data.verification.verificationUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to start KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLimits = (level: string) => {
    const limits = {
      none: { daily: '$0', monthly: '$0', transaction: '$0' },
      basic: { daily: '$1,000', monthly: '$10,000', transaction: '$100' },
      intermediate: { daily: '$10,000', monthly: '$100,000', transaction: '$1,000' },
      advanced: { daily: '$100,000', monthly: '$1,000,000', transaction: '$10,000' },
      institutional: { daily: 'Unlimited', monthly: 'Unlimited', transaction: 'Unlimited' },
    };
    return limits[level as keyof typeof limits];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      not_started: 'bg-gray-500',
      pending: 'bg-yellow-500',
      in_review: 'bg-blue-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
      resubmission_required: 'bg-orange-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to access KYC verification</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">KYC Verification</h1>

      {/* Current Status */}
      {verification && (
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Current Verification</h2>
            <Badge className={getStatusColor(verification.status)}>
              {verification.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <p><strong>Level:</strong> {verification.level.toUpperCase()}</p>
            <p><strong>Started:</strong> {new Date(verification.createdAt).toLocaleDateString()}</p>
            {verification.expiresAt && (
              <p><strong>Expires:</strong> {new Date(verification.expiresAt).toLocaleDateString()}</p>
            )}
            {verification.rejectionReason && (
              <p className="text-red-500"><strong>Reason:</strong> {verification.rejectionReason}</p>
            )}
          </div>

          {verification.verificationUrl && verification.status === 'pending' && (
            <Button
              onClick={() => window.open(verification.verificationUrl, '_blank')}
              className="mt-4"
            >
              Continue Verification
            </Button>
          )}
        </Card>
      )}

      {/* KYC Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['basic', 'intermediate', 'advanced', 'institutional'].map((level) => {
          const limits = getLimits(level);
          const isCurrentLevel = verification?.level === level;

          return (
            <Card key={level} className={`p-6 ${isCurrentLevel ? 'border-blue-500 border-2' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold capitalize">{level}</h3>
                {isCurrentLevel && <Badge className="bg-blue-500">Current</Badge>}
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Daily Limit</p>
                  <p className="text-lg font-semibold">{limits.daily}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Monthly Limit</p>
                  <p className="text-lg font-semibold">{limits.monthly}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Per Transaction</p>
                  <p className="text-lg font-semibold">{limits.transaction}</p>
                </div>
              </div>

              <Button
                onClick={() => startVerification(level)}
                disabled={loading || isCurrentLevel}
                className="w-full"
              >
                {isCurrentLevel ? 'Verified' : `Verify ${level}`}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card className="p-6 mt-8">
        <h2 className="text-2xl font-bold mb-4">Why KYC?</h2>
        <ul className="space-y-2 text-gray-300">
          <li>✅ Higher transaction limits</li>
          <li>✅ Faster withdrawals</li>
          <li>✅ Access to premium features</li>
          <li>✅ Enhanced account security</li>
          <li>✅ Regulatory compliance</li>
        </ul>

        <h3 className="text-xl font-bold mt-6 mb-3">Required Documents</h3>
        <ul className="space-y-2 text-gray-300">
          <li>• Government-issued ID (passport, driver's license, or national ID)</li>
          <li>• Proof of address (utility bill, bank statement, or lease agreement)</li>
          <li>• Selfie for identity verification</li>
        </ul>

        <p className="text-sm text-gray-400 mt-6">
          Your data is encrypted and securely stored. We never share your personal information with third parties without your consent.
        </p>
      </Card>
    </div>
  );
}

