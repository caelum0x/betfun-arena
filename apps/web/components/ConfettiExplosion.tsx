"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiExplosionProps {
  trigger?: boolean;
  colors?: string[];
  duration?: number;
}

export function ConfettiExplosion({
  trigger = true,
  colors = ["#A020F0", "#39FF14", "#14F195", "#FF1493"],
  duration = 3000,
}: ConfettiExplosionProps) {
  useEffect(() => {
    if (!trigger) return;

    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });

      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [trigger, colors, duration]);

  return null;
}

export function TrophyConfetti() {
  useEffect(() => {
    const scalar = 2;
    const trophy = confetti.shapeFromText({ text: "🏆", scalar });

    const defaults = {
      spread: 360,
      ticks: 60,
      gravity: 0,
      decay: 0.96,
      startVelocity: 20,
      shapes: [trophy],
      scalar,
    };

    const shoot = () => {
      confetti({
        ...defaults,
        particleCount: 30,
      });

      confetti({
        ...defaults,
        particleCount: 5,
        flat: true,
      });

      confetti({
        ...defaults,
        particleCount: 15,
        scalar: scalar / 2,
        shapes: ["circle"],
      });
    };

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
  }, []);

  return null;
}

