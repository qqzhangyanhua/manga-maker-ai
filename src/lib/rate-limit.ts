/**
 * 简单的内存频率限制器
 * 生产环境建议使用 Redis
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface WindowRateLimitEntry {
  count: number;
  resetAt: number;
}

// 内存存储（单进程有效）
const rateLimitStore = new Map<string, RateLimitEntry>();
const windowRateLimitStore = new Map<string, WindowRateLimitEntry>();
const hasRedis =
  !!process.env.REDIS_URL ||
  !!process.env.REDIS_HOST ||
  !!process.env.REDIS_PORT ||
  !!process.env.REDIS_PASSWORD;

// 只有配置了 Redis 环境变量时才延迟加载，避免本地无 Redis 报错
const getRedis = async () => {
  const { redis } = await import("./redis");
  return redis;
};

// 每天凌晨重置
function getResetTime(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

// 清理过期条目
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// 每小时清理一次
setInterval(cleanupExpired, 60 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 3
): RateLimitResult {
  const now = Date.now();
  const key = `trial:${identifier}`;

  let entry = rateLimitStore.get(key);

  // 如果没有记录或已过期，创建新记录
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: getResetTime(),
    };
    rateLimitStore.set(key, entry);
  }

  const remaining = Math.max(0, maxRequests - entry.count);
  const allowed = entry.count < maxRequests;

  return {
    allowed,
    remaining,
    resetAt: new Date(entry.resetAt),
  };
}

export function incrementRateLimit(identifier: string): void {
  const key = `trial:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (entry) {
    entry.count++;
  }
}

// 全局配额限制
let globalDailyCount = 0;
let globalResetAt = getResetTime();

export function checkGlobalLimit(maxDaily: number = 1000): boolean {
  const now = Date.now();

  if (globalResetAt <= now) {
    globalDailyCount = 0;
    globalResetAt = getResetTime();
  }

  return globalDailyCount < maxDaily;
}

export function incrementGlobalLimit(): void {
  globalDailyCount++;
}

/**
 * 通用时间窗限流（适用于验证码/登录等高频接口）
 * @param identifier 标识，如 email:xxx 或 ip:1.1.1.1
 * @param maxRequests 窗口内允许的最大请求数
 * @param windowMs 窗口时长（毫秒）
 */
export function checkAndIncrementWindowLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const key = `win:${identifier}`;
  const entry = windowRateLimitStore.get(key);

  // 过期则重置窗口
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    const newEntry = { count: 1, resetAt };
    windowRateLimitStore.set(key, newEntry);
    return { allowed: true, remaining: Math.max(0, maxRequests - 1), resetAt: new Date(resetAt) };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.resetAt) };
  }

  entry.count += 1;
  windowRateLimitStore.set(key, entry);

  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: true, remaining, resetAt: new Date(entry.resetAt) };
}

/**
 * 基于 Redis 的分布式时间窗限流（优先使用 Redis，回退内存）
 */
export async function checkAndIncrementWindowLimitDistributed(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!hasRedis) {
    // 未配置 Redis 时回退内存版
    return checkAndIncrementWindowLimit(identifier, maxRequests, windowMs);
  }

  const key = `rl:${identifier}`;
  const ttlSeconds = Math.ceil(windowMs / 1000);

  try {
    const redis = await getRedis();
    const pipeline = redis.multi();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const results = await pipeline.exec();

    const incrResult = results?.[0]?.[1] as number | undefined;
    const current = incrResult ?? maxRequests + 1;
    const allowed = current <= maxRequests;
    const remaining = Math.max(0, maxRequests - current);

    const ttl = await redis.ttl(key);
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : windowMs));
    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error("Redis 限流失败，回退到内存限流", error);
    return checkAndIncrementWindowLimit(identifier, maxRequests, windowMs);
  }
}
