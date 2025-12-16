"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type StageStatus = "completed" | "inProgress" | "waiting";

interface Stage {
  id: string;
  label: string;
  status: StageStatus;
}

const initialStages: Stage[] = [
  { id: "context", label: "正在读取故事上下文...", status: "waiting" },
  { id: "emotion", label: "角色情绪分析中...", status: "waiting" },
  { id: "camera", label: "镜头语言构建...", status: "waiting" },
  { id: "generate", label: "生成分镜画面...", status: "waiting" },
];

export function GeneratingState() {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // 模拟进度推进（每个阶段 2-3 秒）
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < stages.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [stages.length]);

  // 更新阶段状态
  useEffect(() => {
    setStages((prevStages) =>
      prevStages.map((stage, index) => {
        if (index < currentStageIndex) {
          return { ...stage, status: "completed" as StageStatus };
        } else if (index === currentStageIndex) {
          return { ...stage, status: "inProgress" as StageStatus };
        }
        return { ...stage, status: "waiting" as StageStatus };
      })
    );
  }, [currentStageIndex]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-8">
      {/* 生成终端效果 */}
      <div className="w-full max-w-md">
        <div className="bg-zinc-900/80 border-2 border-orange-500/30 rounded-lg p-6 space-y-4 shadow-lg shadow-orange-500/10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 rounded-full bg-comic-red animate-pulse" />
            <div className="w-3 h-3 rounded-full bg-comic-yellow animate-pulse delay-75" />
            <div className="w-3 h-3 rounded-full bg-comic-green animate-pulse delay-150" />
            <span className="ml-2 text-sm font-mono text-orange-500">
              AI 编排引擎
            </span>
          </div>

          {/* 阶段列表 */}
          <div className="space-y-3 text-left">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md transition-all duration-300",
                  stage.status === "inProgress" &&
                    "bg-orange-500/10 border border-orange-500/30",
                  stage.status === "completed" && "opacity-60"
                )}
              >
                {/* 状态图标 */}
                {stage.status === "completed" && (
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-comic-green flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {stage.status === "inProgress" && (
                  <Loader2 className="w-5 h-5 text-orange-500 animate-spin flex-shrink-0" />
                )}
                {stage.status === "waiting" && (
                  <Clock className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                )}

                {/* 阶段文本 */}
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    stage.status === "inProgress" && "text-orange-500",
                    stage.status === "completed" && "text-zinc-400",
                    stage.status === "waiting" && "text-zinc-500"
                  )}
                >
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 漫画格子预览 */}
      <div className="relative w-full max-w-md">
        <div className="grid grid-cols-3 gap-2 p-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed border-zinc-600",
                "bg-zinc-800/30 relative overflow-hidden",
                i === 0 && "col-span-2 row-span-2"
              )}
            >
              {/* 扫光效果 */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent animate-scan"
                style={{
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            </div>
          ))}
        </div>

        {/* 提示文字 */}
        <p className="text-sm text-zinc-400 mt-4">
          正在生成专业分镜画面，请稍候...
        </p>
      </div>
    </div>
  );
}
