import Redis from "ioredis";

/**
 * Redis 客户端单例
 * 依赖环境变量：
 * - REDIS_URL（优先）形如 redis://:password@host:port/0
 * 或
 * - REDIS_HOST / REDIS_PORT / REDIS_PASSWORD
 */
const getRedisClient = () => {
  const url = process.env.REDIS_URL;
  if (url) {
    return new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
  }

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;

  return new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
};

export const redis = getRedisClient();

export async function redisPing(): Promise<boolean> {
  try {
    const res = await redis.ping();
    return res === "PONG";
  } catch (error) {
    console.error("Redis ping 失败", error);
    return false;
  }
}
