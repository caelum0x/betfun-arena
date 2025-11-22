"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Route, TrendingUp, Zap, AlertTriangle, Info } from "lucide-react";
import { useProgram } from "@/hooks/useProgram";
import { calculateBestRoute, comparePrices, VenueType } from "@/lib/sdk/router";

interface RoutePreviewProps {
  arena: PublicKey;
  outcomeIndex: number;
  outcomeName: string;
  amountIn: number;
  isBuy: boolean;
}

export function RoutePreview({ arena, outcomeIndex, outcomeName, amountIn, isBuy }: RoutePreviewProps) {
  const program = useProgram();
  const [routingPlan, setRoutingPlan] = useState<any>(null);
  const [priceComparison, setPriceComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!program || !amountIn || amountIn <= 0) {
      setRoutingPlan(null);
      setLoading(false);
      return;
    }

    loadRouting();
  }, [program, arena, outcomeIndex, amountIn, isBuy]);

  const loadRouting = async () => {
    if (!program) return;

    setLoading(true);

    try {
      // Calculate best route
      const plan = await calculateBestRoute(
        program,
        arena,
        outcomeIndex,
        amountIn * 1e9, // Convert to lamports
        isBuy,
        100 // 1% max slippage
      );

      setRoutingPlan(plan);

      // Compare prices across venues
      const comparison = await comparePrices(program, arena, outcomeIndex, isBuy);
      setPriceComparison(comparison);
    } catch (error) {
      console.error("Error loading routing:", error);
      setRoutingPlan(null);
      setPriceComparison(null);
    } finally {
      setLoading(false);
    }
  };

  if (!amountIn || amountIn <= 0) {
    return null;
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center text-slate-400">
            <p className="text-sm">Calculating best route...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!routingPlan || routingPlan.routes.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <Alert className="bg-yellow-500/10 border-yellow-500/50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500 text-sm">
              No liquidity available for this trade
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasMultipleRoutes = routingPlan.routes.length > 1;
  const isHighSlippage = routingPlan.estimatedSlippage > 200; // > 2%

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Route className="h-4 w-4 text-blue-400" />
            Smart Router
          </CardTitle>
          {hasMultipleRoutes && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Split Order
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Execution Routes */}
        <div className="space-y-2">
          {routingPlan.routes.map((route: any, index: number) => (
            <div
              key={index}
              className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={route.venue === VenueType.AMM ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {route.venue}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {route.percentage.toFixed(1)}% of order
                  </span>
                </div>
                <span className="text-xs font-medium text-white">
                  {route.expectedPrice.toFixed(6)} SOL
                </span>
              </div>

              <Progress value={route.percentage} className="h-1.5 mb-2" />

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">Output</p>
                  <p className="text-white font-medium">
                    {route.estimatedOutput.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Impact</p>
                  <p className={`font-medium ${
                    route.priceImpact > 200 ? "text-red-400" : "text-emerald-400"
                  }`}>
                    {(route.priceImpact / 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Fee</p>
                  <p className="text-white font-medium">
                    {route.fees.toFixed(4)} SOL
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/30">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Total Output</p>
              <p className="text-white font-bold">
                {routingPlan.totalOutput.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Avg Price</p>
              <p className="text-white font-bold">
                {routingPlan.avgPrice.toFixed(6)} SOL
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Fees</p>
              <p className="text-white font-medium">
                {routingPlan.totalFees.toFixed(4)} SOL
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Est. Slippage</p>
              <p className={`font-medium ${
                isHighSlippage ? "text-red-400" : "text-emerald-400"
              }`}>
                {(routingPlan.estimatedSlippage / 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Price Comparison */}
        {priceComparison && (
          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
            <p className="text-xs font-semibold text-white mb-2">Price Comparison</p>
            <div className="space-y-1.5 text-xs">
              {priceComparison.ammPrice !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">AMM Pool</span>
                  <span className="text-white font-medium">
                    {priceComparison.ammPrice.toFixed(6)} SOL
                  </span>
                </div>
              )}
              {priceComparison.orderBookPrice !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Order Book</span>
                  <span className="text-white font-medium">
                    {priceComparison.orderBookPrice.toFixed(6)} SOL
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-700">
                <span className="text-slate-300 font-medium">Best Price</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {priceComparison.bestVenue}
                  </Badge>
                  <span className="text-emerald-400 font-bold">
                    {priceComparison.bestPrice.toFixed(6)} SOL
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {isHighSlippage && (
          <Alert className="bg-yellow-500/10 border-yellow-500/50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500 text-xs">
              High slippage detected ({(routingPlan.estimatedSlippage / 100).toFixed(2)}%). 
              Consider reducing order size.
            </AlertDescription>
          </Alert>
        )}

        {hasMultipleRoutes && (
          <Alert className="bg-blue-500/10 border-blue-500/50">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-400 text-xs">
              Your order will be split across {routingPlan.routes.length} venues for best execution
            </AlertDescription>
          </Alert>
        )}

        {/* Savings Info */}
        {priceComparison && priceComparison.priceDifference > 50 && (
          <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <p className="text-xs text-emerald-400">
                Saving {(priceComparison.priceDifference / 100).toFixed(2)}% vs worst price
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

