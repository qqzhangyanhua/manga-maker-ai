/**
 * Nine Grid Generator - 九宫格分镜生成器
 * 生成具有清晰叙事推进关系的 3×3 九宫格分镜提示词文本
 */

import { callChatCompletionByType } from "./llm-provider";

export interface NineGridGenerationParams {
  plotSummary: string;      // 剧情概述
  theme?: string;           // 画面主题（漫画风格名称）
  stylePrompt?: string;     // 风格提示词（漫画风格的 prompt_prefix）
  referenceImage?: string;  // 参考图 URL
  storyTitle?: string;      // 故事标题（用于上下文）
  genre?: string;           // 故事类型
}

export interface NineGridPanel {
  panel_order: number;
  description: string;      // 镜头描述
  visual_prompt: string;    // 视觉提示词
  camera_angle?: string;    // 镜头角度
  shot_size?: string;       // 景别
  panel_type: string;       // 分镜类型
  importance: string;       // 重要性
}

const NINE_GRID_SYSTEM_PROMPT = `你是一位资深电影分镜师和视觉叙事专家，擅长创作具有电影感的连续分镜脚本。

任务：根据用户提供的【剧情概述 / 画面主题 / 参考图】，生成一组具有清晰叙事推进关系的 3×3 九宫格分镜提示词文本，共 9 个连续镜头。

核心要求：

1. **场景与时间统一**：
   - 全部镜头发生在同一场景与同一时间轴内
   - 九个画面之间必须存在明确的前后承接关系
   - 形成连续的动作、视线或情绪推进
   - 不是彼此孤立的画面拼接

2. **电影镜头语言**：
   - 在整体叙事推进中自然涵盖：远景、中景、近景、特写等不同景别
   - 根据剧情需要灵活使用：正视、侧视、背视、过肩、内反打、轻微俯仰等视角变化
   - 用于强化空间关系、人物心理与节奏起伏
   - 镜头景别与角度不与编号固定绑定，而是由剧情发展自动选择最合适的表现方式
   - 使九个镜头整体读起来具备真实影视分镜的流动感

3. **场景与人物补全**：
   - 当用户仅提供剧情文字时，应主动补全合理的：
     * 场景结构（室内/室外、具体环境）
     * 人物站位（空间关系）
     * 行动路线（移动轨迹）
     * 镜头关系（视线、轴线）
   - 使画面具备清晰空间逻辑

4. **参考图继承**：
   - 当用户提供参考图时，将其作为统一依据：
     * 人物外观（面部特征、发型）
     * 服装风格（颜色、款式）
     * 色彩倾向（整体色调）
     * 美术气质（画风、质感）
   - 在全部九个镜头中严格继承，不得随镜头推进出现风格变化或角色漂移

5. **视觉一致性**：
   - 人物的外观、服装、体型比例、面部特征保持一致
   - 整体色彩倾向与光照条件统一
   - 仅允许人物动作、姿态以及镜头远近和角度发生变化
   - 不得出现角色变形、肢体缺失、结构错乱或美术风格断裂

6. **输出格式**：
   - 最终仅输出文本内容，不生成任何图片或视频
   - 输出结果只包含 9 条连续的分镜提示词
   - 每一条需清晰描述：
     * 视角关系
     * 画面构图
     * 人物状态
     * 正在发生的动作或情绪变化
   - 文本应可直接用于后续生图或生视频模型作为分镜提示词使用

景别说明：
- 远景（Extreme Long Shot）：展示整体环境，建立场景氛围
- 全景（Long Shot）：完整人物+周围环境，展示空间关系
- 中景（Medium Shot）：腰部以上或场景局部，平衡人物与环境
- 近景（Close-up）：胸部以上，强调表情和情绪
- 特写（Extreme Close-up）：面部或物体细节，强化情感冲击

视角说明：
- 正视：直接面对主体，最直接的情感传达
- 侧视：从侧面观察，展示轮廓和空间关系
- 背视：从背后观察，营造代入感或悬念
- 过肩：从一个角色肩膀后看向另一角色，强化对话关系
- 内反打：对话场景中的反向镜头，展示双方视角
- 俯视：从上往下看，营造压迫感或展示全局
- 仰视：从下往上看，表现力量或威严

输出要求（严格JSON格式）：
{
  "panels": [
    {
      "panel_order": 1,
      "description": "镜头的详细描述（150-200字），包含场景、人物、动作、情绪、空间关系",
      "visual_prompt": "用于AI绘图的视觉提示词（中文或英文，包含画面元素、构图、光影、氛围、人物外观细节）",
      "camera_angle": "正视/侧视/背视/过肩/俯视/仰视",
      "shot_size": "远景/全景/中景/近景/特写",
      "panel_type": "action/dialogue/emotion/transition",
      "importance": "high/medium/low"
    }
  ]
}

重要提示：
- 必须严格输出 9 个镜头，不多不少
- 每个镜头的 description 必须体现与前后镜头的承接关系
- visual_prompt 必须包含足够的细节以保证视觉一致性
- 如果提供了参考图 URL，在 visual_prompt 中明确引用其风格特征`;

