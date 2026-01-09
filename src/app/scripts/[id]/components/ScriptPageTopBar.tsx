import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { ScriptPageHeader } from "./ScriptPageHeader";

interface ScriptPageTopBarProps {
  title: string;
  chapters: unknown[];
  panels: unknown[];
  nextChapterOrder: number;
  onCreateChapter: () => void;
  onImportText: () => void;
  onEnterFocusMode: () => void;
  onOpenSidebar: () => void;
}

export function ScriptPageTopBar({
  title,
  chapters,
  panels,
  nextChapterOrder,
  onCreateChapter,
  onImportText,
  onEnterFocusMode,
  onOpenSidebar,
}: ScriptPageTopBarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex-1">
        <ScriptPageHeader
          title={title}
          chapters={chapters as never}
          panels={panels as never}
          onCreateChapter={onCreateChapter}
          onImportText={onImportText}
          onEnterFocusMode={onEnterFocusMode}
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
