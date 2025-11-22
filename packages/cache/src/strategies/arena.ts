import {
  getCache,
  setCache,
  getOrSetCache,
  CacheKeys,
  CacheTTL,
  invalidateArenaCache,
} from '../index';

export interface Arena {
  id: string;
  title: string;
  pot: number;
  participantsCount: number;
  resolved: boolean;
  // ... other fields
}

/**
 * Get arena with caching
 */
export async function getCachedArena(
  arenaId: string,
  fetcher: () => Promise<Arena>
): Promise<Arena> {
  return getOrSetCache(
    CacheKeys.arena(arenaId),
    fetcher,
    { ttl: CacheTTL.SHORT } // 30s for live arenas
  );
}

/**
 * Get arena list with caching
 */
export async function getCachedArenaList(
  filter: string,
  page: number,
  fetcher: () => Promise<Arena[]>
): Promise<Arena[]> {
  return getOrSetCache(
    CacheKeys.arenaList(filter, page),
    fetcher,
    { ttl: CacheTTL.SHORT }
  );
}

/**
 * Get trending arenas
 */
export async function getCachedTrendingArenas(
  fetcher: () => Promise<Arena[]>
): Promise<Arena[]> {
  return getOrSetCache(
    CacheKeys.trendingArenas(),
    fetcher,
    { ttl: CacheTTL.MEDIUM } // 5min for trending
  );
}

/**
 * Update arena cache after transaction
 */
export async function updateArenaCache(
  arenaId: string,
  updater: (arena: Arena) => Arena
): Promise<void> {
  const cached = await getCache<Arena>(CacheKeys.arena(arenaId));
  
  if (cached) {
    const updated = updater(cached);
    await setCache(CacheKeys.arena(arenaId), updated, { ttl: CacheTTL.SHORT });
  }
}

/**
 * Invalidate arena cache after resolution
 */
export async function onArenaResolved(arenaId: string): Promise<void> {
  await invalidateArenaCache(arenaId);
}

