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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/30 backdrop-blur-sm mb-6 shadow-lg shadow-orange-500/10">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-zinc-200">
              AI 驱动的漫画创作平台
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">
            <span className="text-orange-500">
              故事到漫画
            </span>
            <br />
            <span className="text-white">三步进化</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto">
            输入你的故事，AI 自动生成剧本、分镜、成品漫画
          </p>
        </div>

        {/* 三卡片流水线 */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 lg:gap-8 mb-16">
          {/* 连接线 - 仅桌面端显示 */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 -translate-y-1/2 z-0">
            <div className="relative h-0.5 mx-[16.67%]">
              {/* 流动光缆效果 */}
              <div className="absolute inset-0 bg-zinc-700 rounded-full" />
              <div
                className="absolute inset-0 bg-gradient-to-r from-orange-500/60 via-orange-400/60 to-orange-500/60 rounded-full animate-pulse"
                style={{ opacity: 0.6 }}
              />
              {/* 流动粒子 */}
              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50 animate-flow-particle" />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 shadow-lg shadow-orange-400/50 animate-flow-particle"
                style={{ animationDelay: "1s" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-300 shadow-lg shadow-orange-300/50 animate-flow-particle"
                style={{ animationDelay: "2s" }}
              />
            </div>
          </div>

          {/* Card 1: 剧本 */}
          <div className="relative z-10">
            <PipelineCard
              icon={FileText}
              title="剧本生成"
              subtitle="脚本"
              step={1}
            >
              {/* 代码编辑器样式 */}
              <div className="bg-black/60 rounded-lg p-3 font-mono text-xs leading-relaxed h-[180px] overflow-hidden border border-zinc-800">
                {scriptLines.map((line, idx) => (
                  <div key={idx} className="flex">
                    <span className="w-6 text-zinc-600 select-none text-right pr-2">
                      {idx + 1}
                    </span>
                    <span
                      className={cn(
                        "text-zinc-300",
                        line.startsWith("【") && "text-orange-400",
                        line.startsWith('"') && "text-amber-300"
                      )}
                    >
                      {typedLines[idx] || ""}
                      {idx === currentLine &&
                        currentLine < scriptLines.length && (
                          <span className="inline-block w-2 h-3.5 bg-orange-500 animate-pulse ml-0.5" />
                        )}
                    </span>
                  </div>
                ))}
              </div>
            </PipelineCard>

            {/* 移动端箭头 */}
            <div className="md:hidden flex justify-center py-4">
              <div className="w-px h-8 bg-gradient-to-b from-zinc-600 to-zinc-700" />
              <div className="absolute w-3 h-3 border-b-2 border-r-2 border-orange-500 rotate-45 translate-y-6" />
            </div>
          </div>

          {/* Card 2: 分镜 */}
          <div className="relative z-10">
            <PipelineCard
              icon={Layout}
              title="分镜设计"
              subtitle="分镜"
              step={2}
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
                      "relative bg-zinc-900/60 rounded border-2 border-zinc-700 overflow-hidden transition-all duration-500",
                      showStoryboard && "border-orange-500/50"
                    )}
                    style={{
                      transitionDelay: showStoryboard ? `${panel * 150}ms` : "0ms",
                    }}
                  >
                    {/* 线稿风格 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-10 border-2 border-zinc-600 rounded-full" />
                      <div className="absolute bottom-2 left-2 right-2 h-1 bg-zinc-700 rounded" />
                    </div>
                    {/* 扫描线效果 */}
                    {showStoryboard && (
                      <div
                        className="absolute inset-0 bg-gradient-to-b from-orange-500/20 to-transparent animate-scan"
                        style={{ animationDelay: `${panel * 200}ms` }}
                      />
                    )}
                    <span className="absolute top-1 left-1 text-[10px] text-zinc-500">
                      P{panel}
                    </span>
                  </div>
                ))}
              </div>
            </PipelineCard>

            {/* 移动端箭头 */}
            <div className="md:hidden flex justify-center py-4">
              <div className="w-px h-8 bg-gradient-to-b from-zinc-600 to-zinc-700" />
              <div className="absolute w-3 h-3 border-b-2 border-r-2 border-orange-500 rotate-45 translate-y-6" />
            </div>
          </div>

          {/* Card 3: 成品漫画 */}
          <div className="relative z-10">
            <PipelineCard
              icon={Image}
              title="成品漫画"
              subtitle="成品"
              step={3}
              active={showFinal}
              glow={showFinal}
            >
              {/* 彩色成品漫画预览 */}
              <div
                className={cn(
                  "relative h-[180px] rounded-lg overflow-hidden transition-all duration-700 border border-zinc-800",
                  showFinal ? "opacity-100 scale-100" : "opacity-30 scale-95"
                )}
              >
                {/* 渐变背景模拟彩色漫画 */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-orange-600/10" />

                {/* 模拟漫画内容 */}
                <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                  <div className="col-span-2 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded flex items-center justify-center">
                    <div className="w-12 h-14 bg-gradient-to-b from-amber-200/50 to-amber-400/50 rounded-full" />
                  </div>
                  <div className="bg-gradient-to-br from-orange-400/30 to-amber-500/30 rounded" />
                  <div className="bg-gradient-to-br from-orange-500/30 to-orange-600/30 rounded flex items-end justify-center pb-2">
                    <div className="px-2 py-0.5 bg-white/20 rounded text-[8px] text-white/80">
                      THE END
                    </div>
                  </div>
                </div>

                {/* 完成标记 */}
                {showFinal && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500 rounded text-[10px] text-white font-medium animate-bounce-in">
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
            className="relative bg-orange-500 hover:bg-orange-600 text-white border-0 px-8 overflow-hidden group"
            asChild
          >
            <Link href="/story">
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <Sparkles className="w-5 h-5 mr-2 relative z-10" />
              <span className="relative z-10">开始创作</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 px-8 transition-all duration-300 hover:scale-105"
            onClick={onOpenTrial}
          >
            <Play className="w-5 h-5 mr-2" />
            快速体验
          </Button>
        </div>

        {/* Stats Bar - Industrial Style */}
        <div className="flex items-center justify-center gap-8 md:gap-12">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold font-mono text-orange-500 tracking-tighter">2.4M</div>
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Render Ops</div>
          </div>
          <div className="w-px h-8 bg-zinc-700" />
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold font-mono text-emerald-500 tracking-tighter">99.97%</div>
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Uptime</div>
          </div>
          <div className="w-px h-8 bg-zinc-700" />
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold font-mono text-white tracking-tighter">128</div>
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Active Nodes</div>
          </div>
        </div>
      </div>

      {/* 底部渐变 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f0f13] to-transparent z-10" />

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
  step: number;
  active?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

function PipelineCard({
  icon: Icon,
  title,
  subtitle,
  step,
  active = true,
  glow = false,
  children,
}: PipelineCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border backdrop-blur-xl transition-all duration-500 shadow-xl overflow-hidden",
        "bg-zinc-900/50",
        active ? "border-zinc-600" : "border-zinc-800",
        glow && "shadow-2xl shadow-orange-500/30 border-orange-500/60"
      )}
    >
      {/* 顶部高光 */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent transition-opacity",
        active ? "opacity-100" : "opacity-50"
      )} />

      {/* 内部光晕效果 */}
      {glow && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-orange-500/10 blur-2xl rounded-full" />
      )}
      {/* 毛玻璃内容区 */}
      <div className="p-4">
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            active ? "text-orange-500 bg-orange-500/10" : "text-zinc-500 bg-zinc-800"
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
          {/* 步骤数字 */}
          <div className={cn(
            "ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            active ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-500"
          )}>
            {step}
          </div>
        </div>

        {/* 内容 */}
        {children}
      </div>
    </div>
  );
}
