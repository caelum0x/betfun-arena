'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ========== ADMIN COMPLIANCE DASHBOARD ==========

interface PendingReview {
  id: string;
  type: 'kyc' | 'transaction';
  wallet: string;
  level?: string;
  status?: string;
  transactionId?: string;
  createdAt: Date;
  riskScore?: number;
  flags?: string[];
}

export default function ComplianceDashboard() {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [highRiskUsers, setHighRiskUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pendingKYC: 0,
    pendingTransactions: 0,
    highRisk: 0,
    blocked: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reviewsRes, usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/compliance/reviews'),
        fetch('/api/admin/compliance/high-risk'),
        fetch('/api/admin/compliance/stats'),
      ]);

      const reviews = await reviewsRes.json();
      const users = await usersRes.json();
      const statsData = await statsRes.json();

      setPendingReviews(reviews.data);
      setHighRiskUsers(users.data);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    }
  };

  const approveReview = async (id: string, type: string) => {
    try {
      await fetch(`/api/admin/compliance/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const rejectReview = async (id: string, type: string, reason: string) => {
    try {
      await fetch(`/api/admin/compliance/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, reason }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Compliance Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <p className="text-sm text-gray-400 mb-2">Pending KYC</p>
          <p className="text-3xl font-bold">{stats.pendingKYC}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-400 mb-2">Pending Transactions</p>
          <p className="text-3xl font-bold">{stats.pendingTransactions}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-400 mb-2">High Risk Users</p>
          <p className="text-3xl font-bold text-red-500">{stats.highRisk}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-400 mb-2">Blocked</p>
          <p className="text-3xl font-bold text-red-500">{stats.blocked}</p>
        </Card>
      </div>

      {/* Pending Reviews */}
      <Card className="p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Pending Reviews</h2>
        
        {pendingReviews.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No pending reviews</p>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((review) => (
              <div key={review.id} className="border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Badge className={review.type === 'kyc' ? 'bg-blue-500' : 'bg-purple-500'}>
                      {review.type.toUpperCase()}
                    </Badge>
                    <span className="ml-3 text-sm text-gray-400">
                      {new Date(review.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {review.riskScore && (
                    <Badge className={review.riskScore > 75 ? 'bg-red-500' : 'bg-yellow-500'}>
                      Risk: {review.riskScore}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <p><strong>Wallet:</strong> {review.wallet}</p>
                  {review.level && <p><strong>KYC Level:</strong> {review.level}</p>}
                  {review.transactionId && <p><strong>TX:</strong> {review.transactionId}</p>}
                  {review.flags && review.flags.length > 0 && (
                    <div>
                      <strong>Flags:</strong>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {review.flags.map((flag, i) => (
                          <Badge key={i} className="bg-red-600">{flag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => approveReview(review.id, review.type)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) rejectReview(review.id, review.type, reason);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Reject
                  </Button>
                  <Button variant="outline">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* High Risk Users */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">High Risk Users</h2>
        
        {highRiskUsers.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No high risk users</p>
        ) : (
          <div className="space-y-3">
            {highRiskUsers.map((user, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-700 rounded-lg p-3">
                <div>
                  <p className="font-mono">{user.wallet}</p>
                  <div className="flex gap-2 mt-2">
                    {user.flags?.map((flag: string, j: number) => (
                      <Badge key={j} className="bg-red-600 text-xs">{flag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-red-600">Risk: {user.riskScore}</Badge>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(user.screenedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

