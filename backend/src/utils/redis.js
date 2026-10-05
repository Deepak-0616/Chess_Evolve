import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Export an object for BullMQ connection options
export const redisConfig = {
  host: new URL(redisUrl).hostname,
  port: new URL(redisUrl).port || 6379,
  maxRetriesPerRequest: null,
};

// Default redis client if needed directly
export const redisClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
