"use client";

/**
 * Canvas 工具栏组件
 */

import {
  MousePointer2,
  MessageCircle,
  Type,
  Sparkles,
  Undo2,
  Redo2,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayoutEditorStore, type ActiveTool } from "@/stores/layout-editor-store";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "../Templates";
import { BubbleSelector } from "../Bubbles";
import { EffectSelector, type EffectConfig } from "../Effects";
import type { BubbleStyleConfig } from "@/types/layout";

interface ToolButtonProps {
  tool: ActiveTool;
  icon: React.ReactNode;
  label: string;
  activeTool: ActiveTool;
  onClick: (tool: ActiveTool) => void;
}

function ToolButton({ tool, icon, label, activeTool, onClick }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={activeTool === tool ? "secondary" : "ghost"}
          size="icon"
          className={cn(
            "h-8 w-8",
            activeTool === tool && "bg-primary/10 text-primary"
          )}
          onClick={() => onClick(tool)}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface CanvasToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onTemplateSelect?: (templateId: string) => void;
  selectedTemplateId?: string;
  onBubbleSelect?: (styleConfig: BubbleStyleConfig) => void;
  onEffectSelect?: (effect: EffectConfig) => void;
  disabled?: boolean;
}

export function CanvasToolbar({
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onTemplateSelect,
  selectedTemplateId,
  onBubbleSelect,
  onEffectSelect,
  disabled = false,
}: CanvasToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    showGrid,
    toggleGrid,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useLayoutEditorStore();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 border-b bg-background">
        {/* 工具选择 */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            tool="select"
            icon={<MousePointer2 className="h-4 w-4" />}
            label="选择工具 (V)"
            activeTool={activeTool}
            onClick={setActiveTool}
          />
          <ToolButton
            tool="bubble"
            icon={<MessageCircle className="h-4 w-4" />}
            label="气泡工具 (B)"
            activeTool={activeTool}
            onClick={setActiveTool}
          />
          <ToolButton
            tool="text"
            icon={<Type className="h-4 w-4" />}
            label="文字工具 (T)"
            activeTool={activeTool}
            onClick={setActiveTool}
          />
          <ToolButton
            tool="effect"
            icon={<Sparkles className="h-4 w-4" />}
            label="特效工具 (E)"
            activeTool={activeTool}
            onClick={setActiveTool}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* 模板选择 */}
        {onTemplateSelect && (
          <TemplateSelector
            onSelect={onTemplateSelect}
            selectedTemplateId={selectedTemplateId}
            disabled={disabled}
          />
        )}

        {/* 气泡样式选择 */}
        {onBubbleSelect && (
          <BubbleSelector
            onSelect={onBubbleSelect}
            disabled={disabled}
          />
        )}

        {/* 特效素材选择 */}
        {onEffectSelect && (
          <EffectSelector
            onSelect={onEffectSelect}
            disabled={disabled}
          />
        )}

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* 撤销/重做 */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canUndo}
                onClick={onUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>撤销 (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canRedo}
                onClick={onRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>重做 (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* 视图控制 */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showGrid ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={toggleGrid}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>显示网格 (G)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* 右侧：缩放控制 */}
        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={zoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>缩小</p>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 min-w-[60px] text-sm"
            onClick={resetZoom}
          >
            {zoom}%
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={zoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>放大</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>适应窗口</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
