"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { WalletMultiButton } from "../../components/WalletMultiButton";
import { ArenaCard } from "../../components/ArenaCard";
import { TrophyNFT } from "../../components/TrophyNFT";
import { Skeleton } from "../../components/ui/skeleton";
import { supabase } from "../../lib/supabase/client";
import type { LeaderboardEntry, Trophy, Arena, Participant } from "../../lib/supabase/client";
import { formatSOL, truncateAddress, copyToClipboard } from "../../lib/utils";
import { ACHIEVEMENTS } from "../../lib/constants";

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const walletParam = searchParams.get("wallet");
  
  const viewingWallet = walletParam || publicKey?.toString();
  const isOwnProfile = publicKey && viewingWallet === publicKey.toString();

  const [stats, setStats] = useState<LeaderboardEntry | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [arenas, setArenas] = useState<{ created: Arena[]; joined: Participant[] }>({
    created: [],
    joined: [],
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!viewingWallet) return;
    fetchProfile();
  }, [viewingWallet]);

  const fetchProfile = async () => {
    if (!viewingWallet) return;

    setLoading(true);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Fetch leaderboard stats
      const { data: statsData } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("wallet", viewingWallet)
        .single();

      setStats(statsData);

      // Fetch trophies
      const { data: trophiesData } = await supabase
        .from("trophies")
        .select("*, arena:arenas(*)")
        .eq("wallet", viewingWallet)
        .order("minted_at", { ascending: false });

      setTrophies(trophiesData || []);

      // Fetch created arenas
      const { data: createdData } = await supabase
        .from("arenas")
        .select("*")
        .eq("creator_wallet", viewingWallet)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch joined arenas
      const { data: joinedData } = await supabase
        .from("participants")
        .select("*, arena:arenas(*)")
        .eq("wallet", viewingWallet)
        .order("joined_at", { ascending: false })
        .limit(10);

      setArenas({
        created: createdData || [],
        joined: joinedData || [],
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!viewingWallet) return;
    const success = await copyToClipboard(viewingWallet);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!publicKey && !walletParam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-md">
        <div className="text-6xl mb-lg">👤</div>
        <h1 className="text-h1 font-bold mb-md">Connect Wallet</h1>
        <p className="text-body text-light-gray mb-lg text-center max-w-md">
          Connect your wallet to view your profile
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-gray/95 backdrop-blur-sm border-b border-medium-gray">
        <div className="container mx-auto px-md py-sm flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-h3 font-bold">Profile</span>
          </Link>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-md py-lg max-w-6xl">
        {loading ? (
          <div className="space-y-lg">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-lg mb-lg">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-lg">
                  {/* Avatar */}
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-electric-purple to-hot-pink flex items-center justify-center text-6xl">
                    👤
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-sm mb-sm">
                      <h1 className="text-h2 font-bold text-white font-mono">
                        {truncateAddress(viewingWallet || "", 8)}
                      </h1>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyAddress}
                        className="text-light-gray hover:text-white"
                      >
                        {copied ? "✓" : "📋"}
                      </Button>
                    </div>

                    {isOwnProfile && (
                      <p className="text-body-small text-light-gray mb-md">
                        Your Profile
                      </p>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-md mt-lg">
                      <div>
                        <p className="text-body-small text-light-gray mb-xs">
                          Total Wagered
                        </p>
                        <p className="text-body-large font-bold text-white">
                          {stats ? formatSOL(stats.total_wagered) : "0"} SOL
                        </p>
                      </div>
                      <div>
                        <p className="text-body-small text-light-gray mb-xs">
                          Total Won
                        </p>
                        <p className="text-body-large font-bold text-neon-green">
                          {stats ? formatSOL(stats.total_won) : "0"} SOL
                        </p>
                      </div>
                      <div>
                        <p className="text-body-small text-light-gray mb-xs">
                          Win Rate
                        </p>
                        <p className="text-body-large font-bold text-white">
                          {stats ? stats.win_rate.toFixed(1) : "0"}%
                        </p>
                      </div>
                      <div>
                        <p className="text-body-small text-light-gray mb-xs">Level</p>
                        <p className="text-body-large font-bold text-electric-purple">
                          {stats ? stats.level : "1"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Trophies Section */}
            {trophies.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h2 className="text-h2 font-bold text-white mb-md flex items-center gap-sm">
                  🏆 Trophies ({trophies.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
                  {trophies.slice(0, 6).map((trophy) => (
                    <TrophyNFT
                      key={trophy.id}
                      mint={trophy.nft_mint}
                      arenaTitle={(trophy as any).arena?.title || "Arena"}
                      rarity={trophy.rarity as any}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Achievements */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h2 className="text-h2 font-bold text-white mb-md flex items-center gap-sm">
                🎯 Achievements
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md mb-lg">
                {ACHIEVEMENTS.map((achievement) => {
                  const unlocked =
                    (achievement.id === "first_win" && stats && stats.total_won > 0) ||
                    (achievement.id === "10_arenas" && stats && stats.arenas_joined >= 10) ||
                    (achievement.id === "whale" && stats && stats.total_wagered > 100000000000) ||
                    (achievement.id === "creator" && stats && stats.arenas_created > 0);

                  return (
                    <Card
                      key={achievement.id}
                      className={`p-md text-center ${
                        unlocked
                          ? "border-electric-purple shadow-glow-purple"
                          : "opacity-50"
                      }`}
                    >
                      <div className="text-4xl mb-sm">{achievement.icon}</div>
                      <p className="text-body-small font-bold text-white mb-xs">
                        {achievement.name}
                      </p>
                      <p className="text-xs text-light-gray">
                        {achievement.description}
                      </p>
                      {unlocked && (
                        <div className="mt-sm text-neon-green text-xs font-bold">
                          ✓ UNLOCKED
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </motion.div>

            {/* Created Arenas */}
            {arenas.created.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <h2 className="text-h2 font-bold text-white mb-md flex items-center gap-sm">
                  ⚔️ Created Arenas ({arenas.created.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
                  {arenas.created.slice(0, 4).map((arena) => (
                    <ArenaCard
                      key={arena.id}
                      arena={{ ...arena, arena_account: arena.arena_account }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Joined Arenas */}
            {arenas.joined.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <h2 className="text-h2 font-bold text-white mb-md flex items-center gap-sm">
                  🎮 Participated Arenas ({arenas.joined.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {arenas.joined.slice(0, 4).map((participant) => (
                    <ArenaCard
                      key={participant.id}
                      arena={{
                        ...(participant as any).arena,
                        arena_account: (participant as any).arena.arena_account,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {arenas.created.length === 0 &&
              arenas.joined.length === 0 &&
              trophies.length === 0 && (
                <Card className="p-3xl text-center">
                  <div className="text-6xl mb-md">⚔️</div>
                  <h3 className="text-h3 font-bold text-white mb-sm">
                    No Activity Yet
                  </h3>
                  <p className="text-body text-light-gray mb-lg">
                    {isOwnProfile
                      ? "Start creating or joining arenas to build your reputation!"
                      : "This user hasn't participated in any arenas yet"}
                  </p>
                  {isOwnProfile && (
                    <Link href="/create">
                      <Button variant="success" size="lg">
                        Create Your First Arena
                      </Button>
                    </Link>
                  )}
                </Card>
              )}
          </>
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
        <Link href="/leaderboard" className="tab-item">
          <span className="text-2xl">🏆</span>
          <span className="text-xs">Top</span>
        </Link>
        <Link href="/profile" className="tab-item active">
          <span className="text-2xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

