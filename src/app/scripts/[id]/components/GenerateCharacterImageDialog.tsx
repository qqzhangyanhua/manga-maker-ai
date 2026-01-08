"use client";

/**
 * 角色图片生成对话框
 * 在专注模式中为没有图片的角色生成图片，支持选择漫画风格
 */

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Palette, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Character } from "@prisma/client";

interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string | null;
  tag_color: string | null;
  prompt_prefix: string | null;
}

interface GenerateCharacterImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Character | null;
  onSuccess: () => void;
}

export function GenerateCharacterImageDialog({
  open,
  onOpenChange,
  character,
  onSuccess,
}: GenerateCharacterImageDialogProps) {
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("__none__");
  const [stylesLoading, setStylesLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const { toast } = useToast();

  // 获取漫画风格列表
  useEffect(() => {
    if (open) {
      fetchStyles();
    }
  }, [open]);

  const fetchStyles = async () => {
    setStylesLoading(true);
    try {
      const response = await fetch("/api/comic-styles");
      if (response.ok) {
        const data = await response.json();
        setStyles(data.data || []);
      }
    } catch (error) {
      console.error("获取漫画风格失败:", error);
    } finally {
      setStylesLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!character) return;

    setIsGenerating(true);
    setGeneratedImageUrl("");

    try {
      const response = await fetch(`/api/character/${character.id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_style_id: selectedStyleId !== "__none__" ? selectedStyleId : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "QUOTA_EXCEEDED") {
          throw new Error(`今日图像生成配额已用完（${data.used}/${data.limit}）`);
        }
        throw new Error(data.error || "生成角色图片失败");
      }

      setGeneratedImageUrl(data.image_url || "");
      
      toast({
        title: "生成成功",
        description: `${character.name} 的图片已生成`,
      });

      // 延迟关闭对话框，让用户看到结果
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1000);
    } catch (error) {
      console.error("生成角色图片失败:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setSelectedStyleId("__none__");
      setGeneratedImageUrl("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-orange-500" />
            生成角色图片
          </DialogTitle>
          <DialogDescription>
            为 <span className="font-semibold text-foreground">{character?.name}</span> 生成角色图片
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 角色描述展示 */}
          {character?.description && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">角色描述</Label>
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                {character.description}
              </div>
            </div>
          )}

          {/* 漫画风格选择 */}
          <div className="space-y-2">
            <Label htmlFor="comic-style" className="text-sm font-semibold flex items-center gap-2">
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
                <SelectItem value="__none__">
                  <div className="flex items-center gap-2">
                    <span>无风格</span>
                    <span className="text-xs text-muted-foreground">使用默认风格</span>
                  </div>
                </SelectItem>
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
              选择一个漫画风格可以让角色与项目保持统一的美术风格
            </p>
          </div>

          {/* 生成预览 */}
          {generatedImageUrl && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">生成结果</Label>
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={generatedImageUrl}
                  alt={`${character?.name} 生成图片`}
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            {generatedImageUrl ? "完成" : "取消"}
          </Button>
          {!generatedImageUrl && (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !character}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  开始生成
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
