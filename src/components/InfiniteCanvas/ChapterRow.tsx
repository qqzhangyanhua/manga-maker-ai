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
  onGenerateScenes: () => void;
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
}) => (
  <div
    className={cn(
      "flex flex-col items-center p-3 rounded-lg border min-w-[120px]",
      "bg-gray-800/50 border-gray-700",
      status === "completed" && "border-green-600/50",
      status === "generating" && "border-purple-600/50",
      status === "error" && "border-red-600/50"
    )}
  >
    <div className="flex items-center gap-2 mb-2">
      <StatusIcon status={status} />
      <span className="text-sm font-medium text-gray-200">{title}</span>
    </div>
    <div className="text-xs text-gray-400 mb-2">
      {count > 0 ? `${count} 个` : "未生成"}
    </div>
    <div className="flex gap-1">
      {status === "pending" || status === "error" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onGenerate}
          disabled={disabled}
          className="h-7 px-2"
        >
          <Play className="w-3 h-3 mr-1" />
          生成
        </Button>
      ) : status === "completed" && onEdit ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="h-7 px-2"
        >
          <Edit2 className="w-3 h-3 mr-1" />
          编辑
        </Button>
      ) : null}
    </div>
  </div>
);

export function ChapterRow({
  chapter,
  chapterContent,
  onGenerateScript,
  onGenerateShots,
  onGenerateScenes,
  onGenerateFinals,
}: ChapterRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-b border-gray-700 py-4">
      {/* Chapter Header */}
      <div
        className="flex items-center gap-4 cursor-pointer mb-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
          {chapter.chapter_number}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-white">
            第 {chapter.chapter_number} 章
          </h3>
          <p className="text-sm text-gray-400">
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
          <div className="text-gray-500">→</div>

          {/* Shots Node */}
          <NodeCard
            title="镜头"
            status={chapter.shot_status}
            count={chapter.shot_count}
            onGenerate={onGenerateShots}
            disabled={chapter.script_status !== "completed"}
          />

          {/* Arrow */}
          <div className="text-gray-500">→</div>

          {/* Scene Images Node */}
          <NodeCard
            title="场景图"
            status={chapter.scene_status}
            count={chapter.scene_image_count}
            onGenerate={onGenerateScenes}
            disabled={chapter.shot_status !== "completed"}
          />

          {/* Arrow */}
          <div className="text-gray-500">→</div>

          {/* Final Images Node */}
          <NodeCard
            title="漫画图"
            status={chapter.final_status}
            count={chapter.final_image_count}
            onGenerate={onGenerateFinals}
            disabled={chapter.scene_status !== "completed"}
          />
        </div>
      )}
    </div>
  );
}
