/**
 * 灵感模式 - 生成中界面
 * 优化版本：添加动态提示和预计时间
 */
"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, BookOpen, Users, Globe } from "lucide-react";
import { novelTheme } from "../../theme";

const GENERATION_STEPS = [
  { icon: Sparkles, text: "分析你的创意方向...", duration: 5000 },
  { icon: BookOpen, text: "构思故事大纲...", duration: 10000 },
  { icon: Users, text: "设计主角形象...", duration: 8000 },
  { icon: Globe, text: "搭建世界观...", duration: 10000 },
  { icon: Sparkles, text: "润色生成内容...", duration: 7000 },
];

export function GeneratingView() {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // 定时器：更新步骤
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < GENERATION_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 8000);

    // 定时器：更新时间
    const timeTimer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(stepTimer);
      clearInterval(timeTimer);
    };
  }, []);

  const CurrentIcon = GENERATION_STEPS[currentStep].icon;

  return (
    <div className="py-12 text-center space-y-6">
      {/* 主加载动画 */}
      <div className="relative">
        <div className={`w-20 h-20 mx-auto rounded-full ${novelTheme.gradient.purplePinkSoft} flex items-center justify-center`}>
          <Loader2 className={`h-10 w-10 ${novelTheme.loading.spinner}`} />
        </div>
        {/* 外圈动画 */}
        <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-2 border-purple-500/30 animate-ping" />
      </div>

      {/* 当前步骤 */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <CurrentIcon className={`h-4 w-4 ${novelTheme.icon.purple}`} />
          <span>{GENERATION_STEPS[currentStep].text}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          已用时 {elapsedTime} 秒，预计还需 {Math.max(30 - elapsedTime, 10)} 秒
        </p>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-1.5">
        {GENERATION_STEPS.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index <= currentStep
                ? "w-6 bg-purple-500"
                : "w-1.5 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* 提示 */}
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        AI 正在根据你的回答生成完整的故事框架，请耐心等待
      </p>
    </div>
  );
}
