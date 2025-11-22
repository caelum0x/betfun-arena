// Hook for real-time updates via WebSocket

import { useEffect, useState, useCallback } from "react";
import { ws } from "@/lib/websocket";

export function useMarketRealtime(marketId: string | undefined) {
  const [priceUpdates, setPriceUpdates] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!marketId) return;

    setConnected(ws.isConnected());

    const handlePriceUpdate = (data: any) => {
      setPriceUpdates((prev) => [...prev.slice(-99), data]);
    };

    const handleTrade = (trade: any) => {
      setTrades((prev) => [trade, ...prev.slice(0, 49)]);
    };

    ws.subscribeToMarket(marketId, (data) => {
      if (data.price !== undefined) {
        handlePriceUpdate(data);
      }
      if (data.type === "trade") {
        handleTrade(data);
      }
    });

    return () => {
      ws.unsubscribe(`market:${marketId}`);
    };
  }, [marketId]);

  return { priceUpdates, trades, connected };
}

export function useUserRealtime(address: string | undefined) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!address) return;

    ws.subscribeToUser(address, {
      onNotification: (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      },
      onAchievement: (achievement) => {
        setAchievements((prev) => [achievement, ...prev]);
      },
      onTrade: (trade) => {
        setTrades((prev) => [trade, ...prev.slice(0, 49)]);
      },
      onOrder: (order) => {
        setOrders((prev) => {
          const index = prev.findIndex((o) => o.id === order.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = order;
            return updated;
          }
          return [order, ...prev];
        });
      },
    });

    return () => {
      ws.unsubscribe(`user:${address}`);
    };
  }, [address]);

  return { notifications, achievements, trades, orders };
}

export function usePlatformRealtime() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    ws.subscribeToPlatform((data) => {
      setStats(data);
    });

    return () => {
      ws.unsubscribe("platform");
    };
  }, []);

  return { stats };
}

export function useOrderBookRealtime(
  marketId: string | undefined,
  outcomeIndex: number | undefined
) {
  const [buyOrders, setBuyOrders] = useState<any[]>([]);
  const [sellOrders, setSellOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!marketId) return;

    ws.subscribeToOrderBook(marketId, outcomeIndex, (data) => {
      if (data.buyOrders) setBuyOrders(data.buyOrders);
      if (data.sellOrders) setSellOrders(data.sellOrders);
    });

    return () => {
      const room = outcomeIndex !== undefined
        ? `orderbook:${marketId}:${outcomeIndex}`
        : `orderbook:${marketId}`;
      ws.unsubscribe(room);
    };
  }, [marketId, outcomeIndex]);

  return { buyOrders, sellOrders };
}

