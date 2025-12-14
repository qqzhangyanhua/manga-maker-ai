/**
 * Custom hook for streaming panel generation with SSE progress updates
 */

import { useState, useCallback, useRef } from "react";

export interface ProgressState {
  stage: "idle" | "validating" | "generating" | "saving" | "done" | "error";
  current: number;
  total: number;
  message: string;
  llmContent?: string; // 累积的 LLM 生成内容（用于显示预览）
}

interface GenerateParams {
  chapterId: string;
  projectId: string;
  panelCount?: number;
  overwrite?: boolean;
}

export function useStreamingGeneration() {
  const [progress, setProgress] = useState<ProgressState>({
    stage: "idle",
    current: 0,
    total: 0,
    message: "",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (params: GenerateParams): Promise<void> => {
    const { chapterId, projectId, panelCount, overwrite = false } = params;

    // Reset state
    setProgress({
      stage: "idle",
      current: 0,
      total: 0,
      message: "",
      llmContent: "",
    });
    setIsGenerating(true);

    // Create abort controller for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // 用于累积 LLM 内容
    let accumulatedLlmContent = "";

    try {
      const response = await fetch(`/api/chapter/${chapterId}/generate-panels-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          panel_count: panelCount,
          overwrite,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and split by lines
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));

        for (const line of lines) {
          try {
            // Extract JSON after "data: " prefix
            const jsonStr = line.substring(line.indexOf("{"));
            const data = JSON.parse(jsonStr) as ProgressState & { llmChunk?: string };

            // 累积 LLM 内容
            if (data.llmChunk) {
              accumulatedLlmContent += data.llmChunk;
            }

            setProgress({
              ...data,
              llmContent: accumulatedLlmContent,
            });

            // Handle error stage
            if (data.stage === "error") {
              throw new Error(data.message);
            }
          } catch (parseError) {
            console.error("Failed to parse SSE message:", line, parseError);
          }
        }
      }

      setIsGenerating(false);
    } catch (error) {
      // Check if error is due to abort
      if (error instanceof Error && error.name === "AbortError") {
        setProgress({
          stage: "idle",
          current: 0,
          total: 0,
          message: "已取消",
          llmContent: "",
        });
      } else {
        const message = error instanceof Error ? error.message : "未知错误";
        setProgress({
          stage: "error",
          current: 0,
          total: 0,
          message,
          llmContent: accumulatedLlmContent,
        });
      }
      setIsGenerating(false);
      throw error;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setProgress({
      stage: "idle",
      current: 0,
      total: 0,
      message: "已取消",
      llmContent: "",
    });
  }, []);

  const reset = useCallback(() => {
    setProgress({
      stage: "idle",
      current: 0,
      total: 0,
      message: "",
      llmContent: "",
    });
    setIsGenerating(false);
  }, []);

  return {
    progress,
    isGenerating,
    generate,
    cancel,
    reset,
  };
}
