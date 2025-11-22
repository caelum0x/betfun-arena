"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WalletMultiButton } from "../components/WalletMultiButton";
import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import { usePlatformStats } from "../hooks/usePlatformStats";
import { formatSOL } from "../lib/utils";
import { AnimatedNumber } from "../components/AnimatedNumber";

export default function HomePage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { stats, loading } = usePlatformStats();

  // Redirect to feed after wallet connect (USER_FLOW.md spec)
  useEffect(() => {
    if (connected) {
      router.push("/feed");
    }
  }, [connected, router]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Top Bar */}
      <header className="absolute top-0 left-0 right-0 z-40 border-b border-gray-700/20">
        <div className="container mx-auto px-md py-sm flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-h3 font-bold text-gradient-purple">
              BetFun Arena
            </span>
          </Link>

          <div className="flex items-center gap-md">
            <Link href="/feed" className="hidden md:block">
              <Button variant="ghost" size="sm">
                Explore Arenas
              </Button>
            </Link>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Marketing Hero - USERFLOW.md exact spec */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          {/* Safe Top Area - 56px */}
          <div className="h-14" />

          {/* Animated Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="text-6xl mb-4"
          >
            ⚔️
          </motion.div>

          {/* Main Headline - PP Mori 32px bold */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-bold text-gradient-purple mb-2"
            style={{
              fontFamily: '"PP Mori", "Inter", system-ui, sans-serif',
              fontSize: "32px",
              lineHeight: 1.2,
            }}
          >
            BETFUN ARENA
          </motion.h1>

          {/* Subheadline - Inter 16px, #888 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
            style={{
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: "16px",
              color: "#888888",
            }}
          >
            Live Prediction Battles on Solana
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-md mb-2xl flex-wrap"
          >
            <div className="px-6 py-2 bg-gray-700/20 border border-electric-purple/30 rounded-full">
              <span className="text-body font-medium">⚡ Instant Settlement</span>
            </div>
            <div className="px-6 py-2 bg-gray-700/20 border border-neon-green/30 rounded-full">
              <span className="text-body font-medium">🎮 Live Battles</span>
            </div>
            <div className="px-6 py-2 bg-gray-700/20 border border-hot-pink/30 rounded-full">
              <span className="text-body font-medium">💰 Win Big</span>
            </div>
          </motion.div>

          {/* CTA Button - USERFLOW.md spec: 56px height, #A020F0 bg, white text, 24px bold */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-8"
          >
            <div className="w-full" style={{ height: "56px" }}>
              <WalletMultiButton />
            </div>
          </motion.div>

          {/* Stats - Inter 14px, #666 - Real-time with animated numbers */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mb-8"
            style={{
              fontSize: "14px",
              color: "#666666",
            }}
          >
            {loading ? (
              "Loading stats..."
            ) : (
              <>
                <AnimatedNumber
                  value={stats.activeArenas}
                  duration={1500}
                  className="font-medium"
                />{" "}
                arenas live · $
                <AnimatedNumber
                  value={parseFloat(formatSOL(stats.totalVolume))}
                  duration={1500}
                  decimals={0}
                  className="font-medium"
                />{" "}
                vol
              </>
            )}
          </motion.p>

          {/* Trending Today - Inter 18px bold */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="text-left"
          >
            <h3
              className="font-bold mb-4"
              style={{
                fontSize: "18px",
              }}
            >
              Trending today
            </h3>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <p className="mb-2" style={{ fontSize: "16px" }}>
                Will Trump tweet today?
              </p>
              {/* LivePotBar - 12px height from wireframe */}
              <div className="mb-2">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span style={{ color: "#39FF14" }}>Yes 72%</span>
                  <span style={{ color: "#FF2D55" }}>No 28%</span>
                </div>
                <div
                  className="w-full bg-gray-700 rounded-full overflow-hidden"
                  style={{ height: "12px" }}
                >
                  <div
                    style={{
                      width: "72%",
                      height: "100%",
                      background: "#39FF14",
                    }}
                  />
                </div>
              </div>
              <div
                className="flex items-center gap-4"
                style={{ fontSize: "14px", color: "#666666" }}
              >
                <span>👥 12.3k</span>
                <span>💰 4,206 SOL</span>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700/20 py-6">
        <div className="container mx-auto px-md text-center">
          <div className="flex items-center justify-center gap-lg mb-md">
            <Link href="/feed" className="text-body text-gray-400 hover:text-white">
              Explore
            </Link>
            <Link href="/create" className="text-body text-gray-400 hover:text-white">
              Create
            </Link>
            <Link href="/leaderboard" className="text-body text-gray-400 hover:text-white">
              Leaderboard
            </Link>
            <a
              href="https://twitter.com/betfunarena"
              target="_blank"
              rel="noopener noreferrer"
              className="text-body text-gray-400 hover:text-white"
            >
              Twitter
            </a>
          </div>
          <p className="text-body-small text-gray-400">
            Built on Solana • Powered by Indie.fun, Moddio, Play Solana & Pyth
          </p>
        </div>
      </footer>
    </div>
  );
}
