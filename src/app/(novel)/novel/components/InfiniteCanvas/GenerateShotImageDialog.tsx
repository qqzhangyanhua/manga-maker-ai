"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Palette,
  Loader2,
  ImageIcon,
  Sparkles,
  AlertCircle,
  Settings,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTimelineConfig, getSafeConfig } from "@/hooks/useTimelineConfig";
import { findStyleById, useComicStyles } from "@/hooks/useComicStyles";
import type { ShotGenerateDialogShotInfo } from "@/stores/canvas-store";
import type {
  ShotImageCharacterInput,
  ComicStyleFull,
  ChapterCharacterFull,
  NovelCharacterInput,
  SelectableCharacterInput,
} from "./shared-types";

// 重新导出以供其他组件使用
export type { ShotImageCharacterInput };

interface GenerateShotImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shotInfo: ShotGenerateDialogShotInfo | null;
  chapterId: string | null;
  timelineId: string | null;
  onConfirm: (payload: {
    characters: Array<{
      name: string;
      role: string;
      description: string;
      reference_image_url?: string;
    }>;
    comicStyleId?: string;
  }) => void;
  isSubmitting?: boolean;
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "protagonist":
      return "bg-yellow-900/50 text-yellow-300 border-yellow-800";
    case "antagonist":
      return "bg-red-900/50 text-red-300 border-red-800";
    case "supporting":
      return "bg-blue-900/50 text-blue-300 border-blue-800";
    default:
      return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "protagonist":
      return "主角";
    case "antagonist":
      return "反派";
    case "supporting":
      return "配角";
    case "minor":
      return "龙套";
    default:
      return "角色";
  }
}

