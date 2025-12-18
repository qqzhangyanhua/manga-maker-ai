import { useState, useCallback, useEffect } from "react";
import { TrialState, TrialGenerateResponse } from "../types";

// 生成简单的浏览器指纹
function generateFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("fingerprint", 2, 2);
  }

  const data = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|");

  // 简单哈希
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

const INITIAL_STATE: TrialState = {
  step: "input",
  prompt: "",
  selectedStyle: "manga",
  progress: 0,
  progressText: "",
  result: null,
  error: null,
  remainingTrials: 3,
};

const STORAGE_KEY = "trial_id";

export function useTrialGenerate() {
  const [state, setState] = useState<TrialState>(INITIAL_STATE);
  const [fingerprint, setFingerprint] = useState<string>("");

  // 初始化指纹和剩余次数
  useEffect(() => {
    setFingerprint(generateFingerprint());

    // 检查剩余次数
    const checkRemaining = async () => {
      try {
        const fp = generateFingerprint();
        const res = await fetch(`/api/trial/remaining?fingerprint=${fp}`);
        if (res.ok) {
          const data = await res.json();
          setState((prev) => ({ ...prev, remainingTrials: data.remaining }));
        }
      } catch {
        // 忽略错误，使用默认值
      }
    };
    checkRemaining();
  }, []);

  const setPrompt = useCallback((prompt: string) => {
    setState((prev) => ({ ...prev, prompt }));
  }, []);

  const setSelectedStyle = useCallback((styleId: string | null) => {
    setState((prev) => ({ ...prev, selectedStyle: styleId }));
  }, []);

  const generate = useCallback(async () => {
    if (!state.prompt.trim() || state.remainingTrials <= 0) return;

    setState((prev) => ({
      ...prev,
      step: "generating",
      progress: 0,
      progressText: "正在分析你的故事创意...",
      error: null,
    }));

    try {
      const res = await fetch("/api/trial/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: state.prompt,
          styleId: state.selectedStyle,
          fingerprint,
        }),
      });

      if (!res.ok) {
        throw new Error("网络请求失败");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "progress") {
              setState((prev) => ({
                ...prev,
                progress: data.progress || prev.progress,
                progressText: data.text || prev.progressText,
              }));
            } else if (data.type === "chunk") {
              // 可选：显示生成的文本块
            } else if (data.type === "panels") {
              // 保存 trialId 到 localStorage
              if (data.trialId) {
                localStorage.setItem(STORAGE_KEY, data.trialId);
              }

              setState((prev) => ({
                ...prev,
                progress: 100,
                progressText: "生成完成！",
                result: {
                  success: true,
                  panels: data.panels || [],
                  remainingTrials: data.remainingTrials || 0,
                  trialId: data.trialId || "",
                },
                remainingTrials: data.remainingTrials || 0,
              }));
            } else if (data.type === "done") {
              setState((prev) => ({
                ...prev,
                step: "result",
              }));
            } else if (data.type === "error") {
              throw new Error(data.message || "生成失败");
            }
          } catch (parseError) {
            console.error("解析 SSE 消息失败:", parseError);
          }
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        step: "input",
        error: error instanceof Error ? error.message : "生成失败，请稍后重试",
      }));
    }
  }, [state.prompt, state.selectedStyle, state.remainingTrials, fingerprint]);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...INITIAL_STATE,
      remainingTrials: prev.remainingTrials,
    }));
  }, []);

  const retry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: "input",
      result: null,
      error: null,
    }));
  }, []);

  return {
    state,
    setPrompt,
    setSelectedStyle,
    generate,
    reset,
    retry,
  };
}
