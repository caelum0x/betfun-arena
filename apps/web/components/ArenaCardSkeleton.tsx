"use client";

import { Card } from "./ui/card";
import { motion } from "framer-motion";

/**
 * ArenaCard Skeleton Loader
 * Shimmer effect with pulse animation
 */
export function ArenaCardSkeleton() {
  return (
    <Card className="arena-card overflow-hidden">
      {/* Image skeleton */}
      <div className="w-full h-48 bg-medium-gray relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      <div className="p-md">
        {/* Title skeleton */}
        <div className="mb-sm">
          <div className="h-6 bg-medium-gray rounded mb-2 w-3/4 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
                delay: 0.2,
              }}
            />
          </div>
          <div className="h-4 bg-medium-gray rounded w-1/2 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
                delay: 0.4,
              }}
            />
          </div>
        </div>

        {/* Question skeleton */}
        <div className="h-4 bg-medium-gray rounded mb-md w-full relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: 0.6,
            }}
          />
        </div>

        {/* Progress bar skeleton */}
        <div className="h-4 bg-medium-gray rounded mb-md relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: 0.8,
            }}
          />
        </div>

        {/* Stats skeleton */}
        <div className="flex items-center justify-between mt-md pt-md border-t border-medium-gray">
          <div className="flex items-center gap-lg">
            <div className="h-4 bg-medium-gray rounded w-16 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 1.0,
                }}
              />
            </div>
            <div className="h-4 bg-medium-gray rounded w-20 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 1.2,
                }}
              />
            </div>
          </div>
          <div className="h-4 bg-medium-gray rounded w-24 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
                delay: 1.4,
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

