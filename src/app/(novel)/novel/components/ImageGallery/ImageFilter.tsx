/**
 * 图片筛选器组件
 */

"use client";

import { Camera, Layers, Grid3X3, Image as ImageIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImageType, ImageFilterState } from "./types";
import { IMAGE_TYPE_LABELS } from "./types";

interface ImageFilterProps {
  value: ImageFilterState;
  onChange: (state: ImageFilterState) => void;
  totalCount?: number;
}

const FILTER_OPTIONS: Array<{ value: ImageType | "all"; icon: React.ElementType }> = [
  { value: "all", icon: Filter },
  { value: "shot", icon: Camera },
  { value: "comic", icon: ImageIcon },
  { value: "nine_grid", icon: Grid3X3 },
];

export function ImageFilter({ value, onChange, totalCount }: ImageFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-zinc-400 mr-2">
        筛选类型:
      </span>
      {FILTER_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value.type === option.value;
        const label = option.value === "all" ? "全部" : IMAGE_TYPE_LABELS[option.value];

        return (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            className={cn(
              "h-8 text-xs transition-colors",
              isActive
                ? "bg-purple-600 border-purple-500 text-white hover:bg-purple-700"
                : "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
            )}
            onClick={() => onChange({ ...value, type: option.value })}
          >
            <Icon className="w-3 h-3 mr-1" />
            {label}
          </Button>
        );
      })}

      {totalCount !== undefined && (
        <span className="text-sm text-zinc-500 ml-auto">
          共 {totalCount} 张图片
        </span>
      )}
    </div>
  );
}
