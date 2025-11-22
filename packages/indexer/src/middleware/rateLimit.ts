import { Request, Response, NextFunction } from "express";

/**
 * Simple in-memory rate limiter
 * For production, use redis-based rate limiting
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const DEFAULT_OPTIONS: Required<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (req) => req.ip || "unknown",
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

/**
 * Rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.keyGenerator(req);
    const now = Date.now();

    // Clean up expired entries
    for (const [k, v] of Object.entries(store)) {
      if (now > v.resetTime) {
        delete store[k];
      }
    }

    // Get or create entry
    let entry = store[key];
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + opts.windowMs,
      };
      store[key] = entry;
    }

    // Check limit
    if (entry.count >= opts.max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: {
          message: "Too many requests",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter,
        },
      });
    }

    // Increment counter
    entry.count++;

    // Add headers
    res.setHeader("X-RateLimit-Limit", opts.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, opts.max - entry.count));
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(entry.resetTime).toISOString()
    );

    // Track response status
    const originalSend = res.send;
    res.send = function (body) {
      if (opts.skipSuccessfulRequests && res.statusCode < 400) {
        entry.count--;
      }
      if (opts.skipFailedRequests && res.statusCode >= 400) {
        entry.count--;
      }
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Strict rate limiter for webhooks (fewer requests allowed)
 */
export function webhookRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
  });
}

/**
 * API rate limiter (more lenient)
 */
export function apiRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  });
}

