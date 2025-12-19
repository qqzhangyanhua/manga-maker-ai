import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { callImageGenerationByType } from "@/lib/image-generation";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { logInfo, logError } from "@/lib/api-logger";
import { uploadBase64Image } from "@/lib/upload-helpers";

/**
 * POST /api/character/generate-from-style
 * Generate a new character based on style description using AI
 */
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

    logInfo("Request received", { endpoint: "/api/character/generate-from-style", userId });

    const body = await req.json();
    const { style_prompt, comic_style_id, provider_type = "image_generation" } = body;

    // Validate inputs
    if (!style_prompt || style_prompt.trim() === "") {
      return NextResponse.json({ error: "风格描述不能为空" }, { status: 400 });
    }

    logInfo("Request validated", { endpoint: "/api/character/generate-from-style", userId, style_prompt });

    // Check usage quota for image generation
    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: provider_type,
        amount: 1,
      });
    } catch (quotaError: unknown) {
      if (quotaError && typeof quotaError === "object" && "code" in quotaError && quotaError.code === "QUOTA_EXCEEDED") {
        const error = quotaError as { message: string; code: string; limit: number; count: number };
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

    logInfo("Usage quota checked", { endpoint: "/api/character/generate-from-style", userId, usageSnapshot });

    // Step 1: Use LLM to generate detailed character information
    const systemPrompt = `你是专业的角色设计师。根据用户提供的风格描述，生成一个完整的角色设定。

任务：
1. 根据风格描述创造一个独特的角色
2. 生成角色的中文名称（2-6个字，富有创意且符合风格）
3. 生成详细的角色描述（150-300字），包括：
   - 外观特征（发型、发色、眼睛、脸型、身材）
   - 服装风格（具体的服装描述）
   - 性格特点
   - 背景故事（简短）
4. 生成适合 AI 绘画的英文提示词（详细、专业、富有画面感）

输出格式（严格按照以下 JSON 格式）：
{
  "name": "角色名称",
  "description": "详细的中文描述",
  "prompt": "详细的英文 AI 绘画提示词，包含 anime style, detailed, high quality, 8k 等关键词"
}`;

    const userMessage = `风格描述：${style_prompt}

请生成一个符合此风格的完整角色设定。`;

    logInfo("Starting LLM character generation", { endpoint: "/api/character/generate-from-style", userId });

    let characterInfo: { name: string; description: string; prompt: string };
    try {
      const { content } = await callChatCompletionByType({
        providerType: "character_analyzer",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.8,
        maxTokens: 1000,
        options: {
          userId,
        },
      });

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("LLM返回格式不正确");
      }

      characterInfo = JSON.parse(jsonMatch[0]);

      if (!characterInfo.name || !characterInfo.description || !characterInfo.prompt) {
        throw new Error("LLM返回缺少必要字段");
      }

      logInfo("LLM character generation completed", {
        endpoint: "/api/character/generate-from-style",
        userId,
        characterName: characterInfo.name,
      });
    } catch (error) {
      logError("LLM character generation failed", error, { endpoint: "/api/character/generate-from-style", userId });
      return NextResponse.json(
        { error: "角色信息生成失败，请重试" },
        { status: 500 }
      );
    }

    // Step 2: Generate character image
    logInfo("Starting image generation", { endpoint: "/api/character/generate-from-style", userId });

    let imageUrl: string;
    try {
      const result = await callImageGenerationByType({
        providerType: provider_type,
        prompt: characterInfo.prompt,
        negative_prompt:
          "blurry, low quality, distorted, ugly, bad anatomy, multiple characters, watermark, text",
        width: 512,
        height: 768, // 3:4 aspect ratio for character portrait
        steps: 28,
        cfg_scale: 7.5,
      });

      if (!result.success || !result.images || result.images.length === 0) {
        throw new Error(result.error || "图像生成失败");
      }

      const base64Image = result.images[0]; // base64 format

      logInfo("Image generation completed", {
        endpoint: "/api/character/generate-from-style",
        userId,
        durationMs: Date.now() - startedAt,
      });

      // Step 3: Upload image to MinIO
      logInfo("Starting image upload to MinIO", { endpoint: "/api/character/generate-from-style", userId });

      try {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const filename = `character_${timestamp}_${randomStr}.png`;

        imageUrl = await uploadBase64Image(base64Image, filename);

        logInfo("Image uploaded to MinIO", {
          endpoint: "/api/character/generate-from-style",
          userId,
          imageUrl,
        });
      } catch (uploadError) {
        logError("MinIO upload failed", uploadError, { endpoint: "/api/character/generate-from-style", userId });
        throw new Error("图片上传失败");
      }
    } catch (error) {
      logError("Image generation failed", error, { endpoint: "/api/character/generate-from-style", userId });

      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: provider_type,
        status: "failed",
        durationMs: Date.now() - startedAt,
        requestPayload: { style_prompt, comic_style_id },
        errorMessage: error instanceof Error ? error.message : "图像生成失败",
      });

      return NextResponse.json(
        { error: "角色图片生成失败，请重试" },
        { status: 500 }
      );
    }

    // Record generation log
    await recordGenerationLog({
      userId,
      action: "image_generation",
      providerType: provider_type,
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: { style_prompt, comic_style_id },
      responsePayload: { characterName: characterInfo.name },
    });

    logInfo("Character generation completed", {
      endpoint: "/api/character/generate-from-style",
      userId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      character: {
        name: characterInfo.name,
        description: characterInfo.description,
        image_url: imageUrl, // MinIO URL format
        prompt: characterInfo.prompt,
      },
      usage: usageSnapshot,
      message: "角色生成成功",
    });
  } catch (error) {
    logError("Generate character from style error", error, {
      endpoint: "/api/character/generate-from-style",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const errorMessage = error instanceof Error ? error.message : "生成角色失败";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        requestPayload: { message: "generate-from-style" },
        errorMessage,
      });
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
