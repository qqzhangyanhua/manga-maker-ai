/**
 * Novel Project Statistics API
 * GET /api/novel/projects/[id]/stats
 *
 * RESTful 设计原则：
 * - 职责单一：仅返回实时统计信息
 * - 实时计算：不依赖缓存字段，保证数据准确
 * - 性能优化：使用聚合查询，避免 N+1 问题
 *
 * Linus 视角：
 * "统计数据应该实时计算，而不是从缓存字段读取。这才是数据的唯一真实来源。"
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface ProjectStats {
  // 章节统计
  total_chapters: number;
  total_words: number;
  avg_words_per_chapter: number;

  // 进度统计
  target_words: number | null;
  completion_rate: number | null;
  words_remaining: number | null;

  // 状态分布
  status_breakdown: {
    draft: number;
    published: number;
    archived: number;
  };

  // 关键章节
  key_chapters_count: number;

  // 字数分布
  word_count_distribution: {
    min: number;
    max: number;
    median: number;
  };

  // 时间信息
  first_chapter_date: Date | null;
  last_chapter_date: Date | null;
  last_updated: Date;

  // 元数据
  _meta: {
    calculated_at: Date;
    cache_status: "real-time" | "cached";
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Stats request received", {
      endpoint: "/api/novel/projects/[id]/stats",
      method: "GET",
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

    // 验证项目归属
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        target_words: true,
        updated_at: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    // ✅ 实时计算统计数据（单一数据源）
    const [aggregateStats, statusStats, keyChaptersCount, wordCountStats, timeStats] = await Promise.all([
      // 1. 基础聚合统计
      prisma.novelChapter.aggregate({
        where: { project_id: projectId },
        _count: { id: true },
        _sum: { word_count: true },
        _avg: { word_count: true },
      }),

      // 2. 状态分布统计
      prisma.novelChapter.groupBy({
        by: ['status'],
        where: { project_id: projectId },
        _count: { id: true },
      }),

      // 3. 关键章节数量
      prisma.novelChapter.count({
        where: {
          project_id: projectId,
          is_key_chapter: true,
        },
      }),

      // 4. 字数分布统计（最小/最大值）
      prisma.novelChapter.aggregate({
        where: { project_id: projectId },
        _min: { word_count: true },
        _max: { word_count: true },
      }),

      // 5. 时间统计
      prisma.novelChapter.aggregate({
        where: { project_id: projectId },
        _min: { created_at: true },
        _max: { updated_at: true },
      }),
    ]);

    // 计算中位数（需要额外查询）
    const totalChapters = aggregateStats._count.id;
    let medianWordCount = 0;

    if (totalChapters > 0) {
      const medianIndex = Math.floor(totalChapters / 2);
      const medianChapter = await prisma.novelChapter.findMany({
        where: { project_id: projectId },
        select: { word_count: true },
        orderBy: { word_count: 'asc' },
        skip: medianIndex,
        take: 1,
      });
      medianWordCount = medianChapter[0]?.word_count || 0;
    }

    // 构建状态分布对象
    const statusBreakdown = {
      draft: 0,
      published: 0,
      archived: 0,
    };

    statusStats.forEach(stat => {
      const status = stat.status as keyof typeof statusBreakdown;
      if (status in statusBreakdown) {
        statusBreakdown[status] = stat._count.id;
      }
    });

    // 计算进度相关指标
    const totalWords = aggregateStats._sum.word_count || 0;
    const targetWords = project.target_words;
    const completionRate = targetWords && targetWords > 0
      ? Math.min(1, totalWords / targetWords)
      : null;
    const wordsRemaining = targetWords && targetWords > 0
      ? Math.max(0, targetWords - totalWords)
      : null;

    // 构建响应
    const stats: ProjectStats = {
      // 章节统计
      total_chapters: totalChapters,
      total_words: totalWords,
      avg_words_per_chapter: Math.round(aggregateStats._avg.word_count || 0),

      // 进度统计
      target_words: targetWords,
      completion_rate: completionRate,
      words_remaining: wordsRemaining,

      // 状态分布
      status_breakdown: statusBreakdown,

      // 关键章节
      key_chapters_count: keyChaptersCount,

      // 字数分布
      word_count_distribution: {
        min: wordCountStats._min.word_count || 0,
        max: wordCountStats._max.word_count || 0,
        median: medianWordCount,
      },

      // 时间信息
      first_chapter_date: timeStats._min.created_at,
      last_chapter_date: timeStats._max.updated_at,
      last_updated: project.updated_at,

      // 元数据
      _meta: {
        calculated_at: new Date(),
        cache_status: "real-time",
      },
    };

    logInfo("Stats calculated successfully", {
      endpoint: "/api/novel/projects/[id]/stats",
      userId,
      projectId,
      totalChapters,
      totalWords,
      completionRate,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(stats);
  } catch (error) {
    logError("Failed to calculate stats", error, {
      endpoint: "/api/novel/projects/[id]/stats",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "获取统计信息失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
