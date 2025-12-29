/**
 * API: POST /api/chapter/[id]/analyze-character-states
 *
 * Analyze chapter content and extract character states at chapter end
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { logError, logInfo } from "@/lib/api-logger";

const ANALYZE_CHARACTER_STATES_SYSTEM_PROMPT = `你是一位资深的故事分析师，擅长从章节内容中提取角色状态信息。

任务：分析章节内容，提取每个出现的角色在本章结束时的状态。

输出格式（严格JSON）：
{
  "character_states": [
    {
      "character_name": "角色名（必须与角色库中的name精确匹配）",
      "location": "角色所在位置（具体地点，如'废弃工厂三楼'、'学校天台'）",
      "physical_condition": "身体状况（如'右臂骨折，失血约500ml'、'体力透支，呼吸急促'、'健康'）",
      "mental_state": "心理/情绪状态（如'愤怒中保持冷静'、'绝望'、'决心复仇'）",
      "key_items": ["关键物品1", "关键物品2"],
      "relationship_changes": {
        "其他角色名": "关系变化描述（如'信任崩塌'、'产生好感'）"
      }
    }
  ]
}

规则：
1. 只提取在本章中明确出现的角色
2. 如果某个信息在章节中没有提及，可以设为null或空字符串
3. physical_condition要具体，包括伤势、疲劳程度等
4. mental_state要反映角色当前的心理状态和情绪
5. key_items只记录重要物品（武器、线索、证据等）
6. relationship_changes只记录本章中发生的关系变化
`;

interface CharacterStateInput {
  character_name: string;
  location?: string | null;
  physical_condition?: string | null;
  mental_state?: string | null;
  key_items?: string[];
  relationship_changes?: Record<string, string>;
}

interface AnalysisResult {
  character_states: CharacterStateInput[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    // 1. Authenticate
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { error: "无效的token" },
        { status: 401 }
      );
    }

    userId = payload.userId;
    const { id: chapterId } = await params;

    logInfo("Analyze character states request received", {
      endpoint: "/api/chapter/[id]/analyze-character-states",
      userId,
      chapterId,
    });

    // 2. Verify chapter ownership and get chapter content
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            id: true,
            user_id: true,
            title: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "章节不存在" },
        { status: 404 }
      );
    }

    if (chapter.story.user_id !== userId) {
      return NextResponse.json(
        { error: "无权限访问此章节" },
        { status: 403 }
      );
    }

    if (!chapter.content) {
      return NextResponse.json(
        { error: "章节尚未生成详细内容，请先扩展章节内容" },
        { status: 400 }
      );
    }

    // 3. Get story characters (from story_characters relation)
    const storyCharacters = await prisma.storyCharacter.findMany({
      where: { story_id: chapter.story_id },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (storyCharacters.length === 0) {
      return NextResponse.json(
        { error: "故事尚未添加角色，无法分析角色状态" },
        { status: 400 }
      );
    }

    // 4. Get previous chapter states for context
    const previousChapter = await prisma.chapter.findFirst({
      where: {
        story_id: chapter.story_id,
        chapter_order: chapter.chapter_order - 1,
      },
      include: {
        character_states: {
          include: {
            character: {
              select: { name: true },
            },
          },
        },
      },
    });

    // 5. Build prompt
    const characterList = storyCharacters.map((sc) => sc.character.name).join("、");

    const contextParts = [
      `【故事标题】${chapter.story.title}`,
      ``,
      `【章节信息】`,
      `${chapter.title}`,
      ``,
      `【涉及的角色】`,
      characterList,
      ``,
    ];

    if (previousChapter && previousChapter.character_states.length > 0) {
      contextParts.push(`【上一章结束时的角色状态】`);
      previousChapter.character_states.forEach((state) => {
        contextParts.push(
          `${state.character.name}:`,
          `  位置: ${state.location || "未知"}`,
          `  身体: ${state.physical_condition || "正常"}`,
          `  心理: ${state.mental_state || "平静"}`,
          ``
        );
      });
    }

    contextParts.push(
      `【本章详细内容】`,
      chapter.content,
      ``,
      `请分析本章内容，提取每个出现的角色在章节结束时的状态。`
    );

    const userPrompt = contextParts.join("\n");

    // 6. Call LLM
    logInfo("Calling LLM to analyze character states", {
      endpoint: "/api/chapter/[id]/analyze-character-states",
      userId,
      chapterId,
      contentLength: chapter.content.length,
    });

    const result = await callChatCompletionByType({
      providerType: "character_analyzer",
      messages: [
        { role: "system", content: ANALYZE_CHARACTER_STATES_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      maxTokens: 3000,
      options: { userId },
    });

    // 7. Parse response
    let analysisResult: AnalysisResult;
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonContent = result.content.trim();
      const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonBlockMatch) {
        jsonContent = jsonBlockMatch[1].trim();
      }

      analysisResult = JSON.parse(jsonContent);

      if (!analysisResult.character_states || !Array.isArray(analysisResult.character_states)) {
        throw new Error("Invalid response format: missing character_states array");
      }
    } catch (parseError) {
      logError("Failed to parse LLM response", parseError, {
        endpoint: "/api/chapter/[id]/analyze-character-states",
        userId,
        chapterId,
        rawResponse: result.content.substring(0, 500),
      });

      return NextResponse.json(
        { error: "解析分析结果失败", details: "LLM返回格式不正确" },
        { status: 500 }
      );
    }

    // 8. Match character names with database and save states
    const savedStates = [];
    const unmatchedCharacters = [];

    for (const stateInput of analysisResult.character_states) {
      // Find character by name (case-insensitive)
      const matchedCharacter = storyCharacters.find(
        (sc) => sc.character.name.toLowerCase() === stateInput.character_name.toLowerCase()
      );

      if (!matchedCharacter) {
        unmatchedCharacters.push(stateInput.character_name);
        continue;
      }

      // Delete existing state for this chapter-character pair
      await prisma.chapterCharacterState.deleteMany({
        where: {
          chapter_id: chapterId,
          character_id: matchedCharacter.character_id,
        },
      });

      // Create new state
      const savedState = await prisma.chapterCharacterState.create({
        data: {
          chapter_id: chapterId,
          character_id: matchedCharacter.character_id,
          location: stateInput.location || null,
          physical_condition: stateInput.physical_condition || null,
          mental_state: stateInput.mental_state || null,
          key_items: stateInput.key_items || [],
          relationship_changes: stateInput.relationship_changes || undefined,
        },
        include: {
          character: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      savedStates.push(savedState);
    }

    logInfo("Character states analyzed and saved", {
      endpoint: "/api/chapter/[id]/analyze-character-states",
      userId,
      chapterId,
      statesCount: savedStates.length,
      unmatchedCount: unmatchedCharacters.length,
      creditsUsed: result.creditsCost,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      character_states: savedStates,
      unmatched_characters: unmatchedCharacters,
      creditsUsed: result.creditsCost,
      message: `成功分析 ${savedStates.length} 个角色状态${unmatchedCharacters.length > 0 ? `，${unmatchedCharacters.length} 个角色名称未匹配` : ""}`,
    });
  } catch (error) {
    logError("Failed to analyze character states", error, {
      endpoint: "/api/chapter/[id]/analyze-character-states",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: "分析角色状态失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
