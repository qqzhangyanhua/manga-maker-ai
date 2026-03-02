/**
 * 体验结果存储 - Redis 实现
 *
 * 特性：
 * - 分布式一致性（多实例安全）
 * - 自动过期（Redis TTL）
 * - 原子操作（Lua 脚本保证 claim 幂等性）
 * - 无需手动清理
 */

import { redis } from "./redis";
import { TrialPanel } from "@/components/TrialDialog/types";

interface TrialResultData {
  id: string;
  prompt: string;
  styleId: string;
  panels: TrialPanel[];
  fingerprint: string;
  claimed: boolean;
  claimedBy?: string;
  createdAt: string; // ISO 8601
}

// 1 小时过期（原需求是 24 小时，但注释说建议 1 小时）
const EXPIRY_SECONDS = 60 * 60;

// Redis key 前缀
const KEY_PREFIX = "trial:result:";

function getKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

/**
 * 存储体验结果
 */
export async function storeTrialResult(
  data: Omit<TrialResultData, "claimed" | "createdAt">
): Promise<void> {
  const key = getKey(data.id);
  const value: TrialResultData = {
    ...data,
    claimed: false,
    createdAt: new Date().toISOString(),
  };

  await redis.setex(key, EXPIRY_SECONDS, JSON.stringify(value));
}

/**
 * 获取体验结果
 */
export async function getTrialResult(id: string): Promise<TrialResultData | null> {
  const key = getKey(id);
  const raw = await redis.get(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TrialResultData;
  } catch (error) {
    console.error(`Failed to parse trial result ${id}:`, error);
    return null;
  }
}

/**
 * 标记为已领取（原子操作，防止重复领取）
 *
 * @returns true 表示领取成功，false 表示已被领取或不存在
 */
export async function markTrialClaimed(id: string, userId: string): Promise<boolean> {
  const key = getKey(id);

  // Lua 脚本保证原子性：
  // 1. 检查 key 是否存在
  // 2. 检查是否已被领取
  // 3. 更新 claimed 和 claimedBy
  // 4. 保持原有 TTL
  const luaScript = `
    local key = KEYS[1]
    local userId = ARGV[1]

    local raw = redis.call('GET', key)
    if not raw then
      return 0  -- key 不存在
    end

    local data = cjson.decode(raw)
    if data.claimed then
      return 0  -- 已被领取
    end

    data.claimed = true
    data.claimedBy = userId

    local ttl = redis.call('TTL', key)
    if ttl > 0 then
      redis.call('SETEX', key, ttl, cjson.encode(data))
    else
      redis.call('SET', key, cjson.encode(data))
    end

    return 1  -- 领取成功
  `;

  const result = await redis.eval(luaScript, 1, key, userId);
  return result === 1;
}

/**
 * 检查是否已被领取
 */
export async function isTrialClaimed(id: string): Promise<boolean> {
  const result = await getTrialResult(id);
  return result?.claimed ?? false;
}

/**
 * 删除体验结果（用于测试或手动清理）
 */
export async function deleteTrialResult(id: string): Promise<void> {
  const key = getKey(id);
  await redis.del(key);
}

/**
 * 批量清理过期数据（可选，Redis 会自动清理）
 * 仅用于监控或手动触发
 */
export async function cleanupExpiredTrials(): Promise<number> {
  const pattern = `${KEY_PREFIX}*`;
  let cursor = "0";
  let deletedCount = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    );
    cursor = nextCursor;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // 没有设置过期时间的异常数据
        await redis.del(key);
        deletedCount++;
      }
    }
  } while (cursor !== "0");

  return deletedCount;
}
