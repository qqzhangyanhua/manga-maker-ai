/**
 * POST /api/chapter/[id]/generate-background
 * AI生成章节背景图
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { logInfo, logError } from "@/lib/api-logger";

interface RequestBody {
  prompt?: string; // 用户自定义提示词（可选）
  scene_type?: string; // 场景类型
  style?: string; // 风格
  negative_prompt?: string;
  width?: number;
  height?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", { endpoint: "/api/chapter/[id]/generate-background", method: "POST" });

    // Authentication
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
    logInfo("User authenticated", { endpoint: "/api/chapter/[id]/generate-background", userId });

    // Get chapter ID
    const { id: chapterId } = await params;

    // Parse request body
    const body: RequestBody = await req.json();
    const {
      prompt,
      scene_type = "outdoor",
      style = "manga style",
      negative_prompt = "people, humans, characters, text, watermark, low quality, blurry",
      width = 1024,
      height = 768,
    } = body;

    logInfo("Request validated", {
      endpoint: "/api/chapter/[id]/generate-background",
      userId,
      chapterId,
      scene_type,
    });

    // Verify chapter exists and belongs to user's story
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            user_id: true,
            genre: true,
            title: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.story.user_id !== userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // Build prompt
    let backgroundPrompt = prompt || "";

    if (!backgroundPrompt) {
      // Auto-generate prompt from chapter context
      const sceneTypeMap: Record<string, string> = {
        indoor: "室内场景",
        outdoor: "户外场景",
        urban: "城市街景",
        nature: "自然风景",
        fantasy: "奇幻场景",
        scifi: "科幻场景",
        historical: "历史古代场景",
        abstract: "抽象场景",
      };

      const sceneDesc = sceneTypeMap[scene_type] || "场景";
      backgroundPrompt = `${sceneDesc}, ${chapter.story.genre || "漫画"} 风格, ${chapter.title}背景`;

      if (chapter.summary) {
        backgroundPrompt += `, ${chapter.summary.substring(0, 100)}`;
      }
    }

    const fullPrompt = `${backgroundPrompt}, ${style}, detailed background, no characters, high quality, professional illustration`;

    logInfo("Starting background image generation", {
      endpoint: "/api/chapter/[id]/generate-background",
      userId,
      chapterId,
      prompt: fullPrompt.substring(0, 150),
    });

    // Generate image
    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: fullPrompt,
      negative_prompt,
      width,
      height,
      steps: 25,
      cfg_scale: 7,
      options: { userId },
    });

    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || "背景图生成失败");
    }

    const imageBase64 = result.images[0];

    // Upload to MinIO
    await ensureBucketExists();
    const fileName = `chapter-bg-${chapterId}-${Date.now()}.png`;
    const imageBuffer = Buffer.from(imageBase64, "base64");

    await minioClient.putObject(MINIO_BUCKET, fileName, imageBuffer, imageBuffer.length, {
      "Content-Type": "image/png",
    });

    const imageUrl = getPublicUrl(fileName);

    // Update chapter
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        background_image_url: imageUrl,
        background_prompt: fullPrompt,
        updated_at: new Date(),
      },
    });

    logInfo("Background generation completed", {
      endpoint: "/api/chapter/[id]/generate-background",
      userId,
      chapterId,
      imageUrl,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      prompt: fullPrompt,
    });
  } catch (error) {
    logError("Background generation failed", error, {
      endpoint: "/api/chapter/[id]/generate-background",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
