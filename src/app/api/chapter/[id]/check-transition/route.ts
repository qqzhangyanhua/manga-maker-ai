import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { callChatCompletionByType } from "@/lib/llm-provider";

/**
 * POST /api/chapter/[id]/check-transition
 * 检查章节间的过渡和衔接问题
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const { id: chapterId } = params;

    logInfo("Request received", {
      endpoint: `/api/chapter/${chapterId}/check-transition`,
      method: "POST",
    });

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

    logInfo("User authenticated", {
      endpoint: `/api/chapter/${chapterId}/check-transition`,
      userId,
    });

    // 2. 获取当前章节
    const currentChapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            user_id: true,
            title: true,
            premise: true,
          },
        },
      },
    });

    if (!currentChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (currentChapter.story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    // 3. 获取前一章节
    const previousChapter = await prisma.chapter.findFirst({
      where: {
        story_id: currentChapter.story_id,
        chapter_order: currentChapter.chapter_order - 1,
      },
    });

    if (!previousChapter) {
      return NextResponse.json(
        {
          error: "这是第一章，没有前置章节可以比较",
          hasIssues: false,
        },
        { status: 200 }
      );
    }

    // 4. 获取两个章节的分镜内容
    const [previousPanels, currentPanels] = await Promise.all([
      prisma.panel.findMany({
        where: { chapter_id: previousChapter.id },
        orderBy: { panel_order: "asc" },
        select: {
          scene_description: true,
          dialogue: true,
          panel_order: true,
        },
      }),
      prisma.panel.findMany({
        where: { chapter_id: chapterId },
        orderBy: { panel_order: "asc" },
        select: {
          scene_description: true,
          dialogue: true,
          panel_order: true,
        },
      }),
    ]);

    if (previousPanels.length === 0 || currentPanels.length === 0) {
      return NextResponse.json(
        {
          message: "章节缺少分镜内容，无法分析过渡",
          hasIssues: false,
        },
        { status: 200 }
      );
    }

    // 5. 提取关键内容
    const previousEnding = previousPanels
      .slice(-3)
      .map(
        (p, i) =>
          `分镜 ${p.panel_order}: ${p.scene_description}\n对白: ${p.dialogue || "无"}`
      )
      .join("\n\n");

    const currentBeginning = currentPanels
      .slice(0, 3)
      .map(
        (p, i) =>
          `分镜 ${p.panel_order}: ${p.scene_description}\n对白: ${p.dialogue || "无"}`
      )
      .join("\n\n");

    logInfo("Analyzing transition", {
      endpoint: `/api/chapter/${chapterId}/check-transition`,
      userId,
      previousChapter: previousChapter.title,
      currentChapter: currentChapter.title,
    });

    // 6. 使用LLM分析过渡
    const analysisPrompt = `你是一个专业的故事编辑，擅长分析章节间的过渡和衔接问题。

故事背景：
标题：${currentChapter.story.title}
设定：${currentChapter.story.premise || "未提供"}

前一章节结尾（${previousChapter.title}）：
${previousEnding}

当前章节开头（${currentChapter.title}）：
${currentBeginning}

请分析以下几个方面的衔接问题：
1. **情节连贯性**：前后章节的情节是否自然衔接？有没有突兀的跳跃？
2. **时间逻辑**：时间线是否合理？有没有时间跨度说明不清的问题？
3. **场景转换**：场景变化是否合理？需不需要过渡说明？
4. **角色一致性**：角色的状态、情绪、位置是否连贯？
5. **因果关系**：前一章的结尾是否为当前章做好了铺垫？

请以JSON格式返回分析结果，格式如下：
{
  "hasIssues": true/false,
  "overallScore": 0-10,
  "issues": [
    {
      "type": "plot" | "time" | "scene" | "character" | "causality",
      "severity": "high" | "medium" | "low",
      "description": "问题描述",
      "suggestion": "改进建议"
    }
  ],
  "summary": "总体评价"
}`;

    const result = await callChatCompletionByType({
      providerType: "script_analyzer",
      messages: [
        {
          role: "system",
          content:
            "你是专业的故事编辑。请分析章节过渡问题并以JSON格式返回结果。",
        },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.3,
      maxTokens: 2000,
      options: {
        userId,
        skipCreditsCheck: false,
      },
    });

    // 7. 解析分析结果
    let analysis;
    try {
      const content = result.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法解析JSON");
      }
    } catch (parseError) {
      logError("Failed to parse analysis result", parseError, {
        endpoint: `/api/chapter/${chapterId}/check-transition`,
        userId,
        content: result.content,
      });

      // 返回原始文本作为总结
      analysis = {
        hasIssues: false,
        overallScore: 7,
        issues: [],
        summary: result.content,
      };
    }

    logInfo("Transition analysis completed", {
      endpoint: `/api/chapter/${chapterId}/check-transition`,
      userId,
      hasIssues: analysis.hasIssues,
      issueCount: analysis.issues?.length || 0,
      creditsCost: result.creditsCost,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      previousChapter: {
        id: previousChapter.id,
        title: previousChapter.title,
        order: previousChapter.chapter_order,
      },
      currentChapter: {
        id: currentChapter.id,
        title: currentChapter.title,
        order: currentChapter.chapter_order,
      },
      analysis,
      creditsCost: result.creditsCost,
    });
  } catch (error) {
    logError("Check transition failed", error, {
      endpoint: `/api/chapter/${params.id}/check-transition`,
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "过渡检查失败",
      },
      { status: 500 }
    );
  }
}
