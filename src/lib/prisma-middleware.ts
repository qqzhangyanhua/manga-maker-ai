/**
 * Prisma Middleware - 自动维护项目统计数据
 *
 * 功能：当 NovelChapter 发生增删改时，自动重新计算并更新 NovelProject 的：
 * - chapter_count: 章节总数
 * - total_words: 总字数
 *
 * 设计哲学（Linus 视角）：
 * "消除手动维护的特殊情况，让数据库自己保持一致性"
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./db";

interface ChapterData {
  project_id?: string;
}

interface ChapterWhereUnique {
  id?: string;
  project_id?: string;
}

/**
 * 从查询参数中提取 project_id
 */
function extractProjectId(params: Prisma.MiddlewareParams): string | null {
  // CREATE: data.project_id
  if (params.action === "create" && params.args.data) {
    const data = params.args.data as ChapterData;
    return data.project_id || null;
  }

  // UPDATE: where.id -> 需要先查询获取 project_id
  if (params.action === "update" && params.args.where) {
    const where = params.args.where as ChapterWhereUnique;
    return where.id || null; // 返回 chapter_id，稍后查询
  }

  // DELETE: where.id -> 需要先查询获取 project_id
  if (params.action === "delete" && params.args.where) {
    const where = params.args.where as ChapterWhereUnique;
    return where.id || null; // 返回 chapter_id，稍后查询
  }

  return null;
}

/**
 * 重新计算并更新项目统计数据
 */
async function updateProjectStats(projectId: string): Promise<void> {
  try {
    // 实时计算章节统计
    const stats = await prisma.novelChapter.aggregate({
      where: { project_id: projectId },
      _count: { id: true },
      _sum: { word_count: true },
    });

    // 更新项目表
    await prisma.novelProject.update({
      where: { id: projectId },
      data: {
        chapter_count: stats._count.id,
        total_words: stats._sum.word_count || 0,
        updated_at: new Date(),
      },
    });

    console.log(`[Prisma Middleware] 已更新项目统计: ${projectId}`, {
      chapter_count: stats._count.id,
      total_words: stats._sum.word_count || 0,
    });
  } catch (error) {
    console.error(`[Prisma Middleware] 更新项目统计失败: ${projectId}`, error);
    // 不抛出错误，避免中断主操作
  }
}

/**
 * 注册 Prisma 中间件
 *
 * 触发条件：NovelChapter 表的 create/update/delete 操作
 */
export function registerPrismaMiddleware(): void {
  prisma.$use(async (params, next) => {
    // 只处理 NovelChapter 表的增删改操作
    if (params.model !== "NovelChapter") {
      return next(params);
    }

    if (!["create", "update", "delete"].includes(params.action)) {
      return next(params);
    }

    // 对于 UPDATE/DELETE，需要先获取 project_id
    let projectId: string | null = null;

    if (params.action === "create") {
      // CREATE: 直接从 data 获取
      const data = params.args.data as ChapterData;
      projectId = data.project_id || null;
    } else {
      // UPDATE/DELETE: 先查询章节获取 project_id
      const chapterId = extractProjectId(params);
      if (chapterId) {
        const chapter = await prisma.novelChapter.findUnique({
          where: { id: chapterId },
          select: { project_id: true },
        });
        projectId = chapter?.project_id || null;
      }
    }

    // 执行原始操作
    const result = await next(params);

    // 操作成功后，异步更新项目统计（不阻塞主流程）
    if (projectId) {
      // 使用 setImmediate 异步执行，避免阻塞响应
      setImmediate(() => {
        updateProjectStats(projectId).catch((error) => {
          console.error("[Prisma Middleware] 异步更新统计失败", error);
        });
      });
    }

    return result;
  });

  console.log("[Prisma Middleware] ✅ 已注册 NovelChapter 统计自动更新中间件");
}

/**
 * 批量修复项目统计数据（一次性修复工具）
 * 用于修复历史数据不一致问题
 */
export async function repairAllProjectStats(): Promise<{
  success: number;
  failed: number;
  errors: Array<{ projectId: string; error: string }>;
}> {
  const result = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ projectId: string; error: string }>,
  };

  try {
    // 获取所有项目
    const projects = await prisma.novelProject.findMany({
      select: { id: true, title: true },
    });

    console.log(`[Repair] 开始修复 ${projects.length} 个项目的统计数据`);

    // 逐个修复
    for (const project of projects) {
      try {
        await updateProjectStats(project.id);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          projectId: project.id,
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    }

    console.log("[Repair] 修复完成", result);
    return result;
  } catch (error) {
    console.error("[Repair] 批量修复失败", error);
    throw error;
  }
}
