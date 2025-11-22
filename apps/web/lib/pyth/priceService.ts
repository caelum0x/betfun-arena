import { PriceServiceConnection } from "@pythnetwork/price-service-client";
import { PYTH_PRICE_SERVICE_URL, PYTH_PRICE_FEEDS } from "../constants";
import { getCachedPrice, setCachedPrice } from "./cache";

/**
 * Pyth Price Service Client
 */
let priceService: PriceServiceConnection | null = null;

export function getPriceService(): PriceServiceConnection {
  if (!priceService) {
    priceService = new PriceServiceConnection(PYTH_PRICE_SERVICE_URL, {
      priceFeedRequestConfig: { binary: true },
    });
  }
  return priceService;
}

interface PriceData {
  price: number;
  confidence: number;
  expo: number;
  publishTime: number;
}

/**
 * Get current price for a feed (with caching)
 */
export async function getCurrentPrice(feedId: string): Promise<PriceData | null> {
  // Check cache first
  const cached = getCachedPrice(feedId);
  if (cached) {
    return {
      price: cached.price,
      confidence: cached.confidence,
      expo: 0, // Cached data doesn't include expo
      publishTime: cached.timestamp,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const service = getPriceService();
    const priceFeeds = await Promise.race([
      service.getLatestPriceFeeds([feedId]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10000)
      ),
    ]);

    clearTimeout(timeoutId);

    if (!priceFeeds || priceFeeds.length === 0) {
      return null;
    }

    const priceFeed = priceFeeds[0];
    const price = priceFeed.getPriceUnchecked();

    const priceData = {
      price: Number(price.price) * Math.pow(10, price.expo),
      confidence: Number(price.conf) * Math.pow(10, price.expo),
      expo: price.expo,
      publishTime: price.publishTime,
    };

    // Cache the result
    setCachedPrice(feedId, priceData.price, priceData.confidence);

    return priceData;
  } catch (error) {
    console.error("Error fetching Pyth price:", error);
    
    // Return cached data if available, even if stale
    const cached = getCachedPrice(feedId);
    if (cached) {
      console.warn("Using cached price data due to fetch error");
      return {
        price: cached.price,
        confidence: cached.confidence,
        expo: 0,
        publishTime: cached.timestamp,
      };
    }
    
    return null;
  }
}

/**
 * Get Bitcoin price
 */
export async function getBTCPrice(): Promise<number | null> {
  const data = await getCurrentPrice(PYTH_PRICE_FEEDS.BTC_USD);
  return data?.price || null;
}

/**
 * Get Solana price
 */
export async function getSOLPrice(): Promise<number | null> {
  const data = await getCurrentPrice(PYTH_PRICE_FEEDS.SOL_USD);
  return data?.price || null;
}

/**
 * Get Ethereum price
 */
export async function getETHPrice(): Promise<number | null> {
  const data = await getCurrentPrice(PYTH_PRICE_FEEDS.ETH_USD);
  return data?.price || null;
}

/**
 * Check if price condition is met for arena resolution
 */
export async function checkPriceCondition(
  feedId: string,
  targetPrice: number,
  condition: "above" | "below"
): Promise<boolean> {
  const data = await getCurrentPrice(feedId);
  if (!data) return false;

  if (condition === "above") {
    return data.price > targetPrice;
  } else {
    return data.price < targetPrice;
  }
}

/**
 * Subscribe to price updates
 */
export function subscribeToPriceUpdates(
  feedId: string,
  callback: (price: PriceData) => void
): () => void {
  const service = getPriceService();
  let isActive = true;

  const poll = async () => {
    while (isActive) {
      const data = await getCurrentPrice(feedId);
      if (data) {
        callback(data);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5s
    }
  };

  poll();

  return () => {
    isActive = false;
  };
}

/**
 * Format price with appropriate decimals
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

