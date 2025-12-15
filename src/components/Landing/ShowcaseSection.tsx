"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShowcaseItem {
  id: string;
  title: string;
  thumbnail: string;
  meta: {
    renderTime: string;
    seed: string;
    resolution: string;
    model: string;
  };
}

const showcaseItems: ShowcaseItem[] = [
  {
    id: "001",
    title: "悬崖对决",
    thumbnail: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)",
    meta: { renderTime: "0.8s", seed: "847291", resolution: "4K", model: "SD_XL" },
  },
  {
    id: "002",
    title: "雨夜追逐",
    thumbnail: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e3a8a 100%)",
    meta: { renderTime: "1.2s", seed: "129384", resolution: "4K", model: "SD_XL" },
  },
  {
    id: "003",
    title: "樱花告白",
    thumbnail: "linear-gradient(135deg, #ec4899 0%, #be185d 50%, #9d174d 100%)",
    meta: { renderTime: "0.9s", seed: "556721", resolution: "4K", model: "SD_XL" },
  },
  {
    id: "004",
    title: "机甲觉醒",
    thumbnail: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #5b21b6 100%)",
    meta: { renderTime: "1.5s", seed: "998122", resolution: "4K", model: "FLUX" },
  },
  {
    id: "005",
    title: "深渊之眼",
    thumbnail: "linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)",
    meta: { renderTime: "1.1s", seed: "334567", resolution: "4K", model: "SD_XL" },
  },
  {
    id: "006",
    title: "时空裂隙",
    thumbnail: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
    meta: { renderTime: "2.0s", seed: "771234", resolution: "8K", model: "FLUX" },
  },
];

export function ShowcaseSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

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
    <section className="relative py-24 bg-gradient-to-b from-[#0f0f13] via-[#0d0d12] to-[#0c0c0e]">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="px-4 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-mono uppercase tracking-widest text-zinc-500">
              生产日志
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                创作展示
              </h2>
              <p className="text-zinc-300 max-w-xl">
                用户作品档案，每一帧都记录着 AI 渲染的精确参数
              </p>
            </div>

            {/* Navigation Arrows */}
            <div className="hidden md:flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white"
                onClick={() => scroll("left")}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white"
                onClick={() => scroll("right")}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Horizontal Scrolling Gallery with Spotlight */}
        <div
          ref={containerRef}
          className="relative"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Global Spotlight Overlay */}
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

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-hide"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {showcaseItems.map((item, index) => (
              <ShowcaseCard
                key={item.id}
                item={item}
                index={index}
                mousePosition={mousePosition}
                isContainerHovering={isHovering}
              />
            ))}
          </div>
        </div>

        {/* 移动端滑动提示 */}
        <div className="md:hidden flex justify-center mt-4 px-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ChevronLeft className="w-4 h-4" />
            <span className="font-mono">滑动浏览</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Hide scrollbar globally for this section */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

interface ShowcaseCardProps {
  item: ShowcaseItem;
  index: number;
  mousePosition: { x: number; y: number } | null;
  isContainerHovering: boolean;
}

function ShowcaseCard({ item, index, mousePosition, isContainerHovering }: ShowcaseCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [localMousePos, setLocalMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Update local mouse position relative to this card
  const updateLocalMousePos = useCallback(() => {
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

  // Update local position when mouse moves
  useEffect(() => {
    updateLocalMousePos();
  }, [mousePosition, updateLocalMousePos]);

  const showGlow = isContainerHovering && (isCardHovered || isNearCard());

  return (
    <div
      ref={cardRef}
      className="relative flex-shrink-0 w-72 md:w-80 group cursor-pointer"
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Image Container with Spotlight Border */}
      <div className="relative aspect-[3/4] border overflow-hidden transition-all duration-300"
        style={{
          borderColor: showGlow ? "rgba(249, 115, 22, 0.5)" : "rgb(39, 39, 42)",
        }}
      >
        {/* Glowing border overlay */}
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

        {/* Inner glow effect */}
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
        {/* Placeholder gradient background simulating manga image */}
        <div
          className="absolute inset-0"
          style={{ background: item.thumbnail }}
        />

        {/* Manga panel simulation overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-4 border-2 border-white/30" />
          <div className="absolute top-1/3 left-4 right-4 h-px bg-white/20" />
          <div className="absolute top-2/3 left-4 right-4 h-px bg-white/20" />
        </div>

        {/* ID Badge */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm border border-zinc-700">
          <span className="text-xs font-mono text-zinc-400">
            LOG_{item.id}
          </span>
        </div>

        {/* Scan line effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/0 via-orange-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 group-hover:animate-scan-down transition-opacity" />

        {/* Metadata Overlay Bar - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-zinc-800 p-3">
          <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
            <span>
              RENDER_TIME: <span className="text-orange-500">{item.meta.renderTime}</span>
            </span>
            <span className="text-zinc-600">|</span>
            <span>
              SEED: <span className="text-zinc-300">{item.meta.seed}</span>
            </span>
            <span className="text-zinc-600">|</span>
            <span>
              RES: <span className="text-emerald-500">{item.meta.resolution}</span>
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 mt-1">
            <span>MODEL: {item.meta.model}</span>
            <span>IDX: {String(index).padStart(3, "0")}</span>
          </div>
        </div>
      </div>

      {/* Title below card */}
      <div className="mt-3 px-1">
        <h4 className="text-white font-medium group-hover:text-orange-500 transition-colors">
          {item.title}
        </h4>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          FRAME_COUNT: 24 | STATUS: COMPLETE
        </p>
      </div>
    </div>
  );
}
