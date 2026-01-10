/**
 * 九宫格图片生成对话框（重构版）
 * 精简主组件，职责清晰，易于维护
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Grid3x3, 
  Info, 
  Image as ImageIcon, 
  Palette, 
  Sparkles, 
  List,
  CheckCircle2,
  RefreshCw,
  Download,
  Eye,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useNineGridDialog } from "./useNineGridDialog";
import { PanelSelector } from "./PanelSelector";
import type { 
  NineGridDialogProps, 
  FormData, 
  GenerateNineGridRequest,
  GenerateFromPlotRequest,
  GenerationStep,
} from "./types";

// ==================== 表单验证 ====================

const formSchema = z.object({
  mode: z.enum(["from-panels", "from-plot"]),
  chapterId: z.string().min(1, "请选择章节"),
  plotSummary: z.string().optional(),
  comicStyleId: z.string().optional(),
  referenceImageId: z.string().optional(),
}).refine((data) => {
  // 从剧情生成时，必须提供剧情概述
  if (data.mode === "from-plot") {
    return data.plotSummary && data.plotSummary.trim().length > 0;
  }
  return true;
}, {
  message: "请输入剧情概述",
  path: ["plotSummary"],
});

// ==================== 主组件 ====================

export function NineGridDialog({
  open,
  onOpenChange,
  projectId,
  chapters,
  onSuccess,
}: NineGridDialogProps) {
  const { toast } = useToast();
  const [generationStep, setGenerationStep] = useState<GenerationStep | null>(null);

  // 表单管理
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: "from-panels",
      chapterId: "",
      plotSummary: "",
      comicStyleId: "none",
      referenceImageId: "none",
    },
  });

  // 状态管理
  const { state, handlers } = useNineGridDialog({ open, form });
  
  // 监听模式变化
  const currentMode = form.watch("mode");

  // ==================== 表单提交 ====================

  const handleSubmit = async (data: FormData) => {
    // 验证项目ID
    if (!projectId) {
      toast({
        title: "错误",
        description: "项目 ID 不存在",
        variant: "destructive",
      });
      return;
    }

    // 根据模式调用不同的处理函数
    if (data.mode === "from-plot") {
      await handleGenerateFromPlot(data);
    } else {
      await handleGenerateFromPanels(data);
    }
  };

  // 从现有分镜生成
  const handleGenerateFromPanels = async (data: FormData) => {
    // 验证选择数量
    if (state.selectedPanelIds.length !== 9) {
      toast({
        title: "错误",
        description: "请选择恰好 9 个分镜",
        variant: "destructive",
      });
      return;
    }

    handlers.setGenerating(true);

    try {
      // 构建请求参数
      const selectedStyle =
        data.comicStyleId && data.comicStyleId !== "none"
          ? state.comicStyles.find((s) => s.id === data.comicStyleId)
          : undefined;

      const selectedAsset =
        data.referenceImageId && data.referenceImageId !== "none"
          ? state.characterAssets.find((a) => a.id === data.referenceImageId)
          : undefined;

      const requestBody: GenerateNineGridRequest = {
        project_id: projectId!,
        panel_ids: state.selectedPanelIds,
        comic_style_id: selectedStyle?.id,
        style_prompt: selectedStyle?.prompt_prefix,
        reference_image: selectedAsset?.base_image_url ?? undefined,
      };

      // 发送请求
      const response = await fetch(
        `/api/chapter/${data.chapterId}/generate-nine-grid-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "生成失败");
      }

      // 设置生成结果（不关闭对话框）
      handlers.setResult(result.image_url!);

      // 成功提示
      toast({
        title: "生成成功",
        description: "九宫格图片已生成并保存到素材库",
      });

      // 通知父组件刷新
      onSuccess();
    } catch (error) {
      console.error("九宫格生成失败:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      handlers.setGenerating(false);
    }
  };

  // 从剧情概述生成
  const handleGenerateFromPlot = async (data: FormData) => {
    if (!data.plotSummary || data.plotSummary.trim().length === 0) {
      toast({
        title: "错误",
        description: "请输入剧情概述",
        variant: "destructive",
      });
      return;
    }

    handlers.setGenerating(true);
    setGenerationStep({ current: 1, total: 2, message: "正在生成分镜提示词..." });

    try {
      // 获取参考图URL
      const selectedAsset =
        data.referenceImageId && data.referenceImageId !== "none"
          ? state.characterAssets.find((a) => a.id === data.referenceImageId)
          : undefined;

      const requestBody: GenerateFromPlotRequest = {
        project_id: projectId!,
        plot_summary: data.plotSummary!,
        comic_style_id: data.comicStyleId && data.comicStyleId !== "none" ? data.comicStyleId : undefined,
        reference_image: selectedAsset?.base_image_url ?? undefined,
      };

      // 发送请求
      const response = await fetch(
        `/api/chapter/${data.chapterId}/generate-nine-grid-from-plot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "生成失败");
      }

      // 更新进度
      setGenerationStep({ current: 2, total: 2, message: "正在生成九宫格图片..." });

      // 设置生成结果（不关闭对话框）
      handlers.setResult(result.image_url!, result.panels);

      // 成功提示
      toast({
        title: "生成成功",
        description: result.message || "九宫格图片已生成并保存到素材库",
      });

      // 通知父组件刷新
      onSuccess();
    } catch (error) {
      console.error("九宫格生成失败:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      handlers.setGenerating(false);
      setGenerationStep(null);
    }
  };

  // 重新生成
  const handleRegenerate = () => {
    handlers.clearResult();
    setGenerationStep(null);
  };

  // 关闭对话框
  const handleClose = () => {
    handlers.handleReset();
    form.reset();
    setGenerationStep(null);
    onOpenChange(false);
  };

  // ==================== 渲染 ====================

  // 如果有生成结果，显示结果页面
  if (state.generatedImageUrl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              九宫格生成成功
            </DialogTitle>
            <DialogDescription>
              图片已保存到素材库，你可以重新生成或关闭窗口
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* 成功提示 */}
              <Alert className="border-green-500 bg-green-50/50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  九宫格图片已成功生成并保存到素材库！
                </AlertDescription>
              </Alert>

              {/* 图片预览 */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">生成的九宫格图片</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(state.generatedImageUrl!, "_blank")}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          查看大图
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = state.generatedImageUrl!;
                            a.download = `nine-grid-${Date.now()}.png`;
                            a.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </Button>
                      </div>
                    </div>
                    <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                      <img
                        src={state.generatedImageUrl}
                        alt="生成的九宫格图片"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 分镜提示词（如果有） */}
              {state.generatedPanels && state.generatedPanels.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">生成的分镜提示词</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {state.generatedPanels.map((panel, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold text-sm">
                              {panel.panel_order}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-muted-foreground mb-1">
                                {panel.description}
                              </p>
                              <p className="text-xs text-muted-foreground/70">
                                {panel.visual_prompt}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={handleRegenerate}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重新生成
            </Button>
            <Button onClick={handleClose}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 生成表单页面
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-orange-500" />
            九宫格图片生成
          </DialogTitle>
          <DialogDescription>
            选择 9 个分镜，生成 1 张 3×3 九宫格布局的图片
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* 提示信息 */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    九宫格图片将 9 个分镜组合成一张 3×3 布局的图片，展现连续的视觉叙事。
                    {currentMode === "from-panels" 
                      ? "选择的分镜将按顺序排列（从左到右，从上到下）。"
                      : "AI 将根据剧情自动生成 9 个连续的分镜并合成九宫格图片。"}
                  </AlertDescription>
                </Alert>

                {/* 生成进度 */}
                {generationStep && (
                  <Alert className="border-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{generationStep.message}</span>
                          <span className="text-orange-600 font-medium">
                            步骤 {generationStep.current ?? 0}/{generationStep.total}
                          </span>
                        </div>
                        <Progress 
                          value={generationStep.current ? (generationStep.current / generationStep.total) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 模式选择 */}
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>生成模式</FormLabel>
                      <Tabs value={field.value} onValueChange={field.onChange}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="from-panels" className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            从现有分镜
                          </TabsTrigger>
                          <TabsTrigger value="from-plot" className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            从剧情生成
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <FormDescription>
                        {field.value === "from-panels" 
                          ? "从章节中选择 9 个现有分镜生成九宫格"
                          : "输入剧情概述，AI 自动生成 9 个分镜并合成九宫格"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 章节选择 */}
                <FormField
                  control={form.control}
                  name="chapterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>选择章节 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择章节" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {chapters.map((chapter) => (
                            <SelectItem key={chapter.id} value={chapter.id}>
                              第 {chapter.chapter_order} 章 - {chapter.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {currentMode === "from-panels" 
                          ? "选择包含分镜的章节"
                          : "选择要生成九宫格的章节"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 从剧情生成：剧情输入 */}
                {currentMode === "from-plot" && (
                  <FormField
                    control={form.control}
                    name="plotSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>剧情概述 *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="请输入剧情概述，例如：一个年轻的剑客在森林中遇到了神秘的老人，老人传授给他失传已久的剑法。剑客从怀疑到信任，最终领悟了剑法的真谛。"
                            className="min-h-[120px] resize-none"
                          />
                        </FormControl>
                        <FormDescription>
                          描述你想要展现的故事情节，AI 将生成 9 个连续的分镜
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* 从现有分镜：分镜选择区域 */}
                {currentMode === "from-panels" && state.selectedChapterId && (
                  <PanelSelector
                    panels={state.chapterPanels}
                    selectedPanelIds={state.selectedPanelIds}
                    isLoading={state.isLoadingPanels}
                    onPanelToggle={handlers.handlePanelToggle}
                    onSelectFirst9={handlers.handleSelectFirst9}
                    onClearSelection={handlers.handleClearSelection}
                  />
                )}

                {/* 漫画风格选择 */}
                <FormField
                  control={form.control}
                  name="comicStyleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        漫画风格（可选）
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={state.isLoadingStyles}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                state.isLoadingStyles ? "加载中..." : "选择漫画风格"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">不指定风格</SelectItem>
                          {state.comicStyles.map((style) => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name_zh} ({style.name_en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        选择漫画风格将影响九宫格图片的整体视觉风格
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 参考图选择 */}
                <FormField
                  control={form.control}
                  name="referenceImageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        参考图（可选）
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={state.isLoadingAssets}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                state.isLoadingAssets ? "加载中..." : "从素材库选择参考图"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">不使用参考图</SelectItem>
                          {state.characterAssets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name}
                              {asset.comic_style && ` - ${asset.comic_style.name_zh}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        选择素材库中的角色作为参考图，保持视觉一致性
                      </FormDescription>
                      <FormMessage />

                      {/* 参考图预览 */}
                      {field.value && field.value !== "none" && (
                        <ReferenceImagePreview
                          assetId={field.value}
                          assets={state.characterAssets}
                        />
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={state.isGenerating}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={
                  state.isGenerating || 
                  (currentMode === "from-panels" && state.selectedPanelIds.length !== 9) ||
                  (currentMode === "from-plot" && !form.watch("plotSummary")?.trim())
                }
              >
                {state.isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {generationStep?.message || "生成中..."}
                  </>
                ) : (
                  <>
                    <Grid3x3 className="mr-2 h-4 w-4" />
                    生成九宫格图片
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 子组件 ====================

interface ReferenceImagePreviewProps {
  assetId: string;
  assets: Array<{
    id: string;
    name: string;
    base_image_url: string | null;
    comic_style?: {
      name_zh: string;
    } | null;
  }>;
}

/**
 * 参考图预览组件
 */
function ReferenceImagePreview({ assetId, assets }: ReferenceImagePreviewProps) {
  const selectedAsset = assets.find((a) => a.id === assetId);

  if (!selectedAsset) {
    return null;
  }

  return (
    <div className="mt-2 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        {selectedAsset.base_image_url && (
          <img
            src={selectedAsset.base_image_url}
            alt={selectedAsset.name}
            className="w-16 h-16 rounded object-cover"
          />
        )}
        <div>
          <div className="font-medium">{selectedAsset.name}</div>
          {selectedAsset.comic_style && (
            <div className="text-sm text-muted-foreground">
              风格：{selectedAsset.comic_style.name_zh}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
