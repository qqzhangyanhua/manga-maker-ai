/**
 * POST /api/story/[id]/analyze-characters
 * 第一步：分析故事并生成建议角色列表（仅文本描述，无图片）
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import type { SuggestedCharacter, SuggestedCharactersData } from "@/types/suggested-characters.types";
import type { CharacterRole } from "@/components/StoryCharacter/types";

const VALID_ROLES: CharacterRole[] = ["protagonist", "antagonist", "supporting", "minor"];

interface RequestBody {
  count?: number;
  comic_style_id?: string;
  force_regenerate?: boolean;
}

interface GeneratedCharacterData {
  name: string;
  description: string;
  appearance: string;
  role: CharacterRole;
}

const ANALYZE_SYSTEM_PROMPT = `你是专业的漫画角色设计师。请根据故事背景分析并列出符合故事需要的角色。

硬性要求：
- 只输出 JSON 数组，不要添加任何解释、前后缀或 markdown 代码块
- 字段使用半角双引号；未提及字段不得新增；缺失值用 null
- description 中文 50-120 字；appearance 必须英文（80-160 chars），禁止涉黄/暴力/政治/真实人物/网站
- 至少包含一个 role 为 protagonist

任务：
1. 分析故事的 premise（前提）、genre（类型）和 outline（大纲）
2. 列出指定数量的角色，每个角色包含：
   - name: 角色名字（简短有特色）
   - description: 角色背景和性格描述（50-120字中文）
   - appearance: 外貌特征（英文，包含性别、年龄、发型、发色、眼睛颜色、服装风格等，便于 AI 绘画）
   - role: 角色类型（protagonist/antagonist/supporting/minor）

要求：
- 角色之间要有互动关系和张力
- 外貌描述要具体、可视化，便于AI绘画
- 适合故事类型的角色设计
- 必须包含至少一个主角(protagonist)

输出格式（仅此 JSON，不要其他文字）：
[
  {
    "name": "角色名",
    "description": "背景和性格描述",
    "appearance": "English appearance description for AI image generation",
    "role": "protagonist|antagonist|supporting|minor"
  }
]`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const { id: storyId } = await params;

    // 认证检查
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }
    userId = payload.userId;

    // 获取故事并验证所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 解析请求体
    const body = (await req.json()) as RequestBody;
    const { count = 3, comic_style_id, force_regenerate = false } = body;

    // 验证数量（3-5个）
    const characterCount = Math.min(Math.max(count, 3), 5);

    // 如果已有建议角色且不强制重新生成，直接返回
    if (story.suggested_characters && !force_regenerate) {
      const existingData = story.suggested_characters as unknown as SuggestedCharactersData;
      return NextResponse.json({
        success: true,
        suggested_characters: existingData.characters,
        story_context: {
          title: story.title,
          premise: story.premise,
          genre: story.genre,
        },
        credits_used: 0,
        from_cache: true,
      });
    }

    // 获取漫画风格（优先使用请求参数，否则使用故事默认风格）
    let comicStylePrompt: string | null = null;
    const styleId = comic_style_id || story.comic_style_id;

    if (styleId) {
      const comicStyle = await prisma.comicStyle.findUnique({
        where: { id: styleId },
        select: { prompt_prefix: true, name_zh: true },
      });
      if (comicStyle && comicStyle.prompt_prefix) {
        comicStylePrompt = comicStyle.prompt_prefix;
        console.log(`[analyze-characters] Using comic style: ${comicStyle.name_zh}`);
      }
    }

    // 构建用户消息
    const outlineText = story.outline
      ? typeof story.outline === "string"
        ? story.outline
        : JSON.stringify(story.outline, null, 2)
      : "";

    const userMessage = `
<story_title>${story.title}</story_title>
<story_genre>${story.genre || "未指定"}</story_genre>
<story_premise>${story.premise || "未提供"}</story_premise>
${outlineText ? `<story_outline>${outlineText}</story_outline>` : ""}
${comicStylePrompt ? `<comic_style>${comicStylePrompt}</comic_style>` : ""}

请生成 ${characterCount} 个角色，只输出上方格式的 JSON 数组，不要任何解释。`;

    // 调用 LLM 生成角色描述
    console.log("[analyze-characters] Calling LLM for character analysis...");

    const llmResult = await callChatCompletionByType({
      providerType: "story_character_generator",
      messages: [
        { role: "system", content: ANALYZE_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
      maxTokens: 2000,
      options: {
        userId,
      },
    });

    // 解析 LLM 响应
    let characterDataList: GeneratedCharacterData[];
    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = llmResult.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("LLM响应中未找到JSON数组");
      }
      characterDataList = JSON.parse(jsonMatch[0]);

      // 验证并规范化角色类型
      characterDataList = characterDataList.map((char) => ({
        ...char,
        role: VALID_ROLES.includes(char.role as CharacterRole)
          ? (char.role as CharacterRole)
          : "supporting",
      }));
    } catch (parseError) {
      console.error("[analyze-characters] Failed to parse LLM response:", llmResult.content);
      return NextResponse.json(
        { error: "AI生成的角色数据格式错误，请重试" },
        { status: 500 }
      );
    }

    // 生成建议角色列表（添加 temp_id）
    const suggestedCharacters: SuggestedCharacter[] = characterDataList.map((char) => ({
      temp_id: `temp_${crypto.randomUUID()}`,
      name: char.name,
      description: char.description,
      appearance: char.appearance,
      role: char.role,
      generated: false,
      character_id: null,
    }));

    // 构建完整数据结构
    const suggestedCharactersData: SuggestedCharactersData = {
      version: "1.0",
      generated_at: new Date().toISOString(),
      characters: suggestedCharacters,
      comic_style_id: styleId || null,
      settings: {
        count: characterCount,
        temperature: 0.8,
      },
    };

    // 保存到数据库
    await prisma.story.update({
      where: { id: storyId },
      data: {
        suggested_characters: suggestedCharactersData as any,
      },
    });

    console.log(`[analyze-characters] Generated ${suggestedCharacters.length} characters`);
    console.log(`[analyze-characters] Duration: ${Date.now() - startedAt}ms`);

    return NextResponse.json({
      success: true,
      suggested_characters: suggestedCharacters,
      story_context: {
        title: story.title,
        premise: story.premise,
        genre: story.genre,
      },
      credits_used: llmResult.creditsCost,
    });
  } catch (error) {
    console.error("[analyze-characters] Error:", error);

    // 处理算力不足错误
    if (error instanceof Error && "code" in error && error.code === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析角色失败" },
      { status: 500 }
    );
  }
}
