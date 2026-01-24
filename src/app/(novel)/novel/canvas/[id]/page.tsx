"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Palette, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfiniteCanvasView } from "../../components/InfiniteCanvas";
import { useTimelineWindow } from "@/hooks/useTimelineWindow";
import { StyleSelector } from "@/components/StyleSelector";
import { useUpdateTimelineStyle, getSafeConfig } from "@/hooks/useTimelineConfig";
import { useToast } from "@/hooks/use-toast";
import { ImageGalleryDialog } from "../../components/ImageGallery";
import { CanvasSkeleton } from "./components/CanvasSkeleton";
import { ErrorState } from "./components/ErrorState";
import { novelTheme } from "../../theme";
import "../../novel-theme.css";

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const [imageGalleryOpen, setImageGalleryOpen] = useState(false);
  const { toast } = useToast();

  const timelineId = params.id as string;

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
          toast({
            title: "风格设置成功",
            description: styleId ? "默认漫画风格已更新" : "已取消设置默认风格",
          });
          // invalidateQueries 会自动刷新数据，不需要手动调用 refresh
        },
        onError: (error) => {
          toast({
            title: "风格设置失败",
            description: error instanceof Error ? error.message : "未知错误",
            variant: "destructive",
          });
        },
      });
    },
    [updateStyle, toast]
  );

  // ✅ 删除所有包装函数，直接使用 Hook 提供的方法

  // ✅ 使用骨架屏替代全屏 Loading，避免布局抖动
  if (isLoading) {
    return <CanvasSkeleton />;
  }

  // ✅ 增强错误处理：添加重试按钮，区分错误类型
  if (isError || !timeline) {
    const isNotFound = error?.message?.includes("不存在") || !timeline;

    return (
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
    );
  }

  return (
    <div className="h-screen bg-[#0f0f13] flex flex-col text-zinc-100 novel-theme-scope">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800 bg-[#0f0f13]/80 backdrop-blur-md sticky top-0 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>

        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">{timeline.title}</h1>
          <p className="text-xs text-zinc-500">无限画布 - 可缩放拖拽</p>
        </div>

        {/* 风格选择器 */}
        <div className="flex items-center gap-3">
          {/* 查看图片按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImageGalleryOpen(true)}
            className="border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
          >
            <Images className="w-4 h-4 mr-1" />
            查看图片
          </Button>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Palette className="w-4 h-4" />
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
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
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

      {/* 图片管理弹窗 */}
      {timeline.novel_project_id && (
        <ImageGalleryDialog
          projectId={timeline.novel_project_id}
          open={imageGalleryOpen}
          onOpenChange={setImageGalleryOpen}
        />
      )}
    </div>
  );
}
