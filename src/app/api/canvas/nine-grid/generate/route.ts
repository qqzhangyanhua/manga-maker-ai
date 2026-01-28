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
  // [新增] 角色参考图
  characterReferences?: {
    characterId: string;
    referenceImageUrls: string[];
  }[];
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
  plotSummary: string,
  characterReferences?: { characterId: string; referenceImageUrls: string[] }[]
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

  // P2-2: 增加 plotSummary 截断限制到 400 字符，保留更多剧情信息
  const plotText = plotSummary
    ? truncateText(plotSummary, 400)
    : "连续的故事场景";
  const templateCore = `根据[${plotText}],生成一张具有凝聚力的[3×3]网格图像，包含在同一环境中的[9]个不同摄像机镜头，严格保持人物/物体、服装和光线的一致性，[8K]分辨率，[16：9]画幅。`;
  parts.push(templateCore);

  // 3. 镜头描述
  parts.push(shotLines);

  // P2-4: 移除提示词中的角色参考图 URL，改为仅通过 API 参数 referenceImages 传递
  // 这样可以：1) 减少提示词长度 2) 避免 URL 被模型误解为文本内容
  // 角色一致性说明（不包含具体 URL）
  if (characterReferences && characterReferences.length > 0) {
    parts.push(`角色一致性要求：共${characterReferences.length}个角色，请根据参考图保持外观一致性。`);
  }

  // P1-1: 优化结尾指令，移除文字标注要求，使用纯视觉指令
  parts.push(
    "输出要求：纯视觉内容，无文字标注，无水印。严格3×3网格布局，每格16:9比例。"
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

  const { shotIds, comicStyleId, plotSummary, characterReferences } = body;

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

  // characterReferences 是可选的
  const finalCharacterReferences = characterReferences || [];

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

    // P0-1: chapter_id 为空时返回错误，不再继续执行
    if (!novelChapterId) {
      console.error("[NineGrid] ❌ TimelineChapter.chapter_id 为空!", {
        timelineChapterId,
        suggestion: "请运行数据修复脚本或重新添加章节到时间线",
      });
      return NextResponse.json(
        {
          error: "章节数据异常",
          detail: "TimelineChapter.chapter_id 为空，无法关联九宫格图片",
          suggestion: "请尝试删除并重新添加该章节到时间线",
        },
        { status: 400 }
      );
    }

    console.log("[NineGrid] 章节ID映射:", {
      timelineChapterId,
      novelChapterId,
    });

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
      finalPlotSummary,
      finalCharacterReferences
    );

    // ========== 详细日志输出（便于排查问题）==========
    console.log("\n" + "=".repeat(80));
    console.log("[NineGrid] 九宫格生成请求详情");
    console.log("=".repeat(80));

    // 1. 基础信息
    console.log("\n📌 基础信息:");
    console.log(`  - 用户ID: ${payload.userId}`);
    console.log(`  - 时间线ID: ${timelineId}`);
    console.log(`  - 章节ID: ${novelChapterId}`);
    console.log(`  - 漫画风格ID: ${comicStyleId || "未设置"}`);
    console.log(`  - 风格前缀: ${stylePromptPrefix ? stylePromptPrefix.substring(0, 50) + "..." : "无"}`);

    // 2. 镜头信息
    console.log("\n📷 镜头信息:");
    console.log(`  - 镜头数量: ${shotIds.length}`);
    console.log(`  - 镜头IDs: ${shotIds.join(", ")}`);

    // 3. 角色参考图信息
    console.log("\n👤 角色参考图:");
    if (finalCharacterReferences.length > 0) {
      console.log(`  - 角色数量: ${finalCharacterReferences.length}`);
      finalCharacterReferences.forEach((ref, index) => {
        console.log(`  - 角色${index + 1} (ID: ${ref.characterId}):`);
        console.log(`    - 参考图数量: ${ref.referenceImageUrls.length}`);
        ref.referenceImageUrls.forEach((url, urlIndex) => {
          // 检查图片URL是否经过压缩（通常压缩后的URL会包含特定参数或路径）
          const isCompressed = url.includes("thumbnail") ||
                               url.includes("resize") ||
                               url.includes("compress") ||
                               url.includes("w=") ||
                               url.includes("quality=");
          console.log(`    - 图片${urlIndex + 1}: ${url}`);
          console.log(`      是否压缩: ${isCompressed ? "是" : "否（原图）"}`);
        });
      });
    } else {
      console.log("  - 无角色参考图");
    }

    // 4. 剧情概述
    console.log("\n📝 剧情概述:");
    console.log(`  - 长度: ${finalPlotSummary.length} 字符`);
    console.log(`  - 内容: ${finalPlotSummary || "(空)"}`);

    // 5. 完整提示词
    console.log("\n📜 完整提示词:");
    console.log("-".repeat(60));
    console.log(finalPrompt);
    console.log("-".repeat(60));
    console.log(`  - 提示词总长度: ${finalPrompt.length} 字符`);

    console.log("\n" + "=".repeat(80) + "\n");

    // 提取所有角色参考图URL
    const allReferenceImageUrls = finalCharacterReferences.flatMap(
      ref => ref.referenceImageUrls
    );

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
      referenceImages: allReferenceImageUrls,
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
