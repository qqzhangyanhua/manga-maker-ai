/**
 * 素材应用逻辑 Hook
 * 处理角色和场景应用到分镜的功能
 */

import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface Character {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface Scene {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface UseAssetApplicationProps {
  selectedPanelIds: string[];
  onRefresh: () => Promise<void>;
}

export function useAssetApplication({
  selectedPanelIds,
  onRefresh,
}: UseAssetApplicationProps) {
  const { toast } = useToast();

  /**
   * 应用角色到选中的分镜
   */
  const applyCharacterToPanels = useCallback(
    async (character: Character) => {
      if (selectedPanelIds.length === 0) {
        toast({
          title: "请先选择分镜",
          description: "需要先选择要应用角色的分镜",
          variant: "destructive",
        });
        return false;
      }

      try {
        const response = await fetch("/api/panel/batch-apply-character", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panel_ids: selectedPanelIds,
            character_id: character.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "应用角色失败");
        }

        const result = await response.json();

        toast({
          title: "角色已应用",
          description: `已将角色「${character.name}」应用到 ${result.data?.updated || 0} 个分镜`,
        });

        await onRefresh();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "应用角色失败";
        toast({
          title: "应用失败",
          description: message,
          variant: "destructive",
        });
        console.error("应用角色失败:", error);
        return false;
      }
    },
    [selectedPanelIds, onRefresh, toast]
  );

  /**
   * 应用场景到选中的分镜
   */
  const applySceneToPanels = useCallback(
    async (scene: Scene) => {
      if (selectedPanelIds.length === 0) {
        toast({
          title: "请先选择分镜",
          description: "需要先选择要应用场景的分镜",
          variant: "destructive",
        });
        return false;
      }

      try {
        const response = await fetch("/api/panel/batch-apply-scene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panel_ids: selectedPanelIds,
            scene_id: scene.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "应用场景失败");
        }

        const result = await response.json();

        toast({
          title: "场景已应用",
          description: `已将场景「${scene.name}」应用到 ${result.data?.updated || 0} 个分镜`,
        });

        await onRefresh();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "应用场景失败";
        toast({
          title: "应用失败",
          description: message,
          variant: "destructive",
        });
        console.error("应用场景失败:", error);
        return false;
      }
    },
    [selectedPanelIds, onRefresh, toast]
  );

  return {
    applyCharacterToPanels,
    applySceneToPanels,
  };
}
