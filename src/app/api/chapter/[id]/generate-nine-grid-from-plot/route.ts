/**
 * POST /api/chapter/[id]/generate-nine-grid-from-plot
 * 从剧情概述生成九宫格图片（两步流程）
 * 
 * 第一步：使用 LLM 生成 9 个连续的分镜提示词
 * 第二步：使用提示词生成九宫格图片（3×3，每格 16:9）
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateNineGridPanels } from "@/lib/nine-grid-generator";
import { callImageGenerationByType } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

interface RequestBody {
  project_id: string;
  plot_summary: string;      // 剧情概述
  comic_style_id?: string;    // 漫画风格ID
  reference_image?: string;   // 参考图URL
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    // 1. 认证检查
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

    // 2. 获取参数
    const { id: chapterId } = await context.params;
    const body = await request.json() as RequestBody;
    const {
      project_id,
      plot_summary,
      comic_style_id,
      reference_image,
    } = body;

    // 3. 参数验证
    if (!project_id || typeof project_id !== "string") {
      return NextResponse.json(
        { error: "缺少必需的 project_id 参数" },
        { status: 400 }
      );
    }

    if (!plot_summary || typeof plot_summary !== "string" || plot_summary.trim().length === 0) {
      return NextResponse.json(
        { error: "缺少必需的 plot_summary 参数" },
        { status: 400 }
      );
    }

    // 4. 获取章节及验证权限
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            user_id: true,
            title: true,
            genre: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    // 5. 验证项目所有权
    const project = await prisma.project.findUnique({
      where: { id: project_id },
      select: { user_id: true, story_id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    if (project.story_id !== chapter.story_id) {
      return NextResponse.json(
        { error: "项目和章节不属于同一个故事" },
        { status: 400 }
      );
    }

    // 6. 获取漫画风格信息
    let stylePrompt: string | undefined;
    let themeName: string | undefined;

    if (comic_style_id) {
      const comicStyle = await prisma.comicStyle.findUnique({
        where: { id: comic_style_id },
        select: {
          name_zh: true,
          prompt_prefix: true,
        },
      });

      if (comicStyle) {
        themeName = comicStyle.name_zh;
        stylePrompt = comicStyle.prompt_prefix || undefined;
      }
    }

    // 7. 检查配额（LLM + 图片生成，共2次）
    try {
      await assertAndIncrementUsage({
        userId,
        action: "llm_chat", // 修复：使用正确的 UsageAction 类型
        providerType: "script_analyzer",
      });

      await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generation",
      });
    } catch (quotaError: unknown) {
      const error = quotaError as {
        code?: string;
        message?: string;
        limit?: number;
        count?: number;
      };
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

    console.log(`[九宫格生成] 步骤1: 生成分镜提示词...`);

    // 8. 第一步：使用 LLM 生成 9 个连续的分镜提示词
    const panels = await generateNineGridPanels(
      {
        plotSummary: plot_summary,
        theme: themeName,
        stylePrompt,
        referenceImage: reference_image,
        storyTitle: chapter.story.title,
        genre: chapter.story.genre,
      },
      userId
    );

    console.log(`[九宫格生成] 生成了 ${panels.length} 个分镜提示词`);

    // 9. 构建九宫格图片生成提示词
    const nineGridPrompt = buildNineGridImagePrompt(
      panels,
      plot_summary,
      stylePrompt,
      reference_image
    );

    console.log(`[九宫格生成] 步骤2: 生成九宫格图片...`);
    console.log(`[九宫格生成] 提示词长度: ${nineGridPrompt.length} 字符`);

    // 10. 第二步：生成九宫格图片
    const imageResult = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: nineGridPrompt,
      negative_prompt: buildNegativePrompt(),
      width: 1536,   // 3×3 布局，每格 512px
      height: 864,   // 16:9 比例：1536 / 864 ≈ 1.78
      steps: 30,
      cfg_scale: 7,
      options: { userId },
    });

    if (!imageResult.success || !imageResult.images || imageResult.images.length === 0) {
      throw new Error(imageResult.error || "图片生成失败");
    }

    console.log(`[九宫格生成] 图片生成成功`);

    // 11. 上传到 MinIO
    await ensureBucketExists();

    const base64Image = imageResult.images[0];
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const timestamp = Date.now();
    const objectName = `generated/${userId}/nine-grid/${timestamp}_${chapterId}.png`;

    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      imageBuffer,
      imageBuffer.length,
      { "Content-Type": "image/png" }
    );

    const imageUrl = getPublicUrl(objectName);
    console.log(`[九宫格生成] 图片已上传: ${imageUrl}`);

    // 12. 构建组合提示词（用于记录）
    const promptCombined = panels
      .map((p, i) => `镜头${String(i + 1).padStart(2, "0")}：${p.visual_prompt}`)
      .join("\n\n");

    // 13. 保存九宫格记录到数据库
    const nineGridImage = await prisma.nineGridImage.create({
      data: {
        user_id: userId,
        chapter_id: chapterId,
        panel_ids: [], // 从剧情生成的，没有关联的 panel_ids
        image_url: imageUrl,
        prompt_combined: promptCombined,
        comic_style_id: comic_style_id || null,
        reference_image: reference_image || null,
      },
    });

    // 14. 同时保存到素材库（GeneratedImage）
    await prisma.generatedImage.create({
      data: {
        user_id: userId,
        image_url: imageUrl,
        prompt: promptCombined,
        style: comic_style_id ? `九宫格 - ${comic_style_id}` : "九宫格",
        source_type: "nine_grid",
        source_id: nineGridImage.id,
        chapter_id: chapterId,
        panel_ids: [],
        generation_params: {
          mode: "from_plot",
          plot_summary,
          comic_style_id,
          reference_image,
          panels_count: panels.length,
        },
      },
    });

    // 15. 记录生成日志
    await recordGenerationLog({
      userId,
      projectId: project_id,
      action: "nine_grid_from_plot_generation",
      providerType: "image_generation",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: {
        chapter_id: chapterId,
        plot_summary,
        comic_style_id,
        reference_image,
      },
      responsePayload: {
        image_url: imageUrl,
        panels_generated: panels.length,
      },
    });

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      nine_grid_id: nineGridImage.id,
      panels,  // 返回生成的分镜提示词
      message: "成功生成九宫格图片",
    });
  } catch (error) {
    console.error("[九宫格生成] 失败:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "nine_grid_from_plot_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 构建九宫格图片生成提示词
 */
