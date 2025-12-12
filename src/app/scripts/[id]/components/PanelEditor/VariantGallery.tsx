/**
 * Variant Gallery Component
 * Display and select from generated panel variants
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VariantGalleryProps {
  open: boolean;
  panelId: string;
  taskIds: string[];
  onOpenChange: (open: boolean) => void;
  onVariantSelected: () => void;
}

interface VariantImage {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
  progress: number;
}

export function VariantGallery({
  open,
  panelId,
  taskIds,
  onOpenChange,
  onVariantSelected,
}: VariantGalleryProps) {
  const { toast } = useToast();
  const [variants, setVariants] = useState<VariantImage[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Poll for variant status
  useEffect(() => {
    if (!open || taskIds.length === 0) return;

    // Initialize variants
    setVariants(
      taskIds.map((taskId) => ({
        taskId,
        status: "pending",
        progress: 0,
      }))
    );

    // Poll every 2 seconds
    const interval = setInterval(async () => {
      const updatedVariants = await Promise.all(
        taskIds.map(async (taskId) => {
          try {
            const response = await fetch(
              `/api/image-generation/status?task_id=${taskId}`
            );
            const data = await response.json();

            return {
              taskId,
              status: data.status || "pending",
              imageUrl: data.imageUrl,
              error: data.error,
              progress: data.progress || 0,
            };
          } catch (error) {
            return {
              taskId,
              status: "failed" as const,
              error: "Failed to fetch status",
              progress: 0,
            };
          }
        })
      );

      setVariants(updatedVariants);

      // Stop polling if all completed or failed
      const allDone = updatedVariants.every(
        (v) => v.status === "completed" || v.status === "failed"
      );
      if (allDone) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, taskIds]);

  async function handleSelectVariant(taskId: string): Promise<void> {
    try {
      setIsSelecting(true);
      setSelectedTaskId(taskId);

      const response = await fetch(
        `/api/panel/variants/${taskId}/select`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ panel_id: panelId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "选择变体失败");
      }

      toast({ title: "变体已选择", description: "分镜图片已更新" });
      onVariantSelected();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "选择失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSelecting(false);
      setSelectedTaskId(null);
    }
  }

  const completedCount = variants.filter((v) => v.status === "completed").length;
  const totalCount = variants.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            选择变体
          </DialogTitle>
          <DialogDescription>
            已生成 {completedCount}/{totalCount} 个变体，点击选择作为主图
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {variants.map((variant) => (
            <div
              key={variant.taskId}
              className="relative border rounded-lg overflow-hidden bg-muted/50"
            >
              {/* Image or Loading State */}
              <div className="aspect-[4/3] relative">
                {variant.status === "completed" && variant.imageUrl ? (
                  <img
                    src={variant.imageUrl}
                    alt="Variant"
                    className="w-full h-full object-cover"
                  />
                ) : variant.status === "failed" ? (
                  <div className="w-full h-full flex items-center justify-center text-destructive">
                    <div className="text-center p-4">
                      <p className="text-sm font-medium">生成失败</p>
                      {variant.error && (
                        <p className="text-xs mt-1">{variant.error}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {variant.progress}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  {variant.status === "completed" && (
                    <Badge variant="default" className="bg-green-600">
                      完成
                    </Badge>
                  )}
                  {variant.status === "processing" && (
                    <Badge variant="secondary">生成中</Badge>
                  )}
                  {variant.status === "pending" && (
                    <Badge variant="outline">等待中</Badge>
                  )}
                  {variant.status === "failed" && (
                    <Badge variant="destructive">失败</Badge>
                  )}
                </div>
              </div>

              {/* Select Button */}
              {variant.status === "completed" && variant.imageUrl && (
                <div className="p-2">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleSelectVariant(variant.taskId)}
                    disabled={isSelecting}
                  >
                    {isSelecting && selectedTaskId === variant.taskId ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        选择中...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        选择此变体
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress Summary */}
        {completedCount < totalCount && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在生成变体... ({completedCount}/{totalCount})
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
