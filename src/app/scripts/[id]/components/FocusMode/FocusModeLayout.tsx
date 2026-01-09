"use client";

/**
 * 专注模式三栏布局组件
 * Three-column layout for focus mode editing
 */

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Keyboard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusMode } from "../../contexts/FocusModeContext";
import { ChapterPanelNav } from "./ChapterPanelNav";
import { PanelPreviewCenter } from "./PanelPreviewCenter";
import { PanelConfigSidebar } from "./PanelConfigSidebar";
import { BatchGenerationDialog } from "./BatchGenerationDialog";
import { useScriptOperations } from "../../providers/ScriptOperationsProvider";

interface FocusModeLayoutProps {
  className?: string;
  storyId?: string;
  projectId?: string | null;
  onPanelUpdate: () => void;
}

export function FocusModeLayout({ className, storyId, projectId, onPanelUpdate }: FocusModeLayoutProps) {
  const { state, actions, panels, chapters } = useFocusMode();
  const { handleBatchGenerate } = useScriptOperations();
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  // 获取当前章节
  const currentChapter = useMemo(() => {
    if (!state.currentPanel) return null;
    return chapters.find((ch) => ch.id === state.currentPanel?.chapter_id);
  }, [state.currentPanel, chapters]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 退出专注模式
      if (e.key === "Escape") {
        actions.exitFocusMode();
        return;
      }

      // 阻止默认行为，避免与浏览器快捷键冲突
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + Left: 上一个分镜
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          actions.goToPreviousPanel();
          return;
        }
        // Ctrl/Cmd + Right: 下一个分镜
        if (e.key === "ArrowRight") {
          e.preventDefault();
          actions.goToNextPanel();
          return;
        }
        // Ctrl/Cmd + Enter: 生成图片
        if (e.key === "Enter") {
          e.preventDefault();
          if (!state.isGenerating) {
            void actions.generateImage();
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isGenerating, actions]);

  return (
    <div className={cn("fixed inset-0 z-50 bg-[#0f0f13] flex flex-col", className)}>
      {/* 顶部工具栏 */}
      <div className="h-14 border-b border-gray-800 bg-[#16161a]/95 backdrop-blur-sm flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.exitFocusMode}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4 mr-2" />
            退出专注模式
          </Button>
          
          <div className="h-4 w-px bg-gray-800" />
          
          <div className="text-sm text-gray-400">
            专注编辑模式
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 批量生成按钮 */}
          {currentChapter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchDialogOpen(true)}
              className="text-orange-400 border-orange-400/50 hover:bg-orange-400/10"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              批量生成章节
            </Button>
          )}

          {/* 快捷键提示 */}
          <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              <span>ESC 退出</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">←/→</kbd>
              <span>切换</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Enter</kbd>
              <span>生成</span>
            </div>
          </div>
        </div>
      </div>

      {/* 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：章节分镜导航 */}
        <div className="w-64 flex-shrink-0">
          <ChapterPanelNav />
        </div>

        {/* 中央：大图预览区 */}
        <div className="flex-1 min-w-0">
          <PanelPreviewCenter />
        </div>

        {/* 右侧：配置面板 */}
        <div className="w-80 flex-shrink-0">
          <PanelConfigSidebar storyId={storyId} projectId={projectId} />
        </div>
      </div>

      {/* 底部状态栏（可选） */}
      {state.isGenerating && (
        <div className="h-1 bg-gray-900">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
            style={{ width: `${state.generationProgress}%` }}
          />
        </div>
      )}

      {/* 批量生成对话框 */}
      <BatchGenerationDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        chapter={currentChapter}
        panels={panels}
        onGenerate={async (panelIds) => {
          await handleBatchGenerate(panelIds);
          onPanelUpdate();
        }}
      />
    </div>
  );
}

