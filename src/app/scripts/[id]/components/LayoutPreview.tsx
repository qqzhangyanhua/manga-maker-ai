/**
 * 布局预览组件
 * 在选择分镜后实时显示布局预览效果
 */

"use client";

import { useMemo } from "react";
import { ImageIcon } from "lucide-react";
import type { Panel } from "../types/script-editor.types";
import type { LayoutSize, LayoutDirection } from "../types/layout.types";

interface LayoutPreviewProps {
  selectedPanels: Panel[];
  /** 当前可用的布局选项 */
  availableLayouts: Array<{
    size: LayoutSize;
    direction?: LayoutDirection;
    label: string;
  }>;
}

/**
 * 单个Panel的缩略图
 */
function PanelThumbnail({ panel, index }: { panel: Panel; index: number }) {
  const imageUrl = panel.generated_image || panel.image_url;

  return (
    <div className="relative bg-muted rounded overflow-hidden aspect-[3/4] min-h-[60px]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Panel ${index + 1}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 text-center">
        #{panel.panel_order}
      </div>
    </div>
  );
}

/**
 * 布局预览网格
 */
function LayoutGrid({
  panels,
  size,
  direction,
  label,
}: {
  panels: Panel[];
  size: LayoutSize;
  direction?: LayoutDirection;
  label: string;
}) {
  const gridClass = useMemo(() => {
    switch (size) {
      case "2":
        return direction === "v" ? "grid-cols-1" : "grid-cols-2";
      case "3":
        return direction === "v" ? "grid-cols-1" : "grid-cols-3";
      case "4":
        return "grid-cols-2";
      case "6":
        return "grid-cols-3";
      default:
        return "grid-cols-1";
    }
  }, [size, direction]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`grid ${gridClass} gap-1 w-full max-w-[120px]`}>
        {panels.map((panel, idx) => (
          <PanelThumbnail key={panel.id} panel={panel} index={idx} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function LayoutPreview({
  selectedPanels,
  availableLayouts,
}: LayoutPreviewProps) {
  // 如果没有选择或没有可用布局，不显示
  if (selectedPanels.length === 0 || availableLayouts.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-dashed">
      <div className="text-xs text-muted-foreground mb-2">布局预览</div>
      <div className="flex gap-4 justify-center flex-wrap">
        {availableLayouts.map((layout) => (
          <LayoutGrid
            key={`${layout.size}-${layout.direction || ""}`}
            panels={selectedPanels}
            size={layout.size}
            direction={layout.direction}
            label={layout.label}
          />
        ))}
      </div>
    </div>
  );
}
