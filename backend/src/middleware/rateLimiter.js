import { getRedisClient } from "../utils/redis.js";

// In-memory fallback bucket store if Redis is unavailable
const memoryBuckets = new Map();

/**
 * Creates an Express rate limiting middleware.
 * Uses Redis INCR with TTL, falling back gracefully to in-memory window.
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  keyPrefix = "rl",
  message = "Too many requests. Please slow down.",
}) {
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    // If in test environment, bypass rate limiter unless explicitly testing it
    if (process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

    // Identify by authenticated user ID if present, otherwise by client IP
    const identifier = req.user?.id || req.ip || "unknown";
    const key = `${keyPrefix}:${identifier}`;

    try {
      const redis = getRedisClient();
      if (redis && redis.status === "ready") {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, windowSec);
        }
        if (count > max) {
          const ttl = await redis.ttl(key);
          res.setHeader("Retry-After", Math.max(ttl, 1));
          return res.status(429).json({
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message,
              retryAfterSeconds: Math.max(ttl, 1),
            },
          });
        }
        return next();
      }
    } catch {
      // Fall through to memory bucket
    }

    // In-memory fallback
    const now = Date.now();
    let bucket = memoryBuckets.get(key);
    if (!bucket || bucket.resetTime <= now) {
      bucket = { count: 0, resetTime: now + windowMs };
      memoryBuckets.set(key, bucket);
    }

    bucket.count++;
    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader("Retry-After", Math.max(retryAfterSeconds, 1));
      return res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
          retryAfterSeconds: Math.max(retryAfterSeconds, 1),
        },
      });
    }

    next();
  };
}

// Specialized rate limiters
export const generalLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 500,
  keyPrefix: "rl_gen",
  message: "General API rate limit reached.",
});

export const authLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  keyPrefix: "rl_auth",
  message: "Too many authentication requests.",
});

export const syncLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "rl_sync",
  message: "Too many sync requests. Please wait before syncing again.",
});

export const trainingLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  keyPrefix: "rl_train",
  message: "Too many training requests. Training jobs must be spaced out.",
});

export const coachLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "rl_coach",
  message: "Too many coach chat requests.",
});

export const moveLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: "rl_move",
  message: "Move submission rate limit reached.",
});
