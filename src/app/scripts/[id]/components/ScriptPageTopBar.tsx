import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { ScriptPageHeader } from "./ScriptPageHeader";
import type { ScriptPageTopBarProps } from "../types/component-props.types";

export function ScriptPageTopBar({
  title,
  chapters,
  panels,
  nextChapterOrder,
  onCreateChapter,
  onImportText,
  onEnterFocusMode,
  onOpenSidebar,
  onOpenNineGrid,
}: ScriptPageTopBarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex-1">
        <ScriptPageHeader
          title={title}
          chapters={chapters}
          panels={panels}
          onCreateChapter={onCreateChapter}
          onImportText={onImportText}
          onEnterFocusMode={onEnterFocusMode}
          onOpenNineGrid={onOpenNineGrid}
        />
      </div>

      {/* 侧边栏触发按钮 (仅在新布局时显示) */}
      {FEATURE_FLAGS.NEW_ASSET_SIDEBAR && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSidebar}
          className="ml-4"
        >
          <PanelRight className="w-4 h-4 mr-2" />
          素材库
        </Button>
      )}
    </div>
  );
}
