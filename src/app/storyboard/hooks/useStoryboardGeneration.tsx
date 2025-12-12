import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";
import { ApiProject, ApiPanel } from "../types";
import { convertApiPanelToLocal, parseErrorResponse } from "../utils";

type UseStoryboardGenerationOptions = {
  storyId: string | null;
  onProjectUpdate: (project: ApiProject) => void;
  onPanelsUpdate: (panels: PanelData[]) => void;
  onRefreshUsage: () => void;
};

export const useStoryboardGeneration = ({
  storyId,
  onProjectUpdate,
  onPanelsUpdate,
  onRefreshUsage,
}: UseStoryboardGenerationOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (script: string) => {
    setIsGenerating(true);
    onPanelsUpdate([]);
    onProjectUpdate(null as unknown as ApiProject);

    try {
      const response = await fetch("/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story: script,
          saveToDb: true,
          storyId: storyId,
        }),
      });

      if (!response.ok) {
        await parseErrorResponse(response);
      }

      const data = await response.json();

      if (data.project) {
        onProjectUpdate(data.project);
        const localPanels = data.project.panels.map(convertApiPanelToLocal);
        onPanelsUpdate(localPanels);

        toast({
          title: "智能分镜拆解完成",
          description: `已生成项目《${data.project.title}》，包含 ${localPanels.length} 个分镜`,
        });
        onRefreshUsage();
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromTemplate = async (templateData: Record<string, string>) => {
    const combinedScript = Object.values(templateData).join("\n\n");
    await handleGenerate(combinedScript);
  };

  return {
    isGenerating,
    handleGenerate,
    handleGenerateFromTemplate,
  };
};

type UseImageGenerationOptions = {
  panels: PanelData[];
  currentProject: ApiProject | null;
  defaultCharacterId: string | undefined;
  defaultStyleKey: string | undefined;
  softMode: boolean;
  onPanelsUpdate: (panels: PanelData[]) => void;
  onPromptErrorsUpdate: (errors: Record<string, string>) => void;
  onRefreshUsage: () => void;
  setSoftMode: (mode: boolean) => void;
};

export const useImageGeneration = ({
  panels,
  currentProject,
  defaultCharacterId,
  defaultStyleKey,
  softMode,
  onPanelsUpdate,
  onPromptErrorsUpdate,
  onRefreshUsage,
  setSoftMode,
}: UseImageGenerationOptions) => {
  const { toast } = useToast();
  const [promptErrors, setPromptErrors] = useState<Record<string, string>>({});

  const updatePromptErrors = (errors: Record<string, string>) => {
    setPromptErrors(errors);
    onPromptErrorsUpdate(errors);
  };

  const handleGenerateImages = async (options?: { isRetry?: boolean }) => {
    if (!currentProject) {
      toast({
        title: "请先生成分镜",
        description: "需要先创建故事板项目才能生成图像",
        variant: "destructive",
      });
      return;
    }

    try {
      // 先为缺失提示词的分镜自动生成 prompt
      for (const panel of panels) {
        if (!panel.englishPrompt) {
          try {
            const res = await fetch("/api/panel/build-prompt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                panel_id: panel.id,
                character_id: defaultCharacterId || undefined,
                style_key: defaultStyleKey || undefined,
                soften: softMode,
              }),
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              const msg = errData.error || "生成提示词失败";
              updatePromptErrors({ ...promptErrors, [panel.id]: msg });
              continue;
            }
            const data = await res.json();
            const newErrors = { ...promptErrors };
            delete newErrors[panel.id];
            updatePromptErrors(newErrors);

            onPanelsUpdate(
              panels.map((p) =>
                p.id === panel.id
                  ? { ...p, englishPrompt: data.prompt, generatedImage: p.generatedImage }
                  : p
              )
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : "生成提示词失败";
            updatePromptErrors({ ...promptErrors, [panel.id]: msg });
            continue;
          }
        }
      }

      toast({
        title: "开始生成图像",
        description: `正在为 ${panels.length} 个分镜生成AI图像...${
          Object.keys(promptErrors).length ? "（部分分镜提示词失败，将跳过生成）" : ""
        }`,
      });

      const response = await fetch("/api/panel/generate-image", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: currentProject.id,
        }),
      });

      if (!response.ok) {
        await parseErrorResponse(response);
      }

      const data = await response.json();

      // 更新panels的图像
      const updatedPanels = panels.map((panel) => {
        const updatedPanel = data.panels.find((p: ApiPanel) => p.id === panel.id);
        if (updatedPanel) {
          return {
            ...panel,
            generatedImage: updatedPanel.generated_image || undefined,
          };
        }
        return panel;
      });

      onPanelsUpdate(updatedPanels);

      toast({
        title: "图像生成完成",
        description: `成功为 ${data.generated_count} 个分镜生成图像`,
      });
      onRefreshUsage();
    } catch (error) {
      console.error("Generate images error:", error);
      const description = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "图像生成失败",
        description: options?.isRetry
          ? `${description}（柔和模式也失败了）`
          : `${description}（建议切换到柔和模式重试）`,
        variant: "destructive",
      });

      // Auto retry with soft mode if not already retrying
      if (!options?.isRetry && !softMode) {
        console.log("Auto-retrying with soft mode...");
        setSoftMode(true);
      }
    }
  };

  const handleGenerateSingleImage = async (panelId: string) => {
    if (!currentProject) {
      toast({
        title: "请先生成分镜",
        description: "需要先创建故事板项目才能生成图像",
        variant: "destructive",
      });
      return;
    }

    const panel = panels.find((p) => p.id === panelId);
    if (!panel) {
      toast({
        title: "分镜不存在",
        variant: "destructive",
      });
      return;
    }

    if (!panel.englishPrompt) {
      toast({
        title: "缺少提示词",
        description: "需要先为此分镜生成提示词",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "开始生成图像",
        description: "正在为分镜生成 AI 图像...",
      });

      const response = await fetch("/api/panel/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_id: panelId,
          prompt: panel.englishPrompt,
          style: defaultStyleKey,
          wait: true, // Wait for completion
        }),
      });

      if (!response.ok) {
        await parseErrorResponse(response);
      }

      const data = await response.json();

      // Update panel with generated image
      const updatedPanels = panels.map((p) => {
        if (p.id === panelId) {
          return {
            ...p,
            generatedImage: data.image_url || undefined,
          };
        }
        return p;
      });

      onPanelsUpdate(updatedPanels);

      toast({
        title: "图像生成完成",
        description: "分镜图像已成功生成",
      });
      onRefreshUsage();
    } catch (error) {
      console.error("Generate single image error:", error);
      const description = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "图像生成失败",
        description,
        variant: "destructive",
      });
    }
  };

  return {
    promptErrors,
    handleGenerateImages,
    handleGenerateSingleImage,
  };
};