function buildNineGridImagePrompt(
  panels: Array<{ panel_order: number; visual_prompt: string; description: string }>,
  plotSummary: string,
  stylePrompt?: string,
  referenceImage?: string
): string {
  let prompt = `根据"${plotSummary.substring(0, 100)}"，生成一张具有凝聚力的3×3网格图像，包含在同一环境中的9个不同摄像机镜头，严格保持人物/物体、服装和光线的一致性，8K分辨率，16：9画幅。\n\n`;

  // 添加风格
  if (stylePrompt) {
    prompt += `风格：${stylePrompt}\n\n`;
  }

  // 添加参考图说明
  if (referenceImage) {
    prompt += `参考图：${referenceImage}\n请严格保持参考图中的人物外观、服装风格、色彩倾向和美术气质。\n\n`;
  }

  // 添加9个镜头描述
  panels.forEach((panel, index) => {
    const num = String(index + 1).padStart(2, "0");
    prompt += `镜头${num}：${panel.visual_prompt}\n`;
  });

  // 添加角色和场景说明（从第一个和最后一个镜头提取）
  prompt += `\n图1是${extractSubject(panels[0].description)}，`;
  prompt += `图9是${extractSubject(panels[8].description)}。`;
  
  prompt += `\n\n生成的一定是九宫格，且每个格子比例都是16：9，所有镜头保持视觉一致性。`;

  return prompt;
}

/**
 * 从描述中提取主体（简单实现）
 */
function extractSubject(description: string): string {
  // 简单提取前30个字符作为主体描述
  return description.substring(0, 30).trim();
}

/**
 * 构建负面提示词
 */
function buildNegativePrompt(): string {
  return [
    "inconsistent style",
    "different characters",
    "character mutation",
    "style changes",
    "color inconsistency",
    "bad anatomy",
    "deformed",
    "ugly",
    "blurry",
    "low quality",
    "watermark",
    "text",
    "signature",
    "different aspect ratios",
    "uneven grid",
  ].join(", ");
}
