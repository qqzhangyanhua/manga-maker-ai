import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateNineGridImage } from "@/lib/nine-grid-image-generator";
import { uploadToMinIO } from "@/lib/minio";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

/**
 * POST /api/chapter/[id]/generate-nine-grid-image
 * 生成九宫格图片（3×3 布局，包含 9 个分镜）
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

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

    const { id: chapterId } = await context.params;
    const body = await request.json();
    const {
      project_id,
      panel_ids,
      comic_style_id,
      style_prompt,
      reference_image,
    } = body;

    // 参数验证
    if (!project_id || typeof project_id !== "string") {
      return NextResponse.json(
        { error: "缺少必需的 project_id 参数" },
        { status: 400 }
      );
    }

    if (!Array.isArray(panel_ids) || panel_ids.length !== 9) {
      return NextResponse.json(
        { error: "必须选择恰好 9 个分镜" },
        { status: 400 }
      );
    }

    // 获取章节及验证权限
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

    // 验证项目所有权
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

    // 获取选中的 9 个分镜
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panel_ids },
        chapter_id: chapterId,
      },
      orderBy: {
        panel_order: "asc",
      },
      select: {
        id: true,
        panel_order: true,
        description: true,
        visual_prompt: true,
      },
    });

    if (panels.length !== 9) {
      return NextResponse.json(
        { error: `只找到 ${panels.length} 个有效分镜，需要 9 个` },
        { status: 400 }
      );
    }

    // 按照 panel_ids 的顺序重新排列分镜
    const orderedPanels = panel_ids.map((id) => 
      panels.find((p) => p.id === id)
    ).filter((p): p is NonNullable<typeof p> => p !== undefined);

    // 检查配额
    try {
      await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generator",
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

    // 生成九宫格图片
    const imageBuffer = await generateNineGridImage({
      panels: orderedPanels,
      stylePrompt: style_prompt,
      referenceImage: reference_image,
      storyTitle: chapter.story.title,
      genre: chapter.story.genre,
    }, userId);

    // 上传到 MinIO
    const filename = `nine-grid-${chapterId}-${Date.now()}.png`;
    const imageUrl = await uploadToMinIO(
      imageBuffer,
      filename,
      "image/png"
    );

    // 构建组合提示词（用于记录）
    const promptCombined = orderedPanels
      .map((p, i) => `Panel ${i + 1}: ${p.visual_prompt}`)
      .join("\n");

    // 保存九宫格记录到数据库
    const nineGridImage = await prisma.nineGridImage.create({
      data: {
        user_id: userId,
        chapter_id: chapterId,
        panel_ids: panel_ids,
        image_url: imageUrl,
        prompt_combined: promptCombined,
        comic_style_id: comic_style_id || null,
        reference_image: reference_image || null,
      },
    });

    // 同时保存到素材库（GeneratedImage）
    await prisma.generatedImage.create({
      data: {
        user_id: userId,
        image_url: imageUrl,
        prompt: promptCombined,
        style: comic_style_id ? `九宫格 - ${comic_style_id}` : "九宫格",
        source_type: "nine_grid",
        source_id: nineGridImage.id,
        chapter_id: chapterId,
        panel_ids: panel_ids,
        generation_params: {
          mode: "from_panels",
          panel_ids,
          comic_style_id,
          reference_image,
        },
      },
    });

    // 记录生成日志
    await recordGenerationLog({
      userId,
      projectId: project_id,
      action: "nine_grid_image_generation",
      providerType: "image_generator",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: {
        chapter_id: chapterId,
        panel_ids,
        comic_style_id,
        reference_image,
      },
      responsePayload: {
        image_url: imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      nine_grid_id: nineGridImage.id,
      message: `成功生成九宫格图片`,
    });
  } catch (error) {
    console.error("九宫格图片生成失败:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "nine_grid_image_generation",
        providerType: "image_generator",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
