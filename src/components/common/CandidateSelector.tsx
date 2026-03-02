"use client";

import { useState, useCallback } from "react";
import { Check, Undo2, ZoomIn, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface CandidateImage {
  id: string;
  url: string;
  seed?: number;
  metadata?: Record<string, unknown>;
}

interface CandidateSelectorProps {
  candidates: CandidateImage[];
  currentImageUrl?: string | null;
  isGenerating?: boolean;
  onSelect: (candidate: CandidateImage) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  className?: string;
}

export function CandidateSelector({
  candidates,
  currentImageUrl,
  isGenerating = false,
  onSelect,
  onUndo,
  canUndo = false,
  className,
}: CandidateSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSelect = useCallback(
    (candidate: CandidateImage) => {
      setSelectedId(candidate.id);
      onSelect(candidate);
    },
    [onSelect]
  );

  const handlePreview = useCallback((url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(url);
  }, []);

  if (candidates.length === 0 && !isGenerating) return null;

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {/* Candidate thumbnail strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Current image */}
          {currentImageUrl && (
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-lg border-2 border-zinc-600 overflow-hidden opacity-60">
                <img
                  src={currentImageUrl}
                  alt="当前图片"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 whitespace-nowrap">
                当前
              </span>
            </div>
          )}

          {currentImageUrl && candidates.length > 0 && (
            <div className="w-px h-12 bg-zinc-700 flex-shrink-0" />
          )}

          {/* Candidate images */}
          {candidates.map((candidate, index) => (
            <div
              key={candidate.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(candidate)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(candidate);
                }
              }}
              className={cn(
                "group relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer",
                selectedId === candidate.id
                  ? "border-orange-500 ring-2 ring-orange-500/30 scale-105"
                  : "border-zinc-700 hover:border-zinc-500"
              )}
            >
              <img
                src={candidate.url}
                alt={`候选 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {selectedId === candidate.id && (
                <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white drop-shadow-md" />
                </div>
              )}
              {/* Preview button - separate from parent to avoid nested button */}
              <button
                type="button"
                onClick={(e) => handlePreview(candidate.url, e)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              >
                <ZoomIn className="w-3 h-3 text-white" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-white bg-black/50 py-0.5">
                {index + 1}
              </span>
            </div>
          ))}

          {/* Generating placeholder */}
          {isGenerating && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-zinc-600 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {candidates.length} 个候选 · 点击选择最佳图片
          </span>
          {canUndo && onUndo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              className="text-zinc-400 hover:text-white h-7 px-2"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1" />
              撤销
            </Button>
          )}
        </div>
      </div>

      {/* Full-screen preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 p-2">
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="预览"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
