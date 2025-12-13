"use client";

import { TemplateCard } from "./TemplateCard";
import { TemplateWithMeta } from "@/types/template";
import { Loader2 } from "lucide-react";

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
}

export function TemplateGrid({
  templates,
  isLoading = false,
  likedTemplateIds = new Set(),
  onLike,
  onApply,
  emptyMessage = "暂无模板",
  targetCharacters = null
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
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
