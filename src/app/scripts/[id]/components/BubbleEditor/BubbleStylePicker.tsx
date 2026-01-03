/**
 * 气泡样式选择器组件
 */

"use client";

import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { BubbleType, BUBBLE_PRESETS } from "./types";

export interface BubbleStylePickerProps {
  selectedType: BubbleType | null;
  onSelectType: (type: BubbleType) => void;
  disabled?: boolean;
}

export function BubbleStylePicker({
  selectedType,
  onSelectType,
  disabled = false,
}: BubbleStylePickerProps) {
  return (
    <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        气泡样式
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(BUBBLE_PRESETS).map(([key, preset]) => {
          const bubbleType = key as BubbleType;
          const isSelected = selectedType === bubbleType;

          return (
            <button
              key={key}
              onClick={() => !disabled && onSelectType(bubbleType)}
              disabled={disabled}
              className={cn(
                "p-3 rounded-lg border-2 transition-all",
                "hover:border-orange-500 hover:bg-gray-800/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? "border-orange-500 bg-gray-800/50"
                  : "border-gray-700"
              )}
            >
              <div className="text-2xl mb-1">{preset.icon}</div>
              <div className="text-xs text-gray-400">{preset.label}</div>
            </button>
          );
        })}
      </div>

      {disabled && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          请先点击预览区域的分镜图片
        </p>
      )}
    </div>
  );
}
