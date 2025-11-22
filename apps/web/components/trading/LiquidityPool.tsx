"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Droplets, TrendingUp, AlertCircle, Loader2, Plus, Minus } from "lucide-react";
import { useAMM } from "@/hooks/useAMM";
import { formatErrorForDisplay } from "@/lib/errorHandler";
import { SlippageSettings } from "./SlippageSettings";
import { toast } from "sonner";

interface LiquidityPoolProps {
  arena: string | PublicKey; // Accept string or PublicKey
  outcomeIndex: number;
  outcomeName: string;
}

export function LiquidityPool({ arena, outcomeIndex, outcomeName }: LiquidityPoolProps) {
  const { publicKey } = useWallet();
  const arenaAddress = typeof arena === "string" ? arena : arena.toString();
  
  const {
    pool: poolData,
    liquidityPosition: positionData,
    loading: dataLoading,
    processing,
    currentPrice,
    priceChange24h,
    totalLiquidity,
    initializePool,
    addLiquidity: addLiquidityToPool,
    removeLiquidity: removeLiquidityFromPool,
  } = useAMM(arenaAddress, outcomeIndex);

  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");
  
  // Add liquidity state
  const [tokenAmount, setTokenAmount] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [estimatedLP, setEstimatedLP] = useState<number | null>(null);
  
  // Remove liquidity state
  const [lpToRemove, setLpToRemove] = useState("");
  const [estimatedWithdraw, setEstimatedWithdraw] = useState<{ tokens: number; sol: number } | null>(null);

  // Calculate estimated LP tokens when amounts change
  useEffect(() => {
    if (!poolData || !tokenAmount || !solAmount) {
      setEstimatedLP(null);
      return;
    }

    const tokens = parseFloat(tokenAmount) * 1e9;
    const sol = parseFloat(solAmount) * 1e9;

    if (poolData.totalLpTokens.toNumber() === 0) {
      // First liquidity provider
      const product = tokens * sol;
      const lp = Math.sqrt(product) / 1e9;
      setEstimatedLP(lp);
    } else {
      // Subsequent providers
      const lpFromTokens = (poolData.totalLpTokens.toNumber() * tokens) / poolData.tokenReserve.toNumber();
      const lpFromSol = (poolData.totalLpTokens.toNumber() * sol) / poolData.solReserve.toNumber();
      const lp = Math.min(lpFromTokens, lpFromSol) / 1e9;
      setEstimatedLP(lp);
    }
  }, [tokenAmount, solAmount, poolData]);

  // Calculate withdrawal amounts
  useEffect(() => {
    if (!poolData || !lpToRemove) {
      setEstimatedWithdraw(null);
      return;
    }

    const lp = parseFloat(lpToRemove) * 1e9;
    const tokenAmount = (poolData.tokenReserve.toNumber() * lp) / poolData.totalLpTokens.toNumber();
    const solAmount = (poolData.solReserve.toNumber() * lp) / poolData.totalLpTokens.toNumber();

    setEstimatedWithdraw({
      tokens: tokenAmount / 1e9,
      sol: solAmount / 1e9,
    });
  }, [lpToRemove, poolData]);

  const handleTokenAmountChange = (value: string) => {
    setTokenAmount(value);
    
    if (!poolData || !value || isNaN(parseFloat(value))) {
      setSolAmount("");
      return;
    }

    const tokens = parseFloat(value) * 1e9;
    
    // Calculate required SOL based on pool ratio
    if (poolData.tokenReserve.toNumber() > 0) {
      const requiredSol = (tokens * poolData.solReserve.toNumber()) / poolData.tokenReserve.toNumber();
      setSolAmount((requiredSol / 1e9).toFixed(4));
    } else {
      // Empty pool - user can set any ratio
      setSolAmount("");
    }
  };

  const handleAddLiquidity = async () => {
    if (!publicKey || !tokenAmount || !solAmount) {
      toast.error("Please enter amounts");
      return;
    }

    try {
      const tokens = Math.floor(parseFloat(tokenAmount) * 1e9);
      const sol = Math.floor(parseFloat(solAmount) * 1e9);
      const minLP = estimatedLP ? Math.floor(estimatedLP * 0.99 * 1e9) : 0; // 1% slippage

      const signature = await addLiquidityToPool(tokens, sol, minLP);

      toast.success("Liquidity added successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });

      setTokenAmount("");
      setSolAmount("");
      setEstimatedLP(null);
      } catch (error: any) {
        console.error("Add liquidity error:", error);
        const errorInfo = formatErrorForDisplay(error);
        toast.error(errorInfo.title, {
          description: errorInfo.message,
          action: errorInfo.retryable ? {
            label: "Retry",
            onClick: () => handleAddLiquidity(),
          } : undefined,
        });
      }
  };

  const handleRemoveLiquidity = async () => {
    if (!publicKey || !lpToRemove || !estimatedWithdraw) {
      toast.error("Please enter LP amount");
      return;
    }

    try {
      const lp = Math.floor(parseFloat(lpToRemove) * 1e9);
      const minTokens = Math.floor(estimatedWithdraw.tokens * 0.99 * 1e9); // 1% slippage
      const minSol = Math.floor(estimatedWithdraw.sol * 0.99 * 1e9);

      const signature = await removeLiquidityFromPool(lp, minTokens, minSol);

      toast.success("Liquidity removed successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });

      setLpToRemove("");
      setEstimatedWithdraw(null);
      } catch (error: any) {
        console.error("Remove liquidity error:", error);
        const errorInfo = formatErrorForDisplay(error);
        toast.error(errorInfo.title, {
          description: errorInfo.message,
          action: errorInfo.retryable ? {
            label: "Retry",
            onClick: () => handleRemoveLiquidity(),
          } : undefined,
        });
      }
  };

  const handleInitializePool = async () => {
    if (!publicKey) {
      toast.error("Please connect wallet");
      return;
    }

    try {
      const signature = await initializePool(30, 10); // 0.3% fee, 0.1% protocol fee
      toast.success("Pool initialized successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });
    } catch (error: any) {
      console.error("Initialize pool error:", error);
      toast.error("Failed to initialize pool", {
        description: error.message || "Please try again",
      });
    }
  };

  if (dataLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading pool data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!poolData) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <Alert className="bg-yellow-500/10 border-yellow-500/50 mb-4">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500 text-sm">
              Pool not initialized yet. Initialize the pool to enable liquidity provision.
            </AlertDescription>
          </Alert>
          {publicKey && (
            <Button
              onClick={handleInitializePool}
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Initialize Pool
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const poolPrice = currentPrice || 0;
  const tvl = totalLiquidity || 0;
  const apr = positionData && positionData.solDeposited.toNumber() > 0
    ? ((positionData.feesEarned.toNumber() / positionData.solDeposited.toNumber()) * 100 * 12).toFixed(2) + "%"
    : "0.00%";

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-400" />
            Liquidity Pool: {outcomeName}
          </CardTitle>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
            <TrendingUp className="h-3 w-3 mr-1" />
            {apr} APR
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pool Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">TVL</p>
            <p className="text-lg font-bold text-white">{tvl.toFixed(2)}</p>
            <p className="text-xs text-slate-400">SOL</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Price</p>
            <p className="text-lg font-bold text-white">{poolPrice.toFixed(6)}</p>
            <p className="text-xs text-slate-400">SOL</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Volume 24h</p>
            <p className="text-lg font-bold text-white">
              {(poolData.volume24h.toNumber() / 1e9).toFixed(2)}
            </p>
            <p className="text-xs text-slate-400">SOL</p>
          </div>
        </div>

        {/* Your Position */}
        {positionData && positionData.lpTokens.toNumber() > 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/30">
            <p className="text-sm font-semibold text-white mb-3">Your Position</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-400">LP Tokens</p>
                <p className="text-white font-medium">
                  {(positionData.lpTokens.toNumber() / 1e9).toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Fees Earned</p>
                <p className="text-emerald-400 font-medium">
                  +{(positionData.feesEarned.toNumber() / 1e9).toFixed(4)} SOL
                </p>
              </div>
              <div>
                <p className="text-slate-400">Tokens Deposited</p>
                <p className="text-white font-medium">
                  {(positionData.tokensDeposited.toNumber() / 1e9).toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">SOL Deposited</p>
                <p className="text-white font-medium">
                  {(positionData.solDeposited.toNumber() / 1e9).toFixed(4)}
                </p>
              </div>
            </div>
            
            {/* Pool Share */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Pool Share</span>
                <span>
                  {((positionData.lpTokens.toNumber() / poolData.totalLpTokens.toNumber()) * 100).toFixed(2)}%
                </span>
              </div>
              <Progress
                value={(positionData.lpTokens.toNumber() / poolData.totalLpTokens.toNumber()) * 100}
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Liquidity Management */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "add" | "remove")}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger
              value="add"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </TabsTrigger>
            <TabsTrigger
              value="remove"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              <Minus className="h-4 w-4 mr-2" />
              Remove
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="token-amount" className="text-slate-300">
                  Token Amount
                </Label>
                <Input
                  id="token-amount"
                  type="number"
                  placeholder="0.00"
                  value={tokenAmount}
                  onChange={(e) => handleTokenAmountChange(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>

              <div>
                <Label htmlFor="sol-amount" className="text-slate-300">
                  SOL Amount
                </Label>
                <Input
                  id="sol-amount"
                  type="number"
                  placeholder="0.00"
                  value={solAmount}
                  readOnly
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
            </div>

            {estimatedLP !== null && (
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">LP Tokens to Receive</span>
                  <span className="text-lg font-bold text-white">
                    {estimatedLP.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleAddLiquidity}
              disabled={!publicKey || processing || !tokenAmount || !solAmount}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Liquidity
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="remove" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="lp-amount" className="text-slate-300">
                  LP Tokens
                </Label>
                {positionData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLPRemoveChange((positionData.lpTokens.toNumber() / 1e9).toString())}
                    className="text-xs text-blue-400 hover:text-blue-300 h-auto p-0"
                  >
                    Max: {(positionData.lpTokens.toNumber() / 1e9).toFixed(4)}
                  </Button>
                )}
              </div>
              <Input
                id="lp-amount"
                type="number"
                placeholder="0.00"
                value={lpToRemove}
                onChange={(e) => handleLPRemoveChange(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {estimatedWithdraw && (
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Tokens to Receive</span>
                  <span className="text-white font-medium">
                    {estimatedWithdraw.tokens.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">SOL to Receive</span>
                  <span className="text-white font-medium">
                    {estimatedWithdraw.sol.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleRemoveLiquidity}
              disabled={!publicKey || processing || !lpToRemove || !positionData}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 mr-2" />
                  Remove Liquidity
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Info */}
        <Alert className="bg-blue-500/10 border-blue-500/50">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-400 text-xs">
            Earn {apr} APR by providing liquidity • 0.3% fee on all swaps
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

