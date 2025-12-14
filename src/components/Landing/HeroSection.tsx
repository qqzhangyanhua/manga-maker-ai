"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Play, FileText, Layout, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GridBackground } from "./GridBackground";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  onOpenTrial?: () => void;
}

// 剧本内容 - 打字机效果
const scriptLines = [
  "第一幕：黄昏的悬崖",
  "",
  "【场景】海边悬崖，夕阳西下",
  "【角色】少年背对镜头站立",
  "",
  "少年：（转身，眼神坚定）",
  "\"这一次，我不会再逃避。\"",
];

export function HeroSection({ onOpenTrial }: HeroSectionProps) {
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [showStoryboard, setShowStoryboard] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);

  // 打字机效果
  useEffect(() => {
    if (currentLine >= scriptLines.length) {
      // 打字完成，显示分镜
      setTimeout(() => setShowStoryboard(true), 500);
      setTimeout(() => setShowFinal(true), 1200);
      // 循环重置
      setTimeout(() => {
        setTypedLines([]);
        setCurrentLine(0);
        setCurrentChar(0);
        setShowStoryboard(false);
        setShowFinal(false);
        setCycleKey((k) => k + 1);
      }, 5000);
      return;
    }

    const line = scriptLines[currentLine];
    if (currentChar < line.length) {
      const timeout = setTimeout(() => {
        setTypedLines((prev) => {
          const newLines = [...prev];
          newLines[currentLine] = line.slice(0, currentChar + 1);
          return newLines;
        });
        setCurrentChar((c) => c + 1);
      }, 40);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [currentLine, currentChar, cycleKey]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden py-20">
      {/* 动态背景 */}
      <GridBackground />

      {/* 内容层 */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4">
        {/* 顶部标题 - 居中 */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-slate-300">
              AI 驱动的漫画创作平台
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              故事到漫画
            </span>
            <br />
            <span className="text-white">三步进化</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            输入你的故事，AI 自动生成剧本、分镜、成品漫画
          </p>
        </div>

        {/* 三卡片流水线 */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 lg:gap-8 mb-16">
          {/* 连接线 - 仅桌面端显示 */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 -translate-y-1/2 z-0">
            <div className="relative h-1 mx-[16.67%]">
              {/* 流动光缆效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-full" />
              <div
                className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-pulse"
                style={{ opacity: 0.4 }}
              />
              {/* 流动粒子 */}
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-400 shadow-lg shadow-blue-500/50 animate-flow-particle" />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-400 shadow-lg shadow-purple-500/50 animate-flow-particle"
                style={{ animationDelay: "1s" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-pink-400 shadow-lg shadow-pink-500/50 animate-flow-particle"
                style={{ animationDelay: "2s" }}
              />
            </div>
          </div>

          {/* Card 1: 剧本 */}
          <div className="relative z-10">
            <PipelineCard
              icon={FileText}
              title="剧本生成"
              subtitle="Script"
              color="blue"
              delay={0}
            >
              {/* 代码编辑器样式 */}
              <div className="bg-slate-950/80 rounded-lg p-3 font-mono text-xs leading-relaxed h-[180px] overflow-hidden">
                {scriptLines.map((line, idx) => (
                  <div key={idx} className="flex">
                    <span className="w-6 text-slate-600 select-none text-right pr-2">
                      {idx + 1}
                    </span>
                    <span
                      className={cn(
                        "text-slate-300",
                        line.startsWith("【") && "text-blue-400",
                        line.startsWith('"') && "text-green-400"
                      )}
                    >
                      {typedLines[idx] || ""}
                      {idx === currentLine &&
                        currentLine < scriptLines.length && (
                          <span className="inline-block w-2 h-3.5 bg-blue-400 animate-pulse ml-0.5" />
                        )}
                    </span>
                  </div>
                ))}
              </div>
            </PipelineCard>

            {/* 移动端箭头 */}
            <div className="md:hidden flex justify-center py-4">
              <div className="w-px h-8 bg-gradient-to-b from-blue-500 to-purple-500" />
              <div className="absolute w-3 h-3 border-b-2 border-r-2 border-purple-500 rotate-45 translate-y-6" />
            </div>
          </div>

          {/* Card 2: 分镜 */}
          <div className="relative z-10">
            <PipelineCard
              icon={Layout}
              title="分镜设计"
              subtitle="Storyboard"
              color="purple"
              delay={200}
              active={showStoryboard}
            >
              {/* 黑白线稿分镜 */}
              <div
                className={cn(
                  "grid grid-cols-2 gap-2 h-[180px] transition-all duration-700",
                  showStoryboard ? "opacity-100 scale-100" : "opacity-30 scale-95"
                )}
              >
                {[1, 2, 3, 4].map((panel) => (
                  <div
                    key={panel}
                    className={cn(
                      "relative bg-slate-900/60 rounded border-2 border-slate-700 overflow-hidden transition-all duration-500",
                      showStoryboard && "border-purple-500/50"
                    )}
                    style={{
                      transitionDelay: showStoryboard ? `${panel * 150}ms` : "0ms",
                    }}
                  >
                    {/* 线稿风格 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-10 border-2 border-slate-600 rounded-full" />
                      <div className="absolute bottom-2 left-2 right-2 h-1 bg-slate-700 rounded" />
                    </div>
                    {/* 扫描线效果 */}
                    {showStoryboard && (
                      <div
                        className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent animate-scan"
                        style={{ animationDelay: `${panel * 200}ms` }}
                      />
                    )}
                    <span className="absolute top-1 left-1 text-[10px] text-slate-500">
                      P{panel}
                    </span>
                  </div>
                ))}
              </div>
            </PipelineCard>

            {/* 移动端箭头 */}
            <div className="md:hidden flex justify-center py-4">
              <div className="w-px h-8 bg-gradient-to-b from-purple-500 to-pink-500" />
              <div className="absolute w-3 h-3 border-b-2 border-r-2 border-pink-500 rotate-45 translate-y-6" />
            </div>
          </div>

          {/* Card 3: 成品漫画 */}
          <div className="relative z-10">
            <PipelineCard
              icon={Image}
              title="成品漫画"
              subtitle="Final Comic"
              color="pink"
              delay={400}
              active={showFinal}
              glow={showFinal}
            >
              {/* 彩色成品漫画预览 */}
              <div
                className={cn(
                  "relative h-[180px] rounded-lg overflow-hidden transition-all duration-700",
                  showFinal ? "opacity-100 scale-100" : "opacity-30 scale-95"
                )}
              >
                {/* 渐变背景模拟彩色漫画 */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-600/20" />

                {/* 模拟漫画内容 */}
                <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                  <div className="col-span-2 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded flex items-center justify-center">
                    <div className="w-12 h-14 bg-gradient-to-b from-amber-200/50 to-amber-400/50 rounded-full" />
                  </div>
                  <div className="bg-gradient-to-br from-sky-500/30 to-blue-600/30 rounded" />
                  <div className="bg-gradient-to-br from-rose-500/30 to-pink-600/30 rounded flex items-end justify-center pb-2">
                    <div className="px-2 py-0.5 bg-white/20 rounded text-[8px] text-white/80">
                      THE END
                    </div>
                  </div>
                </div>

                {/* 完成标记 */}
                {showFinal && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-pink-500/80 rounded text-[10px] text-white font-medium animate-bounce-in">
                    COMPLETE
                  </div>
                )}
              </div>
            </PipelineCard>
          </div>
        </div>

        {/* CTA 按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white border-0 px-8"
            asChild
          >
            <Link href="/story">
              <Sparkles className="w-5 h-5 mr-2" />
              开始创作
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8"
            onClick={onOpenTrial}
          >
            <Play className="w-5 h-5 mr-2" />
            快速体验
          </Button>
        </div>

        {/* 统计数据 */}
        <div className="text-center text-sm text-slate-500">
          已有 <span className="text-purple-400 font-semibold">12,000+</span>{" "}
          创作者完成了他们的第一部漫画
        </div>
      </div>

      {/* 底部渐变 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent z-10" />

      {/* 自定义动画样式 */}
      <style jsx>{`
        @keyframes flow-particle {
          0% {
            left: 0%;
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }
        .animate-flow-particle {
          animation: flow-particle 3s linear infinite;
        }
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        .animate-scan {
          animation: scan 1.5s ease-out forwards;
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </section>
  );
}

// 流水线卡片组件
interface PipelineCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  color: "blue" | "purple" | "pink";
  delay?: number;
  active?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

function PipelineCard({
  icon: Icon,
  title,
  subtitle,
  color,
  active = true,
  glow = false,
  children,
}: PipelineCardProps) {
  const colorMap = {
    blue: {
      border: "border-blue-500/30",
      activeBorder: "border-blue-500/60",
      bg: "from-blue-500/10 to-blue-600/5",
      icon: "text-blue-400 bg-blue-500/20",
      glow: "shadow-blue-500/30",
    },
    purple: {
      border: "border-purple-500/30",
      activeBorder: "border-purple-500/60",
      bg: "from-purple-500/10 to-purple-600/5",
      icon: "text-purple-400 bg-purple-500/20",
      glow: "shadow-purple-500/30",
    },
    pink: {
      border: "border-pink-500/30",
      activeBorder: "border-pink-500/60",
      bg: "from-pink-500/10 to-pink-600/5",
      icon: "text-pink-400 bg-pink-500/20",
      glow: "shadow-pink-500/30",
    },
  };

  const styles = colorMap[color];

  return (
    <div
      className={cn(
        "relative rounded-2xl border backdrop-blur-md transition-all duration-500",
        "bg-gradient-to-b",
        styles.bg,
        active ? styles.activeBorder : styles.border,
        glow && `shadow-2xl ${styles.glow}`
      )}
    >
      {/* 毛玻璃内容区 */}
      <div className="p-4">
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("p-2 rounded-lg", styles.icon)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        {/* 内容 */}
        {children}
      </div>

      {/* 角落装饰 */}
      <div
        className={cn(
          "absolute top-0 right-0 w-16 h-16 opacity-20",
          `bg-gradient-to-bl from-${color}-500/40 to-transparent`
        )}
        style={{ borderTopRightRadius: "1rem" }}
      />
    </div>
  );
}
