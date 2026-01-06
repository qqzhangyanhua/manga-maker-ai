import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface ImageGenerationConfig {
  customPrompt?: string;
  negativePrompt?: string;
  modelName?: string;
  aspectRatio?: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
  referenceImages?: Array<{ url: string }>;
}

export interface UseImageGenerationOptions {
  onSuccess?: (imageUrl: string) => void;
  onError?: (error: Error) => void;
  onPanelUpdate?: () => void;
}

/**
 * 共享的面板图片生成 Hook
 *
 * 职责：
 * - 封装图片生成 API 调用逻辑
 * - 管理生成状态（loading, progress）
 * - 统一错误处理和提示
 *
 * 用途：
 * - 主页面批量生成
 * - 专注模式单个生成
 */
export function usePanelImageGeneration(options: UseImageGenerationOptions = {}) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  /**
   * 生成单个面板图片
   */
  const generateImage = useCallback(
    async (panelId: string, config: ImageGenerationConfig = {}) => {
      setIsGenerating(true);
      setGenerationProgress(0);

      try {
        const requestBody: Record<string, unknown> = {
          panel_id: panelId,
          prompt: config.customPrompt || "", // API 要求必填
        };

        // 可选参数
        if (config.negativePrompt) {
          requestBody.negative_prompt = config.negativePrompt;
        }
        if (config.modelName) {
          requestBody.model_name = config.modelName;
        }
        if (config.aspectRatio) {
          requestBody.aspect_ratio = config.aspectRatio;
        }
        if (config.numInferenceSteps) {
          requestBody.num_inference_steps = config.numInferenceSteps;
        }
        if (config.guidanceScale) {
          requestBody.guidance_scale = config.guidanceScale;
        }

        // 添加参考图（如果有）
        if (config.referenceImages && config.referenceImages.length > 0) {
          requestBody.reference_image_urls = config.referenceImages.map((img) => img.url);
        }

        const response = await fetch(`/api/panel/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "生成失败");
        }

        const result = await response.json();

        // 更新预览图
        setPreviewImageUrl(result.image_url);

        toast({
          title: "生成成功",
          description: "分镜图片已生成",
        });

        // 回调
        options.onSuccess?.(result.image_url);
        options.onPanelUpdate?.();

        return result.image_url;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("生成失败");

        toast({
          title: "生成失败",
          description: err.message,
          variant: "destructive",
        });

        options.onError?.(err);

        console.error("图片生成失败:", error);
        throw err;
      } finally {
        setIsGenerating(false);
        setGenerationProgress(0);
      }
    },
    [toast, options]
  );

  /**
   * 取消生成
   */
  const cancelGeneration = useCallback(() => {
    setIsGenerating(false);
    setGenerationProgress(0);
  }, []);

  /**
   * 重置预览图
   */
  const resetPreview = useCallback(() => {
    setPreviewImageUrl(null);
  }, []);

  return {
    isGenerating,
    generationProgress,
    previewImageUrl,
    generateImage,
    cancelGeneration,
    resetPreview,
  };
}
