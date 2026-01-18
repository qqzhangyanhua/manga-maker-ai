/**
 * 角色图片生成对话框组件
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewDialog } from "./ImagePreviewDialog";
import type { Character } from "./types";
import type { GenerateCharacterImageResponse } from "@/app/api/novel/character/generate-image/types";
import { novelTheme } from "../../../theme";

interface ComicStyle {
  id: string;
  name_zh: string;
  tag_color: string;
  image_url: string | null;
  prompt_prefix: string | null;
}

interface GenerateCharacterImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  novelProjectId: string;
  onSuccess: (result: GenerateCharacterImageResponse) => void;
}

export function GenerateCharacterImageDialog({
  isOpen,
  onClose,
  character,
  novelProjectId,
  onSuccess,
}: GenerateCharacterImageDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isLoadingStyles, setIsLoadingStyles] = useState(false);
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [prompt, setPrompt] = useState("");

  // 预览相关状态
  const [showPreview, setShowPreview] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedAssetCharacterId, setGeneratedAssetCharacterId] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GenerateCharacterImageResponse | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // 加载风格列表
  useEffect(() => {
    if (isOpen) {
      loadStyles();
      // 初始化提示词（基于角色描述）
      if (character) {
        setPrompt(character.description || "");
      }
    }
  }, [isOpen, character]);

  const loadStyles = async () => {
    try {
      setIsLoadingStyles(true);
      const response = await fetch("/api/canvas/styles");
      if (!response.ok) {
        throw new Error("加载风格列表失败");
      }
      const result = await response.json();
      setStyles(result.data || []);
    } catch (error) {
      console.error("加载风格失败:", error);
      toast.error("加载风格列表失败");
    } finally {
      setIsLoadingStyles(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!character) return;

    try {
      setIsEnhancing(true);

      const response = await fetch("/api/novel/character/enhance-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterName: character.name,
          characterDescription: character.description,
          traits: character.traits || [],
          basePrompt: prompt || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "强化失败");
      }

      const result = await response.json();

      if (result.success) {
        setPrompt(result.enhancedPrompt);
        toast.success("提示词已强化");
      } else {
        throw new Error(result.message || "强化失败");
      }
    } catch (error) {
      console.error("强化提示词失败:", error);
      toast.error(error instanceof Error ? error.message : "强化提示词失败");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!character || !prompt.trim()) {
      toast.error("请输入生成提示词");
      return;
    }

    try {
      setIsGenerating(true);

      const response = await fetch("/api/novel/character/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novelProjectId,
          characterId: character.id,
          characterName: character.name,
          characterDescription: character.description,
          prompt: prompt.trim(),
          comicStyleId: selectedStyleId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成失败");
      }

      const result = await response.json();

      if (result.success) {
        // 保存完整的生成结果，显示预览对话框
        setGeneratedResult(result);
        setGeneratedImageUrl(result.imageUrl);
        setGeneratedAssetCharacterId(result.assetCharacterId);
        setShowPreview(true);
        toast.success(result.message || "图片生成成功");
      } else {
        throw new Error(result.message || "生成失败");
      }
    } catch (error) {
      console.error("生成图片失败:", error);
      toast.error(error instanceof Error ? error.message : "生成图片失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmSave = () => {
    // 用户确认保存，传递完整结果给父组件
    if (generatedResult) {
      onSuccess(generatedResult);
    }
    setShowPreview(false);
    onClose();
  };

  const handleRegenerate = async () => {
    // 重新生成图片
    setShowPreview(false);
    await handleGenerate();
  };

  const selectedStyle = styles.find((s) => s.id === selectedStyleId);

  if (!character) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>为角色生成图片</DialogTitle>
          <DialogDescription>
            为「{character.name}」生成基础形象图片
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 角色信息展示 */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{character.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({character.role})
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {character.description}
              </p>
              {character.traits && character.traits.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {character.traits.map((trait, i) => (
                    <span
                      key={`trait-${i}`}
                      className={`text-xs px-2 py-1 rounded-full ${novelTheme.primary.light}`}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 风格选择 */}
          <div className="space-y-3">
            <Label>选择漫画风格（可选）</Label>
            <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
              <SelectTrigger>
                <SelectValue placeholder="选择风格（可选）" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingStyles ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  styles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: style.tag_color }}
                        />
                        {style.name_zh}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* 风格预览图 */}
            {selectedStyle && selectedStyle.image_url && (
              <img
                src={selectedStyle.image_url}
                alt={selectedStyle.name_zh}
                className="w-full h-32 object-cover rounded-lg"
              />
            )}
          </div>

          {/* 提示词编辑器 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>生成提示词</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    AI 强化中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI 推荐强化
                  </>
                )}
              </Button>
            </div>

            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入角色外观描述，或基于上方角色信息编辑..."
              rows={6}
              className="font-mono text-sm"
            />

            <div className="text-xs text-muted-foreground space-y-1">
              <p>基础信息: {character.name} - {character.description}</p>
              {selectedStyle && (
                <p className="text-amber-600">
                  将应用风格: {selectedStyle.name_zh}
                </p>
              )}
            </div>
          </div>

          {/* 预计消耗提示 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>预计消耗算力: ~50 积分</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={novelTheme.button.primary}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                生成图片
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 图片预览对话框 */}
      <ImagePreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        character={character}
        imageUrl={generatedImageUrl}
        onConfirm={handleConfirmSave}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
      />
    </Dialog>
  );
}
