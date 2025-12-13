"use client";

import { useState, useEffect } from "react";
import { Copy, X, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SampleProject } from "../types";
import { CATEGORY_LABELS, GENRE_LABELS } from "../types";

interface PanelData {
  id: string;
  panel_order: number;
  description: string;
  dialogue: string | null;
  generated_image: string | null;
}

interface SamplePreviewDialogProps {
  sample: SampleProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (id: string) => void;
  copying: boolean;
}

export function SamplePreviewDialog({
  sample,
  open,
  onOpenChange,
  onCopy,
  copying,
}: SamplePreviewDialogProps) {
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (sample && open) {
      fetchPanels(sample.id);
      setCurrentIndex(0);
    }
  }, [sample, open]);

  const fetchPanels = async (storyId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/story/${storyId}/panels`);
      if (res.ok) {
        const data = await res.json();
        setPanels(data.panels || []);
      }
    } catch (err) {
      console.error("Failed to fetch panels:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : panels.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < panels.length - 1 ? prev + 1 : 0));
  };

  if (!sample) return null;

  const currentPanel = panels[currentIndex];
  const categoryLabel = CATEGORY_LABELS[sample.category] || sample.category;
  const genreLabel = GENRE_LABELS[sample.genre] || sample.genre;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {sample.title}
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {genreLabel}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {categoryLabel}
              </span>
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">{sample.premise}</p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : panels.length > 0 ? (
            <div className="space-y-4">
              {/* Panel Display */}
              <div className="relative aspect-square max-h-[400px] mx-auto bg-muted rounded-lg overflow-hidden">
                {currentPanel?.generated_image ? (
                  <img
                    src={currentPanel.generated_image}
                    alt={`Panel ${currentIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layers className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}

                {/* Navigation Arrows */}
                {panels.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Panel Indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-sm">
                  {currentIndex + 1} / {panels.length}
                </div>
              </div>

              {/* Panel Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-foreground">
                  第 {currentIndex + 1} 格
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentPanel?.description}
                </p>
                {currentPanel?.dialogue && (
                  <div className="text-sm italic text-foreground border-l-2 border-primary pl-3">
                    "{currentPanel.dialogue}"
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {panels.map((panel, index) => (
                  <button
                    key={panel.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentIndex
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/50"
                    }`}
                  >
                    {panel.generated_image ? (
                      <img
                        src={panel.generated_image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          {index + 1}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              暂无分镜数据
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button
            variant="comic"
            onClick={() => onCopy(sample.id)}
            disabled={copying}
          >
            <Copy className="w-4 h-4 mr-1" />
            {copying ? "复制中..." : "复制到我的账号"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
