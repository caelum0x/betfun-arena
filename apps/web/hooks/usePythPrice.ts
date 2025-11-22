"use client";

import { useEffect, useState } from "react";
import { PYTH_PRICE_SERVICE_URL, PYTH_PRICE_FEEDS } from "../lib/constants";

/**
 * Pyth Network Price Feed Integration
 * SPONSOR_APIS.md spec: Official price IDs for SOL, BTC, WIF
 */

interface PriceData {
  price: number;
  conf: number;
  expo: number;
  publishTime: number;
}

interface PythPrice {
  id: string;
  price: PriceData;
  emaPrice: PriceData;
}

export function usePythPrice(symbol: keyof typeof PYTH_PRICE_FEEDS) {
  const [price, setPrice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const priceId = PYTH_PRICE_FEEDS[symbol];

  useEffect(() => {
    if (!priceId) {
      setError("Invalid price feed symbol");
      setLoading(false);
      return;
    }

    // Fetch initial price
    fetchPrice();

    // Set up interval for periodic updates (every 5 seconds)
    const interval = setInterval(fetchPrice, 5000);

    return () => clearInterval(interval);
  }, [priceId]);

  const fetchPrice = async () => {
    try {
      // Pyth Hermes API endpoint
      const response = await fetch(
        `${PYTH_PRICE_SERVICE_URL}/api/latest_price_feeds?ids[]=${priceId}`
      );

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const priceData: PythPrice = data[0];
        
        // Convert price (Pyth returns price * 10^expo)
        const actualPrice = priceData.price.price * Math.pow(10, priceData.price.expo);
        const actualConf = priceData.price.conf * Math.pow(10, priceData.price.expo);

        setPrice(actualPrice);
        setConfidence(actualConf);
        setLastUpdate(new Date(priceData.price.publishTime * 1000));
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch Pyth price:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return {
    price,
    confidence,
    loading,
    error,
    lastUpdate,
    refresh: fetchPrice,
  };
}

/**
 * Hook to get price at a specific timestamp (for arena resolution)
 */
export async function getPriceAtTime(
  symbol: keyof typeof PYTH_PRICE_FEEDS,
  timestamp: number
): Promise<number | null> {
  const priceId = PYTH_PRICE_FEEDS[symbol];
  
  if (!priceId) {
    console.error("Invalid price feed symbol");
    return null;
  }

  try {
    // Get price updates around the timestamp
    const response = await fetch(
      `${PYTH_PRICE_SERVICE_URL}/api/get_price_feed?id=${priceId}&publish_time=${timestamp}`
    );

    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.statusText}`);
    }

    const data: PythPrice = await response.json();
    const actualPrice = data.price.price * Math.pow(10, data.price.expo);

    return actualPrice;
  } catch (error) {
    console.error("Failed to fetch historical Pyth price:", error);
    return null;
  }
}
