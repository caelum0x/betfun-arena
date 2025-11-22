"use client";

import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

interface TrophyNFTProps {
  mint: string;
  arenaTitle: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  className?: string;
}

const rarityConfig = {
  Common: {
    border: "border-light-gray",
    glow: "",
    emoji: "🥉",
  },
  Rare: {
    border: "border-sol-blue",
    glow: "shadow-glow-blue",
    emoji: "🥈",
  },
  Epic: {
    border: "border-electric-purple",
    glow: "shadow-glow-purple",
    emoji: "🥇",
  },
  Legendary: {
    border: "border-warning",
    glow: "shadow-glow-purple shadow-glow-green",
    emoji: "👑",
  },
};

export function TrophyNFT({
  mint,
  arenaTitle,
  rarity,
  className,
}: TrophyNFTProps) {
  const config = rarityConfig[rarity];

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 0.8 }}
      className={className}
    >
      <Card
        className={cn(
          "trophy-card border-2",
          config.border,
          config.glow,
          "overflow-hidden"
        )}
      >
        {/* Trophy Emoji Display */}
        <div className="flex items-center justify-center p-8 bg-gradient-to-br from-dark-gray to-medium-gray">
          <div className="text-8xl animate-pulse-slow">
            🏆
          </div>
        </div>

        {/* Trophy Details */}
        <div className="p-md space-y-sm">
          <div className="flex items-center justify-between">
            <span className="text-body-small text-light-gray">Trophy</span>
            <span className="flex items-center gap-1 text-body-small font-bold">
              {config.emoji} {rarity}
            </span>
          </div>

          <h4 className="text-body font-bold text-white truncate" title={arenaTitle}>
            {arenaTitle}
          </h4>

          <div className="pt-sm border-t border-medium-gray">
            <p className="text-xs text-light-gray truncate" title={mint}>
              Mint: {mint.slice(0, 8)}...{mint.slice(-8)}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

