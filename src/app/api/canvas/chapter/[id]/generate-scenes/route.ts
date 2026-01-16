/**
 * Canvas Chapter Generate Scenes API
 * POST /api/canvas/chapter/[id]/generate-scenes - 生成场景图
 *
 * ✅ 集成 novel-backend (提示词优化) + unified-image-generation (图像生成)
 * ✅ 添加速率限制
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNovelBackendClient, NovelBackendError } from "@/lib/novel-backend-client";
import { logInfo, logError } from "@/lib/api-logger";
import { generateImage, waitForTaskCompletion } from "@/lib/unified-image-generation";
import { checkRateLimit } from "@/lib/security/rate-limiter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const startedAt = Date.now();
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: chapterId } = await params;

  // 速率限制: 每分钟最多 5 次
  const rateLimitResult = checkRateLimit(`generate-scenes:${payload.userId}`, {
    window: 60000,
    max: 5,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "请求过于频繁",
        detail: `请在 ${Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)} 秒后重试`,
        resetAt: rateLimitResult.resetAt,
      },
      { status: 429 }
    );
  }

  try {
    logInfo("开始生成场景图", {
      endpoint: "/api/canvas/chapter/[id]/generate-scenes",
      chapterId,
      userId: payload.userId,
    });

    // 1. 获取章节和镜头信息
    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: true,
        script_segments: {
          include: {
            shot_designs: true,
          },
        },
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (timelineChapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const allShots = timelineChapter.script_segments.flatMap(
      (s) => s.shot_designs
    );

    if (allShots.length === 0) {
      return NextResponse.json(
        { error: "请先生成镜头设计" },
        { status: 400 }
      );
    }

    logInfo("镜头设计获取成功", {
      chapterId,
      shotCount: allShots.length,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { scene_status: "generating" },
    });

    // 2. 调用 novel-backend 获取优化的提示词
    const client = getNovelBackendClient();
    const sceneResult = await client.generateScenes({
      shots: allShots.map(shot => ({
        shot_id: shot.id,
        camera_angle: shot.camera_angle,
        shot_size: shot.shot_size,
        shot_description: shot.shot_description,
        prompt: shot.prompt,
        character_ids: shot.character_ids,
      })),
      style: "manga", // TODO: 从用户设置获取
    });

    if (!sceneResult.success || sceneResult.scenes.length === 0) {
      throw new Error("场景图生成返回空结果");
    }

    logInfo("提示词优化完成", {
      chapterId,
      sceneCount: sceneResult.scenes.length,
    });

    // 3. 使用 unified-image-generation 批量生成图像
    const imageGenerationTasks: Array<{
      shot_id: string;
      taskId: string;
      prompt: string;
    }> = [];

    for (const scene of sceneResult.scenes) {
      logInfo("提交图像生成任务", {
        shot_id: scene.shot_id,
        promptPreview: scene.generation_prompt.substring(0, 100),
      });

      const { taskId } = await generateImage(
        "scene",  // 图像类型
        scene.generation_prompt,  // 优化后的提示词
        payload.userId,
        {
          width: 800,
          height: 600,
          negativePrompt: "blurry, low quality, distorted, deformed, ugly",
          metadata: {
            shot_id: scene.shot_id,
            chapter_id: chapterId,
            type: "canvas_scene",
          },
        }
      );

      imageGenerationTasks.push({
        shot_id: scene.shot_id,
        taskId,
        prompt: scene.generation_prompt,
      });
    }

    logInfo("所有图像任务已提交", {
      chapterId,
      taskCount: imageGenerationTasks.length,
    });

    // 4. 等待所有图像生成完成
    const createdScenes = [];
    let successCount = 0;
    let failCount = 0;

    for (const task of imageGenerationTasks) {
      try {
        logInfo("等待图像生成", { 
          shot_id: task.shot_id, 
          taskId: task.taskId 
        });

        // 等待单个任务完成 (最多60秒)
        const taskStatus = await waitForTaskCompletion(task.taskId, 60000);

        if (taskStatus.status === "completed" && taskStatus.imageUrl) {
          // 保存到数据库
          const sceneImage = await prisma.sceneImage.create({
            data: {
              shot_design_id: task.shot_id,
              image_url: taskStatus.imageUrl,  // MinIO URL
              generation_prompt: task.prompt,
              status: "completed",
            },
          });

          createdScenes.push(sceneImage);
          successCount++;

          logInfo("场景图生成成功", {
            shot_id: task.shot_id,
            imageUrl: taskStatus.imageUrl,
          });
        } else {
          failCount++;
          logError("场景图生成失败", new Error(taskStatus.error || "Unknown error"), {
            shot_id: task.shot_id,
            taskStatus,
          });
        }
      } catch (error) {
        failCount++;
        logError("等待图像生成超时", error, {
          shot_id: task.shot_id,
          taskId: task.taskId,
        });
      }
    }

    // 5. 更新章节状态
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        scene_status: successCount > 0 ? "completed" : "error",
        scene_image_count: successCount,
      },
    });

    const durationMs = Date.now() - startedAt;
    logInfo("场景图生成完成", {
      chapterId,
      userId: payload.userId,
      successCount,
      failCount,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      scenes: createdScenes,
      metadata: {
        scene_count: successCount,
        failed_count: failCount,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logError("生成场景图失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { scene_status: "error" },
    });

    if (error instanceof NovelBackendError) {
      return NextResponse.json(
        {
          error: "场景图生成失败",
          detail: error.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "生成场景图失败",
        detail: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
