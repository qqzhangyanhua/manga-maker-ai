/**
 * POST /api/character/[id]/regenerate-image
 * 为已存在角色重新生成图片
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";

interface RequestBody {
  mode: "fast" | "variation";
  variation_prompt?: string;
  update_base_image?: boolean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params;

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

    // 获取角色
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    if (character.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此角色" }, { status: 403 });
    }

    // 解析请求
    const body = (await req.json()) as Partial<RequestBody>;
    const { mode = "fast", variation_prompt, update_base_image = true } = body;

    // 验证 mode 参数
    if (mode !== "fast" && mode !== "variation") {
      return NextResponse.json({ error: "mode 必须是 fast 或 variation" }, { status: 400 });
    }

    if (mode === "variation" && !variation_prompt) {
      return NextResponse.json({ error: "variation 模式需要提供 variation_prompt" }, { status: 400 });
    }

    // 构建提示词
    let finalPrompt: string;
    if (mode === "fast") {
      // 快速模式：直接使用原提示词
      finalPrompt = character.base_prompt || character.description || "";
    } else {
      // 变化模式：在原提示词基础上添加变化描述
      finalPrompt = `${character.base_prompt || character.description || ""}, ${variation_prompt}`;
    }

    console.log(`[regenerate-image] Regenerating image for ${character.name} (mode: ${mode})`);

    // 生成图片
    const imageResult = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: finalPrompt,
      negative_prompt:
        "blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, extra limbs, mutation, disfigured, watermark, text, signature",
      width: 512,
      height: 768,
      steps: 25,
      cfg_scale: 7.5,
      options: { userId: payload.userId },
    });

    if (!imageResult.success || !imageResult.images || imageResult.images.length === 0) {
      throw new Error(imageResult.error || "图片生成失败");
    }

    const image_base64 = imageResult.images[0];
    let image_url: string | null = null;

    // 如果需要更新 base_image，上传到 MinIO
    if (update_base_image) {
      await ensureBucketExists();

      // 转换 base64 为 Buffer
      const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // 生成对象名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const objectName = `users/${payload.userId}/characters/${character.id}/base_${timestamp}_${randomStr}.png`;

      // 上传到 MinIO
      await minioClient.putObject(MINIO_BUCKET, objectName, imageBuffer, imageBuffer.length, {
        "Content-Type": "image/png",
      });

      image_url = getPublicUrl(objectName);

      // 更新 Character.base_image_url
      await prisma.character.update({
        where: { id: characterId },
        data: { base_image_url: image_url },
      });

      console.log(`[regenerate-image] Updated base_image for ${character.name}: ${image_url}`);
    }

    return NextResponse.json({
      success: true,
      image_url,
      image_base64,
      optimized_prompt: finalPrompt,
      credits_used: 30,
    });
  } catch (error) {
    console.error("[regenerate-image] Error:", error);

    if (error instanceof Error && "code" in error && error.code === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "重新生成失败" },
      { status: 500 }
    );
  }
}
