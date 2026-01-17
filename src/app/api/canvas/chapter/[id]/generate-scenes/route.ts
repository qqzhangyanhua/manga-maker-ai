/**
 * Canvas Chapter Generate Scenes API
 * POST /api/canvas/chapter/[id]/generate-scenes - 生成场景图
 *
 * ✅ 集成 novel-backend (提示词优化) + unified-image-generation (图像生成)
 * ✅ 添加速率限制
 * ✅ 场景去重：按 location_key 分组，相同位置只生成一张场景图
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNovelBackendClient, NovelBackendError, SceneImageOutput } from "@/lib/novel-backend-client";
import { logInfo, logError } from "@/lib/api-logger";
import { generateImage, waitForTaskCompletion } from "@/lib/unified-image-generation";
import { checkRateLimit } from "@/lib/security/rate-limiter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ShotWithLocation {
  id: string;
  camera_angle: string;
  shot_size: string;
  shot_description: string;
  prompt: string;
  character_ids: string[];
  location_key: string;
}

interface LocationGroup {
  location_key: string;
  shot_ids: string[];
  representative_shot: ShotWithLocation;
}

/**
 * 按 location_key 分组镜头
 * 同一位置的镜头只生成一张场景图
 */
function groupShotsByLocation(shots: ShotWithLocation[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>();

  for (const shot of shots) {
    // 如果没有 location_key，使用 shot.id 作为唯一标识（不去重）
    const key = shot.location_key || `unique_${shot.id}`;

    if (groups.has(key)) {
      groups.get(key)!.shot_ids.push(shot.id);
    } else {
      groups.set(key, {
        location_key: key,
        shot_ids: [shot.id],
        representative_shot: shot, // 使用第一个镜头作为代表
      });
    }
  }

  return Array.from(groups.values());
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
        comic_style: true, // 获取选定的风格
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

    const allShots: ShotWithLocation[] = timelineChapter.script_segments.flatMap(
      (s) => s.shot_designs.map(shot => ({
        id: shot.id,
        camera_angle: shot.camera_angle,
        shot_size: shot.shot_size,
        shot_description: shot.shot_description,
        prompt: shot.prompt,
        character_ids: shot.character_ids,
        location_key: shot.location_key || "",
      }))
    );

    if (allShots.length === 0) {
      return NextResponse.json(
        { error: "请先生成镜头设计" },
        { status: 400 }
      );
    }

    // 2. 按 location_key 分组去重
    const locationGroups = groupShotsByLocation(allShots);

    // 获取风格信息
    const selectedStyle = timelineChapter.comic_style;
    const styleKey = selectedStyle?.style_key || "manga";
    const stylePromptPrefix = selectedStyle?.prompt_prefix || "";

    logInfo("场景去重完成", {
      chapterId,
      totalShots: allShots.length,
      uniqueLocations: locationGroups.length,
      deduplicationRatio: `${((1 - locationGroups.length / allShots.length) * 100).toFixed(1)}%`,
      selectedStyle: styleKey,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { scene_status: "generating" },
    });

    // 3. 只为去重后的唯一位置调用 novel-backend 获取优化的提示词
    const client = getNovelBackendClient();
    const sceneResult = await client.generateScenes({
      shots: locationGroups.map(group => ({
        shot_id: group.representative_shot.id,
        camera_angle: group.representative_shot.camera_angle,
        shot_size: group.representative_shot.shot_size,
        shot_description: group.representative_shot.shot_description,
        prompt: stylePromptPrefix
          ? `${stylePromptPrefix}, ${group.representative_shot.prompt}`
          : group.representative_shot.prompt,
        character_ids: group.representative_shot.character_ids,
      })),
      style: styleKey, // 使用用户选定的风格
      pure_scene_mode: true, // 纯场景模式：不包含人物
    });

    if (!sceneResult.success || sceneResult.scenes.length === 0) {
      throw new Error("场景图生成返回空结果");
    }

    logInfo("提示词优化完成", {
      chapterId,
      sceneCount: sceneResult.scenes.length,
    });

    // 4. 使用 unified-image-generation 批量生成图像（仅对去重后的场景）
    const imageGenerationTasks: Array<{
      location_key: string;
      shot_ids: string[];
      representative_shot_id: string;
      taskId: string;
      prompt: string;
    }> = [];

    // 创建 shot_id 到 scene 结果的映射
    const sceneResultMap = new Map<string, SceneImageOutput>(
      sceneResult.scenes.map(scene => [scene.shot_id, scene])
    );

    for (const group of locationGroups) {
      const sceneData = sceneResultMap.get(group.representative_shot.id);
      if (!sceneData) {
        logError("未找到场景数据", new Error("Scene data not found"), {
          representative_shot_id: group.representative_shot.id,
        });
        continue;
      }

      logInfo("提交图像生成任务", {
        location_key: group.location_key,
        shot_count: group.shot_ids.length,
        promptPreview: sceneData.generation_prompt.substring(0, 100),
      });

      const { taskId } = await generateImage(
        "scene",  // 图像类型
        sceneData.generation_prompt,  // 优化后的提示词
        payload.userId,
        {
          width: 800,
          height: 600,
          negativePrompt: "person, people, human, man, woman, boy, girl, character, figure, face, body, hands, legs, portrait, selfie, blurry, low quality, distorted, deformed, ugly",
          metadata: {
            location_key: group.location_key,
            shot_ids: group.shot_ids,
            chapter_id: chapterId,
            type: "canvas_scene",
            pure_scene: true,
          },
        }
      );

      imageGenerationTasks.push({
        location_key: group.location_key,
        shot_ids: group.shot_ids,
        representative_shot_id: group.representative_shot.id,
        taskId,
        prompt: sceneData.generation_prompt,
      });
    }

    logInfo("所有图像任务已提交", {
      chapterId,
      taskCount: imageGenerationTasks.length,
    });

    // 5. 等待所有图像生成完成，并建立共享关系
    const createdScenes = [];
    let successCount = 0;
    let failCount = 0;

    for (const task of imageGenerationTasks) {
      try {
        logInfo("等待图像生成", {
          location_key: task.location_key,
          taskId: task.taskId
        });

        // 等待单个任务完成 (最多60秒)
        const taskStatus = await waitForTaskCompletion(task.taskId, 60000);

        if (taskStatus.status === "completed" && taskStatus.imageUrl) {
          // 创建场景图记录（使用第一个 shot_id 作为主关联）
          const sceneImage = await prisma.sceneImage.create({
            data: {
              shot_design_id: task.representative_shot_id,
              location_key: task.location_key,
              image_url: taskStatus.imageUrl,  // MinIO URL
              generation_prompt: task.prompt,
              status: "completed",
            },
          });

          // 更新所有共享此场景的镜头的 shared_scene_id
          await prisma.shotDesign.updateMany({
            where: {
              id: { in: task.shot_ids },
            },
            data: {
              shared_scene_id: sceneImage.id,
            },
          });

          createdScenes.push({
            ...sceneImage,
            shared_shot_count: task.shot_ids.length,
          });
          successCount++;

          logInfo("场景图生成成功", {
            location_key: task.location_key,
            imageUrl: taskStatus.imageUrl,
            sharedShotCount: task.shot_ids.length,
          });
        } else {
          failCount++;
          logError("场景图生成失败", new Error(taskStatus.error || "Unknown error"), {
            location_key: task.location_key,
            taskStatus,
          });
        }
      } catch (error) {
        failCount++;
        logError("等待图像生成超时", error, {
          location_key: task.location_key,
          taskId: task.taskId,
        });
      }
    }

    // 6. 更新章节状态
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
      totalShots: allShots.length,
      uniqueScenes: locationGroups.length,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      scenes: createdScenes,
      metadata: {
        scene_count: successCount,
        failed_count: failCount,
        total_shots: allShots.length,
        unique_locations: locationGroups.length,
        deduplication_ratio: `${((1 - locationGroups.length / allShots.length) * 100).toFixed(1)}%`,
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
