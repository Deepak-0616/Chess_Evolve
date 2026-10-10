import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let parsedConfig = {
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
};

try {
  const parsed = new URL(redisUrl);
  parsedConfig = {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port, 10) || (parsed.protocol === "rediss:" ? 6380 : 6379),
    maxRetriesPerRequest: null,
  };
  if (parsed.password) {
    parsedConfig.password = decodeURIComponent(parsed.password);
  }
  if (parsed.username && parsed.username !== "default") {
    parsedConfig.username = decodeURIComponent(parsed.username);
  }
  if (parsed.protocol === "rediss:") {
    parsedConfig.tls = { rejectUnauthorized: false };
  }
} catch (e) {
  console.warn("[Redis] Failed to parse REDIS_URL, falling back to localhost:6379:", e.message);
}

export const redisConfig = parsedConfig;

let _redisClient = null;
let _isRedisAvailable = false;
let _lastCheck = 0;
let _lastErrorLog = 0;

export function getRedisClient() {
  if (!_redisClient) {
    _redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy(times) {
        // Exponential backoff up to 2000ms
        return Math.min(times * 100, 2000);
      },
    });

    let hasLoggedUnavailable = false;
    _redisClient.on("error", () => {
      if (!hasLoggedUnavailable && process.env.NODE_ENV !== "test") {
        hasLoggedUnavailable = true;
        console.info("[Redis]: Local Redis service not connected; operating seamlessly in in-memory mode.");
      }
    });
  }
  return _redisClient;
}

export const redisClient = getRedisClient();

export async function isRedisConnected() {
  const now = Date.now();
  if (now - _lastCheck < 5000) return _isRedisAvailable;
  _lastCheck = now;
  try {
    const client = getRedisClient();
    const pong = await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timeout")), 500))
    ]);
    _isRedisAvailable = pong === "PONG";
  } catch {
    _isRedisAvailable = false;
  }
  return _isRedisAvailable;
}

export async function closeRedis() {
  if (_redisClient) {
    try {
      await _redisClient.quit();
      console.log("[Redis] Client connection closed.");
    } catch (e) {
      _redisClient.disconnect();
    }
  }
}

