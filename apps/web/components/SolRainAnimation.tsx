"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Coin {
  id: number;
  x: number;
  y: number;
  rotation: number;
  velocity: number;
  emoji: string;
}

/**
 * SOL Rain Animation
 * USERFLOW.md spec: Falling coins with physics for 5 seconds
 * 60fps using requestAnimationFrame
 */
export function SolRainAnimation({ duration = 5000 }: { duration?: number }) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isActive, setIsActive] = useState(true);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const coinIdRef = useRef(0);

  // Coin emojis to rain down
  const coinEmojis = ["💰", "💵", "💎", "🪙", "💸", "🤑"];

  useEffect(() => {
    startTimeRef.current = Date.now();

    // Spawn new coins periodically
    const spawnInterval = setInterval(() => {
      if (Date.now() - startTimeRef.current > duration) {
        clearInterval(spawnInterval);
        setIsActive(false);
        return;
      }

      // Spawn 2-4 coins
      const numCoins = Math.floor(Math.random() * 3) + 2;
      const newCoins: Coin[] = [];

      for (let i = 0; i < numCoins; i++) {
        newCoins.push({
          id: coinIdRef.current++,
          x: Math.random() * window.innerWidth,
          y: -50,
          rotation: Math.random() * 360,
          velocity: Math.random() * 3 + 2, // 2-5 pixels per frame
          emoji: coinEmojis[Math.floor(Math.random() * coinEmojis.length)],
        });
      }

      setCoins((prev) => [...prev, ...newCoins]);
    }, 200);

    // Animation loop
    const animate = () => {
      setCoins((prevCoins) =>
        prevCoins
          .map((coin) => ({
            ...coin,
            y: coin.y + coin.velocity,
            rotation: coin.rotation + 5,
          }))
          .filter((coin) => coin.y < window.innerHeight + 50) // Remove off-screen coins
      );

      if (Date.now() - startTimeRef.current < duration + 2000) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(spawnInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [duration]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      <AnimatePresence>
        {coins.map((coin) => (
          <motion.div
            key={coin.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{
              position: "absolute",
              left: coin.x,
              top: coin.y,
              transform: `rotate(${coin.rotation}deg)`,
              fontSize: "32px",
              textShadow: "0 0 10px rgba(255, 215, 0, 0.5)",
            }}
          >
            {coin.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

