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
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-red-400 mb-4">{error || "时间线不存在"}</p>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Navigation */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
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
