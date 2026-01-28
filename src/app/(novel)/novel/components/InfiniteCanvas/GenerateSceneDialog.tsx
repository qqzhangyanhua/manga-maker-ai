"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Palette,
  Users,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ImageIcon,
  RefreshCw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  ComicStyleFull,
  CharacterAssetStatusFull,
  ChapterCharacterFull,
} from "./shared-types";

interface GenerateSceneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  timelineId: string;
  onSuccess?: () => void;
}

export function GenerateSceneDialog({
  open,
  onOpenChange,
  chapterId,
  chapterTitle,
  chapterNumber,
  timelineId,
  onSuccess,
}: GenerateSceneDialogProps) {
  const queryClient = useQueryClient();
  const [selectedStyleId, setSelectedStyleId] = useState<string>("__default__");
  const [generatingAssets, setGeneratingAssets] = useState<Set<string>>(new Set());

  // 获取漫画风格列表
  const { data: stylesData, isLoading: stylesLoading } = useQuery({
    queryKey: ["canvas-styles"],
    queryFn: async () => {
      const res = await fetch("/api/canvas/styles");
      if (!res.ok) throw new Error("获取风格列表失败");
      return res.json() as Promise<{ data: ComicStyle[]; total: number }>;
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // 获取章节当前风格
  const { data: currentStyle } = useQuery({
    queryKey: ["chapter-style", chapterId],
    queryFn: async () => {
      const res = await fetch(`/api/canvas/chapter/${chapterId}/style`);
      if (!res.ok) throw new Error("获取当前风格失败");
      return res.json() as Promise<{
        comic_style_id: string | null;
        comic_style: ComicStyle | null;
      }>;
    },
    enabled: open,
  });

  // 获取章节角色列表
  const {
    data: charactersData,
    isLoading: charactersLoading,
    refetch: refetchCharacters,
  } = useQuery({
    queryKey: ["chapter-characters", chapterId],
    queryFn: async () => {
      const res = await fetch(`/api/canvas/chapter/${chapterId}/characters`);
      if (!res.ok) throw new Error("获取角色列表失败");
      return res.json() as Promise<{
        data: ChapterCharacter[];
        total: number;
        summary: {
          total_characters: number;
          ready_count: number;
          needs_generation_count: number;
        };
      }>;
    },
    enabled: open,
  });

  // 初始化选中的风格
  useEffect(() => {
    if (currentStyle?.comic_style_id) {
      setSelectedStyleId(currentStyle.comic_style_id);
    }
  }, [currentStyle]);

  // 更新章节风格
  const updateStyleMutation = useMutation({
    mutationFn: async (styleId: string) => {
      const res = await fetch(`/api/canvas/chapter/${chapterId}/style`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_style_id: styleId === "__default__" ? null : styleId,
        }),
      });
      if (!res.ok) throw new Error("更新风格失败");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-style", chapterId] });
    },
  });

  // 生成场景图
  const generateScenesMutation = useMutation({
    mutationFn: async () => {
      // 先保存风格选择
      if (selectedStyleId !== "__default__" && selectedStyleId !== currentStyle?.comic_style_id) {
        await updateStyleMutation.mutateAsync(selectedStyleId);
      }

      const res = await fetch(`/api/canvas/chapter/${chapterId}/generate-scenes`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "生成失败");
      }
      return res.json();
    },
    onMutate: async () => {
      // 乐观更新：立即关闭弹窗并更新状态为 generating
      onOpenChange(false);

      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ["timeline", timelineId] });

      // 获取所有匹配的查询并保存之前的数据
      const queries = queryClient.getQueriesData({ queryKey: ["timeline", timelineId] });
      const previousDataMap = new Map(queries);

      // 使用模糊匹配更新所有相关缓存
      queryClient.setQueriesData(
        { queryKey: ["timeline", timelineId] },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const timeline = old as { chapters?: Array<{ id: string; scene_status: string }> };
          if (!timeline.chapters) return old;
          return {
            ...timeline,
            chapters: timeline.chapters.map((ch) =>
              ch.id === chapterId ? { ...ch, scene_status: "generating" } : ch
            ),
          };
        }
      );

      return { previousDataMap };
    },
    onSuccess: (data) => {
      toast.success(`场景图生成成功`, {
        description: `生成 ${data.metadata?.scene_count || 0} 张场景图`,
      });

      // 更新缓存为完成状态
      queryClient.setQueriesData(
        { queryKey: ["timeline", timelineId] },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const timeline = old as { chapters?: Array<{ id: string; scene_status: string; scene_image_count: number }> };
          if (!timeline.chapters) return old;
          return {
            ...timeline,
            chapters: timeline.chapters.map((ch) =>
              ch.id === chapterId
                ? { ...ch, scene_status: "completed", scene_image_count: data.metadata?.scene_count || 0 }
                : ch
            ),
          };
        }
      );

      // 刷新数据确保与数据库同步
      queryClient.refetchQueries({ queryKey: ["timeline", timelineId] });
      onSuccess?.();
    },
    onError: (error: Error, _variables, context) => {
      toast.error("生成失败", { description: error.message });
      // 回滚到之前的状态
      if (context?.previousDataMap) {
        context.previousDataMap.forEach((data, key) => {
          queryClient.setQueryData(key as string[], data);
        });
      }
    },
  });

  // 生成单个角色资产
  const generateCharacterAssets = useCallback(
    async (characterId: string, types: string[]) => {
      setGeneratingAssets((prev) => new Set(prev).add(characterId));

      try {
        for (const type of types) {
          const res = await fetch(
            `/api/canvas/chapter/${chapterId}/characters/${characterId}/generate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type }),
            }
          );
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || `生成${type}失败`);
          }
        }
        toast.success("资产生成已启动");
        refetchCharacters();
      } catch (error) {
        toast.error("生成失败", {
          description: error instanceof Error ? error.message : "未知错误",
        });
      } finally {
        setGeneratingAssets((prev) => {
          const next = new Set(prev);
          next.delete(characterId);
          return next;
        });
      }
    },
    [chapterId, refetchCharacters]
  );

  // 一键生成所有缺失资产
  const generateAllAssetsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/canvas/chapter/${chapterId}/characters/generate-all`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "批量生成失败");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("资产生成完成", {
        description: data.message,
      });
      refetchCharacters();
    },
    onError: (error: Error) => {
      toast.error("批量生成失败", { description: error.message });
    },
  });

  const comicStyles = stylesData?.data || [];
  const characters = charactersData?.data || [];
  const summary = charactersData?.summary;

  const selectedStyle = comicStyles.find((s) => s.id === selectedStyleId);
  const hasUnreadyCharacters = summary && summary.needs_generation_count > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            生成场景图 - 第{chapterNumber}章
          </DialogTitle>
          <DialogDescription>
            {chapterTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* 风格选择 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Palette className="w-4 h-4 text-purple-400" />
              漫画风格
            </Label>
            <Select
              value={selectedStyleId}
              onValueChange={setSelectedStyleId}
              disabled={stylesLoading}
            >
              <SelectTrigger className="w-full bg-zinc-900 border-zinc-700">
                <SelectValue placeholder={stylesLoading ? "加载中..." : "选择漫画风格"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">
                  <span className="text-zinc-400">使用默认风格</span>
                </SelectItem>
                {comicStyles.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: style.tag_color }}
                      />
                      {style.name_zh}
                      <span className="text-zinc-500 text-xs">({style.name_en})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 风格预览 */}
            {selectedStyle && selectedStyle.image_url && (
              <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <img
                  src={selectedStyle.image_url}
                  alt={selectedStyle.name_zh}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{selectedStyle.name_zh}</p>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {selectedStyle.prompt_prefix || "无描述"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 角色列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-blue-400" />
                章节角色
                {summary && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {summary.ready_count}/{summary.total_characters} 就绪
                  </Badge>
                )}
              </Label>
              {hasUnreadyCharacters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAllAssetsMutation.mutate()}
                  disabled={generateAllAssetsMutation.isPending}
                  className="text-xs h-7 border-purple-800 text-purple-300 hover:bg-purple-900/30"
                >
                  {generateAllAssetsMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      一键生成缺失资产
                    </>
                  )}
                </Button>
              )}
            </div>

            {charactersLoading ? (
              <div className="flex items-center justify-center h-24 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                加载角色中...
              </div>
            ) : characters.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-zinc-500 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                <Users className="w-8 h-8 mb-2 text-zinc-600" />
                <p className="text-sm">暂无关联角色</p>
                <p className="text-xs text-zinc-600 mt-1">LLM 将自动从对话中识别角色</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      char.asset_status.ready_for_generation
                        ? "bg-zinc-900/50 border-zinc-800"
                        : "bg-yellow-900/10 border-yellow-800/30"
                    )}
                  >
                    {/* 角色头像 */}
                    <div className="relative">
                      {char.base_image_url || char.reference_image ? (
                        <img
                          src={char.base_image_url || char.reference_image || ""}
                          alt={char.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                      {/* 状态指示器 */}
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 flex items-center justify-center",
                          char.asset_status.ready_for_generation
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        )}
                      >
                        {char.asset_status.ready_for_generation ? (
                          <CheckCircle className="w-3 h-3 text-white" />
                        ) : (
                          <AlertTriangle className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>
                    </div>

                    {/* 角色信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {char.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        出现 {char.shot_count} 个镜头
                      </p>
                      {!char.asset_status.ready_for_generation && (
                        <div className="flex items-center gap-1 mt-1">
                          {generatingAssets.has(char.id) ? (
                            <span className="text-xs text-purple-400">
                              <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                              生成中...
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                generateCharacterAssets(char.id, ["base_image"])
                              }
                              className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                            >
                              生成参考图
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700"
          >
            取消
          </Button>
          <Button
            onClick={() => generateScenesMutation.mutate()}
            disabled={generateScenesMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generateScenesMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                开始生成场景图
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
