/**
 * 简单的内存频率限制器
 * 生产环境建议使用 Redis
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// 内存存储（单进程有效）
const rateLimitStore = new Map<string, RateLimitEntry>();

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
