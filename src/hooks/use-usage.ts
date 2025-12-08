import { useEffect, useState, useCallback } from "react";

type UsageItem = {
  count: number;
  limit: number | null;
  remaining: number | null;
  lastUsedAt: string | null;
};

export type UsageSummary = {
  storyboard_generation: UsageItem;
  image_generation: UsageItem;
  llm_chat: UsageItem;
};

// 简单的客户端用量获取 Hook，便于在界面显示剩余额度
export function useUsage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) {
        throw new Error("获取用量信息失败");
      }
      const data = await res.json();
      setUsage(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取用量信息失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading, error, refresh: fetchUsage };
}
