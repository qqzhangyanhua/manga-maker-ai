/**
 * API: POST /api/chapter/[id]/expand-content
 *
 * Expand chapter summary into detailed content (2000-5000 words)
 * for better context in panel generation
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { logError, logInfo } from "@/lib/api-logger";

const EXPAND_CONTENT_SYSTEM_PROMPT = `你是一位资深的故事编剧和小说家。

任务：根据章节标题和简短梗概，扩展生成详细的章节内容（2000-5000字）。

输出要求：
1. 详细描述场景、角色行动、对话和心理活动
2. 包含足够的细节以便后续AI生成分镜脚本
3. 保持与故事大纲和前面章节的连贯性
4. 注意角色状态的延续性（如受伤、疲劳、情绪变化等）
5. 埋下必要的伏笔和情节推进
6. 内容长度控制在2000-5000字之间

格式要求：
- 直接输出纯文本内容，不要JSON格式
- 分段清晰，使用\\n\\n分隔段落
- 可以包含简单的对话标记（如「」或""）
`;

interface ExpandContentParams {
  mode?: "auto" | "custom"; // auto=AI生成, custom=手动编辑
  customContent?: string; // 如果mode=custom，使用这个内容
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

    logInfo("Expand chapter content request received", {
      endpoint: "/api/chapter/[id]/expand-content",
      userId,
      chapterId,
    });

    // 2. Get request body
    const body: ExpandContentParams = await request.json();
    const { mode = "auto", customContent } = body;

    // 3. Verify chapter ownership
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            id: true,
            user_id: true,
            title: true,
            premise: true,
            genre: true,
            outline: true,
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

    // 4. Handle custom content mode
    if (mode === "custom") {
      if (!customContent || customContent.trim().length < 100) {
        return NextResponse.json(
          { error: "自定义内容至少需要100字" },
          { status: 400 }
        );
      }

      const updated = await prisma.chapter.update({
        where: { id: chapterId },
        data: { content: customContent.trim() },
      });

      logInfo("Chapter content updated (custom mode)", {
        endpoint: "/api/chapter/[id]/expand-content",
        userId,
        chapterId,
        contentLength: customContent.length,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json({
        success: true,
        content: updated.content,
        mode: "custom",
      });
    }

    // 5. AI generation mode: Get context
    logInfo("Fetching previous chapters for context", {
      endpoint: "/api/chapter/[id]/expand-content",
      userId,
      chapterId,
    });

    const previousChapters = await prisma.chapter.findMany({
      where: {
        story_id: chapter.story_id,
        chapter_order: { lt: chapter.chapter_order },
      },
      orderBy: { chapter_order: "asc" },
      select: {
        title: true,
        summary: true,
        content: true,
        chapter_order: true,
      },
    });

    // 6. Build prompt
    const contextParts = [
      `【故事背景】`,
      `标题: ${chapter.story.title}`,
      `类型: ${chapter.story.genre}`,
      `前提: ${chapter.story.premise}`,
      ``,
      `【故事大纲】`,
      JSON.stringify(chapter.story.outline, null, 2),
    ];

    if (previousChapters.length > 0) {
      contextParts.push(``, `【前面章节回顾】`);
      previousChapters.forEach((prevChapter) => {
        contextParts.push(
          ``,
          `${prevChapter.title}`,
          prevChapter.content || prevChapter.summary || "(无内容)"
        );
      });
    }

    contextParts.push(
      ``,
      `【当前章节】`,
      `标题: ${chapter.title}`,
      `梗概: ${chapter.summary || "(无梗概)"}`,
      ``,
      `请根据以上信息，为当前章节生成详细内容（2000-5000字）：`
    );

    const userPrompt = contextParts.join("\n");

    // 7. Call LLM
    logInfo("Calling LLM to generate chapter content", {
      endpoint: "/api/chapter/[id]/expand-content",
      userId,
      chapterId,
    });

    const result = await callChatCompletionByType({
      providerType: "chapter_generator",
      messages: [
        { role: "system", content: EXPAND_CONTENT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: 6000,
      options: { userId },
    });

    const generatedContent = result.content.trim();

    if (generatedContent.length < 500) {
      logError("Generated content too short", new Error("Content too short"), {
        endpoint: "/api/chapter/[id]/expand-content",
        userId,
        chapterId,
        contentLength: generatedContent.length,
      });

      return NextResponse.json(
        { error: "生成的内容过短，请重试" },
        { status: 500 }
      );
    }

    // 8. Save to database
    const updated = await prisma.chapter.update({
      where: { id: chapterId },
      data: { content: generatedContent },
    });

    logInfo("Chapter content generated and saved", {
      endpoint: "/api/chapter/[id]/expand-content",
      userId,
      chapterId,
      contentLength: generatedContent.length,
      creditsUsed: result.creditsCost,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      content: updated.content,
      contentLength: generatedContent.length,
      creditsUsed: result.creditsCost,
      mode: "auto",
    });
  } catch (error) {
    logError("Failed to expand chapter content", error, {
      endpoint: "/api/chapter/[id]/expand-content",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: "生成章节内容失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
