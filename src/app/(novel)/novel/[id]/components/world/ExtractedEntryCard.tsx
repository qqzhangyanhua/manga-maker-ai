/**
 * 提取条目卡片组件
 * 显示 AI 提取的单个条目，支持选择/取消选择
 */
"use client";

import { useState } from "react";
import {
  MapPin,
  User,
  Calendar,
  Package,
  BookOpen,
  Eye,
  Check,
  AlertTriangle,
  Quote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ExtractedEntry, EntryType, ENTRY_TYPE_CONFIG } from "../../types/world";

const ENTRY_ICONS: Record<EntryType, React.ComponentType<{ className?: string }>> = {
  location: MapPin,
  character: User,
  event: Calendar,
  item: Package,
  rule: BookOpen,
  foreshadowing: Eye,
};

interface ExtractedEntryCardProps {
  entry: ExtractedEntry;
  chapterId: number;
  isDuplicate: boolean;
  similarEntryName?: string;
  isSelected: boolean;
  onToggleSelect: (selected: boolean) => void;
}

export function ExtractedEntryCard({
  entry,
  chapterId,
  isDuplicate,
  similarEntryName,
  isSelected,
  onToggleSelect,
}: ExtractedEntryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const config = ENTRY_TYPE_CONFIG[entry.type];
  const Icon = ENTRY_ICONS[entry.type];

  const confidenceColor =
    entry.confidence >= 0.8
      ? "text-green-600"
      : entry.confidence >= 0.6
        ? "text-yellow-600"
        : "text-red-600";

  const confidenceLabel =
    entry.confidence >= 0.8
      ? "高"
      : entry.confidence >= 0.6
        ? "中"
        : "低";

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all",
        isSelected && "ring-2 ring-primary",
        isDuplicate && "opacity-60"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              onToggleSelect(checked === true);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn("gap-1", config.color)}>
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>

              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className={cn("gap-1", confidenceColor)}>
                    <Check className="h-3 w-3" />
                    {confidenceLabel}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  置信度: {Math.round(entry.confidence * 100)}%
                </TooltipContent>
              </Tooltip>

              <Badge variant="outline" className="text-xs">
                第 {chapterId} 章
              </Badge>

              {isDuplicate && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      重复
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    与现有条目 &quot;{similarEntryName}&quot; 相似
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <h4 className="font-medium truncate">{entry.name}</h4>

            <p className={cn("text-sm text-muted-foreground mt-1", !expanded && "line-clamp-2")}>
              {entry.description}
            </p>

            {expanded && (
              <div className="mt-3 space-y-2">
                {Object.entries(entry.properties).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(entry.properties).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                )}

                {entry.source_text && (
                  <div className="bg-muted/50 rounded p-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Quote className="h-3 w-3" />
                      原文引用
                    </div>
                    <p className="italic line-clamp-3">{entry.source_text}</p>
                  </div>
                )}

                {entry.type === "foreshadowing" && entry.hint_text && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 rounded p-2 text-xs">
                    <div className="text-orange-600 dark:text-orange-400 mb-1">
                      伏笔线索
                    </div>
                    <p>{entry.hint_text}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExtractedEntryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded bg-muted animate-pulse" />
              <div className="h-5 w-12 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
