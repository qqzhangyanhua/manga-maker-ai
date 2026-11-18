import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { estimatePanelCount, type DensityMode } from "@/lib/panel-estimator";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

/**
 * GET /api/chapter/[id]/estimate-panels
 *
 * 预估章节应生成的分镜数量
 *
 * Query Parameters:
 * - densityMode: 'sparse' | 'standard' | 'dense' (可选，默认 'standard')
 *
 * Response:
 * {
 *   estimatedCount: number;      // 预估镜头数
 *   minCount: number;             // 最少镜头数
 *   maxCount: number;             // 最多镜头数
 *   wordCount: number;            // 章节字数
 *   baseDensity: number;          // 基础密度(字/镜)
 *   genre: string;                // 故事类型
 *   estimatedCredits: number;     // 预估消耗credits
 *   densityMode: string;          // 当前密度模式
 *   warnings: string[];           // 警告信息
 * }
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", {
      endpoint: "/api/chapter/[id]/estimate-panels",
      method: "GET",
    });

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

    logInfo("User authenticated", {
      endpoint: "/api/chapter/[id]/estimate-panels",
      userId,
    });

    // 2. 获取参数
    const { id: chapterId } = await context.params;
    const { searchParams } = new URL(request.url);
    const densityModeParam = searchParams.get("densityMode");

    // 验证 densityMode 参数
    let densityMode: DensityMode = "standard";
    if (densityModeParam) {
      if (!["sparse", "standard", "dense"].includes(densityModeParam)) {
        return NextResponse.json(
          {
            error: "无效的 densityMode 参数，必须是 'sparse', 'standard' 或 'dense'",
          },
          { status: 400 }
        );
      }
      densityMode = densityModeParam as DensityMode;
    }

    logInfo("Request validated", {
      endpoint: "/api/chapter/[id]/estimate-panels",
      userId,
      chapterId,
      densityMode,
    });

    // 3. 验证章节所有权
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        project: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    logInfo("Authorization verified", {
      endpoint: "/api/chapter/[id]/estimate-panels",
      userId,
      chapterId,
    });

    // 4. 执行预估
    logInfo("Starting panel estimation", {
      endpoint: "/api/chapter/[id]/estimate-panels",
      userId,
      chapterId,
      densityMode,
    });

    const estimation = await estimatePanelCount({
      chapterId,
      densityMode,
    });

    logInfo("Panel estimation completed", {
      endpoint: "/api/chapter/[id]/estimate-panels",
      userId,
      chapterId,
      estimatedCount: estimation.estimatedCount,
      estimatedCredits: estimation.estimatedCredits,
      durationMs: Date.now() - startedAt,
    });

    // 5. 返回结果
    return NextResponse.json(estimation);
  } catch (error) {
    logError("Panel estimation failed", error, {
      endpoint: "/api/chapter/[id]/estimate-panels",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
