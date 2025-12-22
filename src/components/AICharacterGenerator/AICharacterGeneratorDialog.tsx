"use client";

import { useState, useCallback, useEffect } from "react";
import { Sparkles, Loader2, RefreshCw, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GeneratedCharacterCard } from "./GeneratedCharacterCard";
import {
  useGenerateStoryCharacters,
  useSaveGeneratedCharacters,
} from "@/app/scripts/[id]/hooks/useGenerateStoryCharacters";
import type { DialogStage, GeneratedCharacter, StoryContext } from "./types";

interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string | null;
  tag_color: string | null;
  prompt_prefix: string | null;
}

interface AICharacterGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  onComplete: () => void;
}

export function AICharacterGeneratorDialog({
  open,
  onOpenChange,
  storyId,
  onComplete,
}: AICharacterGeneratorDialogProps) {
  const { toast } = useToast();
  const [stage, setStage] = useState<DialogStage>("idle");
  const [generatedCharacters, setGeneratedCharacters] = useState<
    GeneratedCharacter[]
  >([]);
  const [storyContext, setStoryContext] = useState<StoryContext | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);

  // Comic styles state
  const [comicStyles, setComicStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("__auto__");
  const [loadingStyles, setLoadingStyles] = useState(true);

  const generateMutation = useGenerateStoryCharacters(storyId);
  const saveMutation = useSaveGeneratedCharacters(storyId);

  // Load comic styles when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingStyles(true);
      fetch("/api/comic-styles")
        .then(res => res.json())
        .then(data => {
          setComicStyles(data.data || []);
          setLoadingStyles(false);
        })
        .catch(err => {
          console.error("Failed to load comic styles:", err);
          setLoadingStyles(false);
        });
    }
  }, [open]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset state on close
        setStage("idle");
        setGeneratedCharacters([]);
        setSelectedIndices(new Set());
        setError(null);
        setStoryContext(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Generate characters
  const handleGenerate = useCallback(async () => {
    setStage("generating");
    setError(null);

    try {
      const result = await generateMutation.mutateAsync({
        count: 3,
        comic_style_id: selectedStyleId === "__auto__" ? undefined : selectedStyleId
      });
      setGeneratedCharacters(result.generated_characters);
      setStoryContext(result.story_context);
      // Default select all
      setSelectedIndices(
        new Set(result.generated_characters.map((_, i) => i))
      );
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成角色失败");
      setStage("idle");
    }
  }, [generateMutation, selectedStyleId]);

  // Save selected characters
  const handleSave = useCallback(async () => {
    const toSave = generatedCharacters
      .filter((_, i) => selectedIndices.has(i))
      .map((char) => ({
        name: char.name,
        description: char.description,
        base_prompt: char.optimized_prompt,
        role: char.role,
        image_base64: char.image_base64,
        comic_style_id: selectedStyleId === "__auto__" ? undefined : selectedStyleId,
      }));

    if (toSave.length === 0) {
      toast({
        title: "请选择角色",
        description: "至少选择一个角色进行保存",
        variant: "destructive",
      });
      return;
    }

    setStage("saving");
    setError(null);

    try {
      const result = await saveMutation.mutateAsync(toSave);
      toast({
        title: "保存成功",
        description: `已保存 ${result.saved_count} 个角色到角色库`,
      });
      onComplete();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存角色失败");
      setStage("preview");
    }
  }, [
    generatedCharacters,
    selectedIndices,
    selectedStyleId,
    saveMutation,
    toast,
    onComplete,
    handleOpenChange,
  ]);

  // Toggle character selection
  const toggleSelection = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI 生成角色
          </DialogTitle>
          <DialogDescription>
            根据故事背景自动生成角色，保存后将添加到角色库并关联到当前故事
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stage: Idle */}
        {stage === "idle" && (
          <div className="py-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">准备生成角色</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  AI 将根据故事背景生成 3 个适合的角色
                </p>
              </div>
            </div>

            {/* Comic Style Selector */}
            <div className="max-w-md mx-auto space-y-2">
              <Label htmlFor="comic-style">选择漫画风格（可选）</Label>
              <Select
                value={selectedStyleId}
                onValueChange={setSelectedStyleId}
                disabled={loadingStyles}
              >
                <SelectTrigger id="comic-style">
                  <SelectValue placeholder={loadingStyles ? "加载风格中..." : "使用故事默认风格"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">使用故事默认风格</SelectItem>
                  {comicStyles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name_zh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                选择特定风格会让角色形象更符合该风格特征
              </p>
            </div>

            <div className="text-center">
              <Button onClick={handleGenerate} disabled={loadingStyles}>
                <Sparkles className="w-4 h-4 mr-2" />
                开始生成
              </Button>
            </div>
          </div>
        )}

        {/* Stage: Generating */}
        {stage === "generating" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div>
              <h3 className="font-medium">正在生成角色...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI 正在分析故事并生成角色，请稍候
              </p>
            </div>
          </div>
        )}

        {/* Stage: Preview */}
        {stage === "preview" && (
          <div className="space-y-4">
            {/* Story context */}
            {storyContext && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <span className="font-medium">故事：</span>
                {storyContext.title}
                {storyContext.genre && (
                  <span className="ml-2">({storyContext.genre})</span>
                )}
              </div>
            )}

            {/* Character grid */}
            <div className="grid grid-cols-3 gap-4">
              {generatedCharacters.map((char, index) => (
                <GeneratedCharacterCard
                  key={index}
                  character={char}
                  selected={selectedIndices.has(index)}
                  onToggle={() => toggleSelection(index)}
                />
              ))}
            </div>

            {/* Selection hint */}
            <p className="text-xs text-muted-foreground text-center">
              点击卡片选择/取消选择角色，已选择 {selectedIndices.size} 个
            </p>
          </div>
        )}

        {/* Stage: Saving */}
        {stage === "saving" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div>
              <h3 className="font-medium">正在保存角色...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                正在上传图片并保存到角色库
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        {stage === "preview" && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重新生成
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedIndices.size === 0 || saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              保存选中 ({selectedIndices.size})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
