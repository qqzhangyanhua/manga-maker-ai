/**
 * Hook for nine-grid generation logic
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNineGridStore } from "../store/useNineGridStore";
import type {
    FormData,
    GenerateNineGridRequest,
    GenerateFromPlotRequest,
    GenerationStep,
} from "../types";

interface UseNineGridGenerationOptions {
    projectId: string | null;
    onSuccess: () => void;
}

export function useNineGridGeneration({
    projectId,
    onSuccess,
}: UseNineGridGenerationOptions) {
    const { toast } = useToast();
    const [generationStep, setGenerationStep] = useState<GenerationStep | null>(null);

    const {
        selectedPanelIds,
        comicStyles,
        characterAssets,
        setGenerating,
        setResult,
    } = useNineGridStore();

    /**
     * Generate from existing panels
     */
    const handleGenerateFromPanels = async (data: FormData) => {
        // Validate selection count
        if (selectedPanelIds.length !== 9) {
            toast({
                title: "错误",
                description: "请选择恰好 9 个分镜",
                variant: "destructive",
            });
            return;
        }

        setGenerating(true);

        try {
            // Build request parameters
            const selectedStyle =
                data.comicStyleId && data.comicStyleId !== "none"
                    ? comicStyles.find((s) => s.id === data.comicStyleId)
                    : undefined;

            const selectedAsset =
                data.referenceImageId && data.referenceImageId !== "none"
                    ? characterAssets.find((a) => a.id === data.referenceImageId)
                    : undefined;

            const requestBody: GenerateNineGridRequest = {
                project_id: projectId!,
                panel_ids: selectedPanelIds,
                comic_style_id: selectedStyle?.id,
                style_prompt: selectedStyle?.prompt_prefix,
                reference_image: selectedAsset?.base_image_url ?? undefined,
            };

            // Send request
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

            // Set generation result
            setResult(result.image_url!);

            // Success toast
            toast({
                title: "生成成功",
                description: "九宫格图片已生成并保存到素材库",
            });

            // Notify parent component
            onSuccess();
        } catch (error) {
            console.error("九宫格生成失败:", error);
            toast({
                title: "生成失败",
                description: error instanceof Error ? error.message : "未知错误",
                variant: "destructive",
            });
        } finally {
            setGenerating(false);
        }
    };

    /**
     * Generate from plot summary
     */
    const handleGenerateFromPlot = async (data: FormData) => {
        if (!data.plotSummary || data.plotSummary.trim().length === 0) {
            toast({
                title: "错误",
                description: "请输入剧情概述",
                variant: "destructive",
            });
            return;
        }

        setGenerating(true);
        setGenerationStep({ current: 1, total: 2, message: "正在生成分镜提示词..." });

        try {
            // Get reference image URL
            const selectedAsset =
                data.referenceImageId && data.referenceImageId !== "none"
                    ? characterAssets.find((a) => a.id === data.referenceImageId)
                    : undefined;

            const requestBody: GenerateFromPlotRequest = {
                project_id: projectId!,
                plot_summary: data.plotSummary!,
                comic_style_id: data.comicStyleId && data.comicStyleId !== "none" ? data.comicStyleId : undefined,
                reference_image: selectedAsset?.base_image_url ?? undefined,
            };

            // Send request
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

            // Update progress
            setGenerationStep({ current: 2, total: 2, message: "正在生成九宫格图片..." });

            // Set generation result
            setResult(result.image_url!, result.panels);

            // Success toast
            toast({
                title: "生成成功",
                description: result.message || "九宫格图片已生成并保存到素材库",
            });

            // Notify parent component
            onSuccess();
        } catch (error) {
            console.error("九宫格生成失败:", error);
            toast({
                title: "生成失败",
                description: error instanceof Error ? error.message : "未知错误",
                variant: "destructive",
            });
        } finally {
            setGenerating(false);
            setGenerationStep(null);
        }
    };

    return {
        handleGenerateFromPanels,
        handleGenerateFromPlot,
        generationStep,
    };
}