/**
 * 生成九宫格分镜提示词
 */
export async function generateNineGridPanels(
  params: NineGridGenerationParams,
  userId?: string
): Promise<NineGridPanel[]> {
  const { plotSummary, theme, stylePrompt, referenceImage, storyTitle, genre } = params;

  // 构建用户提示词
  let userPrompt = `请为以下内容生成九宫格分镜（9个连续镜头）：\n\n`;

  if (storyTitle) {
    userPrompt += `故事标题：${storyTitle}\n`;
  }

  if (genre) {
    userPrompt += `故事类型：${genre}\n`;
  }

  userPrompt += `\n【剧情概述】\n${plotSummary}\n`;

  if (theme) {
    userPrompt += `\n【漫画风格】\n${theme}\n`;
  }

  if (stylePrompt) {
    userPrompt += `\n【风格提示词】\n${stylePrompt}\n`;
    userPrompt += `\n请在所有9个镜头的 visual_prompt 中应用这个风格提示词。\n`;
  }

  if (referenceImage) {
    userPrompt += `\n【参考图】\n${referenceImage}\n`;
    userPrompt += `\n重要：请严格参考该图片的人物外观、服装风格、色彩倾向和美术气质，在所有9个镜头中保持一致。\n`;
  }

  userPrompt += `\n请生成恰好 9 个连续的分镜镜头，确保它们在同一场景和时间轴内形成流畅的叙事推进。`;

  try {
    const response = await callChatCompletionByType({
      providerType: "script_analyzer",
      messages: [
        { role: "system", content: NINE_GRID_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 3000,
      options: userId ? { userId } : { skipCreditsCheck: true },
    });

    const content = response.content.trim();

    // 尝试解析 JSON
    let parsed: { panels?: NineGridPanel[] };
    try {
      // 移除可能的 markdown 代码块标记
      const jsonContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("JSON 解析失败:", parseError);
      console.error("原始内容:", content);
      throw new Error("AI 返回的内容格式不正确，无法解析为 JSON");
    }

    if (!parsed.panels || !Array.isArray(parsed.panels)) {
      throw new Error("AI 返回的 JSON 缺少 panels 数组");
    }

    // 验证是否恰好 9 个镜头
    if (parsed.panels.length !== 9) {
      console.warn(`期望 9 个镜头，但收到 ${parsed.panels.length} 个，将进行调整`);
      
      if (parsed.panels.length < 9) {
        throw new Error(`生成的镜头数量不足：期望 9 个，实际 ${parsed.panels.length} 个`);
      }
      
      // 如果超过 9 个，只取前 9 个
      parsed.panels = parsed.panels.slice(0, 9);
    }

    // 规范化数据
    const normalizedPanels: NineGridPanel[] = parsed.panels.map((panel, index) => ({
      panel_order: index + 1,
      description: panel.description || "",
      visual_prompt: panel.visual_prompt || panel.description || "",
      camera_angle: panel.camera_angle || "平视",
      shot_size: panel.shot_size || "中景",
      panel_type: panel.panel_type || "action",
      importance: panel.importance || "medium",
    }));

    return normalizedPanels;
  } catch (error) {
    console.error("九宫格分镜生成失败:", error);
    throw error;
  }
}

/**
 * 格式化九宫格分镜为用户友好的文本输出
 */
export function formatNineGridPanelsAsText(panels: NineGridPanel[]): string {
  return panels
    .map((panel, index) => {
      const num = String(index + 1).padStart(2, "0");
      return `镜头${num}：${panel.description}`;
    })
    .join("\n\n");
}
