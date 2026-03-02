import { useState, useCallback } from "react";
import type { CandidateImage } from "@/components/common/CandidateSelector";
import { useToast } from "@/hooks/use-toast";

interface UseCandidateSystemOptions {
  panelId: string;
  onConfirm: (panelId: string, imageUrl: string) => Promise<void>;
}

interface CandidateState {
  candidates: CandidateImage[];
  isGenerating: boolean;
  previousImageUrl: string | null;
  canUndo: boolean;
}

interface VariantsApiResponse {
  success?: boolean;
  task_ids?: string[];
}

interface TaskStatusResponse {
  success?: boolean;
  status?: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 120; // ~4 minutes

async function pollForImageUrl(taskId: string): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const res = await fetch(`/api/image/task-status?task_id=${taskId}`);
    const data = (await res.json()) as TaskStatusResponse;
    if (data.status === "completed" && data.imageUrl) return data.imageUrl;
    if (data.status === "failed") return null;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return null;
}

export function useCandidateSystem({ panelId, onConfirm }: UseCandidateSystemOptions) {
  const { toast } = useToast();
  const [state, setState] = useState<CandidateState>({
    candidates: [],
    isGenerating: false,
    previousImageUrl: null,
    canUndo: false,
  });

  const generateCandidates = useCallback(
    async (
      _prompt: string,
      count: number = 3,
      currentImageUrl?: string | null
    ) => {
      setState((prev) => ({
        ...prev,
        isGenerating: true,
        previousImageUrl: currentImageUrl || prev.previousImageUrl,
      }));

      try {
        const response = await fetch(`/api/panel/${panelId}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variant_count: Math.min(5, Math.max(1, count)),
            variant_type: "style",
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "生成候选图失败");
        }

        const data = (await response.json()) as VariantsApiResponse;
        const taskIds = data.task_ids || [];

        if (taskIds.length === 0) {
          setState((prev) => ({ ...prev, isGenerating: false }));
          return;
        }

        const newCandidates: CandidateImage[] = [];
        for (let i = 0; i < taskIds.length; i++) {
          const url = await pollForImageUrl(taskIds[i]);
          if (url) {
            newCandidates.push({ id: taskIds[i], url });
          }
        }

        setState((prev) => ({
          ...prev,
          candidates: newCandidates,
          isGenerating: false,
        }));
      } catch (error) {
        setState((prev) => ({ ...prev, isGenerating: false }));
        toast({
          title: "候选图生成失败",
          description: error instanceof Error ? error.message : "请稍后重试",
          variant: "destructive",
        });
      }
    },
    [panelId, toast]
  );

  const selectCandidate = useCallback(
    async (candidate: CandidateImage) => {
      try {
        await onConfirm(panelId, candidate.url);
        setState((prev) => ({
          ...prev,
          canUndo: true,
        }));
        toast({ title: "已选择候选图" });
      } catch (error) {
        toast({
          title: "选择失败",
          description: error instanceof Error ? error.message : "请稍后重试",
          variant: "destructive",
        });
      }
    },
    [panelId, onConfirm, toast]
  );

  const undo = useCallback(async () => {
    if (!state.previousImageUrl) return;

    try {
      await onConfirm(panelId, state.previousImageUrl);
      setState((prev) => ({
        ...prev,
        canUndo: false,
      }));
      toast({ title: "已撤销选择" });
    } catch (error) {
      toast({
        title: "撤销失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }, [panelId, state.previousImageUrl, onConfirm, toast]);

  const clearCandidates = useCallback(() => {
    setState({
      candidates: [],
      isGenerating: false,
      previousImageUrl: null,
      canUndo: false,
    });
  }, []);

  return {
    candidates: state.candidates,
    isGenerating: state.isGenerating,
    canUndo: state.canUndo,
    generateCandidates,
    selectCandidate,
    undo,
    clearCandidates,
  };
}
