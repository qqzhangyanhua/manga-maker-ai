"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Palette, Users, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfiniteCanvasView } from "../../components/InfiniteCanvas";
import { useTimelineWindow } from "@/hooks/useTimelineWindow";
import { StyleSelector } from "@/components/StyleSelector";
import { useUpdateTimelineStyle, getSafeConfig } from "@/hooks/useTimelineConfig";
import { toast } from "sonner";
import { CanvasSkeleton } from "./components/CanvasSkeleton";
import { ErrorState } from "./components/ErrorState";
import { ProjectLinkBanner } from "./components/ProjectLinkBanner";
import { CharacterLibraryDrawer } from "../../components/InfiniteCanvas/CharacterLibraryDrawer";
import { ImageGalleryDialog } from "../../components/ImageGallery/ImageGalleryDialog";
import { novelTheme } from "../../theme";
import { cn } from "@/lib/utils";
import "../../novel-theme.css";
import { Navbar } from "@/components/Landing";

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();

  const timelineId = params.id as string;

  // 角色库抽屉状态
  const [characterLibraryOpen, setCharacterLibraryOpen] = useState(false);
  // 图片库弹窗状态
  const [imageGalleryOpen, setImageGalleryOpen] = useState(false);

  // ✅ 移除 windowCenter 冗余状态，Hook 内部管理
  const {
    timeline,
    isLoading,
    isError,
    error,
    window: windowState,
    chapterSummaries,
    navigateTo,
    navigatePrev,
    navigateNext,
    jumpToFirst,
    jumpToLast,
    refresh,
    canNavigatePrev,
    canNavigateNext,
  } = useTimelineWindow({
    timelineId,
    initialCenter: 1,
    range: 2,
  });

  // 风格更新 hook
  const updateStyle = useUpdateTimelineStyle(timelineId);

  // 处理风格变更
  const handleStyleChange = useCallback(
    (styleId: string | null) => {
      updateStyle.mutate(styleId, {
        onSuccess: () => {
          toast.success(styleId ? "默认漫画风格已更新" : "已取消设置默认风格");
          // invalidateQueries 会自动刷新数据，不需要手动调用 refresh
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "风格设置失败");
        },
      });
    },
    [updateStyle]
  );

  // ✅ 删除所有包装函数，直接使用 Hook 提供的方法

  // ✅ 使用骨架屏替代全屏 Loading，避免布局抖动
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f13] novel-theme-scope">
        <Navbar />
        <div className="pt-20">
          <CanvasSkeleton />
        </div>
      </div>
    );
  }

  // ✅ 增强错误处理：添加重试按钮，区分错误类型
  if (isError || !timeline) {
    const isNotFound = error?.message?.includes("不存在") || !timeline;

    return (
      <div className="min-h-screen bg-[#0f0f13] novel-theme-scope">
        <Navbar />
        <div className="pt-20">
          <ErrorState
            title={isNotFound ? "时间线不存在" : "加载失败"}
            message={
              isNotFound
                ? "该时间线可能已被删除或您没有访问权限"
                : error?.message || "网络连接异常，请检查网络后重试"
            }
            onRetry={isNotFound ? undefined : refresh}
            onGoBack={() => router.back()}
            showRetry={!isNotFound}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col text-zinc-100 novel-theme-scope pt-20">
      <Navbar />
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-purple-500/10 bg-[#0f0f13]/80 backdrop-blur-md sticky top-20 z-40">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className={cn(novelTheme.button.ghost, "transition-colors duration-200")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>

        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">{timeline.title}</h1>
          <p className="text-xs text-purple-300/60">无限画布 - 可缩放拖拽</p>
        </div>

        {/* 图片库按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImageGalleryOpen(true)}
          className={novelTheme.button.outline}
        >
          <Images className="w-4 h-4 mr-1.5" />
          图片库
        </Button>

        {/* 角色库按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCharacterLibraryOpen(true)}
          className={novelTheme.button.outline}
        >
          <Users className="w-4 h-4 mr-1.5" />
          角色库
        </Button>

        {/* 风格选择器 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-purple-300/70">
            <Palette className={cn("w-4 h-4", novelTheme.icon.purpleLight)} />
            <span className="hidden sm:inline">默认风格:</span>
          </div>
          <div className="w-64">
            <StyleSelector
              value={getSafeConfig(timeline.config).default_comic_style_id}
              onValueChange={handleStyleChange}
              allowUnset={true}
              unsetLabel="未设置"
              placeholder="选择默认风格"
              disabled={updateStyle.isPending}
              className={cn(novelTheme.select.trigger)}
            />
          </div>
        </div>
      </div>

      {!timeline.project_id && (timeline.candidate_projects?.length ?? 0) > 0 && (
        <ProjectLinkBanner
          timelineId={timelineId}
          candidates={timeline.candidate_projects ?? []}
        />
      )}

      <div className="flex-1 overflow-hidden min-h-0">
        <InfiniteCanvasView
          timeline={timeline}
          windowState={windowState}
          chapterSummaries={chapterSummaries}
          onRefresh={refresh}
          onNavigate={navigateTo}
          onPrev={navigatePrev}
          onNext={navigateNext}
          onJumpFirst={jumpToFirst}
          onJumpLast={jumpToLast}
          isLoading={isLoading}
        />
      </div>

      {/* 角色库抽屉 */}
      <CharacterLibraryDrawer
        open={characterLibraryOpen}
        onOpenChange={setCharacterLibraryOpen}
        novelProjectId={timeline.novel_project_id}
        timelineId={timelineId}
      />

      {/* 图片库弹窗 */}
      <ImageGalleryDialog
        projectId={timeline.novel_project_id}
        open={imageGalleryOpen}
        onOpenChange={setImageGalleryOpen}
      />
    </div>
  );
}
