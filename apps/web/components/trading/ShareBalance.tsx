"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import { useProgram } from "@/hooks/useProgram";
import { getShareBalance, calculateUnrealizedPnl, calculateTotalPnl, formatPrice } from "@/lib/sdk/shares";

interface ShareBalanceProps {
  arena: PublicKey;
  outcomeIndex: number;
  outcomeName: string;
  currentPrice: number;
}

interface BalanceData {
  balance: number;
  avgCostBasis: number;
  totalInvested: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  currentValue: number;
  roi: number;
}

export function ShareBalance({ arena, outcomeIndex, outcomeName, currentPrice }: ShareBalanceProps) {
  const { publicKey } = useWallet();
  const program = useProgram();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey || !program) {
      setLoading(false);
      return;
    }

    loadBalance();
    const interval = setInterval(loadBalance, 10000); // Refresh every 10s

    return () => clearInterval(interval);
  }, [publicKey, program, arena, outcomeIndex, currentPrice]);

  const loadBalance = async () => {
    if (!publicKey || !program) return;

    try {
      // Get outcome share PDA
      const [outcomeSharePda] = await PublicKey.findProgramAddressSync(
        [
          Buffer.from("outcome_share"),
          arena.toBuffer(),
          Buffer.from([outcomeIndex]),
        ],
        program.programId
      );

      const balance = await getShareBalance(program, outcomeSharePda, publicKey);

      if (!balance) {
        setBalanceData(null);
        setLoading(false);
        return;
      }

      // Calculate P&L
      const unrealizedPnl = calculateUnrealizedPnl(
        balance.balance,
        balance.avgCostBasis,
        { toNumber: () => currentPrice } as any
      );

      const totalPnl = calculateTotalPnl(
        balance.balance,
        balance.avgCostBasis,
        { toNumber: () => currentPrice } as any,
        balance.realizedPnl
      );

      const currentValue = (balance.balance.toNumber() * currentPrice) / 1e9;
      const totalInvested = balance.totalInvested.toNumber() / 1e9;
      const roi = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

      setBalanceData({
        balance: balance.balance.toNumber(),
        avgCostBasis: balance.avgCostBasis.toNumber() / 1e9,
        totalInvested,
        realizedPnl: balance.realizedPnl.toNumber() / 1e9,
        unrealizedPnl,
        totalPnl,
        currentValue,
        roi,
      });
    } catch (error) {
      console.error("Error loading balance:", error);
      setBalanceData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Wallet className="h-5 w-5" />
            <p>Connect wallet to view your position</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!balanceData || balanceData.balance === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center text-slate-400">
            <p>No position in {outcomeName}</p>
            <p className="text-sm mt-1">Buy shares to start trading</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProfitable = balanceData.totalPnl >= 0;

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white">
            Your Position: {outcomeName}
          </CardTitle>
          <Badge
            variant={isProfitable ? "default" : "destructive"}
            className={isProfitable ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : ""}
          >
            {isProfitable ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {balanceData.roi >= 0 ? "+" : ""}{balanceData.roi.toFixed(2)}% ROI
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Holdings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Holdings</p>
            <p className="text-2xl font-bold text-white">
              {(balanceData.balance / 1e9).toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 mt-1">shares</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Current Value</p>
            <p className="text-2xl font-bold text-white">
              {balanceData.currentValue.toFixed(4)}
            </p>
            <p className="text-xs text-slate-400 mt-1">SOL</p>
          </div>
        </div>

        {/* Cost Basis & Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Avg Cost</p>
            <p className="text-sm font-semibold text-white">
              {balanceData.avgCostBasis.toFixed(6)} SOL
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Current Price</p>
            <p className="text-sm font-semibold text-white">
              {(currentPrice / 1e9).toFixed(6)} SOL
            </p>
          </div>
        </div>

        {/* P&L Breakdown */}
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Total Invested</span>
            <span className="text-sm font-medium text-white">
              {balanceData.totalInvested.toFixed(4)} SOL
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Realized P&L</span>
            <span className={`text-sm font-medium ${balanceData.realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {balanceData.realizedPnl >= 0 ? "+" : ""}{balanceData.realizedPnl.toFixed(4)} SOL
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Unrealized P&L</span>
            <span className={`text-sm font-medium ${balanceData.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {balanceData.unrealizedPnl >= 0 ? "+" : ""}{balanceData.unrealizedPnl.toFixed(4)} SOL
            </span>
          </div>

          <div className="pt-2 border-t border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-white">Total P&L</span>
              <span className={`text-lg font-bold ${isProfitable ? "text-emerald-400" : "text-red-400"}`}>
                {balanceData.totalPnl >= 0 ? "+" : ""}{balanceData.totalPnl.toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>Break-even: {balanceData.avgCostBasis.toFixed(6)} SOL</span>
          </div>
          <div>
            {isProfitable ? (
              <span className="text-emerald-400">In profit</span>
            ) : (
              <span className="text-red-400">At loss</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

