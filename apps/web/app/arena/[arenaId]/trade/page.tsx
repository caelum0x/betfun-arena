"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Droplets, BookOpen, Route } from "lucide-react";
import Link from "next/link";
import { ShareBalance } from "@/components/trading/ShareBalance";
import { ShareTrading } from "@/components/trading/ShareTrading";
import { LiquidityPool } from "@/components/trading/LiquidityPool";
import { OrderBook } from "@/components/trading/OrderBook";
import { RoutePreview } from "@/components/trading/RoutePreview";
import { useProgram } from "@/hooks/useProgram";

export default function TradePage() {
  const params = useParams();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [arena, setArena] = useState<any>(null);
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tradeAmount, setTradeAmount] = useState(0);

  useEffect(() => {
    if (!program || !params.id) return;
    loadArena();
  }, [program, params.id]);

  const loadArena = async () => {
    if (!program || !params.id) return;

    try {
      // Fetch arena data
      const arenaPubkey = new PublicKey(params.id as string);
      const arenaData = await program.account.arena.fetch(arenaPubkey);
      setArena({ ...arenaData, pubkey: arenaPubkey });
    } catch (error) {
      console.error("Error loading arena:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!arena) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Arena not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/arena/${params.id}`}>
            <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Arena
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{arena.title}</h1>
              <p className="text-slate-400">{arena.question}</p>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
              Advanced Trading
            </Badge>
          </div>
        </div>

        {/* Outcome Selector */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 mb-6 p-4">
          <p className="text-sm text-slate-400 mb-3">Select Outcome to Trade</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {arena.outcomes.map((outcome: string, index: number) => (
              <Button
                key={index}
                variant={selectedOutcome === index ? "default" : "outline"}
                onClick={() => setSelectedOutcome(index)}
                className={`${
                  selectedOutcome === index
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
              >
                {outcome}
              </Button>
            ))}
          </div>
        </Card>

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Position & Trading */}
          <div className="lg:col-span-2 space-y-6">
            {/* Position */}
            {publicKey && (
              <ShareBalance
                arena={arena.pubkey}
                outcomeIndex={selectedOutcome}
                outcomeName={arena.outcomes[selectedOutcome]}
                currentPrice={500000000} // Mock price - would come from on-chain data
              />
            )}

            {/* Trading Tabs */}
            <Tabs defaultValue="simple" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-800">
                <TabsTrigger value="simple" className="data-[state=active]:bg-slate-700">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Simple
                </TabsTrigger>
                <TabsTrigger value="liquidity" className="data-[state=active]:bg-slate-700">
                  <Droplets className="h-4 w-4 mr-2" />
                  Liquidity
                </TabsTrigger>
                <TabsTrigger value="orderbook" className="data-[state=active]:bg-slate-700">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="router" className="data-[state=active]:bg-slate-700">
                  <Route className="h-4 w-4 mr-2" />
                  Router
                </TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="mt-6">
                <ShareTrading
                  arena={arena.pubkey.toString()}
                  outcomeIndex={selectedOutcome}
                  outcomeName={arena.outcomes[selectedOutcome]}
                  onTradeComplete={loadArena}
                />
              </TabsContent>

              <TabsContent value="liquidity" className="mt-6">
                <LiquidityPool
                  arena={arena.pubkey.toString()}
                  outcomeIndex={selectedOutcome}
                  outcomeName={arena.outcomes[selectedOutcome]}
                />
              </TabsContent>

              <TabsContent value="orderbook" className="mt-6">
                <OrderBook
                  arena={arena.pubkey.toString()}
                  outcomeIndex={selectedOutcome}
                  outcomeName={arena.outcomes[selectedOutcome]}
                />
              </TabsContent>

              <TabsContent value="router" className="mt-6">
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-4">
                    <p className="text-sm text-slate-400 mb-3">Enter trade amount to see routing</p>
                    <input
                      type="number"
                      placeholder="Amount (SOL)"
                      value={tradeAmount || ""}
                      onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    />
                  </Card>

                  {tradeAmount > 0 && (
                    <RoutePreview
                      arena={arena.pubkey}
                      outcomeIndex={selectedOutcome}
                      outcomeName={arena.outcomes[selectedOutcome]}
                      amountIn={tradeAmount}
                      isBuy={true}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Market Info */}
          <div className="space-y-6">
            {/* Market Stats */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Market Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Total Volume</p>
                  <p className="text-2xl font-bold text-white">
                    {(arena.totalStaked / 1e9).toFixed(2)} SOL
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Participants</p>
                    <p className="text-lg font-semibold text-white">
                      {arena.totalParticipants}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Entry Fee</p>
                    <p className="text-lg font-semibold text-white">
                      {(arena.entryFee / 1e9).toFixed(2)} SOL
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <Badge className={arena.resolved ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>
                    {arena.resolved ? "Resolved" : "Active"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Outcome Probabilities */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Implied Probabilities</h3>
              <div className="space-y-3">
                {arena.outcomes.map((outcome: string, index: number) => {
                  const votes = arena.outcomeCounts[index] || 0;
                  const total = arena.totalParticipants || 1;
                  const probability = (votes / total) * 100;

                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{outcome}</span>
                        <span className="text-white font-semibold">{probability.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${probability}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Trading Info */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Trading Features</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-300">Share Token Trading</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-slate-300">AMM Liquidity Pool</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-slate-300">Limit Order Book</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-400" />
                  <span className="text-slate-300">Smart Order Router</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-slate-300">Advanced Order Types</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

