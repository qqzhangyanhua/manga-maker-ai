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
  style?: string;
}

/**
 * 中文镜头术语映射表
 */
const CAMERA_ANGLE_MAP: Record<string, string> = {
  "俯视": "top-down view",
  "仰视": "low-angle view",
  "平视": "eye-level view",
  "荷兰角": "dutch angle",
};

const SHOT_SIZE_MAP: Record<string, string> = {
  "特写": "close-up",
  "近景": "close shot",
  "中景": "medium shot",
  "全景": "full shot",
  "远景": "long shot",
};

/**
 * 转换中文镜头术语为英文
 */
function translateCameraTerm(term: string | null, map: Record<string, string>): string | null {
  if (!term) return null;
  return map[term] || term; // 如果已经是英文或未知术语，保持原样
}

/**
 * 获取合理的图片尺寸（基于分镜数量）
 */
function getImageDimensions(count: number): { width: number; height: number } {
  // 根据分镜数量返回合理的画布尺寸
  if (count <= 2) {
    return { width: 1024, height: 512 };  // 横向宽幅
  } else if (count <= 4) {
    return { width: 1024, height: 1024 }; // 方形画布
  } else {
    return { width: 1536, height: 1024 }; // 更大的画布
  }
}

/**
 * 获取明确的布局建议（根据分镜数量）
 */
function getLayoutHint(count: number): string {
  if (count === 2) {
    return "horizontal 2-panel layout";
  } else if (count === 3) {
    return "top-to-bottom 3-panel vertical progression";
  } else if (count === 4) {
    return "2x2 grid layout";
  } else if (count === 5) {
    return "mixed layout with larger top panel and 4 smaller bottom panels";
  } else if (count === 6) {
    return "3x2 grid layout or 2x3 grid layout";
  }
  return "appropriate multi-panel layout";
}

/**
 * 构建优化的多格提示词
 * 应用最佳实践：
 * 1. 语言统一性 - 全英文术语
 * 2. 角色一致性 - 全局角色定义
 * 3. 布局控制 - 明确布局建议
 * 4. 视觉隔离 - 强化边框描述
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
}>, style?: string): string {
  // 1. 收集所有角色（用于全局定义）
  const characters = new Set<string>();
  panels.forEach(panel => {
    if (panel.character_name) {
      characters.add(panel.character_name);
    }
  });

  // 2. 构建全局角色定义
  let characterReference = "";
  if (characters.size > 0) {
    const characterList = Array.from(characters).join(", ");
    characterReference = `[Character Reference] Main characters: ${characterList}. Maintain consistent appearance across all panels. `;
  }

  // 3. 构建每个分镜的描述（全英文）
  const panelDescriptions = panels.map((panel, index) => {
    const position = `Panel ${index + 1}`;
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

    // 添加镜头角度（转换为英文）
    const angleEn = translateCameraTerm(panel.camera_angle, CAMERA_ANGLE_MAP);
    if (angleEn) {
      desc += `, angle: ${angleEn}`;
    }

    // 添加景别（转换为英文）
    const shotEn = translateCameraTerm(panel.shot_size, SHOT_SIZE_MAP);
    if (shotEn) {
      desc += `, shot: ${shotEn}`;
    }

    return desc;
  }).join("; ");

  // 4. 获取明确的布局建议
  const layoutHint = getLayoutHint(panels.length);

  // 5. 构建风格描述
  const stylePrompt = style ? `Style: ${style}` : "Style: manga/comic style, black and white or toned";

  // 6. 组合完整提示词
  return [
    characterReference,
    `Create a manga comic page with ${panels.length} panels in ${layoutHint}.`,
    `Panels content: ${panelDescriptions}.`,
    `${stylePrompt}, professional panel arrangement, white gutters, distinct panel frames, clear panel borders, no bleeding between panels.`,
    `Seamless composition, high quality, detailed artwork.`
  ].join(" ").trim();
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

    const body = (await request.json()) as RequestBody;
    const { panel_ids, reference_image_urls = [], style } = body;

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

    // 获取图片尺寸
    const dimensions = getImageDimensions(panels.length);

    // 构建多格提示词（AI 自己决定布局）
    const multiPrompt = buildMultiPanelPrompt(panels, style);

    console.log(`[MultiPanelGenerate] 生成 ${panels.length} 格图片:`, {
      dimensions: `${dimensions.width}x${dimensions.height}`,
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
        width: dimensions.width,
        height: dimensions.height,
        referenceImageUrls: reference_image_urls,
        options: { userId },
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
          layout: `${panels.length}格（AI自动布局）`,
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
        layout: `${panels.length}格（AI自动布局）`,
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
          layout: `${panels.length}格（AI自动布局）`,
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
