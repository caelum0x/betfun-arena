"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  TrendingUp, 
  Trophy, 
  Activity, 
  DollarSign,
  Target,
  Award,
  Users,
  Calendar,
  Share2,
  Settings
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface UserProfile {
  address: string;
  username?: string;
  avatar?: string;
  bio?: string;
  joinedAt: number;
  stats: {
    totalVolume: number;
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    marketsCreated: number;
    marketsWon: number;
    currentStreak: number;
    bestStreak: number;
  };
  achievements: Achievement[];
  recentActivity: Activity[];
  activePositions: Position[];
  followers: number;
  following: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt: number;
}

interface Activity {
  id: string;
  type: string;
  market: string;
  marketId: string;
  amount: number;
  timestamp: number;
}

interface Position {
  id: string;
  market: string;
  marketId: string;
  outcome: string;
  shares: number;
  invested: number;
  currentValue: number;
  pnl: number;
}

export default function ProfilePage() {
  const params = useParams();
  const { publicKey } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    if (params.address) {
      loadProfile();
      setIsOwnProfile(publicKey?.toBase58() === params.address);
    }
  }, [params.address, publicKey]);

  const loadProfile = async () => {
    setLoading(true);

    // Mock data - would fetch from API
    const mockProfile: UserProfile = {
      address: params.address as string,
      username: "CryptoTrader",
      bio: "Full-time prediction market trader. BTC maximalist. Always betting on the future. 🚀",
      joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
      stats: {
        totalVolume: 5250000000000,
        totalTrades: 342,
        totalPnl: 1250000000000,
        winRate: 68.5,
        marketsCreated: 12,
        marketsWon: 45,
        currentStreak: 5,
        bestStreak: 12,
      },
      achievements: [
        {
          id: "1",
          name: "First Trade",
          description: "Complete your first trade",
          icon: "🎯",
          rarity: "common",
          unlockedAt: Date.now() - 80 * 24 * 60 * 60 * 1000,
        },
        {
          id: "2",
          name: "Whale",
          description: "Trade over 1000 SOL in volume",
          icon: "🐋",
          rarity: "epic",
          unlockedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        },
        {
          id: "3",
          name: "Prophet",
          description: "Win 10 markets in a row",
          icon: "🔮",
          rarity: "legendary",
          unlockedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
        },
        {
          id: "4",
          name: "Market Maker",
          description: "Create 10 markets",
          icon: "🏭",
          rarity: "rare",
          unlockedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
        },
      ],
      recentActivity: [
        {
          id: "1",
          type: "trade",
          market: "Will Bitcoin reach $100k?",
          marketId: "1",
          amount: 100,
          timestamp: Date.now() - 2 * 60 * 60 * 1000,
        },
        // Add more...
      ],
      activePositions: [
        {
          id: "1",
          market: "Will Bitcoin reach $100k?",
          marketId: "1",
          outcome: "Yes",
          shares: 100,
          invested: 55000000000,
          currentValue: 60000000000,
          pnl: 5000000000,
        },
        // Add more...
      ],
      followers: 1250,
      following: 340,
    };

    setProfile(mockProfile);
    setLoading(false);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "bg-slate-500/20 text-slate-400 border-slate-500/50";
      case "rare":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "epic":
        return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "legendary":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/50";
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  const roi = profile.stats.totalVolume > 0 
    ? (profile.stats.totalPnl / profile.stats.totalVolume) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 mb-8">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl">
                  {profile.avatar || "👤"}
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">
                      {profile.username || "Anonymous"}
                    </h1>
                    {profile.stats.winRate > 70 && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                        <Trophy className="h-3 w-3 mr-1" />
                        Pro Trader
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-400 mb-3">{profile.address.slice(0, 8)}...{profile.address.slice(-8)}</p>
                  {profile.bio && (
                    <p className="text-slate-300 max-w-2xl">{profile.bio}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined {new Date(profile.joinedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {profile.followers} followers
                    </span>
                    <span className="flex items-center gap-1">
                      {profile.following} following
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Link href="/settings">
                    <Button className="bg-slate-700 hover:bg-slate-600">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Follow
                    </Button>
                    <Button variant="outline" className="bg-slate-800 border-slate-700">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Volume</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {(profile.stats.totalVolume / 1e9).toFixed(0)} SOL
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">P&L</span>
                </div>
                <p className={`text-lg font-bold ${
                  profile.stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {profile.stats.totalPnl >= 0 ? "+" : ""}
                  {(profile.stats.totalPnl / 1e9).toFixed(0)} SOL
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs">Win Rate</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {profile.stats.winRate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs">Trades</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {profile.stats.totalTrades}
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs">Markets Won</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {profile.stats.marketsWon}
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Award className="h-4 w-4" />
                  <span className="text-xs">ROI</span>
                </div>
                <p className={`text-lg font-bold ${
                  roi >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <span className="text-xs">Current Streak</span>
                </div>
                <p className="text-lg font-bold text-white">
                  🔥 {profile.stats.currentStreak}
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <span className="text-xs">Best Streak</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ⚡ {profile.stats.bestStreak}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="positions">Active Positions</TabsTrigger>
            <TabsTrigger value="achievements">
              <Trophy className="h-4 w-4 mr-2" />
              Achievements ({profile.achievements.length})
            </TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.activePositions.map((position) => (
                <Link key={position.id} href={`/market/${position.marketId}`}>
                  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all cursor-pointer">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {position.market}
                      </h3>
                      <Badge variant="outline" className="mb-4">
                        {position.outcome}
                      </Badge>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Shares</p>
                          <p className="text-sm font-semibold text-white">
                            {position.shares}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Invested</p>
                          <p className="text-sm font-semibold text-white">
                            {(position.invested / 1e9).toFixed(2)} SOL
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Current Value</p>
                          <p className="text-sm font-semibold text-white">
                            {(position.currentValue / 1e9).toFixed(2)} SOL
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">P&L</p>
                          <p className={`text-sm font-semibold ${
                            position.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {position.pnl >= 0 ? "+" : ""}
                            {(position.pnl / 1e9).toFixed(2)} SOL
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {profile.achievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card className={`bg-gradient-to-br from-slate-900 to-slate-800 border ${getRarityColor(achievement.rarity)} cursor-pointer`}>
                    <CardContent className="p-6 text-center">
                      <div className="text-6xl mb-3">{achievement.icon}</div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {achievement.name}
                      </h3>
                      <p className="text-sm text-slate-400 mb-3">
                        {achievement.description}
                      </p>
                      <Badge className={getRarityColor(achievement.rarity)}>
                        {achievement.rarity}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-2">
                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <div className="space-y-3">
              {profile.recentActivity.map((activity) => (
                <Card key={activity.id} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium mb-1">{activity.type}</p>
                        <Link
                          href={`/market/${activity.marketId}`}
                          className="text-sm text-slate-400 hover:text-blue-400"
                        >
                          {activity.market}
                        </Link>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {(activity.amount / 1e9).toFixed(2)} SOL
                        </p>
                        <p className="text-xs text-slate-400">
                          {Math.floor((Date.now() - activity.timestamp) / (60 * 60 * 1000))}h ago
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

