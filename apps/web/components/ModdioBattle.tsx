"use client";

import { useEffect, useState, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { MODDIO_BASE_URL, MODDIO_WORLD_ID } from "../lib/constants";
import { buildModdioUrl } from "../lib/moddio/urlBuilder";
import { checkModdioHealthWithTimeout } from "../lib/moddio/healthCheck";

interface ModdioBattleProps {
  arenaId: string;
  wallet?: string;
  outcome?: number;
  className?: string;
}

/**
 * Moddio Battle Component with Lazy Loading
 * Only loads iframe when component is visible (performance optimization)
 */
export function ModdioBattle({
  arenaId,
  wallet,
  outcome,
  className = "",
}: ModdioBattleProps) {
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lazy load: only load iframe when visible
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  // Check Moddio health when component mounts
  useEffect(() => {
    if (inView && !shouldLoad) {
      checkModdioHealthWithTimeout(3000)
        .then((result) => {
          setIsHealthy(result.healthy);
          if (!result.healthy) {
            setError(result.error || "Moddio world unavailable");
          }
          setShouldLoad(true);
        })
        .catch((err) => {
          setIsHealthy(false);
          setError(err.message || "Health check failed");
          setShouldLoad(true);
        });
    }
  }, [inView, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || !MODDIO_WORLD_ID) {
      if (!MODDIO_WORLD_ID) {
        console.warn("Moddio World ID not configured");
      }
      return;
    }

    const url = buildModdioUrl({
      worldId: MODDIO_WORLD_ID,
      arenaId,
      wallet,
      outcome,
    });

    setIframeUrl(url);
  }, [shouldLoad, arenaId, wallet, outcome]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {!shouldLoad || !iframeUrl ? (
        <div
          className={`flex items-center justify-center bg-dark-gray border-2 border-electric-purple rounded-md ${className}`}
        >
          <div className="text-center">
            <div className="animate-spin w-8 h-8 mx-auto mb-2 border-4 border-electric-purple border-t-transparent rounded-full" />
            <p className="text-light-gray">Loading battle arena...</p>
          </div>
        </div>
      ) : isHealthy === false ? (
        // Fallback UI when Moddio is unavailable
        <div
          className={`flex flex-col items-center justify-center bg-dark-gray border-2 border-medium-gray rounded-md p-8 ${className}`}
        >
          <div className="text-4xl mb-4">🎮</div>
          <h3 className="text-h3 font-bold text-white mb-2">Battle Arena Unavailable</h3>
          <p className="text-body text-light-gray text-center mb-4">
            {error || "The Moddio game world is currently unavailable. Please try again later."}
          </p>
          <button
            onClick={() => {
              setIsHealthy(null);
              setError(null);
              setShouldLoad(false);
            }}
            className="px-4 py-2 bg-electric-purple text-white rounded-md hover:bg-electric-purple/90 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <iframe
          src={iframeUrl}
          className="w-full h-full border-2 border-electric-purple rounded-md"
          allow="autoplay; fullscreen"
          allowFullScreen
          title="BetFun Arena Battle"
          loading="lazy"
          onError={() => {
            setIsHealthy(false);
            setError("Failed to load Moddio world");
          }}
        />
      )}
    </div>
  );
}

