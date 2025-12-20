/**
 * Panel Generator - Core logic for AI panel/storyboard generation from chapter summary
 */

import { callChatCompletionByType, callChatCompletionStreamByType } from "./llm-provider";
import {
  loadChapterContext,
  formatChapterContextForPrompt,
  type ChapterContext,
} from "./chapter-context-loader";

export interface PanelGenerationParams {
  chapterTitle: string;
  chapterSummary: string;
  storyTitle: string;
  genre: string;
  panelCount?: number;
  styleConfig?: {
    comic_style_prompt?: string | null; // From ComicStyle.prompt_prefix
    style_reference_image?: string | null; // Reference image URL
  };
  // Phase 4: Enhanced context for long-form storytelling
  chapterId?: string; // If provided, load intelligent context
}

export interface GeneratedPanel {
  panel_order: number;
  description: string;
  visual_prompt: string;
  dialogue?: string;
  panel_type: string; // wide, medium, closeup, action, dialogue, transition
  importance: string; // high, medium, low
  camera_angle?: string; // 俯视, 仰视, 平视, 荷兰角
  shot_size?: string; // 特写, 近景, 中景, 全景, 远景
  camera_movement?: string; // static, push_in, pull_out, pan_left, pan_right, tilt_up, tilt_down, dolly, zoom
  movement_speed?: string; // slow, medium, fast, sudden
  movement_direction?: string; // 补充描述
}

const PANEL_GENERATION_SYSTEM_PROMPT = `你是一位资深漫画分镜师和视觉叙事专家，擅长将文字剧本转化为分镜脚本。

任务：根据章节梗概，生成详细的分镜脚本（panel-by-panel breakdown）。

输出要求（严格JSON格式）：
{
  "panels": [
    {
      "panel_order": 1,
      "description": "场景和动作的详细描述（客观描述画面内容，100-150字）",
      "visual_prompt": "用于AI绘图的视觉提示词（英文或中文，包含画面元素、构图、光影、氛围）",
      "dialogue": "角色对话（如果有）",
      "panel_type": "wide/medium/closeup/action/dialogue/transition",
      "importance": "high/medium/low",
      "camera_angle": "俯视/仰视/平视/荷兰角",
      "shot_size": "特写/近景/中景/全景/远景",
      "camera_movement": "static/push_in/pull_out/pan_left/pan_right/tilt_up/tilt_down/dolly/zoom",
      "movement_speed": "slow/medium/fast/sudden",
      "movement_direction": "补充描述（可选）"
    }
  ]
}

分镜类型说明：
- wide: 宽幅画面，展示环境、建立场景
- medium: 中景画面，展示角色和部分环境
- closeup: 特写画面，强调表情或细节
- action: 动作场景，展示角色动作
- dialogue: 对话场景，角色对话为主
- transition: 过渡画面，连接场景

重要性说明：
- high: 关键剧情转折、重要对话、高潮时刻
- medium: 推动剧情的场景
- low: 过渡性场景、环境展示

镜头角度：
- 俯视：从上往下看，常用于展示全景或营造压迫感
- 仰视：从下往上看，常用于表现角色力量或威严
- 平视：水平视角，最自然的观看角度
- 荷兰角：倾斜视角，营造不安或紧张感

景别：
- 特写：脸部或物体细节
- 近景：上半身或物体局部
- 中景：全身或场景局部
- 全景：完整角色和周围环境
- 远景：广阔的环境全景

运镜类型：
- static: 静止镜头，无运镜（默认）
- push_in: 推镜，向主体推进，强化情感
- pull_out: 拉镜，拉远展示环境
- pan_left/pan_right: 左摇/右摇，展示横向空间
- tilt_up/tilt_down: 上摇/下摇，展示纵向空间
- dolly: 移动镜头，跟随主体
- zoom: 变焦特效，快速放大/缩小

运镜速度：
- slow: 缓慢（3-5秒），营造氛围
- medium: 中速（1-2秒），常规叙事
- fast: 快速（0.5-1秒），动作场景
- sudden: 突然（瞬间），惊吓/震撼效果

规则：
1. 每个章节通常8-20个分镜，根据内容复杂度调整
2. 开场用wide建立场景，关键时刻用closeup强化情感
3. 对话场景：先全景建立，再切到中景/近景对话
4. 动作场景：用多个分镜展示动作过程，注意节奏
5. visual_prompt要具体可视化，包含人物动作、表情、环境、光影、氛围
6. dialogue只在需要时添加，避免过度依赖文字
7. 确保分镜间有视觉连贯性和节奏变化

8. 运镜设计原则：
   - 对话场景优先使用static，保持稳定
   - 情感强化时使用push_in（慢速）
   - 建立镜头用pull_out揭示环境
   - 动作追逐用dolly或pan跟随
   - 震撼时刻用zoom+sudden制造冲击
   - 避免过度使用运镜，60%分镜应为static`;

