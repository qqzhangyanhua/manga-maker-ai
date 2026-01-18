import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { callImageGenerationByType } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";

export async function POST(req: Request) {
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

    const body = await req.json();
    const {
      prompt,
      negative_prompt,
      width = 512,
      height = 512,
      steps = 30,
      cfg_scale = 7,
      type = "general",
      metadata = {},
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: "缺少 prompt 参数" }, { status: 400 });
    }

    console.log(`[image-generation] 开始生成图片...`);
    console.log(`  - Type: ${type}`);
    console.log(`  - Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`  - Size: ${width}x${height}`);

    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt,
      negative_prompt: negative_prompt || "low quality, blurry, distorted",
      width,
      height,
      steps,
      cfg_scale,
      options: { userId: payload.userId },
    });

    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || "图片生成失败");
    }

    await ensureBucketExists();

    const base64Data = result.images[0].replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const objectName = `generated/${payload.userId}/${type}/${timestamp}_${randomStr}.png`;

    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      imageBuffer,
      imageBuffer.length,
      { "Content-Type": "image/png" }
    );

    const imageUrl = getPublicUrl(objectName);

    console.log(`[image-generation] 图片生成成功: ${imageUrl}`);

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      image_base64: result.images[0],
      metadata,
    });
  } catch (error) {
    console.error("[image-generation] Error:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
