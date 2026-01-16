/**
 * Rate Limiter
 * 基于内存的简单速率限制 (生产环境建议使用 Redis)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 清理过期条目 (每分钟)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitOptions {
  /** 时间窗口 (毫秒) */
  window?: number;
  /** 最大请求数 */
  max?: number;
}

export interface RateLimitResult {
  /** 是否允许请求 */
  allowed: boolean;
  /** 当前请求数 */
  current: number;
  /** 最大请求数 */
  limit: number;
  /** 重置时间 (毫秒时间戳) */
  resetAt: number;
  /** 剩余请求数 */
  remaining: number;
}

/**
 * 检查速率限制
 *
 * @param key - 限制键 (通常是 userId 或 IP)
 * @param options - 限制选项
 * @returns 限制结果
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const {
    window = 60000, // 默认 1 分钟
    max = 10,       // 默认 10 次
  } = options;

  const now = Date.now();
  let entry = rateLimitStore.get(key);

  // 创建或重置条目
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + window,
    };
    rateLimitStore.set(key, entry);
  }

  // 增加计数
  entry.count++;

  const allowed = entry.count <= max;
  const remaining = Math.max(0, max - entry.count);

  return {
    allowed,
    current: entry.count,
    limit: max,
    resetAt: entry.resetAt,
    remaining,
  };
}

/**
 * 重置速率限制 (用于测试或管理)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * 获取所有限制状态 (用于监控)
 */
export function getRateLimitStats(): {
  totalKeys: number;
  entries: Array<{ key: string; count: number; resetAt: number }>;
} {
  return {
    totalKeys: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, entry]) => ({
      key,
      count: entry.count,
      resetAt: entry.resetAt,
    })),
  };
}
