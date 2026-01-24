/**
 * 镜头设计详情面板
 *
 * 功能:
 * 1. 显示章节的所有镜头设计
 * 2. 缩略图网格展示
 * 3. 显示镜头参数 (角度、景别、面板类型)
 * 4. 支持重新生成
 * 5. 支持九宫格选择模式（选择9个镜头生成网格图）
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  Film,
  Layout,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useShotGenerateDialog,
  useOpenShotGenerateDialog,
  useCloseShotGenerateDialog,
  useNineGridDialog,
  useOpenNineGridDialog,
  useCloseNineGridDialog,
} from "@/stores/canvas-store";
import { GenerateShotImageDialog } from "../GenerateShotImageDialog";
import { GenerateNineGridDialog, useNineGridTaskPolling } from "../NineGrid";
import { ImageViewerDialog } from "@/components/ui/image-viewer-dialog";
import { useState, useCallback, useMemo, useEffect } from "react";
import type { ShotDesignBasic, NineGridGenerateRequest } from "../NineGrid";
import type { NineGridTaskStatus } from "../NineGrid";
import { groupShotsIntoNineGrids } from "../utils/shot-grouping";
import { ShotGroupSection } from "./ShotGroupSection";
import type { ShotGroup } from "./types";

/**
 * 镜头设计类型
 */
interface ShotDesign {
  id: string;
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  prompt: string;
  generated_image_url?: string | null;
  generation_status?: string;
  created_at: string;
}

/**
 * API 响应类型
 */
interface ShotDetailResponse {
  chapterId: string;
  chapterNumber: number;
  timelineId: string;
  shots: ShotDesign[];
  totalCount: number;
}

interface ShotDetailPanelProps {
  chapterId: string;
}

interface ShotImageCharacterInput {
  name: string;
  role: string;
  description: string;
  reference_image_url?: string;
}

interface GenerateShotImagePayload {
  shotId: string;
  characters: ShotImageCharacterInput[];
  comicStyleId?: string;
}

/**
 * 镜头卡片组件 (已弃用,保留以备后用)
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
function ShotCard({
  shot,
  onGenerate,
  onImageClick,
  isSelectMode,
  isSelected,
  onSelectToggle,
}: {
  shot: ShotDesign;
  onGenerate: (shot: ShotDesign) => void;
  onImageClick: (shot: ShotDesign) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onSelectToggle: (shotId: string) => void;
}) {
  const isGenerating = shot.generation_status === "generating";
  const hasImage = !!shot.generated_image_url;

  const handleCardClick = useCallback(() => {
    if (isSelectMode) {
      onSelectToggle(shot.id);
    }
  }, [isSelectMode, onSelectToggle, shot.id]);

  return (
    <div
      className={cn(
        "bg-zinc-800/50 border rounded-lg overflow-hidden transition-all",
        isSelectMode && "cursor-pointer",
        isSelected
          ? "border-purple-500 ring-2 ring-purple-500/30"
          : "border-zinc-700 hover:border-zinc-600"
      )}
      onClick={handleCardClick}
    >
      {/* 缩略图区域 */}
      <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border-b border-zinc-700 relative overflow-hidden group">
        {/* 选择模式下的复选框 */}
        {isSelectMode && (
          <div className="absolute top-2 left-2 z-10">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-purple-500 text-white"
                  : "bg-zinc-900/80 border border-zinc-600 text-zinc-400"
              )}
            >
              {isSelected ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs font-mono">{shot.shot_order}</span>
              )}
            </div>
          </div>
        )}

        {hasImage ? (
          <>
            <img
              src={shot.generated_image_url || ""}
              alt={`镜头 ${shot.shot_order}`}
              className="w-full h-full object-cover"
              onClick={(e) => {
                if (!isSelectMode) {
                  e.stopPropagation();
                  onImageClick(shot);
                }
              }}
            />
            {!isSelectMode && (
              <div
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(shot);
                }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white pointer-events-none"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  查看大图
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
            <div className="text-xs text-zinc-500">镜头 {shot.shot_order}</div>
          </div>
        )}
        {isGenerating && !hasImage && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-zinc-300">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            生成中...
          </div>
        )}
      </div>

      {/* 镜头信息 */}
      <div className="p-3 space-y-2">
        {/* 参数标签 */}
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 bg-blue-900/30 border border-blue-800/50 rounded text-xs text-blue-300">
            <Eye className="w-3 h-3 inline mr-1" />
            {shot.camera_angle}
          </span>
          <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-800/50 rounded text-xs text-purple-300">
            <Film className="w-3 h-3 inline mr-1" />
            {shot.shot_size}
          </span>
          <span className="px-2 py-0.5 bg-green-900/30 border border-green-800/50 rounded text-xs text-green-300">
            <Layout className="w-3 h-3 inline mr-1" />
            {shot.panel_type}
          </span>
        </div>

        {/* 镜头描述 */}
        <div className="text-xs text-zinc-400 line-clamp-2">
          {shot.shot_description}
        </div>

        {/* 构图提示 */}
        {shot.composition_hint && (
          <div className="text-xs text-zinc-500 italic line-clamp-1">
            构图: {shot.composition_hint}
          </div>
        )}

        {/* 生成按钮（非选择模式下显示） */}
        {!isSelectMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onGenerate(shot);
            }}
            disabled={isGenerating}
            className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                生成图片
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 镜头详情面板主组件
 */
