"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Wallet, DollarSign, Trophy, Droplets } from "lucide-react";
import { useProgram } from "@/hooks/useProgram";
import Link from "next/link";

export default function PortfolioPage() {
  const { publicKey } = useWallet();
  const program = useProgram();
  const [positions, setPositions] = useState<any[]>([]);
  const [liquidityPositions, setLiquidityPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalValue: 0,
    totalPnl: 0,
    totalInvested: 0,
    roi: 0,
  });

  useEffect(() => {
    if (!publicKey || !program) {
      setLoading(false);
      return;
    }

    loadPortfolio();
  }, [publicKey, program]);

  const loadPortfolio = async () => {
    if (!publicKey || !program) return;

    try {
      // Fetch all share balances
      const shareBalances = await program.account.shareBalance.all([
        {
          memcmp: {
            offset: 8, // discriminator
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      // Fetch all liquidity positions
      const lpPositions = await program.account.liquidityPosition.all([
        {
          memcmp: {
            offset: 8 + 32, // discriminator + pool
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      // Fetch all orders
      const userOrders = await program.account.limitOrder.all([
        {
          memcmp: {
            offset: 8 + 8 + 32 + 1, // discriminator + order_id + arena + outcome_index
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      setPositions(shareBalances.map(p => p.account));
      setLiquidityPositions(lpPositions.map(p => p.account));
      setOrders(userOrders.map(o => o.account).filter((o: any) => o.status.open || o.status.partiallyFilled));

      // Calculate stats
      let totalValue = 0;
      let totalInvested = 0;
      let totalPnl = 0;

      shareBalances.forEach((pos: any) => {
        const invested = pos.account.totalInvested.toNumber() / 1e9;
        const pnl = pos.account.realizedPnl.toNumber() / 1e9;
        totalInvested += invested;
        totalPnl += pnl;
        totalValue += invested + pnl;
      });

      lpPositions.forEach((pos: any) => {
        const invested = pos.account.solDeposited.toNumber() / 1e9;
        const fees = pos.account.feesEarned.toNumber() / 1e9;
        totalInvested += invested;
        totalPnl += fees;
        totalValue += invested + fees;
      });

      const roi = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

      setStats({
        totalValue,
        totalPnl,
        totalInvested,
        roi,
      });
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Wallet className="h-12 w-12 text-slate-400" />
            <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
            <p className="text-slate-400">Connect your wallet to view your portfolio</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Portfolio</h1>
          <p className="text-slate-400">Track your positions, liquidity, and orders</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{stats.totalValue.toFixed(2)}</p>
              <p className="text-sm text-slate-400 mt-1">SOL</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {stats.totalPnl >= 0 ? "+" : ""}{stats.totalPnl.toFixed(2)}
              </p>
              <p className="text-sm text-slate-400 mt-1">SOL</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{stats.totalInvested.toFixed(2)}</p>
              <p className="text-sm text-slate-400 mt-1">SOL</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">ROI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {stats.roi >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-400" />
                )}
                <p className={`text-3xl font-bold ${stats.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {stats.roi >= 0 ? "+" : ""}{stats.roi.toFixed(2)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Tabs */}
        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 mb-6">
            <TabsTrigger value="positions" className="data-[state=active]:bg-slate-700">
              <Trophy className="h-4 w-4 mr-2" />
              Positions ({positions.length})
            </TabsTrigger>
            <TabsTrigger value="liquidity" className="data-[state=active]:bg-slate-700">
              <Droplets className="h-4 w-4 mr-2" />
              Liquidity ({liquidityPositions.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-slate-700">
              <DollarSign className="h-4 w-4 mr-2" />
              Orders ({orders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions">
            {positions.length === 0 ? (
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-8">
                <div className="text-center text-slate-400">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No positions yet</p>
                  <p className="text-sm mt-2">Start trading to build your portfolio</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positions.map((position, index) => (
                  <Card key={index} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg">Position #{index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-400">Balance</p>
                        <p className="text-xl font-bold text-white">
                          {(position.balance.toNumber() / 1e9).toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">P&L</p>
                        <p className={`text-lg font-semibold ${
                          position.realizedPnl.toNumber() >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {position.realizedPnl.toNumber() >= 0 ? "+" : ""}
                          {(position.realizedPnl.toNumber() / 1e9).toFixed(4)} SOL
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="liquidity">
            {liquidityPositions.length === 0 ? (
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-8">
                <div className="text-center text-slate-400">
                  <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No liquidity positions yet</p>
                  <p className="text-sm mt-2">Provide liquidity to earn fees</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liquidityPositions.map((position, index) => (
                  <Card key={index} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg">LP Position #{index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-400">LP Tokens</p>
                        <p className="text-xl font-bold text-white">
                          {(position.lpTokens.toNumber() / 1e9).toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Fees Earned</p>
                        <p className="text-lg font-semibold text-emerald-400">
                          +{(position.feesEarned.toNumber() / 1e9).toFixed(4)} SOL
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-8">
                <div className="text-center text-slate-400">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active orders</p>
                  <p className="text-sm mt-2">Place limit orders to appear here</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any, index) => (
                  <Card key={index} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant={order.side.buy ? "default" : "destructive"} className="mb-2">
                            {order.side.buy ? "BUY" : "SELL"}
                          </Badge>
                          <p className="text-lg font-semibold text-white">
                            {(order.price.toNumber() / 1e9).toFixed(6)} SOL
                          </p>
                          <p className="text-sm text-slate-400">
                            {(order.remainingSize.toNumber() / 1e9).toFixed(2)} / {(order.size.toNumber() / 1e9).toFixed(2)} shares
                          </p>
                        </div>
                        <Badge variant="outline">
                          {order.fillPercentage || 0}% Filled
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
