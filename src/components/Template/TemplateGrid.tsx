"use client";

import { TemplateCard } from "./TemplateCard";
import { TemplateWithMeta } from "@/types/template";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TemplateGridProps {
  templates: Array<TemplateWithMeta & {
    user?: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }>;
  isLoading?: boolean;
  likedTemplateIds?: Set<string>;
  onLike?: (templateId: string, isLiked: boolean) => void;
  onApply?: (templateId: string) => void;
  emptyMessage?: string;
  targetCharacters?: number | null;
  onClearFilters?: () => void;
}

export function TemplateGrid({
  templates,
  isLoading = false,
  likedTemplateIds = new Set(),
  onLike,
  onApply,
  emptyMessage = "暂无模板",
  targetCharacters = null,
  onClearFilters
}: TemplateGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <p className="text-zinc-400">{emptyMessage}</p>
        {onClearFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            清除筛选 (Clear Filters)
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isLiked={likedTemplateIds.has(template.id)}
          onLike={onLike}
          onApply={onApply}
          targetCharacters={targetCharacters}
        />
      ))}
    </div>
  );
}
