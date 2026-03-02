import type { ConnectionOptions } from "bullmq";

export const QUEUE_NAMES = {
  IMAGE_GENERATION: "image-generation",
  TEXT_GENERATION: "text-generation",
} as const;

/**
 * 从环境变量构建 BullMQ Redis 连接配置
 * 优先使用 REDIS_URL，否则使用 REDIS_HOST/PORT/PASSWORD
 */
export function getRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379", 10),
      password: parsed.password || undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

/** 默认任务选项：重试 3 次，指数退避，完成后保留 100 条/24h，失败保留 200 条/7 天 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 3600,
  },
  removeOnFail: {
    count: 200,
    age: 7 * 24 * 3600,
  },
};
