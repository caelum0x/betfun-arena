"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { triggerHaptic } from "../lib/utils";

/**
 * Floating Action Button (FAB)
 * EXACT specs from USERFLOW.md wireframe:
 * - 64×64px circle
 * - #A020F0 background
 * - +48px from bottom (above tab bar)
 * - Bottom-right position
 * - Shadow glow effect
 * - Microinteractions: haptic feedback, pulse animation
 */
export function FloatingActionButton() {
  const handleClick = () => {
    triggerHaptic("medium");
    // Optional: Play sound
    // playSound("whoosh.mp3", 0.5);
  };

  return (
    <Link href="/create" onClick={handleClick}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ 
          scale: 1,
        }}
        whileHover={{ 
          scale: 1.15,
          rotate: [0, -5, 5, -5, 0],
          transition: { duration: 0.3 }
        }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-[112px] right-[20px] md:bottom-[64px] md:right-[32px] z-50"
      >
        <div className="relative">
          {/* Pulse ring animation */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "#A020F0",
              opacity: 0.4,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          
          {/* Main button */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer relative z-10"
            style={{
              background: "#A020F0",
              boxShadow: "0 0 20px rgba(160, 32, 240, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)",
            }}
          >
            <span className="text-4xl" role="img" aria-label="Create arena">
              ⚔️
            </span>
            <span className="text-3xl ml-[-8px]">+</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

