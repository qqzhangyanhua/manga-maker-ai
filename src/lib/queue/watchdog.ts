import { prisma } from "@/lib/db";

const TASK_TIMEOUT_MS = 10 * 60 * 1000; // 10 分钟

/**
 * 检查并标记超时任务为失败
 * 将超过 TASK_TIMEOUT_MS 仍处于 pending/processing 的任务标记为 failed
 * @returns 被标记的任务数量
 */
export async function checkStalledTasks(): Promise<number> {
  const cutoff = new Date(Date.now() - TASK_TIMEOUT_MS);

  const result = await prisma.generationTask.updateMany({
    where: {
      status: { in: ["pending", "processing"] },
      created_at: { lt: cutoff },
      completed_at: null,
    },
    data: {
      status: "failed",
      completed_at: new Date(),
    },
  });

  if (result.count > 0) {
    console.warn(`[Watchdog] 标记 ${result.count} 个超时任务为失败`);
  }

  return result.count;
}
