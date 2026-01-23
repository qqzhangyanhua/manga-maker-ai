/**
 * Nine Grid Generate Image API
 * POST /api/canvas/nine-grid/generate - 生成九宫格图片
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateImage, getImageGenerationQueue } from "@/lib/unified-image-generation";

/**
 * 请求体类型
 */
interface NineGridGenerateRequestBody {
  shotIds: string[];
  comicStyleId?: string;
  plotSummary: string;
}

/**
 * 镜头数据类型
 */
interface ShotData {
  id: string;
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  shot_description: string | null;
  prompt: string | null;
}

/**
 * 截断字符串
 */
function truncateText(text: string, maxLength: number = 80): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + "...";
}

/**
 * 构建九宫格提示词
 */
function buildNineGridPrompt(
  shots: ShotData[],
  stylePrefix: string,
  plotSummary: string
): string {
  // 按 shot_order 排序
  const sortedShots = [...shots].sort((a, b) => a.shot_order - b.shot_order);

  // 构建镜头描述
  const shotLines = sortedShots
    .map((shot, index) => {
      const num = String(index + 1).padStart(2, "0");
      const desc = truncateText(shot.shot_description || shot.prompt || "无描述", 100);
      const params = [shot.camera_angle, shot.shot_size].filter(Boolean).join("，");
      if (params) {
        return `镜头${num}：${desc}（${params}）`;
      }
      return `镜头${num}：${desc}`;
    })
    .join("\n");

  // 拼接完整提示词
  const parts: string[] = [];

  // 1. 风格前缀
  if (stylePrefix && stylePrefix.trim()) {
    parts.push(stylePrefix.trim());
  }

  // 2. 九宫格模板核心（如果有剧情概述则使用，否则使用通用描述）
  const plotText = plotSummary
    ? truncateText(plotSummary, 200)
    : "连续的故事场景";
  const templateCore = `根据[${plotText}],生成一张具有凝聚力的[3×3]网格图像，包含在同一环境中的[9]个不同摄像机镜头，严格保持人物/物体、服装和光线的一致性，[8K]分辨率，[16：9]画幅。`;
  parts.push(templateCore);

  // 3. 镜头描述
  parts.push(shotLines);

  // 4. 结尾说明
  parts.push(
    "最后加上图1是什么角色，图2是什么角色或者场景。生成的一定是九宫格，且每个格子比例都是16：9"
  );

  return parts.join("\n\n");
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  // 解析请求体
  let body: Partial<NineGridGenerateRequestBody> = {};
  try {
    body = (await req.json()) as Partial<NineGridGenerateRequestBody>;
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { shotIds, comicStyleId, plotSummary } = body;

  // 验证必填字段
  if (!Array.isArray(shotIds) || shotIds.length !== 9) {
    return NextResponse.json(
      { error: "请选择恰好9个镜头" },
      { status: 400 }
    );
  }

  // plotSummary 改为可选，默认使用空字符串
  const finalPlotSummary = (plotSummary && typeof plotSummary === "string")
    ? plotSummary.trim()
    : "";

  try {
    // 查询所有镜头数据
    const shots = await prisma.shotDesign.findMany({
      where: {
        id: { in: shotIds },
      },
      select: {
        id: true,
        shot_order: true,
        camera_angle: true,
        shot_size: true,
        shot_description: true,
        prompt: true,
        script_segment: {
          select: {
            timeline_chapter: {
              select: {
                id: true,
                timeline: {
                  select: {
                    id: true,
                    user_id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 验证镜头数量
    if (shots.length !== 9) {
      return NextResponse.json(
        { error: `找到 ${shots.length} 个镜头，需要9个` },
        { status: 400 }
      );
    }

    // 验证权限（所有镜头必须属于同一用户）
    const userIds = new Set(
      shots.map((s) => s.script_segment.timeline_chapter.timeline.user_id)
    );
    if (userIds.size !== 1 || !userIds.has(payload.userId)) {
      return NextResponse.json({ error: "无权操作这些镜头" }, { status: 403 });
    }

    // 获取时间线和章节信息
    const timelineId = shots[0].script_segment.timeline_chapter.timeline.id;
    const timelineChapterId = shots[0].script_segment.timeline_chapter.id;

    // 获取 NovelChapter 的 ID（用于保存到 NineGridImage）
    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: timelineChapterId },
      select: { chapter_id: true },
    });

    if (!timelineChapter) {
      return NextResponse.json(
        { error: "找不到时间线章节" },
        { status: 404 }
      );
    }

    const novelChapterId = timelineChapter.chapter_id;

    // 获取漫画风格
    let stylePromptPrefix = "";
    if (comicStyleId) {
      const style = await prisma.comicStyle.findFirst({
        where: { id: comicStyleId, enabled: true },
        select: { prompt_prefix: true },
      });

      if (style?.prompt_prefix) {
        stylePromptPrefix = style.prompt_prefix;
      }
    }

    // 构建提示词
    const shotData: ShotData[] = shots.map((s) => ({
      id: s.id,
      shot_order: s.shot_order,
      camera_angle: s.camera_angle,
      shot_size: s.shot_size,
      shot_description: s.shot_description,
      prompt: s.prompt,
    }));

    const finalPrompt = buildNineGridPrompt(
      shotData,
      stylePromptPrefix,
      finalPlotSummary
    );

    console.log("[NineGrid] Generated prompt:", finalPrompt.substring(0, 200) + "...");

    // 调用图片生成
    // 九宫格图片尺寸：3x3网格，每格16:9
    // 使用 2048x1152 作为整图尺寸（约 16:9）
    const { taskId } = await generateImage("panel", finalPrompt, payload.userId, {
      width: 2048,
      height: 1152,
      metadata: {
        type: "nine_grid",
        shot_ids: shotIds,
        timeline_id: timelineId,
        chapter_id: timelineChapterId,
      },
    });

    console.log("[NineGrid] Task created:", taskId);

    // 注册任务完成回调，保存到数据库
    const queue = getImageGenerationQueue();
    queue.onTaskComplete(taskId, async (result) => {
      if (result.status === "completed" && result.imageUrl) {
        try {
          await prisma.nineGridImage.create({
            data: {
              user_id: payload.userId,
              chapter_id: novelChapterId,
              panel_ids: shotIds,
              image_url: result.imageUrl,
              prompt_combined: finalPrompt,
              comic_style_id: comicStyleId || null,
            },
          });
          console.log(`[NineGrid] ✅ Saved to database: taskId=${taskId}`);
        } catch (dbError) {
          console.error(`[NineGrid] ❌ Failed to save to database:`, dbError);
        }
      } else if (result.status === "failed") {
        console.log(`[NineGrid] Task failed: taskId=${taskId}, error=${result.error}`);
      }
    });

    return NextResponse.json({
      success: true,
      taskId,
      status: "pending",
      message: "九宫格图片生成任务已提交",
    });
  } catch (error) {
    console.error("[NineGrid] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - 查询任务状态（可选）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "缺少 taskId 参数" }, { status: 400 });
  }

  const queue = getImageGenerationQueue();
  const status = queue.getStatus(taskId);

  if (!status) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  return NextResponse.json({
    taskId,
    status: status.status,
    progress: status.progress,
    imageUrl: status.imageUrl,
    error: status.error,
  });
}
