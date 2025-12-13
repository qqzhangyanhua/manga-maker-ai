import { useState, useEffect, useCallback } from "react";
import { WorkflowProgress } from "../types";

const DEFAULT_PROGRESS: WorkflowProgress = {
  currentStep: 1,
  steps: {
    story: { completed: false },
    characters: { completed: false, count: 0 },
    panels: { completed: false, total: 0, generated: 0 },
    exported: { completed: false },
  },
};

export function useWorkflowProgress() {
  const [progress, setProgress] = useState<WorkflowProgress>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/workflow/progress");

      if (res.status === 401) {
        // 未登录用户返回默认进度
        setProgress(DEFAULT_PROGRESS);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch progress");
      }

      const data = await res.json();
      setProgress(data);
    } catch (err) {
      console.error("Failed to fetch workflow progress:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setProgress(DEFAULT_PROGRESS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    loading,
    error,
    refetch: fetchProgress,
  };
}
