import { redis } from "@/lib/redis";
import { getImageQueue } from "./queues";
import type { ImageGenerationJobData } from "./queues";
import { prisma } from "@/lib/db";

const DEDUPE_PREFIX = "dedupe:image:";
const DEDUPE_TTL = 600; // 10 分钟

/**
 * 将单个图像生成任务加入队列
 * 支持去重：相同 dedupeKey 在 TTL 内返回已有 jobId
 */
export async function enqueueImageGeneration(
  data: ImageGenerationJobData
): Promise<{ jobId: string; deduplicated: boolean }> {
  const dedupeKey =
    data.dedupeKey || `${data.panelId}:${data.prompt?.slice(0, 50)}`;

  const existingJobId = await redis.get(`${DEDUPE_PREFIX}${dedupeKey}`);
  if (existingJobId) {
    return { jobId: existingJobId, deduplicated: true };
  }

  const queue = getImageQueue();
  const job = await queue.add("generate-image", data, {
    jobId: `img-${data.panelId}-${Date.now()}`,
  });

  if (job.id) {
    await redis.set(`${DEDUPE_PREFIX}${dedupeKey}`, job.id, "EX", DEDUPE_TTL);
  }

  return { jobId: job.id || "", deduplicated: false };
}

/**
 * 批量将图像生成任务加入队列
 * 返回实际入队数量与去重数量
 */
export async function enqueueBatchImageGeneration(
  taskId: string,
  panels: Array<{ id: string; prompt: string; negativePrompt?: string }>,
  userId: string,
  projectId: string,
  style?: string,
  quality?: "standard" | "high"
): Promise<{ enqueuedCount: number; deduplicatedCount: number }> {
  let enqueuedCount = 0;
  let deduplicatedCount = 0;

  for (const panel of panels) {
    const result = await enqueueImageGeneration({
      taskId,
      panelId: panel.id,
      prompt: panel.prompt,
      negativePrompt: panel.negativePrompt,
      style,
      quality,
      userId,
      projectId,
      dedupeKey: `${panel.id}:${panel.prompt.slice(0, 50)}`,
    });

    if (result.deduplicated) {
      deduplicatedCount++;
    } else {
      enqueuedCount++;
    }
  }

  return { enqueuedCount, deduplicatedCount };
}

/**
 * 发布任务进度到 Redis 频道，供前端订阅
 */
export async function publishTaskProgress(
  taskId: string,
  progress: {
    status: string;
    percent: number;
    currentPanelId?: string;
    message?: string;
    error?: string;
  }
): Promise<void> {
  const channel = `task:${taskId}`;
  await redis.publish(
    channel,
    JSON.stringify({
      taskId,
      timestamp: Date.now(),
      ...progress,
    })
  );
}

/** 查询任务状态 */
export async function getTaskStatus(taskId: string) {
  return prisma.generationTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      progress: true,
      current_panel_index: true,
      panel_ids: true,
      error_logs: true,
      created_at: true,
      completed_at: true,
    },
  });
}
