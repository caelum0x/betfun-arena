"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { WalletMultiButton } from "../../components/WalletMultiButton";
import { Skeleton } from "../../components/ui/skeleton";
import { supabase } from "../../lib/supabase/client";
import type { LeaderboardEntry } from "../../lib/supabase/client";
import { formatSOL, truncateAddress, formatNumber } from "../../lib/utils";
import { usePlaySolana } from "../../hooks/usePlaySolana";

type Timeframe = "daily" | "weekly" | "all-time";

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [timeframe, setTimeframe] = useState<Timeframe>("all-time");
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe, publicKey]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("total_won", { ascending: false })
        .limit(100);

      if (error) throw error;

      setLeaders(data || []);

      // Find user's rank
      if (publicKey) {
        const userEntry = data?.find((entry) => entry.wallet === publicKey.toString());
        setUserRank(userEntry || null);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getLevelEmoji = (level: number) => {
    if (level >= 10) return "🔥🔥🔥";
    if (level >= 5) return "🔥🔥";
    if (level >= 3) return "🔥";
    return "⚡";
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-gray/95 backdrop-blur-sm border-b border-medium-gray">
        <div className="container mx-auto px-md py-sm flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-h3 font-bold text-gradient-purple">
              Leaderboard
            </span>
          </Link>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-md py-lg max-w-4xl">
        {/* Title */}
        <div className="text-center mb-3xl">
          <div className="text-6xl mb-md">🏆</div>
          <h1 className="text-display font-bold text-gradient-green mb-sm">
            Top Warriors
          </h1>
          <p className="text-body-large text-light-gray">
            The fiercest competitors in BetFun Arena
          </p>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex items-center justify-center gap-md mb-lg">
          <Button
            variant={timeframe === "all-time" ? "default" : "ghost"}
            onClick={() => setTimeframe("all-time")}
          >
            All Time
          </Button>
          <Button
            variant={timeframe === "weekly" ? "default" : "ghost"}
            onClick={() => setTimeframe("weekly")}
          >
            This Week
          </Button>
          <Button
            variant={timeframe === "daily" ? "default" : "ghost"}
            onClick={() => setTimeframe("daily")}
          >
            Today
          </Button>
        </div>

        {/* Podium (Top 3) */}
        {!loading && leaders.length >= 3 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-3xl"
          >
            <div className="flex items-end justify-center gap-md">
              {/* 2nd Place */}
              <Card className="flex-1 p-lg text-center border-2 border-sol-blue shadow-glow-blue">
                <div className="text-4xl mb-sm">🥈</div>
                <p className="text-body-small text-light-gray mb-xs">2nd Place</p>
                <p className="text-body font-bold text-white truncate mb-sm">
                  {truncateAddress(leaders[1].wallet)}
                </p>
                <p className="text-h3 font-bold text-sol-blue">
                  {formatSOL(leaders[1].total_won)}
                </p>
                <p className="text-body-small text-light-gray">SOL won</p>
              </Card>

              {/* 1st Place */}
              <Card className="flex-1 p-lg text-center border-2 border-warning shadow-glow-purple shadow-glow-green scale-110">
                <div className="text-6xl mb-sm">🥇</div>
                <p className="text-body-small text-light-gray mb-xs">1st Place</p>
                <p className="text-body font-bold text-white truncate mb-sm">
                  {truncateAddress(leaders[0].wallet)}
                </p>
                <p className="text-h2 font-bold text-warning">
                  {formatSOL(leaders[0].total_won)}
                </p>
                <p className="text-body-small text-light-gray">SOL won</p>
              </Card>

              {/* 3rd Place */}
              <Card className="flex-1 p-lg text-center border-2 border-electric-purple shadow-glow-purple">
                <div className="text-4xl mb-sm">🥉</div>
                <p className="text-body-small text-light-gray mb-xs">3rd Place</p>
                <p className="text-body font-bold text-white truncate mb-sm">
                  {truncateAddress(leaders[2].wallet)}
                </p>
                <p className="text-h3 font-bold text-electric-purple">
                  {formatSOL(leaders[2].total_won)}
                </p>
                <p className="text-body-small text-light-gray">SOL won</p>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Full Leaderboard Table */}
        <Card className="p-md mb-lg overflow-hidden">
          {loading ? (
            <div className="space-y-sm">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-md">📊</div>
              <p className="text-body text-light-gray">
                No leaderboard data yet. Be the first!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-medium-gray text-left">
                    <th className="py-sm px-md text-body-small text-light-gray">
                      Rank
                    </th>
                    <th className="py-sm px-md text-body-small text-light-gray">
                      Player
                    </th>
                    <th className="py-sm px-md text-body-small text-light-gray text-right">
                      Total Won
                    </th>
                    <th className="py-sm px-md text-body-small text-light-gray text-right">
                      Win Rate
                    </th>
                    <th className="py-sm px-md text-body-small text-light-gray text-center">
                      Level
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((entry, index) => (
                    <motion.tr
                      key={entry.wallet}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-medium-gray hover:bg-medium-gray/50 transition-colors ${
                        publicKey && entry.wallet === publicKey.toString()
                          ? "bg-electric-purple/10 border-l-4 border-l-electric-purple"
                          : ""
                      }`}
                    >
                      <td className="py-md px-md">
                        <span className="text-body font-bold">
                          {getRankEmoji(index + 1)}
                        </span>
                      </td>
                      <td className="py-md px-md">
                        <div className="flex items-center gap-sm">
                          <Link href={`/profile?wallet=${entry.wallet}`}>
                            <span className="text-body text-white hover:text-electric-purple font-mono">
                              {truncateAddress(entry.wallet, 6)}
                            </span>
                          </Link>
                          {publicKey && entry.wallet === publicKey.toString() && (
                            <span className="text-xs bg-electric-purple text-white px-2 py-1 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-md px-md text-right">
                        <span className="text-body font-bold text-neon-green">
                          {formatNumber(parseFloat(formatSOL(entry.total_won)))} SOL
                        </span>
                      </td>
                      <td className="py-md px-md text-right">
                        <span className="text-body text-white">
                          {entry.win_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-md px-md text-center">
                        <span className="text-body">{getLevelEmoji(entry.level)}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* User's Rank (if not in top 100) */}
        {publicKey && userRank && (
          <Card className="p-lg bg-electric-purple/10 border-2 border-electric-purple">
            <div className="text-center">
              <p className="text-body-small text-light-gray mb-sm">Your Rank</p>
              <p className="text-h1 font-bold text-electric-purple mb-sm">
                {getRankEmoji(
                  leaders.findIndex((l) => l.wallet === publicKey.toString()) + 1
                )}
              </p>
              <p className="text-body text-white">
                {formatNumber(parseFloat(formatSOL(userRank.total_won)))} SOL won •{" "}
                {userRank.win_rate.toFixed(1)}% win rate
              </p>
            </div>
          </Card>
        )}
      </main>

      {/* Bottom Tab Bar (Mobile) */}
      <nav className="tab-bar md:hidden">
        <Link href="/" className="tab-item">
          <span className="text-2xl">🏠</span>
          <span className="text-xs">Home</span>
        </Link>
        <Link href="/create" className="tab-item">
          <span className="text-3xl text-electric-purple">➕</span>
          <span className="text-xs">Create</span>
        </Link>
        <Link href="/leaderboard" className="tab-item active">
          <span className="text-2xl">🏆</span>
          <span className="text-xs">Top</span>
        </Link>
        <Link href="/profile" className="tab-item">
          <span className="text-2xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

