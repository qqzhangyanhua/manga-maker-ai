import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureLlmProvider } from "@/lib/llm-provider";
import { logInfo, logError } from "@/lib/api-logger";
import type { EstimateImportCostRequest } from "../import-text/types";

/**
 * POST /api/story/[id]/estimate-import-cost
 * 预估导入文本的积分消耗
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", { endpoint: "/api/story/[id]/estimate-import-cost", method: "POST" });

    // 1. 身份验证
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

    // 2. 解析参数
    const { id: storyId } = await context.params;
    const body: EstimateImportCostRequest = await request.json();
    const { text } = body;

    // 3. 参数验证
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "文本内容不能为空" },
        { status: 400 }
      );
    }

    // 4. 验证 Story 所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { user_id: true }
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 5. 计算文本统计信息
    const wordCount = text.length;

    // 6. 预估分镜数量（每200字生成1个分镜）
    const CHARS_PER_PANEL = 200;
    const estimatedPanels = Math.ceil(wordCount / CHARS_PER_PANEL);

    // 限制在合理范围内（8-20个分镜是推荐范围）
    const clampedPanels = Math.max(8, Math.min(estimatedPanels, 20));

    // 7. 查询 LLM Provider 的积分成本
    const provider = await ensureLlmProvider("script_analyzer");
    const creditsPerCall = provider.credits_cost ?? 0;

    // 8. 预估总积分消耗
    // 注意：一次 LLM 调用生成所有分镜，所以积分消耗是固定的
    const estimatedCredits = creditsPerCall;

    // 9. 检查用户当前积分余额
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });

    const currentCredits = user?.credits ?? 0;
    const hasEnoughCredits = currentCredits >= estimatedCredits;

    logInfo("Estimate completed", {
      endpoint: "/api/story/[id]/estimate-import-cost",
      userId,
      wordCount,
      estimatedPanels: clampedPanels,
      estimatedCredits,
      currentCredits,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({
      success: true,
      estimate: {
        wordCount,
        estimatedPanels: clampedPanels,
        estimatedCredits,
        creditsPerCall,
        currentCredits,
        hasEnoughCredits,
        warning: wordCount > 10000
          ? "文本过长，建议分段导入（每次不超过10,000字）"
          : null
      }
    });

  } catch (error) {
    logError("Estimate failed", error, {
      endpoint: "/api/story/[id]/estimate-import-cost",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt
    });

    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