export function GenerateShotImageDialog({
  open,
  onOpenChange,
  shotInfo,
  chapterId,
  timelineId,
  onConfirm,
  isSubmitting = false,
}: GenerateShotImageDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 获取时间线配置（包含默认风格）
  const { data: timelineData, isLoading: timelineLoading } = useTimelineConfig(timelineId);
  const timelineConfig = timelineData?.timeline.config;
  const defaultStyleId = getSafeConfig(timelineConfig).default_comic_style_id;

  // 获取风格列表（用于显示风格信息）
  const { data: stylesData } = useComicStyles({ enabled: !!defaultStyleId });
  const currentStyle = findStyleById(stylesData?.data, defaultStyleId);

  const {
    data: chapterCharactersData,
    isLoading: chapterLoading,
    error: chapterError,
    refetch: refetchChapterCharacters,
  } = useQuery({
    queryKey: ["chapter-characters", chapterId],
    queryFn: async () => {
      const res = await fetch(`/api/canvas/chapter/${chapterId}/characters`);
      if (!res.ok) {
        const error = await res.json() as { error?: string };
        throw new Error(error.error || "获取角色列表失败");
      }
      return res.json() as Promise<{
        data: ChapterCharacterFull[];
        total: number;
      }>;
    },
    enabled: open && !!chapterId,
    staleTime: 30 * 1000,
  });

  const {
    data: novelCharactersData,
    isLoading: novelLoading,
    error: novelError,
    refetch: refetchNovelCharacters,
  } = useQuery({
    queryKey: ["novel-characters", timelineId],
    queryFn: async () => {
      const res = await fetch(
        `/api/canvas/timeline/${timelineId}/novel-characters`
      );
      if (!res.ok) {
        const error = await res.json() as { error?: string };
        throw new Error(error.error || "获取小说角色失败");
      }
      return res.json() as Promise<{
        success: boolean;
        characters: NovelCharacterInput[];
      }>;
    },
    enabled: open && !!timelineId,
    staleTime: 30 * 1000,
  });

  const chapterCharacters = useMemo(() => chapterCharactersData?.data || [], [chapterCharactersData?.data]);
  const novelCharacters = useMemo(() => novelCharactersData?.characters || [], [novelCharactersData?.characters]);
  const isWaitingForChapter = open && !!chapterId && chapterLoading && !chapterError;
  const shouldFallbackToNovel =
    !isWaitingForChapter && (chapterError || chapterCharacters.length === 0);
  const characterSource: "novel" | "chapter" = shouldFallbackToNovel ? "novel" : "chapter";
  const isCharactersLoading =
    isWaitingForChapter || (shouldFallbackToNovel && novelLoading);
  const charactersError = shouldFallbackToNovel ? novelError : chapterError;

  const selectableCharacters = useMemo<SelectableCharacterInput[]>(() => {
    if (characterSource === "chapter") {
      return chapterCharacters.map((char) => ({
        id: char.id,
        name: char.name,
        role: "supporting",
        description: char.description || "",
        imageUrl: char.reference_image || char.base_image_url || null,
        source: "chapter",
      }));
    }
    return novelCharacters.map((char) => ({
      id: char.tempId,
      name: char.name,
      role: char.role,
      description: char.description,
      imageUrl: char.generatedImageUrl || null,
      source: "novel",
    }));
  }, [characterSource, chapterCharacters, novelCharacters]);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
    }
  }, [open, characterSource]);

  const handleCheckedChange = useCallback(
    (id: string, checked: boolean | "indeterminate") => {
      const isChecked = checked === true;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (isChecked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    []
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(selectableCharacters.map((char) => char.id)));
  }, [selectableCharacters]);

  const handleSelectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleConfirm = useCallback(() => {
    const selectedCharacters: ShotImageCharacterInput[] = selectableCharacters
      .filter((char) => selectedIds.has(char.id))
      .map((char) => ({
        name: char.name,
        role: char.role,
        description: char.description,
        reference_image_url: char.imageUrl || undefined,
      }));

    onConfirm({
      characters: selectedCharacters,
      comicStyleId: defaultStyleId, // 直接使用时间线默认风格
    });
  }, [onConfirm, selectableCharacters, selectedIds, defaultStyleId]);

  const hasCharacters = selectableCharacters.length > 0;
  const missingContext = !chapterId && !timelineId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            生成镜头图片
          </DialogTitle>
          <DialogDescription>
            选择角色后生成单镜头预览图（使用时间线默认风格）
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* 镜头信息 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-300">镜头信息</Label>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
              <div className="text-sm text-white">
                镜头 {shotInfo?.shot_order ?? "-"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-blue-900/30 border border-blue-800/50 rounded text-xs text-blue-300">
                  机位: {shotInfo?.camera_angle || "未填写"}
                </span>
                <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-800/50 rounded text-xs text-purple-300">
                  景别: {shotInfo?.shot_size || "未填写"}
                </span>
                <span className="px-2 py-0.5 bg-green-900/30 border border-green-800/50 rounded text-xs text-green-300">
                  面板: {shotInfo?.panel_type || "未填写"}
                </span>
              </div>
              <div className="text-xs text-zinc-400 line-clamp-2">
                {shotInfo?.shot_description || "暂无镜头描述"}
              </div>
            </div>
          </div>

          {/* 角色选择 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-blue-400" />
                角色选择
              </Label>
              <div className="flex items-center gap-2">
                {characterSource === "novel" && (
                  <Badge variant="outline" className="text-xs text-blue-300 border-blue-800">
                    使用小说角色
                  </Badge>
                )}
                {hasCharacters && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-xs h-7"
                    >
                      全选
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectNone}
                      className="text-xs h-7"
                    >
                      清空
                    </Button>
                  </>
                )}
              </div>
            </div>

            {missingContext ? (
              <div className="flex flex-col items-center justify-center h-24 text-zinc-500 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                <AlertCircle className="w-6 h-6 mb-2 text-zinc-600" />
                <p className="text-sm">缺少章节或时间线信息</p>
              </div>
            ) : isCharactersLoading ? (
              <div className="flex items-center justify-center h-24 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                加载角色中...
              </div>
            ) : charactersError ? (
              <div className="flex flex-col items-center justify-center h-24 text-zinc-500 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                <AlertCircle className="w-6 h-6 mb-2 text-red-400" />
                <p className="text-sm mb-2">
                  {charactersError instanceof Error ? charactersError.message : "加载失败"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchChapterCharacters();
                    refetchNovelCharacters();
                  }}
                >
                  重试
                </Button>
              </div>
            ) : !hasCharacters ? (
              <div className="flex flex-col items-center justify-center h-24 text-zinc-500 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                <Users className="w-8 h-8 mb-2 text-zinc-600" />
                <p className="text-sm">暂无可选角色</p>
                <p className="text-xs text-zinc-600 mt-1">
                  可直接生成（不使用角色参考）
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {selectableCharacters.map((char) => {
                  const isSelected = selectedIds.has(char.id);
                  const checkboxId = `shot-character-${char.id}`;
                  return (
                    <div
                      key={char.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        isSelected
                          ? "border-purple-500 bg-purple-900/20"
                          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                      )}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleCheckedChange(char.id, checked)
                        }
                      />
                      <label htmlFor={checkboxId} className="flex-1 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {char.imageUrl ? (
                              <img
                                src={char.imageUrl}
                                alt={char.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-white truncate text-sm">
                                {char.name}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-4",
                                  getRoleBadgeColor(char.role)
                                )}
                              >
                                {getRoleLabel(char.role)}
                              </Badge>
                            </div>
                            {char.description && (
                              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                {char.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
              <div className="flex flex-col gap-3 p-4 bg-amber-900/20 rounded-lg border border-amber-800/50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-300">未设置默认漫画风格</p>
                    <p className="text-xs text-amber-400/80 mt-1">
                      请先在画布页面顶部设置默认风格，以确保生成的镜头图片风格统一
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="w-fit border-amber-700 text-amber-300 hover:bg-amber-900/30"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  前往设置风格
                </Button>
              </div>
            ) : currentStyle ? (
              <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                {currentStyle.image_url && (
                  <img
                    src={currentStyle.image_url}
                    alt={currentStyle.name_zh}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: currentStyle.tag_color }}
                    />
                    <p className="text-sm font-medium text-white">
                      {currentStyle.name_zh} ({currentStyle.name_en})
                    </p>
                  </div>
                  {currentStyle.prompt_prefix && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {currentStyle.prompt_prefix}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs text-green-300 border-green-800 bg-green-900/20">
                  时间线默认
                </Badge>
              </div>
            ) : (
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 text-zinc-400 text-sm">
                使用时间线默认风格
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4">
          <div className="flex-1 text-sm text-zinc-400">
            已选择 {selectedIds.size} / {selectableCharacters.length} 个角色
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
            disabled={!shotInfo || isSubmitting || !defaultStyleId}
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
                确认生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
