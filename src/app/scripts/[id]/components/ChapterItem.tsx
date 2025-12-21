/**
 * Chapter Item Component - Individual chapter in the list
 */

"use client";

import { useState } from "react";
import {
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  Star,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CharacterStatePanel } from "./CharacterStatePanel";
import type { Chapter } from "../types/script-editor.types";

interface ChapterItemProps {
  chapter: Chapter;
  isSelected: boolean;
  isExpanded: boolean;
  expandingContent: string | null;
  analyzingStates: string | null;
  togglingKeyChapter: string | null;
  onSelect: () => void;
  onToggleExpansion: () => void;
  onExpandContent: () => void;
  onAnalyzeStates: () => void;
  onToggleKeyChapter: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ChapterItem({
  chapter,
  isSelected,
  isExpanded,
  expandingContent,
  analyzingStates,
  togglingKeyChapter,
  onSelect,
  onToggleExpansion,
  onExpandContent,
  onAnalyzeStates,
  onToggleKeyChapter,
  onEdit,
  onDelete,
}: ChapterItemProps) {
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpansion}>
      <div
        className={`
          group rounded-lg border transition-colors
          ${isSelected ? "bg-accent border-primary" : ""}
        `}
      >
        {/* Chapter header */}
        <div
          className="flex items-start gap-2 p-3 cursor-pointer hover:bg-accent/50"
          onClick={onSelect}
        >
          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium truncate">{chapter.title}</div>
              {/* Status badges */}
              {chapter.content ? (
                <Badge variant="default" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  已扩展
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  仅梗概
                </Badge>
              )}
              {chapter.is_key_chapter && (
                <Badge variant="destructive" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  关键
                </Badge>
              )}
              {/* Loading badges */}
              {expandingContent === chapter.id && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  生成中
                </Badge>
              )}
              {analyzingStates === chapter.id && (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  分析中
                </Badge>
              )}
            </div>
            {chapter.summary && (
              <div className="text-xs text-muted-foreground truncate mt-1">
                {chapter.summary.slice(0, 60)}...
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!chapter.content && (
                <>
                  <DropdownMenuItem
                    onClick={onExpandContent}
                    disabled={expandingContent === chapter.id}
                  >
                    {expandingContent === chapter.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    生成详细内容
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={onAnalyzeStates}
                disabled={analyzingStates === chapter.id || !chapter.content}
              >
                {analyzingStates === chapter.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                分析角色状态
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onToggleKeyChapter}
                disabled={togglingKeyChapter === chapter.id}
              >
                {togglingKeyChapter === chapter.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Star className="w-4 h-4 mr-2" />
                )}
                {chapter.is_key_chapter ? "取消关键标记" : "标为关键章节"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapsible content area */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-2 text-xs border-t">
            {chapter.content && (
              <div className="p-2 bg-muted rounded text-muted-foreground">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">详细内容预览:</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                  >
                    {isContentExpanded ? "收起" : "展开"}
                  </Button>
                </div>
                <div className={isContentExpanded ? "" : "line-clamp-3"}>
                  {chapter.content}
                </div>
              </div>
            )}
            {chapter.is_key_chapter && chapter.key_chapter_reason && (
              <div className="p-2 bg-destructive/10 rounded text-destructive-foreground">
                <div className="font-medium mb-1">关键原因:</div>
                <div>{chapter.key_chapter_reason}</div>
              </div>
            )}
            {/* Character states panel */}
            <CharacterStatePanel chapterId={chapter.id} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
