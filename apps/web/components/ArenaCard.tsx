"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { LivePotBar } from "./LivePotBar";
import { OutcomeChip } from "./OutcomeChip";
import { VolumeBadge } from "./VolumeBadge";
import { formatSOL, formatCountdown, truncateAddress } from "../lib/utils";
import type { Arena } from "../lib/supabase/client";

interface ArenaCardProps {
  arena: Arena & {
    arena_account: string;
  };
  index?: number;
}

export function ArenaCard({ arena, index = 0 }: ArenaCardProps) {
  const isTokenized = !!arena.token_mint;
  const isResolved = arena.resolved;
  const timeRemaining = formatCountdown(arena.end_time);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link href={`/arena/${arena.arena_account}`}>
        <motion.div
          whileHover={{
            boxShadow: "0 8px 32px rgba(160, 32, 240, 0.3)",
          }}
        >
          <Card className="arena-card cursor-pointer overflow-hidden transition-all duration-200 hover:border-electric-purple">
          {/* Hero Image (if provided) - Next.js Image for optimization */}
          {arena.image_uri && (
            <div className="w-full h-48 bg-medium-gray overflow-hidden relative">
              <Image
                src={arena.image_uri}
                alt={arena.title || "Arena image"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                loading="lazy"
              />
            </div>
          )}

          <div className="p-md">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-sm">
            <div className="flex-1 min-w-0">
              <h3 className="text-body-large font-bold text-white truncate-2-lines">
                {arena.title}
              </h3>
              <p className="text-body-small text-light-gray mt-1">
                by {truncateAddress(arena.creator_wallet)}
              </p>
            </div>
            {isTokenized && (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-electric-purple/20 text-electric-purple text-xs font-bold">
                  🚀 TOKENIZED
                </span>
              </div>
            )}
          </div>

          {/* Question */}
          <p className="text-body text-white/80 mb-md truncate-2-lines">
            {arena.question}
          </p>

          {/* Progress Bar - USERFLOW.md spec: 16px height for feed cards */}
          <LivePotBar 
            outcomes={arena.outcomes} 
            pot={arena.pot} 
            resolved={isResolved} 
            winnerOutcome={arena.winner_outcome}
            size="md"
          />

          {/* Stats */}
          <div className="flex items-center justify-between mt-md pt-md border-t border-medium-gray">
            <div className="flex items-center gap-lg text-body-small">
              <span className="flex items-center gap-1 text-light-gray">
                👥 <span className="text-white">{arena.participants_count}</span>
              </span>
              <VolumeBadge pot={arena.pot} />
            </div>

            {!isResolved && (
              <span className="text-body-small text-hot-pink font-bold flex items-center gap-1">
                ⏰ {timeRemaining}
              </span>
            )}

            {isResolved && arena.winner_outcome !== null && (
              <OutcomeChip outcome={arena.outcomes[arena.winner_outcome]} isWinner />
            )}
          </div>

          {/* Tags */}
          {arena.tags && arena.tags.length > 0 && (
            <div className="flex flex-wrap gap-xs mt-sm">
              {arena.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-sm bg-medium-gray text-light-gray text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          </div>
          </Card>
        </motion.div>
      </Link>
    </motion.div>
  );
}

