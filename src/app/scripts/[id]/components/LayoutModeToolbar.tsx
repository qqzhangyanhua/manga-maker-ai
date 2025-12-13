/**
 * 布局模式工具栏组件
 * 用于选择Panel并应用布局（2镜/3镜/4镜/6镜）
 * 支持保存和加载布局模板
 */

"use client";

import { useMemo, useState } from "react";
import {
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  Columns2,
  Rows2,
  Columns3,
  Rows3,
  Ungroup,
  Check,
  X,
  Save,
  FolderOpen,
  Trash2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Panel } from "../types/script-editor.types";
import type { LayoutSize, LayoutDirection, LayoutRatio } from "../types/layout.types";
import {
  isSelectionContinuous,
  isInLayoutGroup,
  LAYOUT_RATIOS_2,
  LAYOUT_RATIOS_3,
  getLayoutTypeName,
} from "../types/layout.types";
import { useLayoutTemplates, type LayoutTemplate } from "../hooks/useLayoutTemplates";

interface LayoutModeToolbarProps {
  isLayoutMode: boolean;
  selectedPanelIds: string[];
  panels: Panel[];
  isApplying: boolean;
  onEnterLayoutMode: () => void;
  onExitLayoutMode: () => void;
  onApplyLayout: (
    layoutType: LayoutSize,
    direction?: LayoutDirection,
    ratio?: LayoutRatio
  ) => void;
  onBatchApplyLayout?: (
    layoutType: LayoutSize,
    direction?: LayoutDirection,
    ratio?: LayoutRatio
  ) => Promise<void>;
  onClearSelection: () => void;
}

