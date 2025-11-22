"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  Share2,
  MessageSquare,
  BarChart3,
  BookOpen,
  Activity
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamic imports
const TradingViewChart = dynamic(() => import("@/components/charts/TradingViewChart"), { ssr: false });
import { ShareTrading } from "@/components/trading/ShareTrading";
import { OrderBook } from "@/components/trading/OrderBook";

interface MarketData {
  id: string;
  title: string;
  question: string;
  description: string;
  category: string;
  outcomes: string[];
  volume: number;
  participants: number;
  liquidity: number;
  endTime: number;
  resolved: boolean;
  winningOutcome?: number;
  createdAt: number;
  creator: string;
}

interface Trade {
  id: string;
  user: string;
  outcome: number;
  type: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: number;
}

interface Comment {
  id: string;
  user: string;
  content: string;
  timestamp: number;
  likes: number;
}

export default function MarketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const [market, setMarket] = useState<MarketData | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (params.id) {
      loadMarketData();
    }
  }, [params.id]);

  const loadMarketData = async () => {
    setLoading(true);

    // Mock data - would fetch from API
    const mockMarket: MarketData = {
      id: params.id as string,
      title: "Will Bitcoin reach $100k by end of 2024?",
      question: "Will BTC price reach $100,000 USD before December 31, 2024?",
      description: "This market resolves to YES if Bitcoin (BTC) reaches or exceeds $100,000 USD on any major exchange (Coinbase, Binance, Kraken) before 11:59 PM UTC on December 31, 2024. Otherwise resolves to NO.",
      category: "Crypto",
      outcomes: ["Yes", "No"],
      volume: 125000000000,
      participants: 1250,
      liquidity: 45000000000,
      endTime: Date.now() + 30 * 24 * 60 * 60 * 1000,
      resolved: false,
      createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      creator: "5yxN...kQpU",
    };

    const mockTrades: Trade[] = [
      {
        id: "1",
        user: "8xYz...mNpQ",
        outcome: 0,
        type: "buy",
        amount: 100,
        price: 0.55,
        timestamp: Date.now() - 5 * 60 * 1000,
      },
      {
        id: "2",
        user: "3aWx...bCdE",
        outcome: 1,
        type: "sell",
        amount: 50,
        price: 0.45,
        timestamp: Date.now() - 15 * 60 * 1000,
      },
      // Add more...
    ];

    const mockComments: Comment[] = [
      {
        id: "1",
        user: "9zAb...cDeF",
        content: "BTC looking bullish! Just broke resistance at $95k",
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        likes: 12,
      },
      // Add more...
    ];

    setMarket(mockMarket);
    setRecentTrades(mockTrades);
    setComments(mockComments);
    setLoading(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: market?.title,
        text: market?.question,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      user: publicKey?.toBase58().slice(0, 4) + "..." + publicKey?.toBase58().slice(-4) || "Anonymous",
      content: newComment,
      timestamp: Date.now(),
      likes: 0,
    };

    setComments([comment, ...comments]);
    setNewComment("");
  };

  if (loading || !market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading market...</div>
      </div>
    );
  }

  const probability = 55; // Mock - would calculate from market data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{market.category}</Badge>
                {market.resolved && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    Resolved
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">{market.title}</h1>
              <p className="text-slate-400">{market.question}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="bg-slate-800 border-slate-700"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Volume</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {(market.volume / 1e9).toFixed(2)} SOL
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Participants</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {market.participants.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs">Liquidity</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {(market.liquidity / 1e9).toFixed(2)} SOL
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Ends In</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {Math.floor((market.endTime - Date.now()) / (24 * 60 * 60 * 1000))}d
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Price Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-slate-800 rounded-lg flex items-center justify-center">
                  <p className="text-slate-400">TradingView Chart Component</p>
                  {/* <TradingViewChart marketId={market.id} /> */}
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="trades">Recent Trades</TabsTrigger>
                <TabsTrigger value="comments">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comments ({comments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Market Description</h3>
                    <p className="text-slate-300 leading-relaxed mb-6">
                      {market.description}
                    </p>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Created by</span>
                        <span className="text-white font-medium">{market.creator}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Created</span>
                        <span className="text-white font-medium">
                          {new Date(market.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Resolution Date</span>
                        <span className="text-white font-medium">
                          {new Date(market.endTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trades" className="mt-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {recentTrades.map((trade) => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={trade.type === "buy" ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {trade.type.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-slate-300">
                              {market.outcomes[trade.outcome]}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              {trade.amount} shares @ {trade.price.toFixed(2)} SOL
                            </p>
                            <p className="text-xs text-slate-400">
                              {Math.floor((Date.now() - trade.timestamp) / 60000)}m ago
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="mt-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    {/* Comment Input */}
                    {publicKey && (
                      <div className="mb-6">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Share your thoughts..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white resize-none"
                          rows={3}
                        />
                        <Button
                          onClick={handleComment}
                          className="mt-2 bg-blue-600 hover:bg-blue-700"
                          disabled={!newComment.trim()}
                        >
                          Post Comment
                        </Button>
                      </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="p-4 bg-slate-900 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">
                              {comment.user}
                            </span>
                            <span className="text-xs text-slate-400">
                              {Math.floor((Date.now() - comment.timestamp) / (60 * 60 * 1000))}h ago
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm mb-2">{comment.content}</p>
                          <Button variant="ghost" size="sm" className="text-slate-400">
                            👍 {comment.likes}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Trading */}
          <div className="space-y-6">
            {/* Outcome Probabilities */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Current Odds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {market.outcomes.map((outcome, index) => {
                  const prob = index === 0 ? probability : 100 - probability;
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-2">
                        <span className="text-white font-medium">{outcome}</span>
                        <span className="text-white font-bold">{prob}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            index === 0 ? "bg-emerald-500" : "bg-red-500"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${prob}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Trade */}
            <ShareTrading
              arena={market.id}
              outcomeIndex={selectedOutcome}
              outcomeName={market.outcomes[selectedOutcome]}
            />

            {/* Related Markets */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm">Related Markets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/market/2">
                  <div className="p-3 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                    <p className="text-sm text-white font-medium mb-1">
                      Will ETH reach $5k?
                    </p>
                    <p className="text-xs text-slate-400">2.5k SOL volume</p>
                  </div>
                </Link>
                <Link href="/market/3">
                  <div className="p-3 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                    <p className="text-sm text-white font-medium mb-1">
                      Will SOL flip BNB?
                    </p>
                    <p className="text-xs text-slate-400">1.8k SOL volume</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

