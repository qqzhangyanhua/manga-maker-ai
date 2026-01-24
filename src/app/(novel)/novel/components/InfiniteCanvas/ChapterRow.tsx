"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle, AlertCircle, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimelineChapter, GenerationStatus } from "./types";

interface ChapterRowProps {
  chapter: TimelineChapter;
  chapterContent?: string;
  onGenerateScript: () => void;
  onGenerateShots: () => void;
  onGenerateFinals: () => void;
}

const StatusIcon = ({ status }: { status: GenerationStatus }) => {
  switch (status) {
    case "generating":
      return <Loader2 className="w-4 h-4 animate-spin text-purple-400" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:
      return <div className="w-4 h-4 rounded-full border border-gray-500" />;
  }
};

const NodeCard = ({
  title,
  status,
  count,
  onGenerate,
  onEdit,
  disabled,
}: {
  title: string;
  status: GenerationStatus;
  count: number;
  onGenerate: () => void;
  onEdit?: () => void;
  disabled?: boolean;
}) => {
  const handleGenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`生成${title}按钮被点击`);
    onGenerate();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`编辑${title}按钮被点击`);
    onEdit?.();
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center p-3 rounded-lg border min-w-[120px]",
        "bg-zinc-900/50 border-zinc-800",
        status === "completed" && "border-green-600/50 bg-green-900/10",
        status === "generating" && "border-purple-600/50 bg-purple-900/10",
        status === "error" && "border-red-600/50 bg-red-900/10"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon status={status} />
        <span className="text-sm font-medium text-zinc-200">{title}</span>
      </div>
      <div className="text-xs text-zinc-400 mb-2">
        {count > 0 ? `${count} 个` : "未生成"}
      </div>
      <div className="flex gap-1">
        {status === "generating" ? (
          <Button
            size="sm"
            variant="outline"
            disabled
            className="h-7 px-2 border-purple-600/50 text-purple-300 bg-purple-900/20 cursor-not-allowed"
          >
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            生成中...
          </Button>
        ) : status === "pending" || status === "error" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateClick}
            disabled={disabled}
            className="h-7 px-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <Play className="w-3 h-3 mr-1" />
            {status === "error" ? "重试" : "生成"}
          </Button>
        ) : status === "completed" && onEdit ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEditClick}
            className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <Edit2 className="w-3 h-3 mr-1" />
            编辑
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export function ChapterRow({
  chapter,
  chapterContent,
  onGenerateScript,
  onGenerateShots,
  onGenerateFinals,
}: ChapterRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-b border-zinc-800 py-4">
      {/* Chapter Header */}
      <div
        className="flex items-center gap-4 cursor-pointer mb-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/20">
          {chapter.chapter_number}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-white">
            第 {chapter.chapter_number} 章
          </h3>
          <p className="text-sm text-zinc-400">
            {chapterContent?.slice(0, 50)}...
          </p>
        </div>
      </div>

      {/* Timeline Nodes */}
      {isExpanded && (
        <div className="flex items-center gap-4 overflow-x-auto pb-2 ml-12">
          {/* Script Node */}
          <NodeCard
            title="剧本"
            status={chapter.script_status}
            count={chapter.script_segment_count}
            onGenerate={onGenerateScript}
          />

          {/* Arrow */}
          <div className="text-zinc-600">→</div>

          {/* Shots Node */}
          <NodeCard
            title="镜头"
            status={chapter.shot_status}
            count={chapter.shot_count}
            onGenerate={onGenerateShots}
            disabled={chapter.script_status !== "completed"}
          />

          {/* Arrow */}
          <div className="text-zinc-600">→</div>

          {/* Final Images Node */}
          <NodeCard
            title="漫画图"
            status={chapter.final_status}
            count={chapter.final_image_count}
            onGenerate={onGenerateFinals}
            disabled={chapter.shot_status !== "completed"}
          />
        </div>
      )}
    </div>
  );
}
