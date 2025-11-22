"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  Target,
  Award,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";

interface PlatformMetrics {
  totalVolume: number;
  totalMarkets: number;
  totalUsers: number;
  totalTrades: number;
  activeMarkets: number;
  resolvedMarkets: number;
  avgTradeSize: number;
  avgMarketVolume: number;
}

interface TimeSeriesData {
  date: string;
  volume: number;
  trades: number;
  users: number;
}

interface TopMarket {
  id: string;
  title: string;
  volume: number;
  participants: number;
  category: string;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [topMarkets, setTopMarkets] = useState<TopMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">("7d");

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    setLoading(true);

    // Mock data - would fetch from API
    const mockMetrics: PlatformMetrics = {
      totalVolume: 15250000000000,
      totalMarkets: 342,
      totalUsers: 12450,
      totalTrades: 45678,
      activeMarkets: 156,
      resolvedMarkets: 186,
      avgTradeSize: 334000000000,
      avgMarketVolume: 44590000000000,
    };

    const mockTimeSeries: TimeSeriesData[] = [
      { date: "Nov 12", volume: 1200000000000, trades: 3400, users: 890 },
      { date: "Nov 13", volume: 1450000000000, trades: 3800, users: 920 },
      { date: "Nov 14", volume: 1350000000000, trades: 3600, users: 905 },
      { date: "Nov 15", volume: 1680000000000, trades: 4200, users: 1050 },
      { date: "Nov 16", volume: 1890000000000, trades: 4500, users: 1120 },
      { date: "Nov 17", volume: 2100000000000, trades: 5100, users: 1280 },
      { date: "Nov 18", volume: 2250000000000, trades: 5400, users: 1350 },
    ];

    const mockTopMarkets: TopMarket[] = [
      {
        id: "1",
        title: "Will Bitcoin reach $100k by end of 2024?",
        volume: 1250000000000,
        participants: 1250,
        category: "Crypto",
      },
      {
        id: "2",
        title: "Will Solana flip Ethereum in TVL?",
        volume: 850000000000,
        participants: 890,
        category: "Crypto",
      },
      {
        id: "3",
        title: "Will ETH reach $5k?",
        volume: 620000000000,
        participants: 670,
        category: "Crypto",
      },
      {
        id: "4",
        title: "Will Trump win 2024 election?",
        volume: 580000000000,
        participants: 1450,
        category: "Politics",
      },
      {
        id: "5",
        title: "Will AI replace programmers by 2025?",
        volume: 420000000000,
        participants: 520,
        category: "Technology",
      },
    ];

    setMetrics(mockMetrics);
    setTimeSeriesData(mockTimeSeries);
    setTopMarkets(mockTopMarkets);
    setLoading(false);
  };

  if (loading || !metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  const maxVolume = Math.max(...timeSeriesData.map(d => d.volume));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Platform Analytics</h1>
              <p className="text-slate-400">Real-time insights and performance metrics</p>
            </div>
            <div className="flex items-center gap-2">
              {(["24h", "7d", "30d", "all"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeframe === tf
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {tf === "all" ? "All Time" : tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-900/20 to-slate-800 border-blue-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="h-8 w-8 text-blue-400" />
                  <span className="text-xs text-emerald-400">+12.5%</span>
                </div>
                <h3 className="text-sm text-slate-400 mb-1">Total Volume</h3>
                <p className="text-3xl font-bold text-white">
                  {(metrics.totalVolume / 1e9).toFixed(0)} SOL
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  ${((metrics.totalVolume / 1e9) * 150).toFixed(0)}M USD
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-purple-900/20 to-slate-800 border-purple-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Target className="h-8 w-8 text-purple-400" />
                  <span className="text-xs text-emerald-400">+8.2%</span>
                </div>
                <h3 className="text-sm text-slate-400 mb-1">Total Markets</h3>
                <p className="text-3xl font-bold text-white">
                  {metrics.totalMarkets.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {metrics.activeMarkets} active, {metrics.resolvedMarkets} resolved
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-emerald-900/20 to-slate-800 border-emerald-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-8 w-8 text-emerald-400" />
                  <span className="text-xs text-emerald-400">+15.7%</span>
                </div>
                <h3 className="text-sm text-slate-400 mb-1">Total Users</h3>
                <p className="text-3xl font-bold text-white">
                  {metrics.totalUsers.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {Math.floor(metrics.totalUsers * 0.35)} active today
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-yellow-900/20 to-slate-800 border-yellow-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="h-8 w-8 text-yellow-400" />
                  <span className="text-xs text-emerald-400">+10.3%</span>
                </div>
                <h3 className="text-sm text-slate-400 mb-1">Total Trades</h3>
                <p className="text-3xl font-bold text-white">
                  {metrics.totalTrades.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Avg: {(metrics.avgTradeSize / 1e9).toFixed(2)} SOL per trade
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Volume Chart */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Trading Volume
              </CardTitle>
              <CardDescription>Daily trading volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {timeSeriesData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-500 hover:to-blue-300 cursor-pointer"
                      style={{
                        height: `${(data.volume / maxVolume) * 100}%`,
                        minHeight: "20px",
                      }}
                      title={`${(data.volume / 1e9).toFixed(2)} SOL`}
                    />
                    <span className="text-xs text-slate-400 mt-2">{data.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trades Chart */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Trade Activity
              </CardTitle>
              <CardDescription>Number of trades per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {timeSeriesData.map((data, index) => {
                  const maxTrades = Math.max(...timeSeriesData.map(d => d.trades));
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all hover:from-emerald-500 hover:to-emerald-300 cursor-pointer"
                        style={{
                          height: `${(data.trades / maxTrades) * 100}%`,
                          minHeight: "20px",
                        }}
                        title={`${data.trades.toLocaleString()} trades`}
                      />
                      <span className="text-xs text-slate-400 mt-2">{data.date}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Markets */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-400" />
              Top Markets by Volume
            </CardTitle>
            <CardDescription>Highest performing prediction markets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topMarkets.map((market, index) => (
                <div
                  key={market.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">{market.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {(market.volume / 1e9).toFixed(2)} SOL
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {market.participants}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">
                          {market.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">
                      +{((market.volume / metrics.totalVolume) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">of total volume</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
