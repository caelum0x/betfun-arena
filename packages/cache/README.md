# @betfun/cache

Redis caching layer for BetFun Arena - Polymarket-level performance optimization.

## Features

- ✅ Redis caching with ioredis
- ✅ Cache-aside pattern
- ✅ Cache warming strategies
- ✅ Automatic invalidation
- ✅ TTL management
- ✅ Pattern-based deletion
- ✅ Type-safe interfaces

## Installation

```bash
npm install @betfun/cache
```

## Usage

### Initialize Redis

```typescript
import { initRedis } from '@betfun/cache';

initRedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'betfun:',
});
```

### Cache Arena Data

```typescript
import { getCachedArena } from '@betfun/cache';

const arena = await getCachedArena(arenaId, async () => {
  // This fetcher only runs if cache miss
  return await database.arenas.findById(arenaId);
});
```

### Cache User Profile

```typescript
import { getCachedUserProfile } from '@betfun/cache';

const profile = await getCachedUserProfile(wallet, async () => {
  return await database.users.getProfile(wallet);
});
```

### Invalidate Cache

```typescript
import { invalidateArenaCache, onArenaResolved } from '@betfun/cache';

// After arena is resolved
await onArenaResolved(arenaId);

// After user places bet
await onUserBet(wallet);
```

### Manual Cache Operations

```typescript
import { getCache, setCache, deleteCache, CacheTTL } from '@betfun/cache';

// Set
await setCache('my-key', { data: 'value' }, { ttl: CacheTTL.MEDIUM });

// Get
const data = await getCache<MyType>('my-key');

// Delete
await deleteCache('my-key');
```

## Cache Strategies

### Arena Strategy
- **TTL**: 30 seconds (live data)
- **Invalidation**: On resolution, new bet, claim
- **Warming**: Top 100 arenas on startup

### User Strategy
- **TTL**: 5 minutes
- **Invalidation**: On bet, claim, profile update
- **Warming**: Active users (last 24h)

### Leaderboard Strategy
- **TTL**: 5 minutes (daily/weekly), 30 minutes (all-time)
- **Invalidation**: On any bet/claim
- **Warming**: All periods on startup

## Cache Keys

All keys are prefixed with `betfun:` by default.

```typescript
import { CacheKeys } from '@betfun/cache';

CacheKeys.arena(arenaId)                    // arena:{id}
CacheKeys.arenaList(filter, page)           // arenas:{filter}:page:{n}
CacheKeys.participant(arenaId, wallet)      // participant:{arena}:{wallet}
CacheKeys.leaderboard(period)               // leaderboard:{period}
CacheKeys.platformStats()                   // platform:stats
CacheKeys.userProfile(wallet)               // user:{wallet}:profile
CacheKeys.userPositions(wallet)             // user:{wallet}:positions
CacheKeys.trendingArenas()                  // trending:arenas
```

## TTL Constants

```typescript
import { CacheTTL } from '@betfun/cache';

CacheTTL.SHORT   // 30 seconds
CacheTTL.MEDIUM  // 5 minutes
CacheTTL.LONG    // 30 minutes
CacheTTL.HOUR    // 1 hour
CacheTTL.DAY     // 24 hours
```

## Cache Warming

Warm cache on application startup:

```typescript
import { warmCache } from '@betfun/cache';

await warmCache({
  platformStats: async () => database.getStats(),
  trendingArenas: async () => database.getTrending(),
  leaderboard: async () => database.getLeaderboard('all-time'),
});
```

## Performance

Expected performance improvements:

- **Arena fetch**: 100ms → 5ms (20x faster)
- **Leaderboard**: 500ms → 10ms (50x faster)
- **Platform stats**: 200ms → 2ms (100x faster)
- **Database load**: -80%

## Configuration

### Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
REDIS_KEY_PREFIX=betfun:
```

### Production Setup

For production, use Redis Cloud or AWS ElastiCache:

```typescript
initRedis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  keyPrefix: 'betfun:',
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false, // Fail fast in production
});
```

## Monitoring

Monitor cache hit rates:

```typescript
import { getRedis } from '@betfun/cache';

const redis = getRedis();
const info = await redis.info('stats');
console.log(info); // Shows hits, misses, etc.
```

## License

MIT

