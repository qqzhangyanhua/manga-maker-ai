import { ApiPanel } from "./types";
import { PanelData } from "@/components/Storyboard/StoryboardPanel";

// 转换API数据为前端格式
export const convertApiPanelToLocal = (apiPanel: ApiPanel): PanelData => ({
  id: apiPanel.id,
  type: apiPanel.panel_type as PanelData["type"],
  importance: apiPanel.importance as PanelData["importance"],
  description: apiPanel.description,
  dialogue: apiPanel.dialogue || undefined,
  character: apiPanel.character_name || undefined,
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
