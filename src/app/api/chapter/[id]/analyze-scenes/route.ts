import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { consumeCredits, checkCredits } from "@/lib/credits";
import { logInfo, logError } from "@/lib/api-logger";
import type { AnalyzedScene } from "@/types/suggested-scenes.types";

const SCENE_ANALYZER_SYSTEM_PROMPT = `你是专业的场景设计师和视觉导演。请根据章节内容分析并列出需要可视化的关键场景。

硬性要求：
- 只输出 JSON 数组，不要添加任何解释、前后缀或 markdown 代码块
- 字段使用半角双引号；未提及字段不得新增；缺失值用 null
- description 中文 100-200 字；scene_prompt 必须英文（120-250 chars）
- scene_type 必须从以下选择：indoor, outdoor, urban, nature, fantasy, scifi, historical, abstract
- 禁止涉黄/暴力/政治/真实人物/网站

任务：
1. 分析章节的 summary（摘要）、content（完整内容）和 panel_visual_prompts（分镜画面描述）
2. 从章节文本和分镜画面中提取 3-5 个最具视觉冲击力的场景
3. 优先选择在多个分镜中重复出现的场景（说明该场景重要）
4. 每个场景包含：
   - name: 场景名称（简短有特色，如"夕阳下的操场"）
   - description: 场景详细描述（100-200字中文，包含氛围、光线、季节、天气等）
   - scene_prompt: 英文场景描述（120-250 chars，便于 AI 绘画，详细描述构图、光线、色调）
   - scene_type: 场景类型（indoor/outdoor/urban/nature/fantasy/scifi/historical/abstract）
   - atmosphere: 氛围标签（如"温馨"、"紧张"、"神秘"、"浪漫"、"孤独"）
   - lighting_hint: 光线提示（如"golden_hour"、"harsh_midday"、"moonlight"、"soft_diffused"）

要求：
- 场景要有故事性和情绪感染力
- 描述要具体、可视化，便于AI绘画
- 优先选择剧情关键转折点的场景
- 避免纯对话场景，优先选择有视觉冲击力的环境
- 场景之间要有变化（不同时间、不同地点、不同氛围）
- 如果提供了 panel_visual_prompts，务必参考其中的场景描述

输出格式（仅此 JSON，不要其他文字）：
[
  {
    "name": "场景名称",
    "description": "详细场景描述（中文100-200字）",
    "scene_prompt": "English scene description for AI image generation (120-250 chars)",
    "scene_type": "outdoor",
    "atmosphere": "温馨浪漫",
    "lighting_hint": "golden_hour"
  }
]`;

interface AnalyzeScenesRequestBody {
  count?: number;
  force_regenerate?: boolean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userIdNullable: string | null = null;

  try {
    const chapterId = params.id;

    logInfo("Request received", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      method: "POST",
      chapterId
    });

    // Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const userId = payload.userId; // Non-null from this point
    userIdNullable = userId;

