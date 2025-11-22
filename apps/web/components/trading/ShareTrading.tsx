"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, BN } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { useShareTrading } from "@/hooks/useShareTrading";
import { formatErrorForDisplay } from "@/lib/errorHandler";
import { toast } from "sonner";

interface ShareTradingProps {
  arena: string; // Arena PDA as string
  outcomeIndex: number;
  outcomeName: string;
  onTradeComplete?: () => void;
}

export function ShareTrading({
  arena,
  outcomeIndex,
  outcomeName,
  onTradeComplete,
}: ShareTradingProps) {
  const { publicKey } = useWallet();
  const {
    outcomeShare,
    shareBalance,
    loading: dataLoading,
    trading,
    buyShares,
    sellShares,
  } = useShareTrading(arena, outcomeIndex);

  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // Calculate derived values
  const currentPrice = outcomeShare?.currentPrice?.toNumber() || 0;
  const userBalance = shareBalance?.balance?.toNumber() || 0;
  const volume24h = outcomeShare?.volume24h?.toNumber() || 0;
  const price24hAgo = outcomeShare?.price24hAgo?.toNumber() || currentPrice;
  const priceChange24h = price24hAgo > 0 
    ? ((currentPrice - price24hAgo) / price24hAgo) * 100 
    : 0;

  useEffect(() => {
    // Recalculate estimated cost when amount or price changes
    if (!amount || isNaN(parseFloat(amount)) || !currentPrice) {
      setEstimatedCost(null);
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      setEstimatedCost(null);
      return;
    }

    // Calculate cost/proceeds: amount * price / 1e9 (price is in lamports)
    const cost = (amountNum * currentPrice) / 1e9;
    setEstimatedCost(cost);
  }, [amount, currentPrice, activeTab]);

  const handleTrade = async () => {
    if (!publicKey || !amount) {
      toast.error("Please enter an amount");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Convert to number of shares (amount is in shares, not lamports)
    const sharesAmount = Math.floor(amountNum);

    try {
      if (activeTab === "buy") {
        const signature = await buyShares(sharesAmount);
        toast.success(`Successfully bought ${sharesAmount} shares!`, {
          description: `Transaction: ${signature.slice(0, 8)}...`,
        });
      } else {
        if (sharesAmount > userBalance) {
          toast.error("Insufficient balance");
          return;
        }

        const signature = await sellShares(sharesAmount);
        toast.success(`Successfully sold ${sharesAmount} shares!`, {
          description: `Transaction: ${signature.slice(0, 8)}...`,
        });
      }

      setAmount("");
      setEstimatedCost(null);
      onTradeComplete?.();
    } catch (error: any) {
      console.error("Trade error:", error);
      const errorInfo = formatErrorForDisplay(error);
      toast.error(errorInfo.title, {
        description: errorInfo.message,
        action: errorInfo.retryable ? {
          label: "Retry",
          onClick: () => handleTrade(),
        } : undefined,
      });
    }
  };

  const setMaxAmount = () => {
    if (activeTab === "sell" && userBalance > 0) {
      setAmount(userBalance.toString());
    }
  };

  if (dataLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-400">Loading share data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!outcomeShare) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-6">
          <Alert className="bg-yellow-500/10 border-yellow-500/50">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500 text-sm">
              Share tokens not created yet. The arena creator needs to create share tokens first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isPriceUp = priceChange24h >= 0;

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white">
            Trade {outcomeName}
          </CardTitle>
          <Badge
            variant={isPriceUp ? "default" : "destructive"}
            className={isPriceUp ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : ""}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {isPriceUp ? "+" : ""}{priceChange24h.toFixed(2)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Info */}
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">Current Price</span>
            <span className="text-lg font-bold text-white">
              {(currentPrice / 1e9).toFixed(6)} SOL
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>24h Volume</span>
            <span>{(volume24h / 1e9).toFixed(2)} SOL</span>
          </div>
        </div>

        {/* Trading Interface */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "buy" | "sell")}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger
              value="buy"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Buy
            </TabsTrigger>
            <TabsTrigger
              value="sell"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="buy-amount" className="text-slate-300">
                Amount (shares)
              </Label>
              <Input
                id="buy-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                step="0.01"
                min="0"
              />
            </div>

            {estimatedCost !== null && (
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Estimated Cost</span>
                  <span className="text-lg font-bold text-white">
                    {estimatedCost.toFixed(4)} SOL
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                  <span>Price per share</span>
                  <span>{(currentPrice / 1e9).toFixed(6)} SOL</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleTrade}
              disabled={!publicKey || trading || !amount || !estimatedCost}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
            >
              {trading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buying...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Buy Shares
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sell-amount" className="text-slate-300">
                  Amount (shares)
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={setMaxAmount}
                  className="text-xs text-blue-400 hover:text-blue-300 h-auto p-0"
                >
                  Max: {(userBalance / 1e9).toFixed(4)}
                </Button>
              </div>
              <Input
                id="sell-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                step="0.01"
                min="0"
                max={userBalance / 1e9}
              />
            </div>

            {estimatedCost !== null && (
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Estimated Proceeds</span>
                  <span className="text-lg font-bold text-white">
                    {estimatedCost.toFixed(4)} SOL
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                  <span>Price per share</span>
                  <span>{(currentPrice / 1e9).toFixed(6)} SOL</span>
                </div>
              </div>
            )}

            {userBalance === 0 && (
              <Alert className="bg-yellow-500/10 border-yellow-500/50">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-500 text-sm">
                  You don't own any shares of this outcome
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleTrade}
              disabled={!publicKey || trading || !amount || !estimatedCost || userBalance === 0}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              {trading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Selling...
                </>
              ) : (
                <>
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Sell Shares
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Trading Info */}
        <Alert className="bg-blue-500/10 border-blue-500/50">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-400 text-xs">
            Trading fee: 0.3% • Instant execution • No slippage on small orders
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

