/**
 * Caching layer for Pyth price data
 */

interface PriceCacheEntry {
  price: number;
  timestamp: number;
  confidence: number;
}

const priceCache = new Map<string, PriceCacheEntry>();
const CACHE_TTL = 60 * 1000; // 1 minute (prices update frequently)

export function getCachedPrice(priceId: string): PriceCacheEntry | null {
  const entry = priceCache.get(priceId);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    priceCache.delete(priceId);
    return null;
  }

  return entry;
}

export function setCachedPrice(
  priceId: string,
  price: number,
  confidence: number
): void {
  priceCache.set(priceId, {
    price,
    timestamp: Date.now(),
    confidence,
  });
}

export function clearPriceCache(priceId?: string): void {
  if (priceId) {
    priceCache.delete(priceId);
  } else {
    priceCache.clear();
  }
}

// Cleanup old entries
if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of priceCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        priceCache.delete(key);
      }
    }
  }, 30000); // Every 30 seconds
}

