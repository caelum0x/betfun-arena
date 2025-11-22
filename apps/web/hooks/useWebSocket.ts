import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketClient } from '@betfun/websocket/client';
import type { ArenaUpdate, BetPlaced, ArenaResolved } from '@betfun/websocket/server';

/**
 * Hook for WebSocket connection
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef(getWebSocketClient());
  
  useEffect(() => {
    const client = clientRef.current;
    
    client.connect()
      .then(() => setIsConnected(true))
      .catch((err) => {
        setError(err);
        console.error('WebSocket connection failed:', err);
      });
    
    return () => {
      client.disconnect();
      setIsConnected(false);
    };
  }, []);
  
  return { isConnected, error, client: clientRef.current };
}

/**
 * Hook to subscribe to arena updates
 */
export function useArenaUpdates(arenaId: string | null) {
  const [arenaData, setArenaData] = useState<ArenaUpdate | null>(null);
  const [recentBets, setRecentBets] = useState<BetPlaced[]>([]);
  const { isConnected, client } = useWebSocket();
  
  useEffect(() => {
    if (!isConnected || !arenaId) return;
    
    // Subscribe to arena updates
    const unsubUpdate = client.subscribeToArena(arenaId, (update) => {
      setArenaData(update);
    });
    
    // Subscribe to bet events
    const unsubBets = client.subscribeToArenaBets(arenaId, (bet) => {
      if (bet.arenaId === arenaId) {
        setRecentBets(prev => [bet, ...prev].slice(0, 10)); // Keep last 10
      }
    });
    
    return () => {
      unsubUpdate();
      unsubBets();
    };
  }, [isConnected, arenaId, client]);
  
  return { arenaData, recentBets };
}

/**
 * Hook to subscribe to arena resolution
 */
export function useArenaResolution(arenaId: string | null, onResolved?: (resolution: ArenaResolved) => void) {
  const [resolution, setResolution] = useState<ArenaResolved | null>(null);
  const { isConnected, client } = useWebSocket();
  
  useEffect(() => {
    if (!isConnected || !arenaId) return;
    
    const unsub = client.subscribeToArenaResolution(arenaId, (res) => {
      if (res.arenaId === arenaId) {
        setResolution(res);
        onResolved?.(res);
      }
    });
    
    return unsub;
  }, [isConnected, arenaId, client, onResolved]);
  
  return resolution;
}

/**
 * Hook to subscribe to leaderboard updates
 */
export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const { isConnected, client } = useWebSocket();
  
  useEffect(() => {
    if (!isConnected) return;
    
    const unsub = client.subscribeToLeaderboard((data) => {
      setLeaderboard(data);
    });
    
    return unsub;
  }, [isConnected, client]);
  
  return leaderboard;
}

/**
 * Hook to subscribe to price updates
 */
export function usePriceUpdates(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const { isConnected, client } = useWebSocket();
  
  useEffect(() => {
    if (!isConnected || symbols.length === 0) return;
    
    const unsub = client.subscribeToPrices(symbols, (priceUpdate) => {
      setPrices(prev => ({
        ...prev,
        [priceUpdate.symbol]: priceUpdate.price,
      }));
    });
    
    return unsub;
  }, [isConnected, symbols, client]);
  
  return prices;
}

/**
 * Hook for user notifications
 */
export function useUserNotifications(wallet: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { isConnected, client } = useWebSocket();
  
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  useEffect(() => {
    if (!isConnected || !wallet) return;
    
    const unsub = client.subscribeToUserNotifications(wallet, (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });
    
    return unsub;
  }, [isConnected, wallet, client]);
  
  return { notifications, clearNotifications };
}

/**
 * Hook for platform announcements
 */
export function usePlatformAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const { isConnected, client } = useWebSocket();
  
  useEffect(() => {
    if (!isConnected) return;
    
    const unsub = client.subscribeToPlatformAnnouncements((announcement) => {
      setAnnouncements(prev => [announcement, ...prev].slice(0, 5)); // Keep last 5
    });
    
    return unsub;
  }, [isConnected, client]);
  
  return announcements;
}

