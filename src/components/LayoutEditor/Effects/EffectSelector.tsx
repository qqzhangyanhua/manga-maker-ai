"use client";

/**
 * 特效素材库组件
 * 提供漫画常用特效元素
 */

import { useState, useCallback } from "react";
import { Sparkles, Star, Zap, Heart, Sun, Wind, Flame, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface EffectConfig {
  type: EffectType;
  name: string;
  category: EffectCategory;
  svgPath?: string;
  color?: string;
  scale?: number;
}

export type EffectType =
  | "speed_lines"
  | "impact_lines"
  | "sparkle"
  | "heart"
  | "star"
  | "sweat_drop"
  | "anger_vein"
  | "blush"
  | "shock"
  | "motion_blur"
  | "glow"
  | "flash";

export type EffectCategory = "action" | "emotion" | "atmosphere" | "motion";

const EFFECT_CATEGORIES: { id: EffectCategory; name: string; icon: React.ReactNode }[] = [
  { id: "action", name: "动作", icon: <Zap className="h-4 w-4" /> },
  { id: "emotion", name: "情感", icon: <Heart className="h-4 w-4" /> },
  { id: "atmosphere", name: "氛围", icon: <Sun className="h-4 w-4" /> },
  { id: "motion", name: "运动", icon: <Wind className="h-4 w-4" /> },
];

const DEFAULT_EFFECTS: EffectConfig[] = [
  // 动作特效
  { type: "speed_lines", name: "速度线", category: "action", color: "#000000" },
  { type: "impact_lines", name: "冲击线", category: "action", color: "#000000" },
  { type: "flash", name: "闪光", category: "action", color: "#FFD700" },
  { type: "shock", name: "震惊", category: "action", color: "#000000" },

  // 情感特效
  { type: "heart", name: "爱心", category: "emotion", color: "#FF69B4" },
  { type: "sparkle", name: "闪亮", category: "emotion", color: "#FFD700" },
  { type: "sweat_drop", name: "汗滴", category: "emotion", color: "#87CEEB" },
  { type: "anger_vein", name: "怒筋", category: "emotion", color: "#FF4444" },
  { type: "blush", name: "腮红", category: "emotion", color: "#FFB6C1" },

  // 氛围特效
  { type: "star", name: "星星", category: "atmosphere", color: "#FFD700" },
  { type: "glow", name: "光晕", category: "atmosphere", color: "#FFFFFF" },

  // 运动特效
  { type: "motion_blur", name: "动态模糊", category: "motion", color: "#666666" },
];

const EFFECT_ICONS: Record<EffectType, React.ReactNode> = {
  speed_lines: <Wind className="h-5 w-5" />,
  impact_lines: <Zap className="h-5 w-5" />,
  sparkle: <Sparkles className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  sweat_drop: <Droplets className="h-5 w-5" />,
  anger_vein: <Flame className="h-5 w-5" />,
  blush: <Sun className="h-5 w-5" />,
  shock: <Zap className="h-5 w-5" />,
  motion_blur: <Wind className="h-5 w-5" />,
  glow: <Sun className="h-5 w-5" />,
  flash: <Star className="h-5 w-5" />,
};

interface EffectSelectorProps {
  onSelect: (effect: EffectConfig) => void;
  disabled?: boolean;
}

export function EffectSelector({ onSelect, disabled = false }: EffectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EffectCategory>("action");

  const handleSelect = useCallback(
    (effect: EffectConfig) => {
      onSelect(effect);
      setIsOpen(false);
    },
    [onSelect]
  );

  const filteredEffects = DEFAULT_EFFECTS.filter((e) => e.category === activeCategory);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Sparkles className="h-4 w-4 mr-2" />
          特效素材
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">选择特效</h4>
          <p className="text-xs text-muted-foreground mt-1">
            点击添加特效到画布
          </p>
        </div>

        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as EffectCategory)}>
          <TabsList className="w-full justify-start p-1 h-auto flex-wrap">
            {EFFECT_CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="text-xs px-2 py-1 gap-1"
              >
                {cat.icon}
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[240px]">
            {EFFECT_CATEGORIES.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="p-3 m-0">
                <div className="grid grid-cols-2 gap-2">
                  {filteredEffects.map((effect) => (
                    <EffectCard
                      key={effect.type}
                      effect={effect}
                      onClick={() => handleSelect(effect)}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

interface EffectCardProps {
  effect: EffectConfig;
  onClick: () => void;
}

function EffectCard({ effect, onClick }: EffectCardProps) {
  return (
    <button
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
        "hover:border-primary hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ color: effect.color, backgroundColor: `${effect.color}20` }}
      >
        {EFFECT_ICONS[effect.type]}
      </div>
      <span className="text-xs font-medium">{effect.name}</span>
    </button>
  );
}

/**
 * 生成特效 SVG 路径数据
 */
export function generateEffectPath(type: EffectType, size: number = 100): string {
  const center = size / 2;

  switch (type) {
    case "speed_lines":
      // 水平速度线
      let lines = "";
      for (let i = 0; i < 8; i++) {
        const y = (size / 9) * (i + 1);
        const x1 = 0;
        const x2 = size * (0.5 + Math.random() * 0.5);
        lines += `M${x1},${y} L${x2},${y} `;
      }
      return lines;

    case "impact_lines":
      // 放射状冲击线
      let radial = "";
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const innerR = size * 0.2;
        const outerR = size * 0.5;
        const x1 = center + innerR * Math.cos(angle);
        const y1 = center + innerR * Math.sin(angle);
        const x2 = center + outerR * Math.cos(angle);
        const y2 = center + outerR * Math.sin(angle);
        radial += `M${x1},${y1} L${x2},${y2} `;
      }
      return radial;

    case "sparkle":
      // 四角星闪光
      const points = [
        [center, 0],
        [center + 10, center - 10],
        [size, center],
        [center + 10, center + 10],
        [center, size],
        [center - 10, center + 10],
        [0, center],
        [center - 10, center - 10],
      ];
      return `M${points.map((p) => p.join(",")).join(" L")} Z`;

    case "star":
      // 五角星
      let starPath = "";
      const outerRadius = size * 0.45;
      const innerRadius = size * 0.2;
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        starPath += (i === 0 ? "M" : "L") + `${x},${y} `;
      }
      return starPath + "Z";

    case "heart":
      // 心形
      return `M${center},${size * 0.8} C${size * 0.1},${size * 0.4} ${size * 0.1},${size * 0.1} ${center},${size * 0.3} C${size * 0.9},${size * 0.1} ${size * 0.9},${size * 0.4} ${center},${size * 0.8} Z`;

    default:
      // 默认圆形
      return `M${center},${center} m-${size * 0.4},0 a${size * 0.4},${size * 0.4} 0 1,0 ${size * 0.8},0 a${size * 0.4},${size * 0.4} 0 1,0 -${size * 0.8},0`;
  }
}
