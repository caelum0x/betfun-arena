import Redis from 'ioredis';

// ========== REDIS CLIENT ==========

let redisClient: Redis | null = null;

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  enableOfflineQueue?: boolean;
}

/**
 * Initialize Redis client
 */
export function initRedis(config: RedisConfig): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db || 0,
    keyPrefix: config.keyPrefix || 'betfun:',
    maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
    enableOfflineQueue: config.enableOfflineQueue !== false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });

  return redisClient;
}

/**
 * Get Redis client instance
 */
export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// ========== CACHE STRATEGIES ==========

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const value = await redis.get(key);
    
    if (!value) {
      return null;
    }
    
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set cached value
 */
export async function setCache<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<void> {
  try {
    const redis = getRedis();
    const serialized = JSON.stringify(value);
    
    if (options?.ttl) {
      await redis.setex(key, options.ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Delete all keys matching pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Cache delete pattern error:', error);
  }
}

/**
 * Get or set cached value (cache-aside pattern)
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Try to get from cache first
  const cached = await getCache<T>(key);
  
  if (cached !== null) {
    return cached;
  }
  
  // If not in cache, fetch and store
  const value = await fetcher();
  await setCache(key, value, options);
  
  return value;
}

/**
 * Increment counter
 */
export async function incrementCache(
  key: string,
  amount: number = 1
): Promise<number> {
  try {
    const redis = getRedis();
    return await redis.incrby(key, amount);
  } catch (error) {
    console.error('Cache increment error:', error);
    return 0;
  }
}

/**
 * Set with expiration (NX - only if not exists)
 */
export async function setNX(
  key: string,
  value: string,
  ttl: number
): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.set(key, value, 'EX', ttl, 'NX');
    return result === 'OK';
  } catch (error) {
    console.error('Cache setNX error:', error);
    return false;
  }
}

// ========== CACHE KEY BUILDERS ==========

export const CacheKeys = {
  arena: (arenaId: string) => `arena:${arenaId}`,
  arenaList: (filter: string, page: number) => `arenas:${filter}:page:${page}`,
  participant: (arenaId: string, wallet: string) => 
    `participant:${arenaId}:${wallet}`,
  leaderboard: (period: string) => `leaderboard:${period}`,
  platformStats: () => 'platform:stats',
  userProfile: (wallet: string) => `user:${wallet}:profile`,
  userPositions: (wallet: string) => `user:${wallet}:positions`,
  trendingArenas: () => 'trending:arenas',
  hotArenas: () => 'hot:arenas',
};

// ========== TTL CONSTANTS ==========

export const CacheTTL = {
  SHORT: 30, // 30 seconds
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
};

// ========== CACHE WARMING ==========

/**
 * Warm cache with popular data
 */
export async function warmCache(fetchers: {
  platformStats: () => Promise<any>;
  trendingArenas: () => Promise<any>;
  leaderboard: () => Promise<any>;
}): Promise<void> {
  try {
    console.log('Warming cache...');
    
    // Warm platform stats
    const stats = await fetchers.platformStats();
    await setCache(CacheKeys.platformStats(), stats, { ttl: CacheTTL.MEDIUM });
    
    // Warm trending arenas
    const trending = await fetchers.trendingArenas();
    await setCache(CacheKeys.trendingArenas(), trending, { ttl: CacheTTL.MEDIUM });
    
    // Warm leaderboard
    const leaderboard = await fetchers.leaderboard();
    await setCache(CacheKeys.leaderboard('all-time'), leaderboard, { 
      ttl: CacheTTL.LONG 
    });
    
    console.log('Cache warming complete');
  } catch (error) {
    console.error('Cache warming error:', error);
  }
}

// ========== CACHE INVALIDATION ==========

/**
 * Invalidate arena-related caches
 */
export async function invalidateArenaCache(arenaId: string): Promise<void> {
  await deleteCache(CacheKeys.arena(arenaId));
  await deleteCachePattern('arenas:*'); // Invalidate all arena lists
  await deleteCachePattern('trending:*'); // Invalidate trending
  await deleteCache(CacheKeys.platformStats());
}

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCache(wallet: string): Promise<void> {
  await deleteCache(CacheKeys.userProfile(wallet));
  await deleteCache(CacheKeys.userPositions(wallet));
  await deleteCachePattern(`leaderboard:*`);
}

// ========== EXPORTS ==========

export * from './strategies/arena';
export * from './strategies/user';
export * from './strategies/leaderboard';

