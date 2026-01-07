/**
 * Generate Chapter Scenes Dialog - Intelligent background generation for chapters
 * Flow: Analyze → Review → Generate → Result (4 steps)
 */

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type {
  SuggestedScene,
  AnalyzeScenesResponse,
  BatchGenerateScenesResponse,
  SceneGenerationResult
} from "@/types/suggested-scenes.types";

interface ComicStyle {
  id: string;
  name_zh: string;
  name_en: string;
  prompt_prefix: string;
}

interface GenerateChapterScenesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  storyId?: string; // Optional story ID for invalidating story gallery cache
  onSuccess?: () => void;
}

type DialogStep = "analyzing" | "reviewing" | "generating" | "completed";

export function GenerateChapterScenesDialog({
  open,
  onOpenChange,
  chapterId,
  chapterTitle,
  chapterOrder,
  storyId,
  onSuccess
}: GenerateChapterScenesDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<DialogStep>("analyzing");
  const [suggestedScenes, setSuggestedScenes] = useState<SuggestedScene[]>([]);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const [generationResults, setGenerationResults] = useState<SceneGenerationResult[]>([]);

  // Comic style selection
  const [comicStyles, setComicStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("__default__");
  const [customStylePrompt, setCustomStylePrompt] = useState<string>("");
  const [stylesLoading, setStylesLoading] = useState(false);

  // Step 1: Analyze scenes
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chapter/${chapterId}/analyze-scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "分析失败");
      }

      return response.json() as Promise<AnalyzeScenesResponse>;
    },
    onSuccess: (data) => {
      setSuggestedScenes(data.suggested_scenes);
      setSelectedSceneIds(data.suggested_scenes.map(s => s.id)); // Select all by default
      setStep("reviewing");

      if (data.credits_used > 0) {
        toast.success(`场景分析完成，消耗 ${data.credits_used} 算力`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "场景分析失败");
      onOpenChange(false);
    }
  });

  // Step 2: Generate images
  const generateMutation = useMutation({
    mutationFn: async (sceneIds: string[]) => {
      const payload: {
        ids: string[];
        auto_save: boolean;
        comic_style_id?: string;
        custom_style_prompt?: string;
      } = {
        ids: sceneIds,
        auto_save: true
      };

      // Add comic style if selected
      if (selectedStyleId && selectedStyleId !== "__default__") {
        payload.comic_style_id = selectedStyleId;
      }

      // Add custom prompt if provided
      if (customStylePrompt.trim()) {
        payload.custom_style_prompt = customStylePrompt.trim();
      }

      const response = await fetch(
        `/api/chapter/${chapterId}/batch-generate-scenes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成失败");
      }

      return response.json() as Promise<BatchGenerateScenesResponse>;
    },
    onSuccess: (data) => {
      setGenerationResults(data.results);
      setStep("completed");

      toast.success(
        `成功生成 ${data.saved_count} 个场景，共消耗 ${data.total_credits_used} 算力`
      );

      // Invalidate scene library cache
      queryClient.invalidateQueries({ queryKey: ["scenes"] });

      // Invalidate story gallery cache if storyId is provided
      if (storyId) {
        queryClient.invalidateQueries({ queryKey: ["story", storyId, "images"] });
      }

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "批量生成失败");
      setStep("reviewing"); // Go back to review step
    }
  });

  // Auto-start analysis when dialog opens
  useEffect(() => {
    if (open && step === "analyzing" && !analyzeMutation.isPending) {
      analyzeMutation.mutate();
    }
  }, [open, step, analyzeMutation]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("analyzing");
      setSuggestedScenes([]);
      setSelectedSceneIds([]);
      setGenerationResults([]);
      setSelectedStyleId("__default__");
      setCustomStylePrompt("");
    }
  }, [open]);

  // Fetch comic styles when dialog opens
  useEffect(() => {
    if (open) {
      const fetchStyles = async () => {
        setStylesLoading(true);
        try {
          const response = await fetch("/api/comic-styles");
          if (response.ok) {
            const data = await response.json();
            setComicStyles(data.data || []);
          }
        } catch (error) {
          console.error("Error fetching comic styles:", error);
        } finally {
          setStylesLoading(false);
        }
      };

      fetchStyles();
    }
  }, [open]);

  // Handle scene selection toggle
  const toggleSceneSelection = (sceneId: string) => {
    setSelectedSceneIds(prev =>
      prev.includes(sceneId)
        ? prev.filter(id => id !== sceneId)
        : [...prev, sceneId]
    );
  };

  // Handle generation start
  const handleStartGeneration = () => {
    if (selectedSceneIds.length === 0) {
      toast.error("请至少选择一个场景");
      return;
    }

    setStep("generating");
    generateMutation.mutate(selectedSceneIds);
  };

  // Calculate estimated cost
  const estimatedCost = selectedSceneIds.length * 30;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] flex flex-col"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            生成章节背景 - {chapterTitle}
          </DialogTitle>
          <DialogDescription>
            AI 将分析章节内容，自动生成所需的背景场景
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 py-3">
          <Badge variant={step === "analyzing" ? "default" : "secondary"}>
            1. 分析场景
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === "reviewing" ? "default" : "secondary"}>
            2. 审核场景
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === "generating" ? "default" : "secondary"}>
            3. 生成图片
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === "completed" ? "default" : "secondary"}>
            4. 完成
          </Badge>
        </div>

        <div className="border-t" />

        {/* Step 1: Analyzing */}
        {step === "analyzing" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
              <p className="text-lg font-medium mb-2">正在分析章节内容...</p>
              <p className="text-sm text-muted-foreground">
                AI 将识别需要可视化的关键场景
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                预计消耗：5-10 算力
              </p>
            </div>

            <div className="border-t pt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? "分析中..." : "取消"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Reviewing */}
        {step === "reviewing" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Style Selection Section */}
            <div className="mb-4 pb-4 border-b border-gray-800">
              <Label className="text-sm font-medium mb-2 block">漫画风格</Label>
              <Select
                value={selectedStyleId}
                onValueChange={setSelectedStyleId}
                disabled={stylesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={stylesLoading ? "加载中..." : "选择漫画风格"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">使用故事默认风格</SelectItem>
                  {comicStyles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name_zh} ({style.name_en})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom Style Prompt */}
              <div className="mt-3">
                <Label className="text-sm font-medium mb-2 block">
                  自定义风格提示词（可选）
                </Label>
                <Textarea
                  value={customStylePrompt}
                  onChange={(e) => setCustomStylePrompt(e.target.value)}
                  placeholder="例如：水彩画风格，柔和色调，梦幻氛围..."
                  className="min-h-[60px] resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customStylePrompt.length}/200 字符
                  {customStylePrompt.trim() && " · 将覆盖所选漫画风格"}
                </p>
              </div>
            </div>

            {/* Scene Selection */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                已分析出 {suggestedScenes.length} 个场景，请选择需要生成的场景：
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSceneIds(suggestedScenes.map(s => s.id))}
                >
                  全选
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSceneIds([])}
                >
                  清除
                </Button>
                <div className="ml-auto text-sm">
                  已选 {selectedSceneIds.length} 个 | 预估 {estimatedCost} 算力
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {suggestedScenes.map((scene, index) => {
                const isSelected = selectedSceneIds.includes(scene.id);

                return (
                  <div
                    key={scene.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/5"
                        : "border-border hover:border-orange-300"
                    }`}
                    onClick={() => toggleSceneSelection(scene.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSceneSelection(scene.id)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {index + 1}. {scene.name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {scene.scene_type}
                          </Badge>
                          {scene.atmosphere && (
                            <Badge variant="secondary" className="text-xs">
                              {scene.atmosphere}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {scene.description}
                        </p>
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground">
                            查看英文提示词
                          </summary>
                          <p className="mt-1 pl-4 border-l-2 border-orange-500/30">
                            {scene.scene_prompt}
                          </p>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 mt-4 flex justify-between">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleStartGeneration}
                disabled={selectedSceneIds.length === 0}
                className="bg-orange-500 hover:bg-orange-600"
              >
                开始生成 ({selectedSceneIds.length} 个场景)
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
              <p className="text-lg font-medium mb-2">正在生成场景图片...</p>
              <p className="text-sm text-muted-foreground mb-4">
                共 {selectedSceneIds.length} 个场景，预计需要 {selectedSceneIds.length * 10} 秒
              </p>
              <div className="w-full max-w-md">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? "生成中..." : "关闭"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Completed */}
        {step === "completed" && (
          <div className="flex-1 flex flex-col">
            <div className="mb-4">
              <p className="text-lg font-medium text-green-600 mb-2">
                ✓ 生成完成！
              </p>
              <p className="text-sm text-muted-foreground">
                成功生成 {generationResults.filter(r => r.success).length} 个场景背景
              </p>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-4 pr-2">
              {generationResults.map((result, index) => {
                const scene = suggestedScenes.find(s => s.id === result.suggested_scene_id);

                return (
                  <div
                    key={result.suggested_scene_id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {result.success && result.image_url ? (
                      <div>
                        <img
                          src={result.image_url}
                          alt={scene?.name || `场景 ${index + 1}`}
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-3">
                          <p className="font-medium text-sm truncate">
                            {scene?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.credits_used} 算力
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center bg-red-500/10">
                        <p className="text-sm text-red-600">生成失败</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 mt-4 flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                完成
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
