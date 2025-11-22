import {
  getOrSetCache,
  CacheKeys,
  CacheTTL,
  deleteCachePattern,
} from '../index';

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  wins: number;
  totalWagered: number;
}

/**
 * Get leaderboard with caching
 */
export async function getCachedLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'all-time',
  fetcher: () => Promise<LeaderboardEntry[]>
): Promise<LeaderboardEntry[]> {
  const ttl = period === 'all-time' ? CacheTTL.LONG : CacheTTL.MEDIUM;
  
  return getOrSetCache(
    CacheKeys.leaderboard(period),
    fetcher,
    { ttl }
  );
}

/**
 * Invalidate leaderboard cache
 */
export async function invalidateLeaderboard(): Promise<void> {
  await deleteCachePattern('leaderboard:*');
}

