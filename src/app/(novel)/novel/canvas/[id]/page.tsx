"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineContainer } from "@/components/InfiniteCanvas";
import type { CanvasTimeline } from "@/components/InfiniteCanvas";

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const [timeline, setTimeline] = useState<CanvasTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      const response = await fetch(`/api/canvas/timeline/${params.id}`);
      if (!response.ok) {
        throw new Error("获取时间线失败");
      }
      const data = await response.json();
      setTimeline(data.timeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f0f13]">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-purple-500/20 animate-pulse"></div>
        </div>
        <p className="mt-4 text-zinc-400 text-sm animate-pulse">加载时间线中...</p>
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f0f13] text-white space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center border border-red-900/50">
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">出错了</h2>
          <p className="text-red-400 text-sm">{error || "时间线不存在"}</p>
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
    <div className="h-screen bg-[#0f0f13] flex flex-col text-zinc-100">
      {/* Navigation */}
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
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <TimelineContainer timeline={timeline} onRefresh={fetchTimeline} />
      </div>
    </div>
  );
}
