import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { CharacterAsset, ViewGeneratingState } from "./types";
import { expressions } from "./constants";

interface UseCharacterGenerationProps {
  character: CharacterAsset;
  onUpdate?: (character: CharacterAsset) => void;
  onViewsUpdate: (views: Record<string, string>) => void;
  onExpressionsUpdate: (expressions: Record<string, string>) => void;
  refreshUsage: () => void;
}

export function useCharacterGeneration({
  character,
  onUpdate,
  onViewsUpdate,
  onExpressionsUpdate,
  refreshUsage,
}: UseCharacterGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewGenerating, setViewGenerating] = useState<ViewGeneratingState>({});
  const [selectedExpression, setSelectedExpression] = useState<string | null>(null);
  const [allExpressionsGenerating, setAllExpressionsGenerating] = useState(false);
  const { toast } = useToast();

  const parseErrorResponse = async (response: Response, defaultMessage = "生成失败") => {
    let errorMessage = defaultMessage;
    let errorCode: string | undefined;
    let providerType: string | undefined;
    try {
      const data = await response.json();
      errorCode = data.code;
      providerType = data.provider_type;
      if (response.status === 429) {
        errorMessage =
          data.error ||
          `已达今日额度上限（已用 ${data.used ?? "-"} / 上限 ${data.limit ?? "-"}），请稍后再试`;
      } else {
        errorMessage = data.error || defaultMessage;
      }
    } catch {
      // ignore
    }
    const error: { message: string; code?: string; providerType?: string } = { message: errorMessage };
    if (errorCode) error.code = errorCode;
    if (providerType) error.providerType = providerType;
    throw error;
  };

  const showErrorToast = (error: unknown, title = "生成失败") => {
    const errorObj = error as { code?: string; message?: string };
    if (errorObj?.code === "MODEL_NOT_CONFIGURED") {
      toast({
        title: "模型未配置",
        description: error instanceof Error ? error.message : "请先在模型配置中启用对应类型",
        variant: "destructive",
      });
    } else {
      toast({
        title,
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
        variant: "destructive",
      });
    }
  };

  // 生成三视图
  const handleGenerateThreeView = async () => {
    setViewGenerating({ front: true, side: true, back: true });
    setIsGenerating(true);

    try {
      const response = await fetch("/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          description: character.description || character.name,
        }),
      });

      if (!response.ok) {
        await parseErrorResponse(response, "三视图生成失败");
      }

      const data = await response.json();
      const views: Record<string, string> = {};
      Object.entries(data.views).forEach(([viewType, viewData]) => {
        const typedViewData = viewData as { image_url: string };
        const imageUrl = typedViewData.image_url;
        const urlWithTimestamp = imageUrl.includes('?')
          ? `${imageUrl}&t=${Date.now()}`
          : `${imageUrl}?t=${Date.now()}`;
        views[viewType] = urlWithTimestamp;
      });
      onViewsUpdate(views);

      toast({
        title: "三视图生成完成",
        description: "角色的正面、侧面、背面视图已生成",
      });

      refreshUsage();

      // Refresh character data
      if (onUpdate) {
        const updatedChar = await fetch(`/api/character/${character.id}`);
        if (updatedChar.ok) {
          const charData = await updatedChar.json();
          onUpdate(charData.character);
        }
      }
    } catch (error) {
      showErrorToast(error);
    } finally {
      setIsGenerating(false);
      setViewGenerating({});
    }
  };

  // 重新生成单个视图
  const handleRegenerateSingleView = async (viewType: string) => {
    setViewGenerating({ [viewType]: true });
    setIsGenerating(true);

    try {
      const response = await fetch("/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          description: character.description || character.name,
          view_types: [viewType],
        }),
      });

      if (!response.ok) {
        await parseErrorResponse(response, `${viewType === 'front' ? '正面' : viewType === 'side' ? '侧面' : '背面'}视图生成失败`);
      }

      const data = await response.json();

      if (data.views && data.views[viewType]) {
        const imageUrl = data.views[viewType].image_url;
        const urlWithTimestamp = imageUrl.includes('?')
          ? `${imageUrl}&t=${Date.now()}`
          : `${imageUrl}?t=${Date.now()}`;

        onViewsUpdate({ [viewType]: urlWithTimestamp });

        const viewName = viewType === 'front' ? '正面' : viewType === 'side' ? '侧面' : '背面';
        toast({
          title: "视图重新生成完成",
          description: `${viewName}视图已更新`,
        });

        refreshUsage();

        if (onUpdate) {
          const updatedChar = await fetch(`/api/character/${character.id}`);
          if (updatedChar.ok) {
            const charData = await updatedChar.json();
            onUpdate(charData.character);
          }
        }
      }
    } catch (error) {
      showErrorToast(error);
    } finally {
      setIsGenerating(false);
      setViewGenerating({});
    }
  };

  // 生成单个表情
  const handleGenerateExpression = async (expressionId: string) => {
    setIsGenerating(true);
    setSelectedExpression(expressionId);

    try {
      const response = await fetch("/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          expression_type: expressionId,
        }),
      });

      if (!response.ok) {
        await parseErrorResponse(response, "表情生成失败");
      }

      const data = await response.json();
      const imageUrl = data.expressions[expressionId].image_url;
      const urlWithTimestamp = imageUrl.includes('?')
        ? `${imageUrl}&t=${Date.now()}`
        : `${imageUrl}?t=${Date.now()}`;

      onExpressionsUpdate({ [expressionId]: urlWithTimestamp });

      toast({
        title: "表情生成完成",
        description: `已生成${expressions.find(e => e.id === expressionId)?.label}表情`,
      });

      refreshUsage();

      if (onUpdate) {
        const updatedChar = await fetch(`/api/character/${character.id}`);
        if (updatedChar.ok) {
          const charData = await updatedChar.json();
          onUpdate(charData.character);
        }
      }
    } catch (error) {
      showErrorToast(error);
    } finally {
      setIsGenerating(false);
      setSelectedExpression(null);
    }
  };

  // 生成全部表情
  const handleGenerateAllExpressions = async () => {
    setAllExpressionsGenerating(true);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          generate_all: true,
        }),
      });

      if (!response.ok) {
        await parseErrorResponse(response, "表情矩阵生成失败");
      }

      const data = await response.json();
      const allExpressions: Record<string, string> = {};
      Object.entries(data.expressions).forEach(([expType, expData]) => {
        const typedExpData = expData as { image_url: string };
        const imageUrl = typedExpData.image_url;
        const urlWithTimestamp = imageUrl.includes('?')
          ? `${imageUrl}&t=${Date.now()}`
          : `${imageUrl}?t=${Date.now()}`;
        allExpressions[expType] = urlWithTimestamp;
      });
      onExpressionsUpdate(allExpressions);

      toast({
        title: "表情矩阵生成完成",
        description: "已生成全部9种表情",
      });

      refreshUsage();

      if (onUpdate) {
        const updatedChar = await fetch(`/api/character/${character.id}`);
        if (updatedChar.ok) {
          const charData = await updatedChar.json();
          onUpdate(charData.character);
        }
      }
    } catch (error) {
      showErrorToast(error);
    } finally {
      setIsGenerating(false);
      setAllExpressionsGenerating(false);
    }
  };

  return {
    isGenerating,
    viewGenerating,
    selectedExpression,
    allExpressionsGenerating,
    handleGenerateThreeView,
    handleRegenerateSingleView,
    handleGenerateExpression,
    handleGenerateAllExpressions,
  };
}
