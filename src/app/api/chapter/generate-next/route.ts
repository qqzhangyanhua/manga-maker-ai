import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { logInfo, logError } from "@/lib/api-logger";

/**
 * POST /api/chapter/generate-next
 * AI 生成下一章（连载模式）
 */
export async function POST(request: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", { endpoint: "/api/chapter/generate-next", method: "POST" });

    // 1. 验证权限
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

    logInfo("User authenticated", { endpoint: "/api/chapter/generate-next", userId });

    // 2. 解析请求体
    const body = await request.json();
    const { story_id, prompt_hint } = body;

    if (!story_id) {
      return NextResponse.json({ error: "缺少必需参数: story_id" }, { status: 400 });
    }

    logInfo("Request validated", {
      endpoint: "/api/chapter/generate-next",
      userId,
      story_id,
      hasPromptHint: !!prompt_hint,
    });

    // 3. 获取故事信息
    const story = await prisma.story.findUnique({
      where: { id: story_id },
      select: {
        user_id: true,
        title: true,
        premise: true,
        genre: true,
        outline: true,
        is_serialized: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 4. 加载已发布的章节
    const publishedChapters = await prisma.chapter.findMany({
      where: {
        story_id,
        publish_status: "published",
      },
      orderBy: { chapter_order: "asc" },
      select: {
        title: true,
        summary: true,
        content: true,
        chapter_order: true,
      },
    });

    if (publishedChapters.length === 0) {
      return NextResponse.json(
        { error: "请先发布至少一章，才能生成下一章" },
        { status: 400 }
      );
    }

    const nextOrder = publishedChapters.length + 1;

    logInfo("Loading context", {
      endpoint: "/api/chapter/generate-next",
      userId,
      story_id,
      publishedChaptersCount: publishedChapters.length,
      nextOrder,
    });

    // 5. 加载最新章节的角色状态
    const latestChapter = publishedChapters[publishedChapters.length - 1];
    const latestChapterFull = await prisma.chapter.findFirst({
      where: {
        story_id,
        chapter_order: latestChapter.chapter_order,
      },
      select: { id: true },
    });

    let characterStatesText = "";
    if (latestChapterFull) {
      const characterStates = await prisma.chapterCharacterState.findMany({
        where: { chapter_id: latestChapterFull.id },
        include: {
          character: {
            select: {
              name: true,
            },
          },
        },
      });

      if (characterStates.length > 0) {
        characterStatesText = characterStates
          .map(
            (s) =>
              `${s.character.name}：位置-${s.location || "未知"}，身体状况-${s.physical_condition || "正常"}，心理状态-${s.mental_state || "平静"}`
          )
          .join("\n");
      }
    }

    // 6. 构建 Prompt
    const systemPrompt = `你是一位资深连载漫画作家，擅长根据前文情节创作下一章。

任务：根据已发布的章节，创作下一章的大纲。

要求：
1. 延续之前的剧情和角色状态
2. 保持故事节奏和吸引力
3. 设置悬念/伏笔为下一章铺垫
4. 尊重角色当前的状态（不能突然改变）
5. 保持作品的风格和基调

输出格式（严格 JSON）：
{
  "title": "第N章：标题（简洁有吸引力）",
  "summary": "详细梗概（200-300字，包含关键事件、角色动作、情节转折）",
  "key_events": ["本章关键事件1", "关键事件2"],
  "cliffhanger": "本章结尾的悬念（可选）",
  "is_key_chapter": false,
  "key_chapter_reason": null
}

如果本章是重大转折点（角色死亡、身份揭露、高潮等），将 is_key_chapter 设为 true 并说明原因。`;

    const userPrompt = `
故事标题：${story.title}
故事类型：${story.genre}
故事前提：${story.premise}

已发布章节：
${publishedChapters.map((ch, idx) => `${idx + 1}. ${ch.title}\n${ch.summary || ch.content || "无内容"}`).join("\n\n")}

${characterStatesText ? `角色当前状态：\n${characterStatesText}\n` : ""}
作者提示：${prompt_hint || "自然发展剧情，保持吸引力"}

请创作第 ${nextOrder} 章的大纲。
`.trim();

    logInfo("Calling LLM", {
      endpoint: "/api/chapter/generate-next",
      userId,
      story_id,
      nextOrder,
    });

    // 7. 调用 LLM 生成
    const result = await callChatCompletionByType({
      providerType: "chapter_generator",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: 2000,
      options: { userId },
    });

    // 8. 解析结果
    let nextChapterData: {
      title: string;
      summary: string;
      key_events?: string[];
      cliffhanger?: string;
      is_key_chapter?: boolean;
      key_chapter_reason?: string;
    };

    try {
      const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      nextChapterData = JSON.parse(cleaned);
    } catch (error) {
      logError("Failed to parse LLM response", error, {
        endpoint: "/api/chapter/generate-next",
        userId,
        rawResponse: result.content,
      });
      return NextResponse.json(
        { error: "AI 响应格式错误，请重试" },
        { status: 500 }
      );
    }

    if (!nextChapterData.title || !nextChapterData.summary) {
      return NextResponse.json(
        { error: "AI 生成的章节缺少必需字段" },
        { status: 500 }
      );
    }

    logInfo("Next chapter generated", {
      endpoint: "/api/chapter/generate-next",
      userId,
      story_id,
      chapter_order: nextOrder,
      title: nextChapterData.title,
      durationMs: Date.now() - startedAt,
    });

    // 9. 返回建议（不自动创建章节，让用户确认）
    return NextResponse.json({
      success: true,
      suggestion: {
        chapter_order: nextOrder,
        title: nextChapterData.title,
        summary: nextChapterData.summary,
        key_events: nextChapterData.key_events || [],
        cliffhanger: nextChapterData.cliffhanger || null,
        is_key_chapter: nextChapterData.is_key_chapter || false,
        key_chapter_reason: nextChapterData.key_chapter_reason || null,
      },
      message: `AI 已生成第 ${nextOrder} 章的建议`,
    });
  } catch (error) {
    logError("Generate next chapter failed", error, {
      endpoint: "/api/chapter/generate-next",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成下一章失败",
      },
      { status: 500 }
    );
  }
}
