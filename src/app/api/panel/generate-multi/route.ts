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
 * 获取场景的视觉重要性描述
 */
function getSceneVisualWeight(
  panel: {
    shot_size: string | null;
    camera_angle: string | null;
  },
  isFirst: boolean
): string {
  // 第一个场景默认作为主导性的大场景
  if (isFirst) {
    return "A large aerial view";
  }

  // 根据景别判断场景大小
  const shotSize = panel.shot_size;
  if (shotSize === "特写" || shotSize === "close-up") {
    return "A closer emotional moment";
  } else if (shotSize === "远景" || shotSize === "long shot") {
    return "A wide panoramic view";
  } else if (shotSize === "全景" || shotSize === "full shot") {
    return "A full scene showing";
  } else if (shotSize === "中景" || shotSize === "medium shot") {
    return "A medium view of";
  } else {
    // 默认中等视角
    return "A visual area showing";
  }
}

/**
 * 构建优化的多格提示词 - 电影化拼贴画理念
 * 核心原则：
 * 1. 连续电影插图 - 不是漫画页面，是单一连续的电影化插图
 * 2. 视觉区域 - 通过光照、透视、深度、构图自然分隔，而非框架
 * 3. 场景共存 - 多个故事时刻共存于一个画面场景中
 * 4. 大小不一 - 有些大而主导，有些小而嵌入环境
 * 5. 触及边缘 - 所有视觉区域触及图像边缘
 * 6. 无缝连接 - 通过统一氛围无缝连接
 * 7. 边界裁剪 - 被图像边界自然裁剪
 *
 * @returns { positive: string, negative: string } 正向和负向提示词
 */
