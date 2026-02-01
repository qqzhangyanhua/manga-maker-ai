/**
 * 故事板缩放控制组件
 */

"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type ThumbnailSize = "small" | "medium" | "large";

interface StoryboardZoomControlProps {
  size: ThumbnailSize;
  onSizeChange: (size: ThumbnailSize) => void;
  className?: string;
}

const sizeLabels: Record<ThumbnailSize, string> = {
  small: "小图",
  medium: "中图",
  large: "大图",
};

const sizeValues: ThumbnailSize[] = ["small", "medium", "large"];

export function StoryboardZoomControl({
  size,
  onSizeChange,
  className,
}: StoryboardZoomControlProps) {
  const currentIndex = sizeValues.indexOf(size);

  const handleSliderChange = (value: number[]) => {
    const newSize = sizeValues[value[0]];
    if (newSize) {
      onSizeChange(newSize);
    }
  };

  const handleZoomOut = () => {
    if (currentIndex > 0) {
      onSizeChange(sizeValues[currentIndex - 1]);
    }
  };

  const handleZoomIn = () => {
    if (currentIndex < sizeValues.length - 1) {
      onSizeChange(sizeValues[currentIndex + 1]);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 bg-[#1a1a1f]/80 backdrop-blur-sm",
        "border border-gray-800/50 rounded-lg",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        disabled={currentIndex === 0}
        className="h-8 w-8"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>

      <div className="w-24">
        <Slider
          value={[currentIndex]}
          min={0}
          max={sizeValues.length - 1}
          step={1}
          onValueChange={handleSliderChange}
          className="cursor-pointer"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        disabled={currentIndex === sizeValues.length - 1}
        className="h-8 w-8"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      <span className="text-xs text-gray-400 min-w-[3rem]">
        {sizeLabels[size]}
      </span>
    </div>
  );
}
