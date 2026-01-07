/**
 * NovelSourceCard - 小说来源信息卡片
 * 在 Story 详情页显示来源小说信息和快捷操作
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, Plus } from "lucide-react";
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
      <Card className="bg-gray-500/5 border-gray-500/20">
        <CardContent className="flex items-center gap-4 py-3 px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">改编自小说</span>
          </div>
          <span className="text-sm text-gray-500">（原小说已删除）</span>
        </CardContent>
      </Card>
    );
  }

  // 正常显示
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleContinueConvert = () => {
    // 跳转到小说页面
    router.push(`/novel/${sourceNovel.id}`);
  };

  return (
    <Card className="bg-blue-500/5 border-blue-500/20">
      <CardContent className="flex items-center gap-4 py-3 px-4">
        {/* 左侧：来源标识 */}
        <div className="flex items-center gap-2 min-w-[100px]">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-300">改编自小说</span>
        </div>

        {/* 中间：小说信息 */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/novel/${sourceNovel.id}`}
            className="font-medium text-white hover:text-blue-300 transition-colors truncate block"
          >
            {sourceNovel.title}
          </Link>
          <p className="text-xs text-gray-400">
            转换于 {formatDate(sourceNovel.created_at)}
          </p>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            asChild
          >
            <Link href={`/novel/${sourceNovel.id}`}>
              <ExternalLink className="w-3.5 h-3.5" />
              查看原小说
            </Link>
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            onClick={handleContinueConvert}
          >
            <Plus className="w-3.5 h-3.5" />
            继续转换章节
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