export function LayoutModeToolbar({
  isLayoutMode,
  selectedPanelIds,
  panels,
  isApplying,
  onEnterLayoutMode,
  onExitLayoutMode,
  onApplyLayout,
  onBatchApplyLayout,
  onClearSelection,
}: LayoutModeToolbarProps) {
  const selectionCount = selectedPanelIds.length;

  // 模板相关状态
  const { templates, saveTemplate, deleteTemplate } = useLayoutTemplates();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [pendingLayout, setPendingLayout] = useState<{
    layoutType: LayoutSize;
    direction?: LayoutDirection;
    ratio?: LayoutRatio;
  } | null>(null);

  // 计算可以批量应用的组数（未组合的连续分镜数量 / 布局所需数量）
  const calculateBatchCount = useMemo(() => {
    return (layoutSize: LayoutSize): number => {
      const requiredCount = parseInt(layoutSize, 10);
      // 过滤出未组合的分镜
      const ungroupedPanels = panels.filter((p) => !isInLayoutGroup(p));
      // 计算可以组成多少组
      return Math.floor(ungroupedPanels.length / requiredCount);
    };
  }, [panels]);

  // 检查选择是否有效（连续）
  const isContinuous = useMemo(
    () => isSelectionContinuous(selectedPanelIds, panels),
    [selectedPanelIds, panels]
  );

  // 检查选择中是否包含已在布局组内的Panel
  const hasGroupedPanels = useMemo(() => {
    return selectedPanelIds.some((id) => {
      const panel = panels.find((p) => p.id === id);
      return panel && isInLayoutGroup(panel);
    });
  }, [selectedPanelIds, panels]);

  // 计算各布局类型是否可用
  const canApply2 = selectionCount === 2 && isContinuous && !hasGroupedPanels;
  const canApply3 = selectionCount === 3 && isContinuous && !hasGroupedPanels;
  const canApply4 = selectionCount === 4 && isContinuous && !hasGroupedPanels;
  const canApply6 = selectionCount === 6 && isContinuous && !hasGroupedPanels;

  // 生成提示信息
  const getTooltipMessage = (requiredCount: number): string => {
    if (selectionCount !== requiredCount) {
      return `需要选择 ${requiredCount} 个分镜（当前 ${selectionCount} 个）`;
    }
    if (!isContinuous) {
      return "请选择连续的分镜";
    }
    if (hasGroupedPanels) {
      return "选择中包含已组合的分镜，请先拆分";
    }
    return `创建 ${requiredCount}镜 布局`;
  };

  // 打开保存模板对话框
  const openSaveDialog = (
    layoutType: LayoutSize,
    direction?: LayoutDirection,
    ratio?: LayoutRatio
  ) => {
    setPendingLayout({ layoutType, direction, ratio });
    setTemplateName("");
    setSaveDialogOpen(true);
  };

  // 确认保存模板
  const confirmSaveTemplate = () => {
    if (!pendingLayout) return;

    saveTemplate(
      templateName,
      pendingLayout.layoutType,
      pendingLayout.direction,
      pendingLayout.ratio
    );

    setSaveDialogOpen(false);
    setPendingLayout(null);
    setTemplateName("");
  };

  // 应用模板
  const applyTemplate = (template: LayoutTemplate) => {
    // 检查选择数量是否匹配
    const requiredCount = parseInt(template.layoutType, 10);
    if (selectionCount !== requiredCount) {
      return;
    }

    onApplyLayout(template.layoutType, template.direction, template.ratio);
  };

  // 检查模板是否可以应用
  const canApplyTemplate = (template: LayoutTemplate): boolean => {
    const requiredCount = parseInt(template.layoutType, 10);
    return (
      selectionCount === requiredCount && isContinuous && !hasGroupedPanels
    );
  };

  // 获取模板显示名称
  const getTemplateDisplayInfo = (template: LayoutTemplate): string => {
    const layoutName =
      template.layoutType === "2" || template.layoutType === "3"
        ? `${template.layoutType}镜${template.direction === "h" ? "横" : "竖"}`
        : `${template.layoutType}镜`;

    const ratioStr = template.ratio ? ` (${template.ratio.replace(/-/g, ":")})` : "";
    return `${layoutName}${ratioStr}`;
  };

  // 非布局模式：显示"布局编辑"按钮
  if (!isLayoutMode) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onEnterLayoutMode}
            disabled={panels.length < 2}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            布局编辑
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          选择多个分镜组合为 2镜/3镜/4镜/6镜 布局
        </TooltipContent>
      </Tooltip>
    );
  }

  // 布局模式：显示完整工具栏
  return (
    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg flex-wrap">
      {/* 选择状态 */}
      <div className="flex items-center gap-2 mr-2">
        <Badge variant={selectionCount > 0 ? "default" : "secondary"}>
          已选 {selectionCount} 个
        </Badge>
        {selectionCount > 0 && !isContinuous && (
          <Badge variant="destructive" className="text-xs">
            不连续
          </Badge>
        )}
        {selectionCount > 0 && hasGroupedPanels && (
          <Badge variant="destructive" className="text-xs">
            含已组合
          </Badge>
        )}
        {/* 快捷键提示 */}
        {selectionCount === 0 && (
          <span className="text-xs text-muted-foreground">
            点击选择 | Shift连选 | Ctrl/Cmd多选
          </span>
        )}
      </div>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-border" />

      {/* 2镜布局（带方向和比例选择） */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={canApply2 ? "default" : "outline"}
                size="sm"
                disabled={!canApply2 || isApplying}
              >
                <Grid2X2 className="w-4 h-4 mr-1" />
                2镜
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{getTooltipMessage(2)}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent className="w-48">
          {/* 横排选项 */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Columns2 className="w-4 h-4 mr-2" />
              横排 (左右)
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                选择比例
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LAYOUT_RATIOS_2.map((r) => (
                <DropdownMenuItem
                  key={`h-${r.value}`}
                  onClick={() => onApplyLayout("2", "h", r.value)}
                >
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {/* 竖排选项 */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Rows2 className="w-4 h-4 mr-2" />
              竖排 (上下)
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                选择比例
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LAYOUT_RATIOS_2.map((r) => (
                <DropdownMenuItem
                  key={`v-${r.value}`}
                  onClick={() => onApplyLayout("2", "v", r.value)}
                >
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 3镜布局（带方向和比例选择） */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={canApply3 ? "default" : "outline"}
                size="sm"
                disabled={!canApply3 || isApplying}
              >
                <Columns3 className="w-4 h-4 mr-1" />
                3镜
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{getTooltipMessage(3)}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent className="w-48">
          {/* 横排选项 */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Columns3 className="w-4 h-4 mr-2" />
              横排 (三列)
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                选择比例
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LAYOUT_RATIOS_3.map((r) => (
                <DropdownMenuItem
                  key={`h-${r.value}`}
                  onClick={() => onApplyLayout("3", "h", r.value)}
                >
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {/* 竖排选项 */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Rows3 className="w-4 h-4 mr-2" />
              竖排 (三行)
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                选择比例
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LAYOUT_RATIOS_3.map((r) => (
                <DropdownMenuItem
                  key={`v-${r.value}`}
                  onClick={() => onApplyLayout("3", "v", r.value)}
                >
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 4镜布局 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={canApply4 ? "default" : "outline"}
            size="sm"
            onClick={() => onApplyLayout("4")}
            disabled={!canApply4 || isApplying}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            4镜
          </Button>
        </TooltipTrigger>
        <TooltipContent>{getTooltipMessage(4)}</TooltipContent>
      </Tooltip>

      {/* 6镜布局 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={canApply6 ? "default" : "outline"}
            size="sm"
            onClick={() => onApplyLayout("6")}
            disabled={!canApply6 || isApplying}
          >
            <Grid3X3 className="w-4 h-4 mr-1" />
            6镜
          </Button>
        </TooltipTrigger>
        <TooltipContent>{getTooltipMessage(6)}</TooltipContent>
      </Tooltip>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-border" />

      {/* 模板加载 */}
      {templates.length > 0 && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderOpen className="w-4 h-4 mr-1" />
                  模板
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>从保存的模板应用布局</TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>应用到选中分镜</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {templates.map((template) => {
              const canApply = canApplyTemplate(template);
              const requiredCount = parseInt(template.layoutType, 10);
              return (
                <DropdownMenuItem
                  key={template.id}
                  disabled={!canApply}
                  onClick={() => applyTemplate(template)}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span>{template.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getTemplateDisplayInfo(template)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!canApply && (
                      <Badge variant="outline" className="text-xs">
                        需{requiredCount}镜
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              );
            })}

            {/* 批量应用分隔线 */}
            {onBatchApplyLayout && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  批量应用到所有未组合分镜
                </DropdownMenuLabel>
                {templates.map((template) => {
                  const batchCount = calculateBatchCount(template.layoutType);
                  const canBatchApply = batchCount > 0;
                  return (
                    <DropdownMenuItem
                      key={`batch-${template.id}`}
                      disabled={!canBatchApply || isApplying}
                      onClick={() =>
                        onBatchApplyLayout(
                          template.layoutType,
                          template.direction,
                          template.ratio
                        )
                      }
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {getTemplateDisplayInfo(template)}
                        </span>
                      </div>
                      <Badge
                        variant={canBatchApply ? "default" : "outline"}
                        className="text-xs"
                      >
                        {batchCount}组
                      </Badge>
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 保存模板（仅当有可用布局时显示） */}
      {(canApply2 || canApply3 || canApply4 || canApply6) && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>将当前布局保存为模板</TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="w-48">
            <DropdownMenuLabel>保存为模板</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canApply2 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Grid2X2 className="w-4 h-4 mr-2" />
                  2镜布局
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {LAYOUT_RATIOS_2.map((r) => (
                    <div key={`save-2-${r.value}`}>
                      <DropdownMenuItem
                        onClick={() => openSaveDialog("2", "h", r.value)}
                      >
                        横排 {r.label}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openSaveDialog("2", "v", r.value)}
                      >
                        竖排 {r.label}
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {canApply3 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Columns3 className="w-4 h-4 mr-2" />
                  3镜布局
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {LAYOUT_RATIOS_3.map((r) => (
                    <div key={`save-3-${r.value}`}>
                      <DropdownMenuItem
                        onClick={() => openSaveDialog("3", "h", r.value)}
                      >
                        横排 {r.label}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openSaveDialog("3", "v", r.value)}
                      >
                        竖排 {r.label}
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {canApply4 && (
              <DropdownMenuItem onClick={() => openSaveDialog("4")}>
                <LayoutGrid className="w-4 h-4 mr-2" />
                4镜布局
              </DropdownMenuItem>
            )}
            {canApply6 && (
              <DropdownMenuItem onClick={() => openSaveDialog("6")}>
                <Grid3X3 className="w-4 h-4 mr-2" />
                6镜布局
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 分隔线 */}
      <div className="h-6 w-px bg-border" />

      {/* 清空选择 */}
      {selectionCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isApplying}
            >
              <Ungroup className="w-4 h-4 mr-1" />
              清空
            </Button>
          </TooltipTrigger>
          <TooltipContent>取消所有选择</TooltipContent>
        </Tooltip>
      )}

      {/* 退出布局模式 */}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExitLayoutMode}
          disabled={isApplying}
        >
          <X className="w-4 h-4 mr-1" />
          取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onExitLayoutMode}
          disabled={isApplying}
        >
          <Check className="w-4 h-4 mr-1" />
          完成
        </Button>
      </div>

      {/* 保存模板对话框 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>保存布局模板</DialogTitle>
            <DialogDescription>
              {pendingLayout && (
                <>
                  保存{" "}
                  {pendingLayout.layoutType === "2" || pendingLayout.layoutType === "3"
                    ? `${pendingLayout.layoutType}镜${pendingLayout.direction === "h" ? "横排" : "竖排"}`
                    : `${pendingLayout.layoutType}镜`}
                  {pendingLayout.ratio && ` (${pendingLayout.ratio.replace(/-/g, ":")})`}
                  {" "}为模板，方便下次快速应用
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="输入模板名称（可选）"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  confirmSaveTemplate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmSaveTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
