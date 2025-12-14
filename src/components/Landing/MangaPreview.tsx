"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PanelConfig {
  id: string;
  className: string;
  delay: number;
  content?: string;
}

interface MangaPreviewProps {
  visibleCount: number;
  isAnimating?: boolean;
}

const panels: PanelConfig[] = [
  {
    id: "p1",
    className: "col-span-1 row-span-1",
    delay: 0,
    content: "远景",
  },
  {
    id: "p2",
    className: "col-span-1 row-span-1",
    delay: 300,
    content: "特写",
  },
  {
    id: "p3",
    className: "col-span-1 row-span-1",
    delay: 600,
    content: "动作",
  },
  {
    id: "p4",
    className: "col-span-2 row-span-1",
    delay: 900,
    content: "全景",
  },
  {
    id: "p5",
    className: "col-span-1 row-span-1",
    delay: 1200,
    content: "对话",
  },
];

export function MangaPreview({ visibleCount, isAnimating }: MangaPreviewProps) {
  const [visiblePanels, setVisiblePanels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAnimating) {
      setVisiblePanels(new Set());
      return;
    }

    const timeouts: NodeJS.Timeout[] = [];

    panels.slice(0, visibleCount).forEach((panel) => {
      const timeout = setTimeout(() => {
        setVisiblePanels((prev) => new Set([...prev, panel.id]));
      }, panel.delay);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [visibleCount, isAnimating]);

  return (
    <div className="relative">
      {/* Glow effect behind panels */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-pink-500/20 blur-2xl" />

      {/* Panel grid */}
      <div className="relative grid grid-cols-3 gap-2 p-4">
        {panels.map((panel) => {
          const isVisible = visiblePanels.has(panel.id);

          return (
            <div
              key={panel.id}
              className={cn(
                panel.className,
                "relative aspect-[3/4] rounded-lg overflow-hidden transition-all duration-500",
                "border-2 border-slate-700/50",
                "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
                "hover:border-purple-500/50 hover:scale-[1.02] cursor-pointer",
                isVisible
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-4 scale-95"
              )}
              style={{
                transitionDelay: `${panel.delay}ms`,
                boxShadow: isVisible
                  ? "0 0 20px rgba(168, 85, 247, 0.2), inset 0 0 30px rgba(0,0,0,0.3)"
                  : "none",
              }}
            >
              {/* Manga panel content placeholder */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Halftone pattern overlay */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, #a855f7 1px, transparent 1px)",
                    backgroundSize: "8px 8px",
                  }}
                />

                {/* Panel number */}
                <span className="text-xs text-purple-400/60 mb-1">
                  {panel.id.toUpperCase()}
                </span>

                {/* Panel type */}
                <span className="text-sm font-medium text-slate-400">
                  {panel.content}
                </span>

                {/* Speed lines for action panel */}
                {panel.content === "动作" && isVisible && (
                  <div className="absolute inset-0 overflow-hidden">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"
                        style={{
                          top: `${20 + i * 10}%`,
                          left: "-10%",
                          right: "-10%",
                          transform: `rotate(${-15 + i * 2}deg)`,
                          animation: `speedLine 2s ease-in-out infinite ${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500/40" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500/40" />
            </div>
          );
        })}
      </div>

      {/* Animated flow particles */}
      <div className="absolute -left-8 top-1/2 -translate-y-1/2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-500"
              style={{
                animation: `flowDot 1.5s ease-in-out infinite ${i * 0.3}s`,
                opacity: isAnimating ? 1 : 0,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes speedLine {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-100%);
          }
          50% {
            opacity: 1;
            transform: translateX(100%);
          }
        }

        @keyframes flowDot {
          0%,
          100% {
            opacity: 0.3;
            transform: translateX(0);
          }
          50% {
            opacity: 1;
            transform: translateX(10px);
          }
        }
      `}</style>
    </div>
  );
}
