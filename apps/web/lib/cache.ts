/**
 * Advanced caching utilities for BetFun Arena
 * Provides in-memory caching with TTL and automatic invalidation
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 60000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Global cache instance
export const cache = new Cache(1000, 60000); // 1000 entries, 60s default TTL

// Cleanup expired entries every 5 minutes
if (typeof window !== "undefined") {
  setInterval(() => {
    cache.clearExpired();
  }, 5 * 60 * 1000);
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  arena: (arenaId: string) => `arena:${arenaId}`,
  arenaList: (filters: string) => `arena:list:${filters}`,
  outcomeShare: (arenaId: string, outcomeIndex: number) =>
    `outcome:${arenaId}:${outcomeIndex}`,
  pool: (arenaId: string, outcomeIndex: number) =>
    `pool:${arenaId}:${outcomeIndex}`,
  orderBook: (arenaId: string, outcomeIndex: number) =>
    `orderbook:${arenaId}:${outcomeIndex}`,
  userBalance: (wallet: string) => `balance:${wallet}`,
  userPositions: (wallet: string) => `positions:${wallet}`,
};

/**
 * Cache wrapper for async functions
 */
export function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return fn().then((result) => {
    cache.set(key, result, ttl);
    return result;
  });
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern: string): void {
  for (const key of cache["cache"].keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

