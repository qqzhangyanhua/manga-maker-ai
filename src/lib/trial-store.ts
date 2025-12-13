/**
 * 体验结果临时存储
 * 生产环境建议使用 Redis 或数据库临时表
 */

import { TrialPanel } from "@/components/TrialDialog/types";

interface TrialResultData {
  id: string;
  prompt: string;
  styleId: string;
  panels: TrialPanel[];
  fingerprint: string;
  claimed: boolean;
  claimedBy?: string;
  createdAt: Date;
}

// 内存存储
const trialResultStore = new Map<string, TrialResultData>();

// 24 小时过期
const EXPIRY_MS = 24 * 60 * 60 * 1000;

// 清理过期条目
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of trialResultStore.entries()) {
    if (now - entry.createdAt.getTime() > EXPIRY_MS) {
      trialResultStore.delete(key);
    }
  }
}

// 每小时清理一次
setInterval(cleanupExpired, 60 * 60 * 1000);

export function storeTrialResult(data: Omit<TrialResultData, "claimed" | "createdAt">): void {
  trialResultStore.set(data.id, {
    ...data,
    claimed: false,
    createdAt: new Date(),
  });
}

export function getTrialResult(id: string): TrialResultData | null {
  const result = trialResultStore.get(id);
  if (!result) return null;

  // 检查是否过期
  if (Date.now() - result.createdAt.getTime() > EXPIRY_MS) {
    trialResultStore.delete(id);
    return null;
  }

  return result;
}

export function markTrialClaimed(id: string, userId: string): boolean {
  const result = trialResultStore.get(id);
  if (!result || result.claimed) {
    return false;
  }

  result.claimed = true;
  result.claimedBy = userId;
  return true;
}

export function isTrialClaimed(id: string): boolean {
  const result = trialResultStore.get(id);
  return result?.claimed ?? false;
}
