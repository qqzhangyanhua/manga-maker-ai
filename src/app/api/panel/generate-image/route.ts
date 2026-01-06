import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { findBestReferenceImage } from "@/lib/character-reference";
import { generateImage } from "@/lib/unified-image-generation";

// POST /api/panel/generate-image - 为单个分镜生成图像
export async function POST(req: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let usageSnapshot: { count: number; limit: number } | null = null;

  try {
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

    const body = await req.json();
    const {
      panel_id,
      prompt,
      style,
      wait,
      reference_image_urls = [],
      // 新增参数
      negative_prompt,
      model_name,
      aspect_ratio,
      num_inference_steps,
      guidance_scale,
    } = body;

    if (!panel_id || !prompt) {
      return NextResponse.json(
        { error: "缺少 panel_id 或 prompt" },
        { status: 400 }
      );
    }

    // 获取panel并验证权限，包含资产关联（含表情和三视图以便智能查找参考图）
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: {
        project: true,
        character: {
          include: {
            expressions: {
              select: {
                expression_type: true,
                image_url: true,
              },
            },
            views: {
              select: {
                view_type: true,
                image_url: true,
              },
            },
            outfits: true,
          },
        },
        outfit: true,
        scene: true,
        chapter: {
          include: {
            scene: true, // 章节关联的 Scene
          },
        },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        amount: 1,
      });
    } catch (quotaError: any) {
      if (quotaError?.code === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            error: quotaError.message,
            code: "QUOTA_EXCEEDED",
            limit: quotaError.limit,
            used: quotaError.count,
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    // Phase 2: Build enhanced prompt using bound assets
    let enhancedPrompt = prompt;

    // Add character information
    if (panel.character) {
      const charDesc = panel.character.base_prompt || panel.character.name;
      enhancedPrompt += `, character: ${charDesc}`;

      // Add expression if specified
      if (panel.expression_type) {
        enhancedPrompt += `, expression: ${panel.expression_type}`;
      }

      // Add outfit if specified
      if (panel.outfit) {
        enhancedPrompt += `, wearing: ${panel.outfit.outfit_name}`;
      }
    }

    // Add scene information
    if (panel.scene) {
      enhancedPrompt += `, background: ${panel.scene.name} (${panel.scene.scene_type})`;
    }

    // 参考图处理：优先使用用户选择的参考图，否则智能查找
    const referenceImages: string[] = [];

    if (reference_image_urls && reference_image_urls.length > 0) {
      // 用户手动选择了参考图，直接使用
      referenceImages.push(...reference_image_urls);
      console.log(`✓ 分镜 ${panel_id} 使用用户选择的 ${reference_image_urls.length} 张参考图`);
    } else {
      // 没有用户选择的参考图，使用智能查找（优先级：reference_image → base_image_url → neutral表情 → 任意表情 → 正面三视图）
      if (panel.character) {
        const characterRef = findBestReferenceImage({
          id: panel.character.id,
          name: panel.character.name,
          reference_image: panel.character.reference_image,
          base_image_url: panel.character.base_image_url,
          expressions: panel.character.expressions,
          views: panel.character.views,
        });

        if (characterRef) {
          referenceImages.push(characterRef);
          console.log(`✓ 分镜 ${panel_id} 将使用角色参考图: ${characterRef}`);
        } else {
          console.log(`ℹ 分镜 ${panel_id} 的角色 ${panel.character.name} 没有可用的参考图`);
        }
      }

      // Add outfit reference image if available
      if (panel.outfit?.image_url) {
        referenceImages.push(panel.outfit.image_url);
        console.log(`✓ 分镜 ${panel_id} 将使用服装参考图: ${panel.outfit.image_url}`);
      }

      // Add scene reference image if available
      if (panel.scene?.image_url) {
        referenceImages.push(panel.scene.image_url);
        console.log(`✓ 分镜 ${panel_id} 将使用场景参考图: ${panel.scene.image_url}`);
      }

      // Add chapter background image if available (priority: scene > background_image_url)
      if (panel.chapter) {
        if (panel.chapter.scene?.image_url) {
          referenceImages.push(panel.chapter.scene.image_url);
          console.log(`✓ 分镜 ${panel_id} 将使用章节关联场景图: ${panel.chapter.scene.image_url}`);
        } else if (panel.chapter.background_image_url) {
          referenceImages.push(panel.chapter.background_image_url);
          console.log(`✓ 分镜 ${panel_id} 将使用章节背景图: ${panel.chapter.background_image_url}`);
        }
      }
    }

    console.log(`分镜 ${panel_id} 总共使用 ${referenceImages.length} 张参考图`);

    // 根据宽高比计算图片尺寸
    const calculateDimensions = (ratio: string): { width: number; height: number } => {
      const baseSize = 1024;
      switch (ratio) {
        case "1:1":
          return { width: baseSize, height: baseSize };
        case "16:9":
          return { width: baseSize, height: Math.round(baseSize * 9 / 16) };
        case "9:16":
          return { width: Math.round(baseSize * 9 / 16), height: baseSize };
        case "4:3":
          return { width: baseSize, height: Math.round(baseSize * 3 / 4) };
        case "3:4":
          return { width: Math.round(baseSize * 3 / 4), height: baseSize };
        default:
          return { width: baseSize, height: Math.round(baseSize * 3 / 4) };
      }
    };

    const dimensions = calculateDimensions(aspect_ratio || "4:3");

    // 使用统一图片生成系统 - 直接同步生成（不使用队列）
    const stylePrompt = style || panel.project.style || "manga style";
    const fullPrompt = `${enhancedPrompt}, ${stylePrompt}, high quality, detailed`;

    console.log(`🚀 开始直接生成图片...`);
    console.log(`  - Prompt: ${fullPrompt.substring(0, 100)}...`);
    console.log(`  - Negative Prompt: ${negative_prompt || "none"}`);
    console.log(`  - Model: ${model_name || "default"}`);
    console.log(`  - Dimensions: ${dimensions.width}x${dimensions.height} (${aspect_ratio || "default"})`);
    console.log(`  - Steps: ${num_inference_steps || "default"}`);
    console.log(`  - Guidance: ${guidance_scale || "default"}`);
    console.log(`  - 参考图数量: ${referenceImages.length}`);

    // 直接调用图片生成，不使用队列
    const { callImageGenerationByType } = await import("@/lib/image-generation");

    let imageUrl: string | undefined;
    try {
      const result = await callImageGenerationByType({
        providerType: "image_generation",
        prompt: fullPrompt,
        negative_prompt: negative_prompt,
        width: dimensions.width,
        height: dimensions.height,
        steps: num_inference_steps,
        cfg_scale: guidance_scale,
        referenceImageUrls: referenceImages,
        options: { userId },
      });

      console.log(`📊 图片生成结果:`, { success: result.success, images: result.images?.length });

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
      const objectName = `generated/${userId}/panel/${timestamp}_${panel_id}.png`;

      console.log(`📤 上传图片到 MinIO: ${objectName}`);

      // 上传到 MinIO
      await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        imageBuffer,
        imageBuffer.length,
        { "Content-Type": "image/png" }
      );

      // 生成公开访问 URL
      imageUrl = getPublicUrl(objectName);
      console.log(`✅ 图片生成并上传成功: ${imageUrl}`);

    } catch (genError) {
      console.error(`❌ 图片生成失败:`, genError);
      throw genError;
    }

    // 更新panel的generated_image
    if (imageUrl) {
      await prisma.panel.update({
        where: { id: panel_id },
        data: {
          generated_image: imageUrl,
          prompt_used: prompt,
        },
      });
      console.log(`✓ Panel ${panel_id} 的 generated_image 已更新`);
    }

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        status: "success",
        durationMs: Date.now() - startedAt,
        requestPayload: {
          panel_id,
          prompt,
          negative_prompt,
          model_name,
          aspect_ratio,
          num_inference_steps,
          guidance_scale,
          style,
          reference_images_count: referenceImages.length,
        },
        responsePayload: { panel_id, image_url: imageUrl },
      });
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      usage: usageSnapshot,
      message: "图片生成完成",
    });
  } catch (error) {
    console.error("Generate image error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/panel/generate-batch - 批量生成项目的所有分镜图像
export async function PUT(req: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let usageSnapshot: { count: number; limit: number } | null = null;

  try {
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

    const body = await req.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: "缺少 project_id" }, { status: 400 });
    }

    // 获取项目并验证权限
    const project = await prisma.project.findUnique({
      where: { id: project_id },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const panelsToGenerate = project.panels.filter((p) => p.prompt_used);

    if (panelsToGenerate.length === 0) {
      return NextResponse.json(
        { error: "没有可生成的分镜(缺少prompt)" },
        { status: 400 }
      );
    }

    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        amount: panelsToGenerate.length,
      });
    } catch (quotaError: any) {
      if (quotaError?.code === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            error: quotaError.message,
            code: "QUOTA_EXCEEDED",
            limit: quotaError.limit,
            used: quotaError.count,
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    // 使用统一图片生成系统批量提交任务
    const stylePrompt = project.style || "manga style";
    const taskIds: string[] = [];

    for (const panel of panelsToGenerate) {
      const fullPrompt = `${panel.prompt_used}, ${stylePrompt}, high quality, detailed`;

      const { taskId } = await generateImage(
        "panel",
        fullPrompt,
        userId,
        {
          style: stylePrompt,
          width: 1024,
          height: 768,
          metadata: { panel_id: panel.id, project_id },
        }
      );

      taskIds.push(taskId);
    }

    await recordGenerationLog({
      userId,
      action: "batch_image_generation",
      providerType: "image_generation",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: { project_id, panel_count: panelsToGenerate.length },
      responsePayload: { task_ids: taskIds },
    });

    return NextResponse.json({
      success: true,
      task_ids: taskIds,
      panel_count: panelsToGenerate.length,
      usage: usageSnapshot,
      message: `已提交${panelsToGenerate.length}个分镜的生成任务`,
    });
  } catch (error) {
    console.error("Batch generate error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    if (userId) {
      await recordGenerationLog({
        userId,
        action: "batch_image_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