    logInfo("User authenticated", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId,
      chapterId
    });

    // Parse request body
    const body = (await req.json()) as AnalyzeScenesRequestBody;
    const { count = 5, force_regenerate = false } = body;

    logInfo("Request validated", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId,
      chapterId,
      count,
      force_regenerate
    });

    // Fetch chapter with story info
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            id: true,
            user_id: true,
            title: true,
            genre: true,
            comic_style_id: true
          }
        },
        suggested_scenes: {
          where: { generated: false },
          orderBy: { display_order: "asc" }
        },
        panels: {
          select: {
            id: true,
            panel_order: true,
            visual_prompt: true
          },
          orderBy: { panel_order: "asc" }
        }
      }
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.story.user_id !== userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // Check if already has ungenerated suggested scenes
    if (chapter.suggested_scenes.length > 0 && !force_regenerate) {
      logInfo("Returning existing suggested scenes", {
        endpoint: "/api/chapter/[id]/analyze-scenes",
        userId,
        chapterId,
        count: chapter.suggested_scenes.length
      });

      return NextResponse.json({
        success: true,
        suggested_scenes: chapter.suggested_scenes,
        chapter_context: {
          id: chapter.id,
          title: chapter.title,
          chapter_order: chapter.chapter_order,
          summary: chapter.summary
        },
        credits_used: 0
      });
    }

    // Check content length
    const contentLength = (chapter.content || chapter.summary || "").length;
    const hasContent = !!chapter.content;
    const hasSummary = !!chapter.summary;

    // Collect panel visual prompts as additional context
    const panelPrompts = chapter.panels
      .filter(p => p.visual_prompt && p.visual_prompt.trim().length > 0)
      .map(p => p.visual_prompt)
      .join("\n");
    const hasPanelPrompts = panelPrompts.length > 0;
    const totalContentLength = contentLength + panelPrompts.length;

    logInfo("Chapter content analysis", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId,
      chapterId,
      contentLength,
      hasFullContent: hasContent,
      hasSummary: hasSummary,
      panelCount: chapter.panels.length,
      panelPromptsLength: panelPrompts.length,
      totalContentLength,
      genre: chapter.story.genre
    });

    if (totalContentLength < 200) {
      return NextResponse.json(
        { error: "章节内容过短（少于200字），请先完善内容或添加分镜画面描述再生成背景" },
        { status: 400 }
      );
    }

    // Check credits
    const estimatedCredits = 5;
    const hasEnough = await checkCredits(userId, estimatedCredits);
    if (!hasEnough) {
      return NextResponse.json(
        { error: `算力不足，需要 ${estimatedCredits} 算力` },
        { status: 400 }
      );
    }

    logInfo("Starting LLM scene analysis", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId,
      chapterId,
      contentLength,
      panelPromptsLength: panelPrompts.length,
      totalContentLength,
      requestedSceneCount: count
    });

    // Build user prompt
    const userMessage = `
<chapter_title>${chapter.title}</chapter_title>
<chapter_order>第${chapter.chapter_order}章</chapter_order>
<chapter_summary>${chapter.summary || "未提供摘要"}</chapter_summary>
${chapter.content ? `<chapter_content>${chapter.content.slice(0, 3000)}</chapter_content>` : ""}
${hasPanelPrompts ? `<panel_visual_prompts>\n${panelPrompts.slice(0, 2000)}\n</panel_visual_prompts>` : ""}
${chapter.story.genre ? `<story_genre>${chapter.story.genre}</story_genre>` : ""}

请生成 ${count} 个场景，只输出上方格式的 JSON 数组，不要任何解释。`;

    logInfo("LLM request parameters", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId,
      chapterId,
      providerType: "scene_analyzer",
      temperature: 0.7,
      maxTokens: 2000,
      userMessageLength: userMessage.length,
      includedPanelPrompts: hasPanelPrompts
    });

    const llmStartTime = Date.now();

    // Call LLM (fallback to prompt_optimizer if scene_analyzer not configured)
    let llmResult;
    let usedProviderType = "scene_analyzer";

    try {
      llmResult = await callChatCompletionByType({
        providerType: "scene_analyzer",
        messages: [
          { role: "system", content: SCENE_ANALYZER_SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        maxTokens: 2000,
        options: {
          userId,
          skipCreditsCheck: false
        }
      });
    } catch (error) {
      // If scene_analyzer not found, fallback to prompt_optimizer
      if (error instanceof Error && error.message.includes("未找到可用的模型配置")) {
        logInfo("scene_analyzer not found, falling back to prompt_optimizer", {
          endpoint: "/api/chapter/[id]/analyze-scenes",
          userId,
          chapterId
        });

        usedProviderType = "prompt_optimizer";
        llmResult = await callChatCompletionByType({
          providerType: "prompt_optimizer",
          messages: [
            { role: "system", content: SCENE_ANALYZER_SYSTEM_PROMPT },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7,
          maxTokens: 2000,
          options: {
            userId,
            skipCreditsCheck: false
          }
        });
      } else {
        throw error;
      }
    }

    const result = llmResult;
    const creditsCost = result.creditsCost || estimatedCredits;
    const llmDuration = Date.now() - llmStartTime;

    logInfo("LLM analysis completed", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId,
      chapterId,
      creditsCost,
      llmDurationMs: llmDuration,
      responseLength: result.content.length,
      usedProviderType
    });

    // Parse LLM response
    let analyzedScenes: AnalyzedScene[];
    try {
      // Remove markdown code blocks if present
      let cleanedContent = result.content.trim();
      cleanedContent = cleanedContent.replace(/^```json\s*/i, "");
      cleanedContent = cleanedContent.replace(/\s*```$/i, "");

      analyzedScenes = JSON.parse(cleanedContent);

      if (!Array.isArray(analyzedScenes)) {
        throw new Error("Response is not an array");
      }

      logInfo("LLM response parsed successfully", {
        endpoint: "/api/chapter/[id]/analyze-scenes",
        userId,
        chapterId,
        sceneCount: analyzedScenes.length,
        sceneTypes: analyzedScenes.map(s => s.scene_type),
        sceneNames: analyzedScenes.map(s => s.name)
      });
    } catch (parseError) {
      logError("Failed to parse LLM response", parseError, {
        endpoint: "/api/chapter/[id]/analyze-scenes",
        userId,
        chapterId,
        rawResponse: result.content.slice(0, 500)
      });

      return NextResponse.json(
        { error: "AI 分析结果格式错误，请重试" },
        { status: 500 }
      );
    }

    // Delete existing ungenerated scenes if force_regenerate
    if (force_regenerate && chapter.suggested_scenes.length > 0) {
      await prisma.suggestedScene.deleteMany({
        where: {
          chapter_id: chapterId,
          generated: false
        }
      });
    }

    // Create SuggestedScene records
    logInfo("Creating SuggestedScene records", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId,
      chapterId,
      sceneCount: analyzedScenes.length
    });

    const suggestedScenes = await Promise.all(
      analyzedScenes.map((scene, index) => {
        logInfo("Creating SuggestedScene", {
          endpoint: "/api/chapter/[id]/analyze-scenes",
          userId,
          chapterId,
          sceneIndex: index,
          sceneName: scene.name,
          sceneType: scene.scene_type
        });

        return prisma.suggestedScene.create({
          data: {
            chapter_id: chapterId,
            name: scene.name,
            description: scene.description,
            scene_prompt: scene.scene_prompt,
            scene_type: scene.scene_type,
            atmosphere: scene.atmosphere || null,
            lighting_hint: scene.lighting_hint || null,
            display_order: index,
            generated: false
          }
        });
      })
    );

    logInfo("Suggested scenes created", {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId,
      chapterId,
      count: suggestedScenes.length,
      durationMs: Date.now() - startedAt,
      creditsCost
    });

    return NextResponse.json({
      success: true,
      suggested_scenes: suggestedScenes,
      chapter_context: {
        id: chapter.id,
        title: chapter.title,
        chapter_order: chapter.chapter_order,
        summary: chapter.summary
      },
      credits_used: creditsCost
    });
  } catch (error) {
    logError("Scene analysis failed", error, {
      endpoint: "/api/chapter/[id]/analyze-scenes",
      userId: userIdNullable || "unknown",
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json(
      { error: "场景分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}
