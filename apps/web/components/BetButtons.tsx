"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface BetButtonsProps {
  outcomes: string[];
  entryFee: number;
  onBet: (outcomeIndex: number) => Promise<void>;
  disabled?: boolean;
  userOutcome?: number | null;
}

export function BetButtons({
  outcomes,
  entryFee,
  onBet,
  disabled = false,
  userOutcome = null,
}: BetButtonsProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [success, setSuccess] = useState<number | null>(null);

  const colors = [
    { bg: "bg-neon-green", hover: "hover:bg-neon-green/90", glow: "shadow-glow-green" },
    { bg: "bg-blood-red", hover: "hover:bg-blood-red/90", glow: "" },
    { bg: "bg-sol-blue", hover: "hover:bg-sol-blue/90", glow: "shadow-glow-blue" },
    { bg: "bg-hot-pink", hover: "hover:bg-hot-pink/90", glow: "" },
    { bg: "bg-electric-purple", hover: "hover:bg-electric-purple/90", glow: "shadow-glow-purple" },
    { bg: "bg-warning", hover: "hover:bg-warning/90", glow: "" },
  ];

  const handleBet = async (index: number) => {
    setLoading(index);
    try {
      await onBet(index);
      setSuccess(index);
      // Flash success checkmark for 2 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
      {outcomes.map((outcome, index) => {
        const color = colors[index % colors.length];
        const isLoading = loading === index;
        const isSuccess = success === index;
        const isUserChoice = userOutcome === index;
        const isDisabled = disabled || isLoading || (userOutcome !== null && !isUserChoice);

        return (
          <Button
            key={outcome}
            onClick={() => handleBet(index)}
            disabled={isDisabled}
            className={cn(
              "font-bold text-base py-4 transition-all duration-150 relative",
              isDisabled && !isUserChoice ? "opacity-50 cursor-not-allowed" : color.bg,
              !isDisabled && color.hover,
              !isDisabled && color.glow,
              "text-black",
              isUserChoice && "ring-2 ring-white",
              !isDisabled && "hover:scale-105 active:scale-95"
            )}
          >
            {isLoading ? (
              <>
                <span className="animate-spin w-5 h-5 mr-2 border-2 border-black border-t-transparent rounded-full inline-block" />
                Placing bet...
              </>
            ) : isSuccess ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2"
              >
                <span className="text-2xl">✅</span>
                Bet Placed!
              </motion.span>
            ) : (
              <>
                {outcome} • {(entryFee / 1e9).toFixed(2)} SOL
                {isUserChoice && " ✓"}
              </>
            )}
          </Button>
        );
      })}
    </div>
  );
}

