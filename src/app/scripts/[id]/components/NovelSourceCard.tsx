/**
 * NovelSourceCard - 小说来源信息卡片
 * 在 Story 详情页显示来源小说信息和快捷操作
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, ArrowRight } from "lucide-react";
import type { SourceNovelInfo } from "../types/script-editor.types";

interface NovelSourceCardProps {
  sourceNovel: SourceNovelInfo | null;
  sourceNovelId: string | null;
  storyId: string;
}

export function NovelSourceCard({
  sourceNovel,
  sourceNovelId,
  storyId,
}: NovelSourceCardProps) {
  const router = useRouter();

  // 不显示卡片的情况：原创 Story（无来源）
  if (!sourceNovelId) {
    return null;
  }

  // 小说已删除的情况
  if (!sourceNovel) {
    return (
      <GlassCard className="mb-6 p-4 border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-500">来源小说已删除</span>
        </div>
      </GlassCard>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleContinueConvert = () => {
    router.push(`/novel/${sourceNovel.id}`);
  };

  return (
    <GlassCard className="mb-6 p-4 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors group">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-300">改编自小说</span>
          </div>

          <div className="flex flex-col min-w-0">
            <Link
              href={`/novel/${sourceNovel.id}`}
              className="font-medium text-blue-100 hover:text-white transition-colors truncate flex items-center gap-2 group-hover:underline decoration-blue-500/30 underline-offset-4"
            >
              {sourceNovel.title}
              <ExternalLink className="w-3 h-3 opacity-50" />
            </Link>
            <span className="text-[10px] text-blue-400/60 truncate">
              转换时间: {formatDate(sourceNovel.created_at)}
            </span>
          </div>
        </div>

        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-500/20 shrink-0"
          onClick={handleContinueConvert}
        >
          继续转换
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </GlassCard>
  );
}
