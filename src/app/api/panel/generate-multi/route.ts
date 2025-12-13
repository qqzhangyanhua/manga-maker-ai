/**
 * 多镜生成 API - 一次性生成包含多个分镜的多格图片
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

interface RequestBody {
  panel_ids: string[];
  reference_image_urls?: string[];
}

/**
 * 计算布局信息
 */
function calculateLayout(count: number): { rows: number; cols: number; description: string } {
  switch (count) {
    case 2:
      return { rows: 1, cols: 2, description: "2格横排" };
    case 3:
      return { rows: 1, cols: 3, description: "3格横排" };
    case 4:
      return { rows: 2, cols: 2, description: "2×2网格" };
    case 5:
      return { rows: 2, cols: 3, description: "2×3网格（5格）" };
    case 6:
      return { rows: 2, cols: 3, description: "2×3网格" };
    default:
      return { rows: 1, cols: count, description: `${count}格横排` };
  }
}

/**
 * 构建多格提示词
 */
function buildMultiPanelPrompt(panels: Array<{
  panel_order: number;
  description: string;
  visual_prompt: string | null;
  prompt_used: string | null;
  character_name: string | null;
  emotion: string | null;
  camera_angle: string | null;
  shot_size: string | null;
}>, layout: { rows: number; cols: number; description: string }): string {
  // 构建多格漫画的结构化提示词
  const gridLayout = `${layout.rows}x${layout.cols} manga panel grid layout`;

  // 每个分镜的描述
  const panelDescriptions = panels.map((panel, index) => {
    const position = `panel ${index + 1}`;
    const content = panel.visual_prompt || panel.prompt_used || panel.description || "empty panel";

    let desc = `[${position}]: ${content}`;

    // 添加角色信息
    if (panel.character_name) {
      desc += `, character: ${panel.character_name}`;
    }

    // 添加情绪
    if (panel.emotion) {
      desc += `, emotion: ${panel.emotion}`;
    }

    // 添加镜头角度
    if (panel.camera_angle) {
      desc += `, angle: ${panel.camera_angle}`;
    }

    // 添加景别
    if (panel.shot_size) {
      desc += `, shot: ${panel.shot_size}`;
    }

    return desc;
  }).join("; ");

  // 组合完整提示词
  return `Create a ${gridLayout} manga comic page with the following panels: ${panelDescriptions}. Style: manga/comic style, black and white or toned, professional layout with clear panel borders, high quality, detailed artwork`;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    // 认证检查
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

    // 解析请求体
    const body = (await request.json()) as RequestBody;
    const { panel_ids, reference_image_urls = [] } = body;

    if (!panel_ids || !Array.isArray(panel_ids) || panel_ids.length < 2 || panel_ids.length > 6) {
      return NextResponse.json(
        { error: "panel_ids 必须是包含 2-6 个元素的数组" },
        { status: 400 }
      );
    }

    // 查询分镜数据
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panel_ids },
      },
      orderBy: {
        panel_order: "asc",
      },
      include: {
        project: true,
      },
    });

    if (panels.length !== panel_ids.length) {
      return NextResponse.json(
        { error: "部分分镜不存在" },
        { status: 404 }
      );
    }

    // 验证分镜所属项目是否属于当前用户
    const projectIds = [...new Set(panels.map((p) => p.project_id))];
    if (projectIds.length !== 1) {
      return NextResponse.json(
        { error: "选中的分镜必须属于同一个项目" },
        { status: 400 }
      );
    }

    const project = panels[0].project;
    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { error: "无权操作此项目" },
        { status: 403 }
      );
    }

    // 检查配额
    try {
      await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        amount: 1,
      });
    } catch (quotaError: unknown) {
      const error = quotaError as { code?: string; message?: string; limit?: number; count?: number };
      if (error?.code === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            error: error.message,
            code: "QUOTA_EXCEEDED",
            limit: error.limit,
            used: error.count,
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    // 计算布局
    const layout = calculateLayout(panels.length);

    // 构建多格提示词
    const multiPrompt = buildMultiPanelPrompt(panels, layout);

    console.log(`[MultiPanelGenerate] 生成 ${panels.length} 格图片:`, {
      layout: layout.description,
      prompt: multiPrompt.substring(0, 200) + "...",
      referenceImageCount: reference_image_urls.length,
    });

    // 调用图像生成 API
    const { callImageGenerationByType } = await import("@/lib/image-generation");

    let imageUrl: string | undefined;
    try {
      const result = await callImageGenerationByType({
        providerType: "image_generation",
        prompt: multiPrompt,
        width: layout.cols * 512, // 根据列数调整宽度
        height: layout.rows * 512, // 根据行数调整高度
        referenceImageUrls: reference_image_urls,
      });

      console.log(`[MultiPanelGenerate] 图片生成结果:`, {
        success: result.success,
        images: result.images?.length
      });

      if (!result.success || !result.images || result.images.length === 0) {
        throw new Error(result.error || "图片生成失败");
      }

      // 上传到 MinIO
      const { base64ToBuffer } = await import("@/lib/image-generation");
      const { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } = await import("@/lib/minio");

      await ensureBucketExists();

      // 转换 base64 为 Buffer
      const imageBuffer = base64ToBuffer(result.images[0]);

      // 生成对象名
      const timestamp = Date.now();
      const objectName = `generated/${userId}/multi-panel/${timestamp}_${panels.length}panels.png`;

      console.log(`[MultiPanelGenerate] 上传图片到 MinIO: ${objectName}`);

      // 上传到 MinIO
      await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        imageBuffer,
        imageBuffer.length,
        {
          "Content-Type": "image/png",
        }
      );

      imageUrl = getPublicUrl(objectName);
      console.log(`[MultiPanelGenerate] 图片上传成功: ${imageUrl}`);

      // 保存到 GeneratedImage 表
      await prisma.generatedImage.create({
        data: {
          user_id: userId,
          image_url: imageUrl,
          prompt: multiPrompt,
          source_type: "panel",
          source_id: project.id,
          style: `multi-panel-${panels.length}`,
        },
      });

      // 记录生成日志
      await recordGenerationLog({
        userId,
        action: "multi_panel_generation",
        providerType: "image_generation",
        status: "success",
        durationMs: Date.now() - startedAt,
        requestPayload: {
          panel_ids,
          layout: layout.description,
          prompt: multiPrompt,
          reference_image_count: reference_image_urls.length,
        },
        responsePayload: {
          imageUrl,
          panelCount: panels.length,
        },
      });

      return NextResponse.json({
        success: true,
        image_url: imageUrl,
        layout: layout.description,
        panel_count: panels.length,
      });
    } catch (genError) {
      console.error("[MultiPanelGenerate] 生成失败:", genError);

      // 记录失败日志
      await recordGenerationLog({
        userId,
        action: "multi_panel_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        requestPayload: {
          panel_ids,
          layout: layout.description,
          prompt: multiPrompt,
          reference_image_count: reference_image_urls.length,
        },
        responsePayload: {
          error: genError instanceof Error ? genError.message : "未知错误",
        },
      });

      throw genError;
    }
  } catch (error) {
    console.error("[MultiPanelGenerate] Error:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
