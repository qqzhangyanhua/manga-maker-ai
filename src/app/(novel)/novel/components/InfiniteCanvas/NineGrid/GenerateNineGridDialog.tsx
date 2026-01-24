/**
 * 九宫格图片生成对话框
 *
 * 功能:
 * 1. 显示选中的9个镜头摘要
 * 2. 输入剧情概述
 * 3. 显示当前漫画风格
 * 4. 确认生成
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Grid3X3,
  Palette,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  Camera,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTimelineConfig, getSafeConfig } from "@/hooks/useTimelineConfig";
import { findStyleById, useComicStyles } from "@/hooks/useComicStyles";
import type { GenerateNineGridDialogProps, ShotDesignBasic, CharacterReference } from "./types";
import { checkShotsConsecutive } from "./prompt-builder";
import { CharacterReferenceSection } from "./CharacterReferenceSection";

/**
 * 镜头预览卡片
 */
function ShotPreviewCard({
  shot,
  index,
}: {
  shot: ShotDesignBasic;
  index: number;
}) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded p-2 text-xs">
      <div className="flex items-center gap-1 mb-1">
        <span className="font-mono text-purple-400">
          {String(index + 1).padStart(2, "0")}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] px-1 py-0 h-4 border-zinc-600"
        >
          {shot.shot_size}
        </Badge>
      </div>
      <p className="text-zinc-400 line-clamp-2">
        {shot.shot_description || shot.prompt || "无描述"}
      </p>
    </div>
  );
}

