import { ApiPanel, ApiProject } from "./types";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";

// 转换API数据为前端格式
export const convertApiPanelToLocal = (apiPanel: ApiPanel): PanelData => ({
  id: apiPanel.id,
  type: apiPanel.panel_type as PanelData["type"],
  importance: apiPanel.importance as PanelData["importance"],
  description: apiPanel.description,
  dialogue: apiPanel.dialogue || undefined,
  character: apiPanel.character?.name || undefined, // Use joined character.name
  emotion: apiPanel.emotion || undefined,
  generatedImage: apiPanel.generated_image || undefined,
  englishPrompt: apiPanel.prompt_used || undefined,
});

// 解析错误响应
export const parseErrorResponse = async (response: Response): Promise<never> => {
  let errorMessage = "生成失败";
  try {
    const data = await response.json();
    if (response.status === 429) {
      errorMessage =
        data.error ||
        `已达今日额度上限（已用 ${data.used ?? "-"} / 上限 ${data.limit ?? "-"}），请稍后再试`;
    } else {
      errorMessage = data.error || errorMessage;
    }
  } catch {
    // ignore parse errors
  }
  throw new Error(errorMessage);
};

/**
 * Convert ApiPanel array to PanelData array
 */
export function apiPanelsToPanelData(apiPanels: ApiPanel[]): PanelData[] {
  return apiPanels.map(panel => ({
    id: panel.id,
    description: panel.description || "",
    dialogue: panel.dialogue || "",
    type: (panel.panel_type || "medium") as "closeup" | "medium" | "wide" | "action" | "dialogue" | "transition",
    importance: (panel.importance || "medium") as "high" | "medium" | "low",
    cameraAngle: panel.camera_angle || undefined,
    shotSize: panel.shot_size || undefined,
    englishPrompt: panel.prompt_used || undefined,
    generatedImage: panel.generated_image || undefined,
  }));
}

/**
 * Convert PanelData array back to ApiPanel array
 */
export function panelDataToApiPanels(
  panelDataArray: PanelData[],
  currentProject: ApiProject
): ApiPanel[] {
  return panelDataArray.map((panel, index) => {
    // Find the original panel to preserve fields not in PanelData
    const originalPanel = currentProject.panels.find(p => p.id === panel.id);

    return {
      id: panel.id,
      panel_order: index,
      description: panel.description,
      dialogue: panel.dialogue || null,
      panel_type: panel.type,
      importance: panel.importance,
      camera_angle: panel.cameraAngle || null,
      shot_size: panel.shotSize || null,
      prompt_used: panel.englishPrompt || null,
      generated_image: panel.generatedImage || null,
      character_id: originalPanel?.character_id || null, // Use character_id
      emotion: originalPanel?.emotion || null,
      script_segment_id: originalPanel?.script_segment_id || null,
      script_start: originalPanel?.script_start || null,
      script_end: originalPanel?.script_end || null,
      visual_prompt: originalPanel?.visual_prompt || null,
      created_at: originalPanel?.created_at || new Date().toISOString(),
    };
  });
}
