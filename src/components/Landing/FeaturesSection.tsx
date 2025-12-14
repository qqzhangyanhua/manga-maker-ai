"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Fingerprint, FileCode, LayoutGrid, Layers, Cpu, Scan } from "lucide-react";
import { cn } from "@/lib/utils";

interface MousePosition {
  x: number;
  y: number;
}

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePosition(null);
  }, []);

  return (
    <section className="relative px-4 py-24 bg-[#0c0c0e]">
      {/* Top separator line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-mono uppercase tracking-widest text-zinc-500">
              系统模块
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            核心处理单元
          </h2>
          <p className="text-zinc-400 max-w-xl font-mono text-sm">
            模块化架构。各组件独立运行，共享内存池。
          </p>
        </div>

        {/* Bento Grid with Spotlight Effect */}
        <div
          ref={containerRef}
          className="relative"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Global Spotlight Overlay - Large soft glow following mouse */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-30 transition-opacity duration-500",
              isHovering ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: mousePosition
                ? `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 115, 22, 0.07), transparent 40%)`
                : "none",
            }}
          />

          {/* Grid Container */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-1 relative">
            {/* Module A: Entity Persistence - Primary Module */}
            <SpotlightCard
              className="md:col-span-4 lg:col-span-4 row-span-2"
              mousePosition={mousePosition}
              isContainerHovering={isHovering}
            >
              <div className="h-full flex flex-col p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500/10 text-orange-500">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">角色持久化</h3>
                    <p className="text-xs font-mono text-zinc-500">ID_LOCK_v3.2</p>
                  </div>
                  <div className="ml-auto px-2 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-500 text-xs font-mono">
                    核心模块
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  专有 ID 锁定算法，确保角色面部在 100+ 帧中保持稳定。零漂移。零方差。
                </p>

                {/* Visual: 3 character thumbnails with face-lock lines */}
                <div className="flex-1 flex items-center justify-center py-4">
                  <div className="relative flex items-center gap-6">
                    {[
                      { frame: "F_001", status: "已锁定" },
                      { frame: "F_054", status: "已锁定" },
                      { frame: "F_127", status: "已锁定" },
                    ].map((char, idx) => (
                      <div key={idx} className="relative">
                        <div className="w-24 h-32 bg-zinc-800 border border-zinc-700 overflow-hidden">
                          <div className="h-full flex flex-col items-center justify-center p-2">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-zinc-600" />
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                                <Scan className="w-2 h-2 text-emerald-500" />
                              </div>
                            </div>
                            <div className="w-8 h-12 mt-1 bg-zinc-700 rounded-t-lg" />
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <div className="text-xs font-mono text-zinc-500">{char.frame}</div>
                          <div className="text-[10px] font-mono text-emerald-500">{char.status}</div>
                        </div>
                      </div>
                    ))}

                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ overflow: "visible" }}
                    >
                      <line x1="48" y1="20" x2="144" y2="20" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
                      <line x1="168" y1="20" x2="264" y2="20" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
                    </svg>
                  </div>
                </div>

                {/* Stats footer */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <div className="text-2xl font-bold font-mono text-white">99.2%</div>
                    <div className="text-xs font-mono text-zinc-500">匹配率</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-white">100+</div>
                    <div className="text-xs font-mono text-zinc-500">帧范围</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-emerald-500">活跃</div>
                    <div className="text-xs font-mono text-zinc-500">ID 状态</div>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            {/* 模块 B: 剧本解析 */}
            <SpotlightCard
              className="md:col-span-2 lg:col-span-2"
              mousePosition={mousePosition}
              isContainerHovering={isHovering}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500/10 text-orange-500">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">剧本解析</h3>
                    <p className="text-xs font-mono text-zinc-500">NLP_引擎</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mb-4">
                  从原始剧本输入中结构化提取。场景、动作、对白映射到渲染参数。
                </p>

                <div className="bg-black/40 p-3 border border-zinc-800 font-mono text-xs">
                  <div className="text-zinc-600">{"// input.txt"}</div>
                  <div className="text-zinc-400 mt-1">[SCENE: cliff, sunset]</div>
                  <div className="text-zinc-400">[ACTION: turn, dramatic]</div>
                  <div className="text-orange-400 mt-2">→ render_params.json</div>
                </div>
              </div>
            </SpotlightCard>

            {/* 模块 C: 自动布局 */}
            <SpotlightCard
              className="md:col-span-2 lg:col-span-2"
              mousePosition={mousePosition}
              isContainerHovering={isHovering}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500/10 text-orange-500">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">自动布局</h3>
                    <p className="text-xs font-mono text-zinc-500">网格_生成</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mb-4">
                  基于叙事权重的分镜构图。动态网格分配。
                </p>

                <div className="grid grid-cols-3 gap-1 h-20">
                  <div className="col-span-2 bg-zinc-800 border border-zinc-700" />
                  <div className="bg-zinc-800 border border-zinc-700" />
                  <div className="bg-zinc-800 border border-zinc-700" />
                  <div className="col-span-2 bg-zinc-800 border border-zinc-700" />
                </div>
              </div>
            </SpotlightCard>

            {/* 模块 D: 分层 PSD 导出 */}
            <SpotlightCard
              className="md:col-span-2 lg:col-span-3"
              mousePosition={mousePosition}
              isContainerHovering={isHovering}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 text-orange-500">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">分层 PSD 导出</h3>
                      <p className="text-xs font-mono text-zinc-500">导出_v2</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mb-4">
                  完整图层分离。背景、角色、特效、文字在独立通道上。
                </p>

                <div className="space-y-1">
                  {[
                    { name: "文字_图层", color: "bg-amber-500" },
                    { name: "特效_图层", color: "bg-purple-500" },
                    { name: "角色_图层", color: "bg-orange-500" },
                    { name: "背景_图层", color: "bg-zinc-600" },
                  ].map((layer, idx) => (
                    <div
                      key={layer.name}
                      className="flex items-center gap-2 px-2 py-1 bg-zinc-800/50 border border-zinc-700"
                      style={{ marginLeft: `${idx * 8}px` }}
                    >
                      <div className={cn("w-2 h-2", layer.color)} />
                      <span className="text-[10px] font-mono text-zinc-400">{layer.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SpotlightCard>

            {/* 输出格式 */}
            <SpotlightCard
              className="md:col-span-2 lg:col-span-3"
              mousePosition={mousePosition}
              isContainerHovering={isHovering}
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-zinc-500 mb-1">输出_格式</div>
                    <div className="text-white font-semibold text-sm">导出管线</div>
                  </div>
                  <div className="flex gap-2">
                    {["PSD", "PNG", "PDF", "TIFF"].map((fmt) => (
                      <div
                        key={fmt}
                        className={cn(
                          "px-2 py-1 border text-xs font-mono",
                          fmt === "PSD"
                            ? "bg-orange-500/10 border-orange-500/30 text-orange-500"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        )}
                      >
                        {fmt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </div>
    </section>
  );
}

// Spotlight Card Component - Individual card with border glow effect
interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  mousePosition: MousePosition | null;
  isContainerHovering: boolean;
}

function SpotlightCard({ children, className, mousePosition, isContainerHovering }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [localMousePos, setLocalMousePos] = useState<MousePosition | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Update local mouse position relative to this card
  useEffect(() => {
    if (!mousePosition || !cardRef.current) {
      setLocalMousePos(null);
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const containerRect = cardRef.current.parentElement?.parentElement?.getBoundingClientRect();

    if (!containerRect) return;

    // Calculate mouse position relative to this card
    const cardLeft = rect.left - containerRect.left;
    const cardTop = rect.top - containerRect.top;

    setLocalMousePos({
      x: mousePosition.x - cardLeft,
      y: mousePosition.y - cardTop,
    });
  }, [mousePosition]);

  // Check if mouse is within proximity of this card
  const isNearCard = useCallback(() => {
    if (!mousePosition || !cardRef.current) return false;

    const rect = cardRef.current.getBoundingClientRect();
    const containerRect = cardRef.current.parentElement?.parentElement?.getBoundingClientRect();

    if (!containerRect) return false;

    const cardLeft = rect.left - containerRect.left;
    const cardTop = rect.top - containerRect.top;
    const cardCenterX = cardLeft + rect.width / 2;
    const cardCenterY = cardTop + rect.height / 2;

    const distance = Math.sqrt(
      Math.pow(mousePosition.x - cardCenterX, 2) +
      Math.pow(mousePosition.y - cardCenterY, 2)
    );

    return distance < 400;
  }, [mousePosition]);

  const showGlow = isContainerHovering && (isCardHovered || isNearCard());

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative bg-zinc-900 overflow-hidden transition-all duration-300",
        className
      )}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Base border - always visible */}
      <div className="absolute inset-0 border border-zinc-800 pointer-events-none z-20 transition-colors duration-300" />

      {/* Glowing border overlay - visible when mouse is near */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none z-20 transition-opacity duration-300",
          showGlow ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: localMousePos
            ? `radial-gradient(350px circle at ${localMousePos.x}px ${localMousePos.y}px, rgba(249, 115, 22, 0.5), transparent 40%)`
            : "none",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "xor",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />

      {/* Inner glow effect - soft fill */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-300",
          showGlow ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: localMousePos
            ? `radial-gradient(400px circle at ${localMousePos.x}px ${localMousePos.y}px, rgba(249, 115, 22, 0.08), transparent 40%)`
            : "none",
        }}
      />

      {/* Card Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
