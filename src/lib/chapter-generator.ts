/**
 * Chapter Generator - Core logic for AI chapter generation from story outline
 */

import { callChatCompletionByType, callChatCompletionStreamByType } from "./llm-provider";

export interface ChapterGenerationParams {
  storyTitle: string;
  premise: string;
  genre: string;
  outline: Record<string, unknown>;
  chapterCount?: number;
}

export interface GeneratedChapter {
  title: string;
  summary: string;
  chapter_order: number;
  is_key_chapter?: boolean; // AI自动识别的关键章节
  key_chapter_reason?: string; // 为什么这是关键章节
}

const CHAPTER_GENERATION_SYSTEM_PROMPT = `你是一位资深编剧和故事策划师，擅长将故事大纲拆分成结构化的章节。

任务：根据用户提供的故事大纲，生成合理的章节划分和每章梗概。

输出要求（严格JSON格式）：
{
  "chapters": [
    {
      "title": "第一章：标题（简洁有吸引力）",
      "summary": "本章详细梗概（包含关键事件、角色动作、情节转折，200-300字）",
      "chapter_order": 1,
      "is_key_chapter": false,
      "key_chapter_reason": null
    },
    {
      "title": "第二章：标题",
      "summary": "本章详细梗概",
      "chapter_order": 2,
      "is_key_chapter": true,
      "key_chapter_reason": "主角首次遭遇反派，重大情节转折"
    }
  ]
}

规则：
1. 章节数量根据故事长度和复杂度决定，通常5-15章
2. 每章应该有明确的戏剧焦点（一个主要事件或转折）
3. 章节之间要有清晰的因果关系和递进感
4. 梗概要足够详细，能指导后续分镜生成
5. 标题要能体现本章核心冲突或主题
6. 确保故事节奏：前1/4建立，中间1/2对抗升级，最后1/4高潮解决
7. 每章梗概必须包含具体场景、角色行动和情节进展，不能过于抽象

关键章节识别标准（is_key_chapter = true）：
- 重大情节转折（如角色死亡、身份揭露、背叛）
- 主要冲突的开始或高潮（如首次对抗、决战）
- 角色关系的重大变化（如结盟、决裂、爱情确立）
- 世界观的重大揭示（如真相大白、阴谋暴露）
- 故事节奏的关键节点（如开场建立、中场转折、高潮、结局）

通常5-12章的故事中，应有2-4个关键章节。关键章节要分散分布，不要集中在结尾。`;

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
 * Generate chapter structure from story outline using LLM
 */
export async function generateChapters(
  params: ChapterGenerationParams,
  userId?: string
): Promise<GeneratedChapter[]> {
  const { storyTitle, premise, genre, outline, chapterCount } = params;

  const userPrompt = `
故事标题：${storyTitle}
故事类型：${genre}
创意前提：${premise}

故事大纲：
${JSON.stringify(outline, null, 2)}

要求生成章节数量：${chapterCount || "根据故事内容决定（建议5-12章）"}

请根据以上信息，生成结构化的章节划分。确保每章梗概足够详细，能够指导后续的分镜脚本生成。
`.trim();

  const result = await callChatCompletionByType({
    providerType: "chapter_generator",
    messages: [
      { role: "system", content: CHAPTER_GENERATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 3000,
    options: userId ? { userId } : { skipCreditsCheck: true },
  });

  try {
    const content = tryFixJSON(result.content);
    const parsed = JSON.parse(content);

    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      throw new Error("LLM返回的数据格式错误：缺少chapters数组");
    }

    // Validate chapter structure and auto-assign chapter_order if missing
    const chapters = parsed.chapters as GeneratedChapter[];
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];

      if (!chapter.title || typeof chapter.title !== "string") {
        throw new Error("章节缺少有效的标题");
      }
      if (!chapter.summary || typeof chapter.summary !== "string") {
        throw new Error(`章节"${chapter.title}"缺少梗概`);
      }

      // Auto-assign chapter_order from array index if missing or invalid
      if (typeof chapter.chapter_order !== "number" || chapter.chapter_order < 1) {
        chapter.chapter_order = i + 1;
      }
    }

    // Sort by chapter_order to ensure correct order
    chapters.sort((a, b) => a.chapter_order - b.chapter_order);

    return chapters;
  } catch (error) {
    console.error("Failed to parse chapter generation response:", error);
    console.error("Raw response:", result.content);
    throw new Error(
      `解析章节生成结果失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

/**
 * Generate chapter structure from story outline using LLM (streaming version)
 */
export async function generateChaptersStream(
  params: ChapterGenerationParams,
  onChunk: (chunk: string) => void,
  userId?: string
): Promise<GeneratedChapter[]> {
  const { storyTitle, premise, genre, outline, chapterCount } = params;

  const userPrompt = `
故事标题：${storyTitle}
故事类型：${genre}
创意前提：${premise}

故事大纲：
${JSON.stringify(outline, null, 2)}

要求生成章节数量：${chapterCount || "根据故事内容决定（建议5-12章）"}

请根据以上信息，生成结构化的章节划分。确保每章梗概足够详细，能够指导后续的分镜脚本生成。
`.trim();

  let accumulatedContent = "";

  for await (const chunk of callChatCompletionStreamByType({
    providerType: "chapter_generator",
    messages: [
      { role: "system", content: CHAPTER_GENERATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 3000,
    options: userId ? { userId } : { skipCreditsCheck: true },
  })) {
    accumulatedContent += chunk;
    onChunk(chunk);
  }

  try {
    const content = tryFixJSON(accumulatedContent);
    const parsed = JSON.parse(content);

    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      throw new Error("LLM返回的数据格式错误：缺少chapters数组");
    }

    // Validate chapter structure and auto-assign chapter_order if missing
    const chapters = parsed.chapters as GeneratedChapter[];
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];

      if (!chapter.title || typeof chapter.title !== "string") {
        throw new Error("章节缺少有效的标题");
      }
      if (!chapter.summary || typeof chapter.summary !== "string") {
        throw new Error(`章节"${chapter.title}"缺少梗概`);
      }

      // Auto-assign chapter_order from array index if missing or invalid
      if (typeof chapter.chapter_order !== "number" || chapter.chapter_order < 1) {
        chapter.chapter_order = i + 1;
      }
    }

    // Sort by chapter_order to ensure correct order
    chapters.sort((a, b) => a.chapter_order - b.chapter_order);

    return chapters;
  } catch (error) {
    console.error("Failed to parse chapter generation response:", error);
    console.error("Raw response:", accumulatedContent);
    throw new Error(
      `解析章节生成结果失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}
