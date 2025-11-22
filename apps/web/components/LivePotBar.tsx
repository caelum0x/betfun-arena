"use client";

import { motion } from "framer-motion";
import { cn } from "../lib/utils";

interface LivePotBarProps {
  outcomes: string[];
  pot: number;
  resolved?: boolean;
  winnerOutcome?: number | null;
  outcomePots?: number[];
  size?: "sm" | "md" | "lg"; // USERFLOW.md: sm=12px, md=16px, lg=24px
}

export function LivePotBar({
  outcomes,
  pot,
  resolved = false,
  winnerOutcome = null,
  outcomePots,
  size = "md",
}: LivePotBarProps) {
  // Calculate percentages
  const percentages = outcomePots
    ? outcomePots.map((p) => (pot > 0 ? (p / pot) * 100 : 0))
    : outcomes.map(() => 100 / outcomes.length); // Equal split if no data

  // Color palette for outcomes (USERFLOW.md exact colors)
  const colors = [
    "bg-neon-green",   // Yes = #39FF14
    "bg-hot-pink",     // No = #FF2D55
    "bg-sol-blue",
    "bg-electric-purple",
    "bg-warning",
  ];

  // Height mapping from USERFLOW.md
  const heightClasses = {
    sm: "h-3",   // 12px - landing page
    md: "h-4",   // 16px - feed cards
    lg: "h-6",   // 24px - arena detail
  };

  return (
    <div className="space-y-xs">
      {/* Stacked progress bars */}
      <div className={cn("flex rounded-sm overflow-hidden", heightClasses[size])}>
        {outcomes.map((outcome, index) => {
          const percentage = percentages[index] || 0;
          const isWinner = resolved && winnerOutcome === index;
          const colorClass = colors[index % colors.length];

          if (percentage === 0) return null;

          return (
            <motion.div
              key={outcome}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "relative flex items-center justify-center text-body-small font-bold",
                colorClass,
                isWinner && "ring-2 ring-white"
              )}
            >
              {percentage > 15 && (
                <span className="text-black mix-blend-difference">
                  {percentage.toFixed(0)}%
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Outcome labels */}
      <div className="flex items-center justify-between gap-sm text-body-small">
        {outcomes.map((outcome, index) => {
          const percentage = percentages[index] || 0;
          const isWinner = resolved && winnerOutcome === index;
          const colorClass = colors[index % colors.length];

          return (
            <div
              key={outcome}
              className={cn(
                "flex items-center gap-1",
                isWinner ? "text-white font-bold" : "text-light-gray"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full", colorClass)} />
              <span>{outcome}</span>
              {isWinner && <span>🏆</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

