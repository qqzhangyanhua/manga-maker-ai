"use client";

import { Copy, Layers, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SampleProject } from "../types";
import { CATEGORY_LABELS, CATEGORY_COLORS, GENRE_LABELS } from "../types";

interface SampleCardProps {
  sample: SampleProject;
  onCopy: (id: string) => void;
  onPreview: (id: string) => void;
  copying: boolean;
}

export function SampleCard({ sample, onCopy, onPreview, copying }: SampleCardProps) {
  const categoryLabel = CATEGORY_LABELS[sample.category] || sample.category;
  const categoryColor = CATEGORY_COLORS[sample.category] || CATEGORY_COLORS.beginner;
  const genreLabel = GENRE_LABELS[sample.genre] || sample.genre;

  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors">
      {/* Cover Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {sample.coverImage ? (
          <img
            src={sample.coverImage}
            alt={sample.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <Layers className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Category Badge */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium border ${categoryColor}`}>
          {categoryLabel}
        </div>

        {/* Panel Count */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
          {sample.panelCount} 格
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground line-clamp-1">
              {sample.title}
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {genreLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {sample.premise}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onPreview(sample.id)}
          >
            <Eye className="w-4 h-4 mr-1" />
            预览
          </Button>
          <Button
            variant="comic"
            size="sm"
            className="flex-1"
            onClick={() => onCopy(sample.id)}
            disabled={copying}
          >
            <Copy className="w-4 h-4 mr-1" />
            {copying ? "复制中..." : "复制到我的"}
          </Button>
        </div>
      </div>
    </div>
  );
}
