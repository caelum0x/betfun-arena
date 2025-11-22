import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

interface NetworkStatus {
  isOnline: boolean;
  isSolanaConnected: boolean;
  latency: number | null;
}

/**
 * Hook to monitor network status and Solana connection health
 */
export function useNetworkStatus() {
  const { connection } = useConnection();
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSolanaConnected: false,
    latency: null,
  });

  useEffect(() => {
    // Monitor browser online/offline status
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check Solana connection health
    const checkSolanaConnection = async () => {
      try {
        const start = Date.now();
        await connection.getVersion();
        const latency = Date.now() - start;

        setStatus((prev) => ({
          ...prev,
          isSolanaConnected: true,
          latency,
        }));
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          isSolanaConnected: false,
          latency: null,
        }));
      }
    };

    // Initial check
    checkSolanaConnection();

    // Periodic health checks (every 30 seconds)
    const interval = setInterval(checkSolanaConnection, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [connection]);

  return {
    ...status,
    isHealthy: status.isOnline && status.isSolanaConnected,
  };
}