export function GenerateNineGridDialog({
  open,
  onOpenChange,
  selectedShots,
  timelineId,
  chapterId,
  chapterSummary = "",
  onConfirm,
  isSubmitting = false,
}: GenerateNineGridDialogProps) {
  // 🔍 调试日志 - 追踪 props 变化
  console.log("[GenerateNineGridDialog] Props:", {
    open,
    timelineId,
    chapterId,
    chapterSummary,
    selectedShotsCount: selectedShots.length,
  });

  const [plotSummary, setPlotSummary] = useState("");
  const [characterReferences, setCharacterReferences] = useState<CharacterReference[]>([]);

  // 获取时间线配置（包含默认风格）
  const { data: timelineData, isLoading: timelineLoading } =
    useTimelineConfig(timelineId);
  const timelineConfig = timelineData?.timeline.config;
  const defaultStyleId = getSafeConfig(timelineConfig).default_comic_style_id;

  // 获取风格列表（用于显示风格信息）
  const { data: stylesData } = useComicStyles({ enabled: !!defaultStyleId });
  const currentStyle = findStyleById(stylesData?.data, defaultStyleId);

  // 检查镜头是否连续
  const consecutiveCheck = checkShotsConsecutive(selectedShots);

  // 当对话框打开时，使用章节摘要初始化剧情概述
  useEffect(() => {
    if (open && chapterSummary) {
      setPlotSummary(chapterSummary);
    }
  }, [open, chapterSummary]);

  // 关闭对话框时重置状态
  useEffect(() => {
    if (!open) {
      setPlotSummary("");
      setCharacterReferences([]);
    }
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (selectedShots.length !== 9) return;

    onConfirm({
      shotIds: selectedShots.map((s) => s.id),
      comicStyleId: defaultStyleId,
      plotSummary: plotSummary.trim(), // 可以为空
      // [新增] 角色参考图
      characterReferences: characterReferences
        .filter((char) => char.selectedReferenceImages.length > 0)
        .map((char) => ({
          characterId: char.id,
          referenceImageUrls: char.selectedReferenceImages.map((img) => img.url),
        })),
    });
  }, [selectedShots, plotSummary, defaultStyleId, characterReferences, onConfirm]);

  const isValid =
    selectedShots.length === 9 && defaultStyleId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-purple-500" />
            生成九宫格图片
          </DialogTitle>
          <DialogDescription>
            基于选中的9个镜头生成一张3x3网格预览图
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* 选中镜头预览 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Camera className="w-4 h-4 text-blue-400" />
                选中的镜头 ({selectedShots.length}/9)
              </Label>
              {!consecutiveCheck.consecutive && (
                <Badge
                  variant="outline"
                  className="text-xs text-amber-300 border-amber-800 bg-amber-900/20"
                >
                  非连续选择
                </Badge>
              )}
            </div>

            {selectedShots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-zinc-500 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                <Grid3X3 className="w-8 h-8 mb-2 text-zinc-600" />
                <p className="text-sm">请选择9个镜头</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {selectedShots.map((shot, index) => (
                  <ShotPreviewCard key={shot.id} shot={shot} index={index} />
                ))}
                {/* 占位符 */}
                {Array.from({ length: 9 - selectedShots.length }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="bg-zinc-900/30 border border-dashed border-zinc-700 rounded p-2 flex items-center justify-center h-16"
                  >
                    <span className="text-xs text-zinc-600">
                      {selectedShots.length + i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 剧情概述输入 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4 text-green-400" />
              剧情概述
              <span className="text-zinc-500 font-normal">(可选)</span>
            </Label>
            <Textarea
              value={plotSummary}
              onChange={(e) => setPlotSummary(e.target.value)}
              placeholder="请输入这组镜头的剧情概述，例如：主角在废弃工厂与反派展开激烈追逐战..."
              className="min-h-[80px] bg-zinc-900/50 border-zinc-700 focus:border-purple-500"
              maxLength={500}
            />
            <p className="text-xs text-zinc-500 text-right">
              {plotSummary.length}/500
            </p>
          </div>

          {/* 角色参考图选择 - 始终渲染,在组件内部处理缺失情况 */}
          <CharacterReferenceSection
            chapterId={chapterId || ""}
            projectId={timelineId || ""}
            characterReferences={characterReferences}
            onUpdateCharacterReferences={setCharacterReferences}
          />

          {/* 漫画风格信息（只读显示） */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Palette className="w-4 h-4 text-purple-400" />
              漫画风格
            </Label>

            {timelineLoading ? (
              <div className="flex items-center gap-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            ) : !defaultStyleId ? (
              <div className="flex items-start gap-3 p-4 bg-amber-900/20 rounded-lg border border-amber-800/50">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-300">
                    未设置默认漫画风格
                  </p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    请先在画布页面顶部设置默认风格
                  </p>
                </div>
              </div>
            ) : currentStyle ? (
              <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                {currentStyle.image_url && (
                  <img
                    src={currentStyle.image_url}
                    alt={currentStyle.name_zh}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: currentStyle.tag_color }}
                    />
                    <p className="text-sm font-medium text-white">
                      {currentStyle.name_zh}
                    </p>
                  </div>
                  {currentStyle.prompt_prefix && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                      {currentStyle.prompt_prefix}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="text-xs text-green-300 border-green-800 bg-green-900/20"
                >
                  时间线默认
                </Badge>
              </div>
            ) : (
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 text-zinc-400 text-sm">
                使用时间线默认风格
              </div>
            )}
          </div>

          {/* 生成说明 */}
          <div className="bg-zinc-900/30 rounded-lg border border-zinc-800 p-4">
            <h4 className="text-sm font-medium text-zinc-300 mb-2">
              生成说明
            </h4>
            <ul className="text-xs text-zinc-500 space-y-1">
              <li>将生成一张 3x3 网格图像，每个格子为 16:9 比例</li>
              <li>系统会保持人物、服装和光线的一致性</li>
              <li>生成时间约 30-60 秒</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4">
          <div className="flex-1 text-sm text-zinc-400">
            {selectedShots.length === 9
              ? "已选择 9 个镜头，可以生成"
              : `还需选择 ${9 - selectedShots.length} 个镜头`}
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700"
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                生成九宫格
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
