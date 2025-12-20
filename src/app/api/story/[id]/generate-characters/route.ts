import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { callImageGenerationByType } from "@/lib/image-generation";
import type { CharacterRole } from "@/types/phase2.types";

const VALID_ROLES: CharacterRole[] = ["protagonist", "antagonist", "supporting", "minor"];

interface GeneratedCharacterData {
  name: string;
  description: string;
  appearance: string;
  role: CharacterRole;
}

interface GeneratedCharacterResult {
  name: string;
  description: string;
  appearance: string;
  role: CharacterRole;
  image_base64: string;
  optimized_prompt: string;
}

const SYSTEM_PROMPT = `你是专业的漫画角色设计师。请根据故事背景分析并生成符合故事需要的角色。

硬性要求：
- 只输出 JSON 数组，不要添加任何解释、前后缀或 markdown 代码块
- 字段使用半角双引号；未提及字段不得新增；缺失值用 null
- description 中文 50-120 字；appearance 必须英文（80-160 chars），禁止涉黄/暴力/政治/真实人物/网站
- 至少包含一个 role 为 protagonist

任务：
1. 分析故事的 premise（前提）和 genre（类型）
2. 生成指定数量的角色，每个角色包含：
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

/**
 * POST /api/story/[id]/generate-characters
 * 根据故事背景AI生成角色
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;

    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // Get story and verify ownership
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { count = 3 } = body as { count?: number };

    // Validate count
    const characterCount = Math.min(Math.max(count, 1), 5);

    // Build user message
    const outlineText = story.outline
      ? (typeof story.outline === 'string'
          ? story.outline
          : JSON.stringify(story.outline, null, 2))
      : "";

    const userMessage = `
<story_title>${story.title}</story_title>
<story_genre>${story.genre || "未指定"}</story_genre>
<story_premise>${story.premise || "未提供"}</story_premise>
${outlineText ? `<story_outline>${outlineText}</story_outline>` : ""}

请生成 ${characterCount} 个角色，只输出上方格式的 JSON 数组，不要任何解释。`;

    // Step 1: Call LLM to generate character descriptions
    console.log("[generate-characters] Calling LLM for character generation...");

    const llmResult = await callChatCompletionByType({
      providerType: "story_character_generator",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
      maxTokens: 2000,
      options: {
        userId: payload.userId,
      },
    });

    // Parse LLM response
    let characterDataList: GeneratedCharacterData[];
    try {
      // Try to extract JSON from response
      const jsonMatch = llmResult.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("LLM响应中未找到JSON数组");
      }
      characterDataList = JSON.parse(jsonMatch[0]);

      // Validate and normalize roles
      characterDataList = characterDataList.map(char => ({
        ...char,
        role: VALID_ROLES.includes(char.role as CharacterRole)
          ? char.role as CharacterRole
          : "supporting",
      }));
    } catch (parseError) {
      console.error("[generate-characters] Failed to parse LLM response:", llmResult.content);
      return NextResponse.json(
        { error: "AI生成的角色数据格式错误，请重试" },
        { status: 500 }
      );
    }

    // Step 2: Generate images for each character in parallel
    console.log(`[generate-characters] Generating ${characterDataList.length} character images...`);

    const imagePromises = characterDataList.map(async (charData) => {
      const imagePrompt = buildImagePrompt(charData.appearance, story.genre || "");

      try {
        const imageResult = await callImageGenerationByType({
          providerType: "image_generation",
          prompt: imagePrompt,
          negative_prompt: "blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, extra limbs, mutation, disfigured, watermark, text, signature",
          width: 512,
          height: 768,
          steps: 25,
          cfg_scale: 7.5,
          options: {
            userId: payload.userId,
          },
        });

        if (imageResult.success && imageResult.images.length > 0) {
          return {
            ...charData,
            image_base64: imageResult.images[0],
            optimized_prompt: imagePrompt,
          };
        } else {
          // Image generation failed, return character without image
          console.warn(`[generate-characters] Image generation failed for ${charData.name}:`, imageResult.error);
          return {
            ...charData,
            image_base64: "",
            optimized_prompt: imagePrompt,
          };
        }
      } catch (imgError) {
        console.error(`[generate-characters] Image generation error for ${charData.name}:`, imgError);
        return {
          ...charData,
          image_base64: "",
          optimized_prompt: imagePrompt,
        };
      }
    });

    const generatedCharacters: GeneratedCharacterResult[] = await Promise.all(imagePromises);

    // Calculate credits used
    const creditsUsed = llmResult.creditsCost + generatedCharacters.filter(c => c.image_base64).length;

    return NextResponse.json({
      success: true,
      generated_characters: generatedCharacters,
      story_context: {
        title: story.title,
        premise: story.premise,
        genre: story.genre,
      },
      credits_used: creditsUsed,
    });

  } catch (error) {
    console.error("[generate-characters] Error:", error);

    // Handle credit errors
    if (error instanceof Error && 'code' in error && error.code === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成角色失败" },
      { status: 500 }
    );
  }
}

/**
 * Build optimized image prompt for character generation
 */
function buildImagePrompt(appearance: string, genre: string): string {
  // Genre-specific style modifiers
  const genreStyles: Record<string, string> = {
    suspense: "dark atmosphere, dramatic lighting, noir style",
    romance: "soft lighting, warm colors, elegant",
    adventure: "dynamic pose, action-ready, adventurous spirit",
    scifi: "futuristic, sci-fi elements, cyberpunk aesthetic",
    daily: "casual, everyday life, natural lighting",
    fantasy: "magical, fantasy elements, ethereal",
  };

  const genreStyle = genreStyles[genre] || "";

  return `${appearance}, character portrait, manga style, anime art, detailed face, high quality illustration, professional character design, clean background, ${genreStyle}`.trim();
}
