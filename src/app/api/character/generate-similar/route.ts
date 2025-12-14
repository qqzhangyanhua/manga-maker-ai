import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { callImageGenerationByType } from "@/lib/image-generation";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

// POST /api/character/generate-similar - Generate similar character variations
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
    const { character_id, variation_prompt, count = 1, provider_type = "image_generation" } = body;

    // Validate inputs
    if (!character_id) {
      return NextResponse.json({ error: "角色ID不能为空" }, { status: 400 });
    }

    if (!variation_prompt || variation_prompt.trim() === "") {
      return NextResponse.json({ error: "请输入变化描述" }, { status: 400 });
    }

    if (![1, 2, 3].includes(count)) {
      return NextResponse.json({ error: "生成数量只能是1、2或3" }, { status: 400 });
    }

    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: provider_type,
        amount: count,
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

    // Verify character ownership
    const character = await prisma.character.findFirst({
      where: {
        id: character_id,
        user_id: payload.userId,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在或无权访问" }, { status: 404 });
    }

    // Step 1: Use LLM to analyze character and generate optimized prompts
    const systemPrompt = `你是专业的角色设计师。请分析原角色特征，并根据用户的变化要求生成新的角色描述。

任务：
1. 提取原角色的核心特征（性别、年龄、发型、发色、眼睛、服装、体型、风格等）
2. 根据用户的变化要求，调整相应特征
3. 保持其他未提及的特征不变
4. 输出详细的 AI 绘画提示词，要求：
   - 包含专业术语（如 anime style, detailed, high quality, 8k 等）
   - 描述要具体且富有画面感
   - 适合 Stable Diffusion 等 AI 绘画工具使用

输出格式：纯文本提示词，不要 JSON 或其他格式。`;

    const userMessage = `
原角色名称：${character.name}
原角色描述：${character.description || "无描述"}
原角色标签：${character.tags.join(", ") || "无标签"}
用户的变化要求：${variation_prompt}

请生成适合 AI 绘画的详细提示词。`;

    console.log(`开始分析角色 ${character.name}，变化要求: ${variation_prompt}`);

    let optimizedPrompt: string;
    try {
      const { content } = await callChatCompletionByType({
        providerType: "character_analyzer",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        maxTokens: 800,
        options: {
          userId: payload.userId,
        },
      });

      optimizedPrompt = content.trim();
      console.log(`LLM 生成的优化提示词: ${optimizedPrompt}`);
    } catch (error) {
      console.warn("LLM 分析失败，使用简单组合:", error);
      // Fallback: 简单组合原描述和变化要求
      optimizedPrompt = `${character.description || character.name}, ${variation_prompt}, anime style, detailed, high quality, 8k`;
    }

    // Step 2: Generate images in parallel
    console.log(`开始生成 ${count} 张相似角色图片`);

    const generationPromises = Array.from({ length: count }, (_, index) => {
      // 为每张图片添加轻微的随机性（可选）
      const prompt = index === 0 
        ? optimizedPrompt 
        : `${optimizedPrompt}, variation ${index + 1}`;
      
      return callImageGenerationByType({
        providerType: provider_type,
        prompt,
        negative_prompt: "blurry, low quality, distorted, ugly, bad anatomy, multiple characters",
        width: 512,
        height: 768, // 3:4 比例，适合人物
        steps: 25,
        cfg_scale: 7.5,
      })
        .then((result) => {
          if (result.success && result.images.length > 0) {
            return {
              image_url: result.images[0], // 返回 base64 格式
              optimized_prompt: prompt,
            };
          }
          throw new Error(result.error || "图片生成失败");
        })
        .catch((error) => {
          console.error(`生成第 ${index + 1} 张图片失败:`, error);
          return null;
        });
    });

    const results = await Promise.all(generationPromises);
    const generated_images = results.filter((img) => img !== null);

    if (generated_images.length === 0) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: provider_type,
        status: "failed",
        durationMs: Date.now() - startedAt,
        requestPayload: { character_id, variation_prompt, count },
        errorMessage: "图片生成失败",
      });

      return NextResponse.json(
        { error: "图片生成失败，请稍后重试" },
        { status: 500 }
      );
    }

    console.log(`成功生成 ${generated_images.length} 张图片`);

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: provider_type,
        status: "success",
        durationMs: Date.now() - startedAt,
        requestPayload: { character_id, variation_prompt, count },
        responsePayload: { generated: generated_images.length },
      });
    }

    return NextResponse.json({
      success: true,
      generated_images,
      original_character: {
        name: character.name,
        description: character.description,
        tags: character.tags,
      },
      variation_prompt,
      usage: usageSnapshot,
      message: `成功生成 ${generated_images.length} 个角色变体`,
    });
  } catch (error) {
    console.error("Generate similar character error:", error);

    const errorMessage = error instanceof Error ? error.message : "生成相似角色失败";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        requestPayload: { message: "generate-similar" },
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
