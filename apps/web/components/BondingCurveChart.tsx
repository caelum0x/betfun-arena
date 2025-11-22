"use client";

import { motion } from "framer-motion";

interface BondingCurveChartProps {
  projectedRaise?: number;
  type?: "linear" | "exponential";
}

/**
 * Mini Bonding Curve Chart
 * USERFLOW.md spec: Shows projected raise for tokenized arenas
 * Simple SVG line chart with glow effect
 */
export function BondingCurveChart({
  projectedRaise = 69420,
  type = "linear",
}: BondingCurveChartProps) {
  // Generate curve points
  const width = 280;
  const height = 80;
  const points = 20;

  const generateCurve = () => {
    const path: string[] = [];
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      let y;

      if (type === "exponential") {
        // Exponential curve
        y = height - Math.pow(i / points, 2) * height * 0.8;
      } else {
        // Linear curve with slight curve
        y = height - (i / points) * height * 0.8;
      }

      if (i === 0) {
        path.push(`M ${x} ${y}`);
      } else {
        path.push(`L ${x} ${y}`);
      }
    }
    return path.join(" ");
  };

  const pathD = generateCurve();

  return (
    <div
      className="relative bg-medium-gray/20 rounded-lg p-4 border border-electric-purple/30 overflow-hidden"
      style={{ width: "100%", maxWidth: "320px" }}
    >
      {/* Background Glow */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background:
            "radial-gradient(circle at 80% 50%, #A020F0 0%, transparent 70%)",
        }}
      />

      {/* Chart SVG */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="relative z-10"
      >
        {/* Grid Lines */}
        <line
          x1="0"
          y1={height * 0.66}
          x2={width}
          y2={height * 0.66}
          stroke="#2D2D2D"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1="0"
          y1={height * 0.33}
          x2={width}
          y2={height * 0.33}
          stroke="#2D2D2D"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Bonding Curve Path */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="#A020F0"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          style={{
            filter: "drop-shadow(0 0 8px rgba(160, 32, 240, 0.6))",
          }}
        />

        {/* Fill Area Under Curve */}
        <motion.path
          d={`${pathD} L ${width} ${height} L 0 ${height} Z`}
          fill="url(#curveGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A020F0" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#A020F0" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Projected Raise Label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-2 flex items-center justify-between"
      >
        <span className="text-xs text-light-gray">Projected Raise</span>
        <span className="text-sm font-bold text-electric-purple">
          ↗ {projectedRaise.toLocaleString()} SOL
        </span>
      </motion.div>

      {/* Type Badge */}
      <div className="absolute top-2 right-2">
        <span
          className="text-[10px] px-2 py-1 rounded-full bg-electric-purple/20 text-electric-purple font-bold uppercase"
        >
          {type}
        </span>
      </div>
    </div>
  );
}

