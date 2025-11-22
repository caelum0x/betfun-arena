"use client";

import { useState, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Card } from "@/components/ui/card";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NetworkStatus() {
  const [mounted, setMounted] = useState(false);
  const { isOnline, isSolanaConnected, latency, isHealthy } = useNetworkStatus();

  // Only render after client-side hydration to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return null during SSR and initial client render
  if (!mounted) {
    return null;
  }

  if (isHealthy) {
    return null; // Don't show anything if everything is healthy
  }

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Card
      className={`fixed top-4 right-4 z-50 max-w-md p-4 ${
        !isOnline || !isSolanaConnected
          ? "bg-red-500/10 border-red-500/50"
          : "bg-yellow-500/10 border-yellow-500/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {!isOnline ? (
          <WifiOff className="h-5 w-5 text-red-500 mt-0.5" />
        ) : !isSolanaConnected ? (
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
        ) : (
          <Wifi className="h-5 w-5 text-yellow-500 mt-0.5" />
        )}
        <div className="flex-1">
          {!isOnline ? (
            <div>
              <p className="font-semibold text-red-400 mb-1">
                No Internet Connection
              </p>
              <p className="text-sm text-red-300">
                Please check your internet connection and try again.
              </p>
            </div>
          ) : !isSolanaConnected ? (
            <div>
              <p className="font-semibold text-red-400 mb-1">
                Solana Network Unavailable
              </p>
              <p className="text-sm text-red-300">
                Unable to connect to Solana network. Transactions may fail.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-yellow-400 mb-1">
                High Latency
              </p>
              <p className="text-sm text-yellow-300">
                Network latency: {latency}ms. Transactions may be slow.
              </p>
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRetry}
          className="ml-2"
        >
          Retry
        </Button>
      </div>
    </Card>
  );
}

