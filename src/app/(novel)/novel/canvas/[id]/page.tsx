"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfiniteCanvasView } from "../../components/InfiniteCanvas";
import { useTimelineWindow } from "@/hooks/useTimelineWindow";
import { StyleSelector } from "@/components/StyleSelector";
import { useUpdateTimelineStyle, getSafeConfig } from "@/hooks/useTimelineConfig";
import { useToast } from "@/hooks/use-toast";
import { novelTheme } from "../../theme";
import "../../novel-theme.css";

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const [windowCenter, setWindowCenter] = useState(1);
  const { toast } = useToast();

  const timelineId = params.id as string;

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
  } = useTimelineWindow({
    timelineId,
    initialCenter: windowCenter,
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

  const handleNavigate = useCallback(
    (chapterNumber: number) => {
      setWindowCenter(chapterNumber);
      navigateTo(chapterNumber);
    },
    [navigateTo]
  );

  const handlePrev = useCallback(() => {
    if (windowState && windowState.center > 1) {
      setWindowCenter(windowState.center - 1);
      navigatePrev();
    }
  }, [windowState, navigatePrev]);

  const handleNext = useCallback(() => {
    if (windowState && windowState.center < windowState.total) {
      setWindowCenter(windowState.center + 1);
      navigateNext();
    }
  }, [windowState, navigateNext]);

  const handleJumpFirst = useCallback(() => {
    setWindowCenter(1);
    jumpToFirst();
  }, [jumpToFirst]);

  const handleJumpLast = useCallback(() => {
    if (windowState) {
      setWindowCenter(windowState.total);
      jumpToLast();
    }
  }, [windowState, jumpToLast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f0f13] novel-theme-scope">
        <div className="relative">
          <Loader2 className={`w-12 h-12 ${novelTheme.loading.spinner}`} />
          <div className={`absolute top-0 left-0 w-12 h-12 rounded-full border-4 ${novelTheme.loading.border}`}></div>
        </div>
        <p className="mt-4 text-zinc-400 text-sm animate-pulse">加载时间线中...</p>
      </div>
    );
  }

  if (isError || !timeline) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f0f13] text-white space-y-4 novel-theme-scope">
        <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center border border-red-900/50">
          <span className="text-3xl">!</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">出错了</h2>
          <p className="text-red-400 text-sm">{error?.message || "时间线不存在"}</p>
        </div>
        <Button
          onClick={() => router.back()}
          className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
        >
          返回上一页
        </Button>
      </div>
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
          onNavigate={handleNavigate}
          onPrev={handlePrev}
          onNext={handleNext}
          onJumpFirst={handleJumpFirst}
          onJumpLast={handleJumpLast}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
