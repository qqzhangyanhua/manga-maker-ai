/**
 * 多镜生成对话框
 * 选择多个分镜，一次性生成包含多格的图片
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Image as ImageIcon, X, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReferenceImageSelector } from "./ReferenceImageSelector";
import type { Panel } from "../types/script-editor.types";

interface ReferenceImage {
  id: string;
  url: string;
  label: string;
  source: string;
}

const STYLE_OPTIONS = [
  { id: "manga_bw", label: "日漫黑白 (Manga B&W)", value: "Japanese Manga style, black and white, high contrast, screentones" },
  { id: "manga_color", label: "日漫彩色 (Manga Color)", value: "Japanese Manga style, full color, vibrant" },
  { id: "webtoon", label: "韩漫 (Webtoon)", value: "Webtoon style, vertical scrolling format aesthetics, digital color, clean lines" },
  { id: "american", label: "美漫 (American Comic)", value: "American Comic Book style, bold lines, dynamic coloring, western comics" },
  { id: "sketch", label: "素描 (Sketch)", value: "Rough sketch style, pencil lines, loose, artistic" },
  { id: "realistic", label: "写实 (Realistic)", value: "Realistic style, detailed shading, cinematic lighting" },
  { id: "watercolor", label: "水彩 (Watercolor)", value: "Watercolor style, soft edges, artistic, painterly" },
];

interface MultiPanelGenerateDialogProps {
  open: boolean;
  panels: Panel[];
  storyId?: string; // 故事 ID
  onOpenChange: (open: boolean) => void;
  onSuccess?: (imageUrl: string, panelIds: string[]) => void;
}

export function MultiPanelGenerateDialog({
  open,
  panels,
  storyId,
  onOpenChange,
  onSuccess,
}: MultiPanelGenerateDialogProps) {
  const { toast } = useToast();
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [referenceSelectorOpen, setReferenceSelectorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取选中的分镜（按 panel_order 排序）
  const selectedPanels = selectedPanelIds
    .map((id) => panels.find((p) => p.id === id))
    .filter((p): p is Panel => p !== undefined)
    .sort((a, b) => a.panel_order - b.panel_order);

  // 计算布局信息
  const count = selectedPanels.length;
  let layoutDesc = "";
  if (count === 2) layoutDesc = "2格横排";
  else if (count === 3) layoutDesc = "3格横排";
  else if (count === 4) layoutDesc = "2×2网格";
  else if (count === 5) layoutDesc = "2×3网格（5格）";
  else if (count === 6) layoutDesc = "2×3网格";

  const canGenerate = count >= 2 && count <= 6;

  // 重置状态
  useEffect(() => {
    if (open) {
      setSelectedPanelIds([]);
      setReferenceImages([]);
      setSelectedStyle("");
      setIsGenerating(false);
      setProgress(0);
      setGeneratedImageUrl(null);
      setError(null);
    }
  }, [open]);

  // 参考图选择确认
  function handleReferenceConfirm(images: ReferenceImage[]): void {
    setReferenceImages(images);
    toast({
      title: "已选择参考图",
      description: `已添加 ${images.length} 张参考图`,
    });
  }

  // 移除参考图
  function removeReferenceImage(id: string): void {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
  }

  // 切换选中状态
  function togglePanel(panelId: string): void {
    setSelectedPanelIds((prev) =>
      prev.includes(panelId)
        ? prev.filter((id) => id !== panelId)
        : [...prev, panelId]
    );
  }

  // 全选/取消全选
  function toggleAll(): void {
    if (selectedPanelIds.length === panels.length) {
      setSelectedPanelIds([]);
    } else {
      setSelectedPanelIds(panels.map((p) => p.id));
    }
  }

  // 开始生成
  async function handleGenerate(): Promise<void> {
    if (!canGenerate) {
      toast({
        title: "选择错误",
        description: "请选择 2-6 个分镜",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setError(null);

    try {
      // 调用多镜生成 API
      const response = await fetch("/api/panel/generate-multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: selectedPanelIds,
          reference_image_urls: referenceImages.map(img => img.url),
          style: selectedStyle ? STYLE_OPTIONS.find(s => s.id === selectedStyle)?.value : undefined,
        }),
      });

      setProgress(50);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "生成失败");
      }

      const data = await response.json();
      setProgress(100);
      setGeneratedImageUrl(data.image_url);

      toast({
        title: "生成成功",
        description: `已生成包含 ${count} 个分镜的多格图片`,
      });

      onSuccess?.(data.image_url, selectedPanelIds);
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      setError(message);
      toast({
        title: "生成失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            多镜生成
          </DialogTitle>
          <DialogDescription>
            选择 2-6 个分镜，AI 将一次性生成包含多格的图片
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 选择提示 */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
            <span className="text-sm">
              已选中 <strong>{count}</strong> 个分镜
              {canGenerate && ` - 将生成 ${layoutDesc}`}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedPanelIds.length === panels.length ? "取消全选" : "全选"}
            </Button>
          </div>

          {/* 风格选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">生成风格 (可选)</label>
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="选择生成风格 (默认 AI 自动决定)" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认 (AI 自动决定)</SelectItem>
                {STYLE_OPTIONS.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 参考图选择 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">参考图 (可选)</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReferenceSelectorOpen(true)}
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                选择参考图
              </Button>
            </div>

            {/* 已选择的参考图 */}
            {referenceImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 p-3 border rounded-lg bg-muted/20">
                {referenceImages.map(img => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.url}
                      alt={img.label}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeReferenceImage(img.id)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-center mt-1 truncate">{img.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 分镜列表 */}
          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            {panels.map((panel) => {
              const isSelected = selectedPanelIds.includes(panel.id);
              const hasPrompt = !!(panel.visual_prompt || panel.prompt_used || panel.description);

              return (
                <div
                  key={panel.id}
                  onClick={() => togglePanel(panel.id)}
                  className={`
                    relative border rounded-lg p-3 cursor-pointer transition-all
                    ${isSelected ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:border-primary/50"}
                    ${!hasPrompt ? "opacity-50" : ""}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePanel(panel.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          分镜 #{panel.panel_order}
                        </span>
                        {!hasPrompt && (
                          <span className="text-xs text-destructive">无提示词</span>
                        )}
                      </div>
                      {panel.generated_image ? (
                        <img
                          src={panel.generated_image}
                          alt={`Panel ${panel.panel_order}`}
                          className="w-full h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">未生成</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {panel.visual_prompt || panel.prompt_used || panel.description || "无描述"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 生成进度 */}
          {isGenerating && (
            <div className="border rounded-lg p-4 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">AI 生成中...</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                正在将 {count} 个分镜的描述合并为多格图片...
              </p>
            </div>
          )}

          {/* 生成结果 */}
          {generatedImageUrl && !isGenerating && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20 space-y-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">生成完成</span>
              </div>
              <img
                src={generatedImageUrl}
                alt="Generated multi-panel"
                className="w-full border rounded"
              />
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="border border-destructive rounded-lg p-4 bg-destructive/5 space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">生成失败</span>
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {/* 无提示词警告 */}
          {count > 0 && selectedPanels.some(p => !(p.visual_prompt || p.prompt_used || p.description)) && (
            <div className="border border-yellow-500 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-950/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ 部分选中的分镜缺少提示词，建议先编辑分镜添加描述后再生成
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {generatedImageUrl ? (
            <Button onClick={() => onOpenChange(false)}>关闭</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
              >
                取消
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成多格图片
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>

        {/* 参考图选择对话框 */}
        <ReferenceImageSelector
          open={referenceSelectorOpen}
          storyId={storyId}
          panels={panels}
          onOpenChange={setReferenceSelectorOpen}
          onConfirm={handleReferenceConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