function buildMultiPanelPrompt(
  panels: Array<{
  panel_order: number;
  description: string;
  visual_prompt: string | null;
  prompt_used: string | null;
  character_name: string | null;
  emotion: string | null;
  camera_angle: string | null;
  shot_size: string | null;
}>,
  options?: {
    style?: string;
    referenceImageCount?: number;
  }
): { positive: string; negative: string } {
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
    characterReference = `Characters: ${characterList}, consistent appearance.`;
  }

  // 3. 参考图提示
  const referenceHint =
    (options?.referenceImageCount ?? 0) > 0
      ? "Use reference images for character consistency."
      : "";

  // 4. 提取场景的主导氛围（从第一个场景）
  const firstPanel = panels[0];
  const firstDesc = firstPanel.visual_prompt || firstPanel.prompt_used || firstPanel.description || "";

  // 尝试识别氛围关键词
  let atmosphere = "Unified atmosphere";
  if (firstDesc.toLowerCase().includes("night") || firstDesc.toLowerCase().includes("夜")) {
    atmosphere = "Nighttime atmosphere";
  } else if (firstDesc.toLowerCase().includes("day") || firstDesc.toLowerCase().includes("日")) {
    atmosphere = "Daytime atmosphere";
  } else if (firstDesc.toLowerCase().includes("sunset") || firstDesc.toLowerCase().includes("黄昏")) {
    atmosphere = "Sunset atmosphere";
  } else if (firstDesc.toLowerCase().includes("rain") || firstDesc.toLowerCase().includes("雨")) {
    atmosphere = "Rainy atmosphere";
  }

  // 5. 构建每个场景的描述
  const sceneDescriptions = panels.map((panel, index) => {
    const visualWeight = getSceneVisualWeight(panel, index === 0);
    const content = panel.visual_prompt || panel.prompt_used || panel.description || "scene";

    const parts: string[] = [];

    // 镜头角度和景别
    const angleEn = translateCameraTerm(panel.camera_angle, CAMERA_ANGLE_MAP);
    const shotEn = translateCameraTerm(panel.shot_size, SHOT_SIZE_MAP);

    // 内容描述
    parts.push(content);

    // 角色和情绪
    if (panel.character_name) {
      let charDesc = panel.character_name;
      if (panel.emotion) {
        charDesc += ` with ${panel.emotion} expression`;
      }
      parts.push(charDesc);
    }

    // 添加镜头信息作为补充（如果有）
    if (angleEn || shotEn) {
      const cameraInfo = [shotEn, angleEn].filter(Boolean).join(", ");
      parts.push(`(${cameraInfo})`);
    }

    return `– ${visualWeight} of ${parts.join(", ")}.`;
  }).join("\n");

  // 6. 构建风格描述
  const baseStyle = options?.style?.trim() || "Hand-painted anime cinematic illustration, atmospheric lighting, moody, high detail";

  // 7. 组合正向提示词 - 电影化拼贴画理念
  const positive = [
    // === 图像本质 ===
    "A single continuous cinematic illustration.",
    "The entire image is filled edge to edge with artwork.",
    "",
    // === 明确不是什么 ===
    "This is NOT a comic page.",
    "This is NOT a printed page.",
    "There is no paper background.",
    "",
    // === 图像类型 ===
    "The image is a cinematic storyboard collage,",
    "where multiple story moments coexist in one painted scene.",
    "",
    // === 视觉分隔方式 ===
    "Different scenes appear as naturally separated visual areas",
    "through lighting, perspective, depth, and composition,",
    "not through frames or panel borders.",
    "",
    // === 场景大小关系 ===
    "Some scenes are large and dominant,",
    "others are smaller and embedded into the environment.",
    "All visual areas touch the image edges.",
    "",
    // === 统一氛围 ===
    `${atmosphere} connects all scenes seamlessly.`,
    "",
    // === 角色和参考 ===
    referenceHint,
    characterReference,
    "",
    // === 场景内容 ===
    "Scenes included:",
    sceneDescriptions,
    "",
    // === 边界裁剪特性 ===
    "Objects, buildings, and characters are cut off by the image boundaries.",
    "No empty space anywhere.",
    "No white background.",
    "",
    // === 风格 ===
    `Style:\n${baseStyle}.`
  ].filter(Boolean).join("\n").trim();

  // 8. 负向提示词 - 强化排除漫画页面概念
  const negative = [
    // 页面和印刷概念
    "comic page",
    "manga page",
    "printed page",
    "book page",
    "page layout",
    "paper background",
    "paper texture",
    "printed material",

    // 框架和边框
    "panel frames",
    "panel borders",
    "frame borders",
    "black borders",
    "white borders",
    "panel dividers",
    "separation lines",
    "dividing lines",
    "border lines",

    // 网格布局
    "grid layout",
    "comic grid",
    "manga grid",
    "regular grid",
    "aligned panels",
    "equal panels",
    "symmetrical panels",

    // 空白和边距
    "white background",
    "empty background",
    "white space",
    "whitespace",
    "empty space",
    "blank space",
    "margins",
    "padding",
    "gutters",

    // 3D/物理效果
    "photograph",
    "photo",
    "scanned",
    "book binding",
    "desk",
    "table",
    "hands holding",
    "3d rendering",

    // 质量问题
    "blurry",
    "low quality",
    "pixelated",
    "watermark",
    "signature",
    "text",
    "speech bubbles",
    "text boxes"
  ].join(", ");

  return { positive, negative };
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

    // 查询分镜数据（包含章节信息）
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panel_ids },
      },
      orderBy: {
        panel_order: "asc",
      },
      include: {
        project: true,
        chapter: {
          select: {
            id: true,
            title: true,
            chapter_order: true,
          },
        },
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

    // 构建多格提示词（返回正向和负向提示词）
    const { positive: multiPrompt, negative: negativePrompt } = buildMultiPanelPrompt(panels, {
      style,
      referenceImageCount: reference_image_urls.length,
    });

    console.log(`[MultiPanelGenerate] 生成 ${panels.length} 格图片:`, {
      dimensions: `${dimensions.width}x${dimensions.height}`,
      positive: multiPrompt.substring(0, 150) + "...",
      negative: negativePrompt,
      referenceImageCount: reference_image_urls.length,
    });

    // 调用图像生成 API
    const { callImageGenerationByType } = await import("@/lib/image-generation");

    let imageUrl: string | undefined;
    try {
      const result = await callImageGenerationByType({
        providerType: "image_generation",
        prompt: multiPrompt,
        negative_prompt: negativePrompt,
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

      // 获取章节信息（从第一个分镜）
      const chapterId = panels[0].chapter_id || null;
      const chapterInfo = panels[0].chapter;
      
      console.log(`[MultiPanelGenerate] 章节信息:`, {
        chapterId,
        chapterTitle: chapterInfo?.title,
        chapterOrder: chapterInfo?.chapter_order,
      });

      // 保存到 GeneratedImage 表
      await prisma.generatedImage.create({
        data: {
          user_id: userId,
          image_url: imageUrl,
          prompt: multiPrompt,
          source_type: "panel",
          source_id: project.id,
          style: `multi-panel-${panels.length}`,
          // @ts-ignore: Prisma client type update might be delayed
          chapter_id: chapterId,
          panel_ids: panel_ids,
        },
      });

      console.log(`[MultiPanelGenerate] 已保存图片记录，包含章节 ID: ${chapterId}`);

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