/**
 * Try to fix common JSON syntax errors and extract JSON from markdown
 */
function tryFixJSON(text: string): string {
  let cleaned = text.trim();

  // Extract JSON from markdown code blocks
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  // Remove BOM and other invisible characters
  cleaned = cleaned.replace(/^\uFEFF/, "");
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");

  return cleaned;
}

/**
 * Generate panel storyboard from chapter summary using LLM
 */
export async function generatePanelsFromChapter(
  params: PanelGenerationParams,
  userId?: string
): Promise<GeneratedPanel[]> {
  const { chapterTitle, chapterSummary, storyTitle, genre, panelCount, styleConfig } = params;

  // Build style instruction
  let styleInstruction = "";
  if (styleConfig?.style_reference_image) {
    styleInstruction = `\n\n【重要】故事风格要求：
- 参考图片URL：${styleConfig.style_reference_image}
- 请在 visual_prompt 中强调从参考图片提取的风格特征（色调、笔触、光影、氛围等）
- 注意：仅提取风格，不包含参考图中的具体人物或对象`;
  } else if (styleConfig?.comic_style_prompt) {
    styleInstruction = `\n\n【重要】故事风格要求：
- 风格描述：${styleConfig.comic_style_prompt}
- 请在 visual_prompt 中融合此风格特征`;
  }

  const userPrompt = `
故事标题：${storyTitle}
故事类型：${genre}
章节标题：${chapterTitle}

章节梗概：
${chapterSummary}

要求生成分镜数量：${panelCount || "根据内容决定（建议8-15个分镜）"}${styleInstruction}

请根据以上信息，生成详细的分镜脚本。确保每个分镜都有清晰的视觉描述和构图设计。
`.trim();

  const result = await callChatCompletionByType({
    providerType: "script_analyzer", // 使用 script_analyzer 或 story_generator
    messages: [
      { role: "system", content: PANEL_GENERATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.8,
    maxTokens: 4000,
    options: userId ? { userId } : { skipCreditsCheck: true },
  });

  try {
    const content = tryFixJSON(result.content);
    const parsed = JSON.parse(content);

    if (!parsed.panels || !Array.isArray(parsed.panels)) {
      throw new Error("LLM返回的数据格式错误：缺少panels数组");
    }

    // Validate panel structure
    const panels = parsed.panels as GeneratedPanel[];
    for (const panel of panels) {
      if (typeof panel.panel_order !== "number" || panel.panel_order < 1) {
        throw new Error("分镜缺少有效的顺序号");
      }
      if (!panel.description || typeof panel.description !== "string") {
        throw new Error(`分镜 ${panel.panel_order} 缺少描述`);
      }
      if (!panel.visual_prompt || typeof panel.visual_prompt !== "string") {
        throw new Error(`分镜 ${panel.panel_order} 缺少视觉提示词`);
      }
      if (!panel.panel_type) {
        panel.panel_type = "medium"; // 默认值
      }
      if (!panel.importance) {
        panel.importance = "medium"; // 默认值
      }
    }

    // Sort by panel_order to ensure correct order
    panels.sort((a, b) => a.panel_order - b.panel_order);

    return panels;
  } catch (error) {
    console.error("Failed to parse panel generation response:", error);
    console.error("Raw response:", result.content);
    throw new Error(
      `解析分镜生成结果失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

/**
 * 流式生成分镜（支持实时推送生成进度）
 * @param onChunk 接收每个文本片段的回调函数
 */
export async function generatePanelsFromChapterStream(
  params: PanelGenerationParams,
  onChunk: (chunk: string) => void,
  userId?: string
): Promise<GeneratedPanel[]> {
  const { chapterTitle, chapterSummary, storyTitle, genre, panelCount, styleConfig, chapterId } = params;

  // Build style instruction
  let styleInstruction = "";
  if (styleConfig?.style_reference_image) {
    styleInstruction = `\n\n【重要】故事风格要求：
- 参考图片URL：${styleConfig.style_reference_image}
- 请在 visual_prompt 中强调从参考图片提取的风格特征（色调、笔触、光影、氛围等）
- 注意：仅提取风格，不包含参考图中的具体人物或对象`;
  } else if (styleConfig?.comic_style_prompt) {
    styleInstruction = `\n\n【重要】故事风格要求：
- 风格描述：${styleConfig.comic_style_prompt}
- 请在 visual_prompt 中融合此风格特征`;
  }

  // Phase 4: Load intelligent context if chapterId is provided
  let contextPrompt: string;
  if (chapterId) {
    try {
      const context = await loadChapterContext(chapterId, {
        recentChaptersCount: 10,
        includeFirstChapter: true,
        includeKeyChapters: true,
        includeCharacterStates: true,
      });

      contextPrompt = formatChapterContextForPrompt(context);
    } catch (error) {
      console.error("Failed to load chapter context, falling back to basic mode:", error);
      // Fallback to basic mode
      contextPrompt = `
故事标题：${storyTitle}
故事类型：${genre}
章节标题：${chapterTitle}

章节梗概：
${chapterSummary}`;
    }
  } else {
    // Legacy mode: use basic context
    contextPrompt = `
故事标题：${storyTitle}
故事类型：${genre}
章节标题：${chapterTitle}

章节梗概：
${chapterSummary}`;
  }

  const userPrompt = `
${contextPrompt}

要求生成分镜数量：${panelCount || "根据内容决定（建议8-15个分镜）"}${styleInstruction}

请根据以上信息，生成详细的分镜脚本。确保每个分镜都有清晰的视觉描述和构图设计。

${chapterId ? `
【重要提示】
1. 生成分镜时要保持与前面章节的连贯性
2. 尊重角色当前状态（如受伤的角色不能突然健步如飞）
3. 如果有伏笔或悬念，注意呼应
4. 注意角色关系的变化和情感延续` : ""}
`.trim();

  let accumulatedContent = "";

  // 使用流式调用
  const stream = callChatCompletionStreamByType({
    providerType: "script_analyzer",
    messages: [
      { role: "system", content: PANEL_GENERATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    maxTokens: 4000,
    options: userId ? { userId } : { skipCreditsCheck: true },
  });

  // 逐块累积内容
  for await (const chunk of stream) {
    accumulatedContent += chunk;
    onChunk(chunk); // 实时推送给调用者
  }

  // 解析完整响应
  try {
    const content = tryFixJSON(accumulatedContent);
    const parsed = JSON.parse(content);

    if (!parsed.panels || !Array.isArray(parsed.panels)) {
      throw new Error("LLM返回的数据格式错误：缺少panels数组");
    }

    // Validate panel structure
    const panels = parsed.panels as GeneratedPanel[];
    for (const panel of panels) {
      if (typeof panel.panel_order !== "number" || panel.panel_order < 1) {
        throw new Error("分镜缺少有效的顺序号");
      }
      if (!panel.description || typeof panel.description !== "string") {
        throw new Error(`分镜 ${panel.panel_order} 缺少描述`);
      }
      if (!panel.visual_prompt || typeof panel.visual_prompt !== "string") {
        throw new Error(`分镜 ${panel.panel_order} 缺少视觉提示词`);
      }
      if (!panel.panel_type) {
        panel.panel_type = "medium"; // 默认值
      }
      if (!panel.importance) {
        panel.importance = "medium"; // 默认值
      }
    }

    // Sort by panel_order to ensure correct order
    panels.sort((a, b) => a.panel_order - b.panel_order);

    return panels;
  } catch (error) {
    console.error("Failed to parse panel generation response:", error);
    console.error("Raw accumulated content:", accumulatedContent);
    throw new Error(
      `解析分镜生成结果失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}
