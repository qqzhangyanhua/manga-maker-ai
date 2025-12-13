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

    // 模拟进度
    const progressSteps = [
      { progress: 15, text: "正在分析你的故事创意..." },
      { progress: 30, text: "AI 正在构思分镜剧情..." },
      { progress: 50, text: "生成第 1 格分镜图像..." },
      { progress: 65, text: "生成第 2 格分镜图像..." },
      { progress: 80, text: "生成第 3 格分镜图像..." },
      { progress: 90, text: "生成第 4 格分镜图像..." },
      { progress: 95, text: "最终处理中..." },
    ];

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setState((prev) => ({
          ...prev,
          progress: progressSteps[stepIndex].progress,
          progressText: progressSteps[stepIndex].text,
        }));
        stepIndex++;
      }
    }, 2000);

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

      clearInterval(progressInterval);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "生成失败");
      }

      const data: TrialGenerateResponse = await res.json();

      if (data.success) {
        // 保存 trialId 到 localStorage
        if (data.trialId) {
          localStorage.setItem(STORAGE_KEY, data.trialId);
        }

        setState((prev) => ({
          ...prev,
          step: "result",
          progress: 100,
          progressText: "生成完成！",
          result: data,
          remainingTrials: data.remainingTrials,
        }));
      } else {
        throw new Error(data.error || "生成失败");
      }
    } catch (error) {
      clearInterval(progressInterval);
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
