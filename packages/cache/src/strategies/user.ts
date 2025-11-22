import {
  getOrSetCache,
  CacheKeys,
  CacheTTL,
  invalidateUserCache,
} from '../index';

export interface UserProfile {
  wallet: string;
  totalWagered: number;
  totalWon: number;
  winRate: number;
  rank: number;
}

export interface UserPosition {
  arenaId: string;
  outcome: number;
  amount: number;
  status: 'active' | 'won' | 'lost';
}

/**
 * Get user profile with caching
 */
export async function getCachedUserProfile(
  wallet: string,
  fetcher: () => Promise<UserProfile>
): Promise<UserProfile> {
  return getOrSetCache(
    CacheKeys.userProfile(wallet),
    fetcher,
    { ttl: CacheTTL.MEDIUM }
  );
}

/**
 * Get user positions with caching
 */
export async function getCachedUserPositions(
  wallet: string,
  fetcher: () => Promise<UserPosition[]>
): Promise<UserPosition[]> {
  return getOrSetCache(
    CacheKeys.userPositions(wallet),
    fetcher,
    { ttl: CacheTTL.SHORT }
  );
}

/**
 * Invalidate user cache after bet
 */
export async function onUserBet(wallet: string): Promise<void> {
  await invalidateUserCache(wallet);
}

/**
 * Invalidate user cache after claim
 */
export async function onUserClaim(wallet: string): Promise<void> {
  await invalidateUserCache(wallet);
}

