"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Palette, Wand2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string;
  prompt_prefix: string | null;
}

interface CharacterInfo {
  id: string;
  name: string;
  description?: string | null;
  base_prompt?: string | null;
  reference_image?: string | null;
  base_image_url?: string | null;
}

interface RegenerateImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: CharacterInfo | null;
  onSuccess: () => void;
}

export function RegenerateImageDialog({
  open,
  onOpenChange,
  character,
  onSuccess,
}: RegenerateImageDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("__none__");
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);

  // Comic styles
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [stylesLoading, setStylesLoading] = useState(false);

  // Load comic styles
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let ignore = false;

    const fetchStyles = async () => {
      setStylesLoading(true);
      try {
        const response = await fetch("/api/comic-styles", { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          if (!ignore) {
            setStyles(data.data || []);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error fetching comic styles:", error);
        }
      } finally {
        if (!ignore) {
          setStylesLoading(false);
        }
      }
    };

    fetchStyles();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && character) {
      setCustomPrompt(character.base_prompt || character.description || "");
      setSelectedStyleId("__none__");
      setReferenceImageFile(null);
      setReferenceImagePreview(null);
    }
  }, [open, character]);

  // Handle reference image upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReferenceImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImageFile(null);
    setReferenceImagePreview(null);
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!character) return;

    setIsGenerating(true);

    try {
      // If user uploaded a reference image, upload it first
      let uploadedReferenceUrl: string | null = null;
      if (referenceImageFile) {
        const formData = new FormData();
        formData.append("image", referenceImageFile);
        formData.append("character_id", character.id);

        const uploadResponse = await fetch("/api/character/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "上传参考图失败");
        }

        const uploadResult = await uploadResponse.json();
        uploadedReferenceUrl = uploadResult.image_url;
      }

      // Call generate-views API with front view only
      const response = await fetch("/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          view_types: ["front"],
          description: customPrompt.trim() || undefined,
          comic_style_id: selectedStyleId !== "__none__" ? selectedStyleId : undefined,
          // Reference image will be auto-detected by findBestReferenceImage
          // or use the newly uploaded one
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成失败");
      }

      toast({
        title: "正面图生成成功",
        description: "角色正面视图已更新",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Regenerate image error:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "生成角色图片失败",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onOpenChange(false);
    }
  };

  // Get current reference image (uploaded or existing)
  const currentReferenceImage = referenceImagePreview || character?.reference_image || character?.base_image_url;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="w-5 h-5 text-primary" />
            生成正面视图
          </DialogTitle>
          <DialogDescription>
            为「{character?.name}」生成高质量的正面视图图片
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current / Reference Image Preview */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">参考图片</Label>
            <div className="flex gap-4">
              {/* Current reference */}
              {currentReferenceImage && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                  <img
                    src={currentReferenceImage}
                    alt="参考图"
                    className="w-full h-full object-cover"
                  />
                  {referenceImagePreview && (
                    <button
                      type="button"
                      onClick={clearReferenceImage}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 text-center">
                    {referenceImagePreview ? "新上传" : "当前"}
                  </div>
                </div>
              )}

              {/* Upload button */}
              <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isGenerating}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">上传新图</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              上传参考图可以让生成的角色更接近你想要的效果
            </p>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label htmlFor="custom-prompt" className="text-base font-semibold">
              角色描述
            </Label>
            <Textarea
              id="custom-prompt"
              placeholder="描述角色的外观特征...&#10;例如：蓝色双马尾，赛博朋克风格，戴着科技护目镜"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isGenerating}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {customPrompt.length}/500 字符 · 详细的描述会被 AI 优化后用于生成
            </p>
          </div>

          {/* Comic Style Selection */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4" />
              漫画风格
            </Label>
            <Select
              value={selectedStyleId}
              onValueChange={setSelectedStyleId}
              disabled={isGenerating || stylesLoading}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={stylesLoading ? "加载中..." : "选择漫画风格（可选）"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">不指定风格</SelectItem>
                {styles.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    <div className="flex items-center gap-2">
                      {style.image_url && (
                        <img
                          src={style.image_url}
                          alt={style.name_zh}
                          className="w-5 h-5 rounded object-cover"
                        />
                      )}
                      <span>{style.name_zh}</span>
                      <span className="text-xs text-muted-foreground">({style.name_en})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择漫画风格可以让生成的图片符合特定的美术风格
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="comic"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                生成正面图
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
