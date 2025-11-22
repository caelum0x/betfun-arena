import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, BN } from "@solana/web3.js";
import { createBetFunClient } from "@betfun/sdk";

export interface OrderBookData {
  arena: PublicKey;
  outcomeIndex: number;
  nextOrderId: BN;
  totalOrders: number;
  activeOrders: number;
  totalVolume: BN;
  lastMatchAt: BN;
}

export interface LimitOrderData {
  arena: PublicKey;
  outcomeIndex: number;
  orderId: BN;
  owner: PublicKey;
  orderType: any;
  side: any;
  price: BN;
  size: BN;
  filledSize: BN;
  remainingSize: BN;
  status: any;
  createdAt: BN;
  expiresAt: BN;
}

export function useOrderBook(arenaAddress: string | null, outcomeIndex: number | null) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [userOrders, setUserOrders] = useState<LimitOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!arenaAddress || outcomeIndex === null) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);

      // Fetch order book data
      const orderBookData = await client.getOrderBook(arenaPDA, outcomeIndex);
      if (orderBookData) {
        setOrderBook(orderBookData as any);
      }

      // Fetch user's orders (placeholder - would use indexer in production)
      const orders = await client.getUserOrders(arenaPDA, outcomeIndex);
      setUserOrders(orders as any);
    } catch (err: any) {
      console.error("Error fetching order book data:", err);
      setError(err.message || "Failed to load order book data");
    } finally {
      setLoading(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet]);

  useEffect(() => {
    fetchData();

    // Poll for updates every 3 seconds (order books change more frequently)
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const placeLimitOrder = useCallback(async (params: {
    orderType: { limit?: {}; market?: {}; stopLoss?: {}; takeProfit?: {}; twap?: {} };
    side: { buy?: {}; sell?: {} };
    price: number; // in lamports
    size: number; // in lamports
    expiresAt?: number;
    stopPrice?: number;
    visibleSize?: number;
    twapInterval?: number;
  }) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setProcessing(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.placeLimitOrder(
        arenaPDA,
        outcomeIndex,
        params
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error placing limit order:", err);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  const cancelOrder = useCallback(async (orderId: number) => {
    if (!arenaAddress || outcomeIndex === null || !wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setProcessing(true);
    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      
      const signature = await client.cancelOrder(
        arenaPDA,
        outcomeIndex,
        orderId
      );

      // Refresh data
      await fetchData();
      return signature;
    } catch (err: any) {
      console.error("Error canceling order:", err);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [arenaAddress, outcomeIndex, connection, wallet, fetchData]);

  const getOrder = useCallback(async (orderId: number): Promise<LimitOrderData | null> => {
    if (!arenaAddress || outcomeIndex === null) {
      return null;
    }

    try {
      const client = createBetFunClient(connection, wallet);
      const arenaPDA = new PublicKey(arenaAddress);
      const order = await client.getLimitOrder(arenaPDA, outcomeIndex, orderId);
      return order as any;
    } catch (err: any) {
      console.error("Error fetching order:", err);
      return null;
    }
  }, [arenaAddress, outcomeIndex, connection, wallet]);

  return {
    orderBook,
    userOrders,
    loading,
    error,
    processing,
    placeLimitOrder,
    cancelOrder,
    getOrder,
    refresh: fetchData,
  };
}

