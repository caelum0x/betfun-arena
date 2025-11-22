import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// ========== USER-SPECIFIC RATE LIMITING ==========

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Per-user rate limiting middleware
 */
export function userRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests from this user',
    keyGenerator = (req: Request) => req.headers['x-wallet-address'] as string || req.ip || 'anonymous',
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);

    if (!key) {
      // If no key can be generated, allow the request
      return next();
    }

    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      // Create new record
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      
      return next();
    }

    if (record.count < maxRequests) {
      // Increment count
      record.count++;
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - record.count);
      res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
      
      return next();
    }

    // Rate limit exceeded
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
    res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));

    return res.status(429).json({
      error: 'Rate limit exceeded',
      message,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
  };
}

/**
 * Redis-based rate limiting (production)
 */
export class RedisRateLimiter {
  private redis: any; // Replace with actual Redis client type

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const redisKey = `ratelimit:${key}`;

    // Get current count
    const current = await this.redis.get(redisKey);

    if (!current) {
      // First request in window
      await this.redis.set(redisKey, '1', 'PX', windowMs);
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    const count = parseInt(current, 10);

    if (count < maxRequests) {
      // Increment count
      await this.redis.incr(redisKey);
      const ttl = await this.redis.pttl(redisKey);
      return {
        allowed: true,
        remaining: maxRequests - count - 1,
        resetAt: now + ttl,
      };
    }

    // Rate limit exceeded
    const ttl = await this.redis.pttl(redisKey);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + ttl,
    };
  }

  middleware(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : req.headers['x-wallet-address'] as string || req.ip || 'anonymous';

      const result = await this.checkLimit(
        key,
        config.maxRequests,
        config.windowMs
      );

      // Set headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: config.message || 'Too many requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        });
      }

      next();
    };
  }
}

/**
 * Database-based rate limiting with Supabase
 */
export class DatabaseRateLimiter {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async checkLimit(
    userId: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Get recent requests
    const { data, error } = await this.supabase
      .from('rate_limit_requests')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open (allow request on error)
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(now.getTime() + windowMs),
      };
    }

    const requestCount = data?.length || 0;

    if (requestCount < maxRequests) {
      // Record this request
      await this.supabase.from('rate_limit_requests').insert({
        user_id: userId,
        created_at: now.toISOString(),
      });

      const oldestRequest = data && data.length > 0 
        ? new Date(data[data.length - 1].created_at)
        : now;
      
      const resetAt = new Date(oldestRequest.getTime() + windowMs);

      return {
        allowed: true,
        remaining: maxRequests - requestCount - 1,
        resetAt,
      };
    }

    // Rate limit exceeded
    const oldestRequest = new Date(data![data!.length - 1].created_at);
    const resetAt = new Date(oldestRequest.getTime() + windowMs);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  middleware(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userId = config.keyGenerator
        ? config.keyGenerator(req)
        : req.headers['x-wallet-address'] as string || req.ip || 'anonymous';

      const result = await this.checkLimit(
        userId,
        config.maxRequests,
        config.windowMs
      );

      // Set headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: config.message || 'Too many requests from this user',
          retryAfter: retryAfterSeconds,
        });
      }

      next();
    };
  }
}

/**
 * Tier-based rate limiting (different limits for different KYC levels)
 */
export interface TierConfig {
  none: number;
  basic: number;
  intermediate: number;
  advanced: number;
  institutional: number;
}

export class TieredRateLimiter {
  private tiers: TierConfig;
  private windowMs: number;

  constructor(tiers: TierConfig, windowMs: number) {
    this.tiers = tiers;
    this.windowMs = windowMs;
  }

  async getUserTier(userId: string): Promise<keyof TierConfig> {
    // Fetch user's KYC level from database
    // Placeholder implementation
    return 'basic';
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.headers['x-wallet-address'] as string;

      if (!userId) {
        // No user ID, use strictest limit
        return userRateLimit({
          windowMs: this.windowMs,
          maxRequests: this.tiers.none,
        })(req, res, next);
      }

      const tier = await this.getUserTier(userId);
      const maxRequests = this.tiers[tier];

      return userRateLimit({
        windowMs: this.windowMs,
        maxRequests,
        keyGenerator: () => userId,
      })(req, res, next);
    };
  }
}

// ========== CLEANUP ==========

/**
 * Clean up expired rate limit records (run periodically)
 */
export function cleanupRateLimitStore(maxAge: number = 60 * 60 * 1000): void {
  const now = Date.now();
  
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(() => cleanupRateLimitStore(), 5 * 60 * 1000);

// ========== EXPORTS ==========

export default {
  userRateLimit,
  RedisRateLimiter,
  DatabaseRateLimiter,
  TieredRateLimiter,
  cleanupRateLimitStore,
};

