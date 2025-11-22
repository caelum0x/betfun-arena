"use client";

import { useEffect, useRef } from "react";

interface IndieFunWidgetProps {
  tokenMint: string;
  tokenName?: string;
}

/**
 * Indie.fun Embed Widget
 * SPONSOR_APIS.md spec: <div class="indie-launch" data-mint={tokenMint} />
 * Displays bonding curve, price, volume, and trading interface
 */
export function IndieFunWidget({ tokenMint, tokenName }: IndieFunWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for Indie.fun script to load
    const initWidget = () => {
      if (typeof window !== "undefined" && (window as any).IndieFun) {
        // Widget is initialized by the script
        return;
      }

      // If script hasn't loaded yet, wait a bit
      setTimeout(initWidget, 100);
    };

    initWidget();
  }, [tokenMint]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="indie-launch"
        data-mint={tokenMint}
        data-name={tokenName || "Arena Token"}
        style={{
          minHeight: "400px",
          width: "100%",
        }}
      />
      
      {/* Fallback if widget doesn't load */}
      <div className="mt-md text-center">
        <a
          href={`https://indie.fun/token/${tokenMint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-electric-purple hover:underline text-body-small"
        >
          View full trading page on Indie.fun →
        </a>
      </div>
    </div>
  );
}