export function ShotDetailPanel({ chapterId }: ShotDetailPanelProps) {
  const queryClient = useQueryClient();
  const shotGenerateDialog = useShotGenerateDialog();
  const openShotGenerateDialog = useOpenShotGenerateDialog();
  const closeShotGenerateDialog = useCloseShotGenerateDialog();
  const nineGridDialog = useNineGridDialog();
  const openNineGridDialog = useOpenNineGridDialog();
  const closeNineGridDialog = useCloseNineGridDialog();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedShot, setSelectedShot] = useState<ShotDesign | null>(null);

  // 分组状态
  const [shotGroups, setShotGroups] = useState<ShotGroup[]>([]);

  // 九宫格任务轮询状态
  const [nineGridTaskId, setNineGridTaskId] = useState<string | null>(null);
  const [nineGridImageUrl, setNineGridImageUrl] = useState<string | null>(null);
  const [nineGridViewerOpen, setNineGridViewerOpen] = useState(false);

  // 计算镜头分组
  useEffect(() => {
    if (data?.shots && data.shots.length > 0) {
      const sortedShots = [...data.shots].sort((a, b) => a.shot_order - b.shot_order);
      // 将 ShotDesign 转换为 Prisma ShotDesign 类型（添加缺失字段）
      const prismaShots = sortedShots.map(shot => ({
        ...shot,
        script_segment_id: '',
        location_key: '',
        character_ids: [],
        scene_id: null,
        atmosphere: null,
        lighting: null,
        weather: null,
        time_of_day: null,
        special_effects: null,
        created_at: new Date(shot.created_at),
      }));
      const groups = groupShotsIntoNineGrids(prismaShots);
      setShotGroups(groups);
    } else {
      setShotGroups([]);
    }
  }, [data?.shots]);

  // 九宫格任务轮询
  const { status: nineGridStatus, isPolling: isNineGridPolling } =
    useNineGridTaskPolling({
      taskId: nineGridTaskId,
      enabled: !!nineGridTaskId,
      interval: 5000, // 5秒轮询一次
      onComplete: (result: NineGridTaskStatus) => {
        if (result.imageUrl) {
          setNineGridImageUrl(result.imageUrl);
          setNineGridViewerOpen(true);
          toast.success("九宫格图片生成完成");
        }
        setNineGridTaskId(null);
      },
      onError: (error: string) => {
        toast.error("九宫格图片生成失败", { description: error });
        setNineGridTaskId(null);
      },
    });

  // 获取镜头数据
  const { data, isLoading, error } = useQuery<ShotDetailResponse>({
    queryKey: ["shot-detail", chapterId],
    queryFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/shot`);
      if (!response.ok) {
        throw new Error("获取镜头详情失败");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: (query) => {
      const data = query.state.data as ShotDetailResponse | undefined;
      if (!data?.shots) return false;

      const generatingShots = data.shots.filter(
        (shot) => shot.generation_status === "generating"
      );

      if (generatingShots.length > 0) {
        return 3000;
      }
      return false;
    },
  });

  // 当前选中的镜头数据（用于九宫格生成）
  const [currentSelectedShotIds, setCurrentSelectedShotIds] = useState<string[]>([]);

  const selectedShots = useMemo<ShotDesignBasic[]>(() => {
    if (!data?.shots || currentSelectedShotIds.length === 0) return [];
    return data.shots
      .filter((shot) => currentSelectedShotIds.includes(shot.id))
      .sort((a, b) => a.shot_order - b.shot_order)
      .map((shot) => ({
        id: shot.id,
        shot_order: shot.shot_order,
        camera_angle: shot.camera_angle,
        shot_size: shot.shot_size,
        panel_type: shot.panel_type,
        shot_description: shot.shot_description,
        composition_hint: shot.composition_hint,
        prompt: shot.prompt,
        generated_image_url: shot.generated_image_url,
        generation_status: shot.generation_status,
      }));
  }, [data?.shots, currentSelectedShotIds]);

  // 处理分组生成按钮点击
  const handleGenerateGroup = useCallback((group: ShotGroup) => {
    if (!data?.timelineId) {
      toast.error("缺少时间线信息");
      return;
    }
    const shotIds = group.shots.map((shot) => shot.id);
    setCurrentSelectedShotIds(shotIds);
    openNineGridDialog(chapterId, data.timelineId, "");
  }, [data?.timelineId, openNineGridDialog, chapterId]);

  // 九宫格生成 mutation
  const nineGridMutation = useMutation({
    mutationFn: async (payload: NineGridGenerateRequest) => {
      const response = await fetch("/api/canvas/nine-grid/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "生成失败");
      }
      return response.json() as Promise<{
        success: boolean;
        taskId: string;
        status: string;
      }>;
    },
    onSuccess: (result) => {
      toast.success("九宫格图片生成任务已提交");
      // 设置 taskId 开始轮询
      setNineGridTaskId(result.taskId);
      closeNineGridDialog();
      setCurrentSelectedShotIds([]);
    },
    onError: (error: Error) => {
      toast.error("生成失败", { description: error.message });
    },
  });

  const handleNineGridConfirm = useCallback(
    (payload: NineGridGenerateRequest) => {
      nineGridMutation.mutate(payload);
    },
    [nineGridMutation]
  );

  const generateShotImageMutation = useMutation({
    mutationFn: async ({
      shotId,
      characters,
      comicStyleId,
    }: GenerateShotImagePayload) => {
      const response = await fetch(
        `/api/canvas/shot-design/${shotId}/generate-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characters,
            comic_style_id: comicStyleId,
          }),
        }
      );
      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "生成失败");
      }
      return response.json() as Promise<{
        success: boolean;
        taskId: string;
        shot: { id: string; generation_status: string };
      }>;
    },
    onMutate: async ({ shotId }) => {
      const previous = queryClient.getQueryData<ShotDetailResponse>([
        "shot-detail",
        chapterId,
      ]);
      queryClient.setQueryData<ShotDetailResponse>(
        ["shot-detail", chapterId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            shots: old.shots.map((shot) =>
              shot.id === shotId
                ? { ...shot, generation_status: "generating" }
                : shot
            ),
          };
        }
      );
      closeShotGenerateDialog();
      return { previous };
    },
    onSuccess: () => {
      toast.success("镜头图片生成任务已提交");
      queryClient.invalidateQueries({ queryKey: ["shot-detail", chapterId] });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["shot-detail", chapterId], context.previous);
      }
      toast.error("生成失败", { description: error.message });
    },
  });

  const handleOpenGenerateDialog = (shot: ShotDesign) => {
    if (!data?.timelineId) {
      toast.error("缺少时间线信息，无法生成图片");
      return;
    }
    openShotGenerateDialog(
      shot.id,
      {
        shot_order: shot.shot_order,
        camera_angle: shot.camera_angle,
        shot_size: shot.shot_size,
        shot_description: shot.shot_description,
        panel_type: shot.panel_type,
      },
      chapterId,
      data.timelineId
    );
  };

  const handleConfirmGenerate = (payload: {
    characters: ShotImageCharacterInput[];
    comicStyleId?: string;
  }) => {
    if (!shotGenerateDialog.shotId) {
      toast.error("未找到镜头信息");
      return;
    }
    generateShotImageMutation.mutate({
      shotId: shotGenerateDialog.shotId,
      characters: payload.characters,
      comicStyleId: payload.comicStyleId,
    });
  };

  const handleImageClick = (shot: { id: string; shot_order: number; generated_image_url?: string | null; shot_description: string; [key: string]: unknown }) => {
    // 从 data.shots 中找到完整的镜头数据
    const fullShot = data?.shots.find(s => s.id === shot.id);
    if (fullShot) {
      setSelectedShot(fullShot);
      setViewerOpen(true);
    }
  };

  // 重新生成镜头
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/canvas/chapter/${chapterId}/generate-shots`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        throw new Error("重新生成失败");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("开始重新生成镜头");
      queryClient.invalidateQueries({ queryKey: ["shot-detail", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onError: (error: Error) => {
      toast.error("重新生成失败", { description: error.message });
    },
  });

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载镜头设计中...</p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  // 空状态
  if (!data || data.shots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Camera className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-sm mb-4">暂无镜头设计</p>
        <Button
          onClick={() => regenerateMutation.mutate()}
          disabled={regenerateMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {regenerateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              生成镜头
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white mb-1">
              第 {data.chapterNumber} 章镜头
            </h3>
            <p className="text-xs text-zinc-400">共 {data.totalCount} 个镜头</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              variant="outline"
              size="sm"
              className="border-blue-800/50 text-blue-300 hover:bg-blue-900/30"
            >
              {regenerateMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  生成中
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  重新生成全部
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 分组展示 */}
      <div className="space-y-6">
        {shotGroups.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            暂无镜头数据
          </div>
        ) : (
          shotGroups.map((group) => (
            <ShotGroupSection
              key={group.groupIndex}
              group={group}
              onGenerate={handleGenerateGroup}
              onShotClick={handleImageClick}
            />
          ))
        )}
      </div>

      <GenerateShotImageDialog
        open={shotGenerateDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) closeShotGenerateDialog();
        }}
        shotInfo={shotGenerateDialog.shotInfo}
        chapterId={shotGenerateDialog.chapterId}
        timelineId={shotGenerateDialog.timelineId}
        onConfirm={handleConfirmGenerate}
        isSubmitting={generateShotImageMutation.isPending}
      />

      {/* 九宫格生成对话框 */}
      <GenerateNineGridDialog
        open={nineGridDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) closeNineGridDialog();
        }}
        selectedShots={selectedShots}
        timelineId={nineGridDialog.timelineId}
        chapterId={nineGridDialog.chapterId}
        chapterSummary={nineGridDialog.chapterSummary || ""}
        onConfirm={handleNineGridConfirm}
        isSubmitting={nineGridMutation.isPending}
      />

      {/* 图片查看器对话框 */}
      <ImageViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        imageUrl={selectedShot?.generated_image_url || ""}
        title={`镜头 ${selectedShot?.shot_order || ""}`}
        description={selectedShot?.shot_description}
      />

      {/* 九宫格图片查看器对话框 */}
      <ImageViewerDialog
        open={nineGridViewerOpen}
        onOpenChange={setNineGridViewerOpen}
        imageUrl={nineGridImageUrl || ""}
        title="九宫格预览图"
        description="基于选中的9个镜头生成的3×3网格预览图"
      />

      {/* 九宫格生成中提示 */}
      {isNineGridPolling && (
        <div className="fixed bottom-4 right-4 bg-zinc-900 border border-purple-800/50 rounded-lg p-4 shadow-lg z-50">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">九宫格图片生成中...</p>
              <p className="text-xs text-zinc-400">
                进度: {nineGridStatus?.progress || 0}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
