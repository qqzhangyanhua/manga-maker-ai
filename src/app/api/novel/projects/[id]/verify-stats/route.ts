/**
 * 数据一致性检查与修复接口
 * GET /api/novel/projects/[id]/verify-stats
 *
 * 功能：
 * 1. 比对存储的统计值 vs 实时计算值
 * 2. 发现不一致时自动修复
 * 3. 返回修复报告
 *
 * 设计哲学（Linus 视角）：
 * "不要相信手动维护的数据，永远验证它。"
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface StatsVerificationResult {
  project_id: string;
  project_title: string;
  stored_stats: {
    chapter_count: number;
    total_words: number;
  };
  calculated_stats: {
    chapter_count: number;
    total_words: number;
  };
  is_consistent: boolean;
  differences: {
    chapter_count_diff: number;
    total_words_diff: number;
  };
  fixed: boolean;
  error?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Verify stats request", {
      endpoint: "/api/novel/projects/[id]/verify-stats",
      projectId,
    });

    // 验证认证
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

    // 查询项目（包含当前存储的统计值）
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        title: true,
        chapter_count: true,
        total_words: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证权限
    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    // 实时计算真实统计值
    const calculatedStats = await prisma.novelChapter.aggregate({
      where: { project_id: projectId },
      _count: { id: true },
      _sum: { word_count: true },
    });

    const storedChapterCount = project.chapter_count || 0;
    const storedTotalWords = project.total_words || 0;
    const calculatedChapterCount = calculatedStats._count.id;
    const calculatedTotalWords = calculatedStats._sum.word_count || 0;

    // 检查一致性
    const isConsistent =
      storedChapterCount === calculatedChapterCount &&
      storedTotalWords === calculatedTotalWords;

    const result: StatsVerificationResult = {
      project_id: project.id,
      project_title: project.title,
      stored_stats: {
        chapter_count: storedChapterCount,
        total_words: storedTotalWords,
      },
      calculated_stats: {
        chapter_count: calculatedChapterCount,
        total_words: calculatedTotalWords,
      },
      is_consistent: isConsistent,
      differences: {
        chapter_count_diff: calculatedChapterCount - storedChapterCount,
        total_words_diff: calculatedTotalWords - storedTotalWords,
      },
      fixed: false,
    };

    // 如果不一致，自动修复
    if (!isConsistent) {
      logInfo("Stats inconsistency detected, fixing...", {
        endpoint: "/api/novel/projects/[id]/verify-stats",
        projectId,
        differences: result.differences,
      });

      try {
        await prisma.novelProject.update({
          where: { id: projectId },
          data: {
            chapter_count: calculatedChapterCount,
            total_words: calculatedTotalWords,
            updated_at: new Date(),
          },
        });

        result.fixed = true;

        logInfo("Stats fixed successfully", {
          endpoint: "/api/novel/projects/[id]/verify-stats",
          projectId,
          newStats: result.calculated_stats,
        });
      } catch (fixError) {
        result.error = fixError instanceof Error ? fixError.message : "修复失败";
        logError("Failed to fix stats", fixError, {
          endpoint: "/api/novel/projects/[id]/verify-stats",
          projectId,
        });
      }
    }

    logInfo("Stats verification completed", {
      endpoint: "/api/novel/projects/[id]/verify-stats",
      projectId,
      isConsistent,
      fixed: result.fixed,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    logError("Stats verification failed", error, {
      endpoint: "/api/novel/projects/[id]/verify-stats",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "验证失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
