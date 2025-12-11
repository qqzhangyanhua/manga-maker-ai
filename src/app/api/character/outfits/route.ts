import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType, ensureLlmProvider } from "@/lib/llm-provider";
import { generateOutfit, OUTFIT_TYPES, type OutfitType } from "@/lib/outfit-generation";
import { base64ToBuffer } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

const DEFAULT_IMAGE_PROVIDER_TYPE = "image_generation_outfit";
const DEFAULT_PROMPT_PROVIDER_TYPE = "storyboard";

// POST /api/character/outfits - Create new outfit for character
export async function POST(req: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let usageSnapshot: { count: number; limit: number } | null = null;
  let imageProviderType: string = DEFAULT_IMAGE_PROVIDER_TYPE;
  let promptProviderType: string = DEFAULT_PROMPT_PROVIDER_TYPE;

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
    const { character_id, outfit_name, outfit_type, description, generate_image = false, provider_type } = body;
    imageProviderType = provider_type || DEFAULT_IMAGE_PROVIDER_TYPE;
    promptProviderType = DEFAULT_PROMPT_PROVIDER_TYPE;

    if (!character_id || !outfit_name || !outfit_type) {
      return NextResponse.json(
        { error: "角色ID、服装名称和类型不能为空" },
        { status: 400 }
      );
    }

    // Verify character ownership
    const character = await prisma.character.findFirst({
      where: {
        id: character_id,
        user_id: payload.userId,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    try {
      await ensureLlmProvider(promptProviderType);
    } catch (providerError: any) {
      const message =
        providerError instanceof Error ? providerError.message : "模型未配置，请先在 /admin/llm-providers 添加";
      return NextResponse.json(
        { error: message, code: "MODEL_NOT_CONFIGURED", provider_type: promptProviderType },
        { status: 400 }
      );
    }
    if (generate_image) {
      try {
        await ensureLlmProvider(imageProviderType);
      } catch (providerError: any) {
        const message =
          providerError instanceof Error ? providerError.message : "模型未配置，请先在 /admin/llm-providers 添加";
        return NextResponse.json(
          { error: message, code: "MODEL_NOT_CONFIGURED", provider_type: imageProviderType },
          { status: 400 }
        );
      }
    }

    // Generate prompt for outfit
    const systemPrompt = `你是一个专业的服装设计师。请根据角色和服装类型生成详细的服装描述提示词。
要求：
1. 保持角色外观一致性
2. 详细描述服装的款式、颜色、材质
3. 包含配饰和细节
4. 使用专业的服装设计术语`;

    const userPrompt = `角色：${character.name}
角色描述：${character.description || ""}
服装类型：${outfit_type}
服装名称：${outfit_name}
${description ? `附加描述：${description}` : ""}

请生成该服装的详细提示词修饰语（用于添加到角色生成提示词中），输出纯文本。`;

    let promptModifier = "";
    let triggerWord = "";

    try {
      const { content } = await callChatCompletionByType({
        providerType: promptProviderType,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 500,
      });

      promptModifier = content.trim();
      triggerWord = outfit_type === "default" ? "" : `${outfit_type}_outfit`;
    } catch (error) {
      console.error("Failed to generate outfit prompt:", error);
      promptModifier = `wearing ${outfit_type} outfit, ${outfit_name}`;
      triggerWord = outfit_type === "default" ? "" : `${outfit_type}_outfit`;
    }

    // Step 3: 生成图片（如果需要）
    let imageUrl = "/placeholder-outfit.jpg";
    let imageGenerated = false;
    
    if (generate_image) {
      try {
        usageSnapshot = await assertAndIncrementUsage({
          userId,
          action: "image_generation",
          providerType: imageProviderType,
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

      console.log(`生成服装图片: ${OUTFIT_TYPES[outfit_type as OutfitType]} - ${outfit_name}`);

      // 确保 MinIO bucket 存在
      await ensureBucketExists();

      // 优化角色描述
      const characterDesc = character.description || character.name;
      let optimizedDescription = characterDesc;

      try {
        const optimizePrompt = `你是一个专业的角色设计师。请将角色描述优化为适合生成角色服装图的详细提示词。
要求：
1. 保留核心外观特征
2. 添加专业术语
3. 适合生成全身人物
4. 输出纯文本`;

        const { content } = await callChatCompletionByType({
          providerType: promptProviderType,
          messages: [
            { role: "system", content: optimizePrompt },
            { role: "user", content: `角色：${characterDesc}` },
          ],
          temperature: 0.7,
          maxTokens: 300,
        });

        optimizedDescription = content.trim();
      } catch (error) {
        console.warn("LLM 优化失败，使用原始描述:", error);
      }

      // 调用图片生成
      const base64Image = await generateOutfit(
        optimizedDescription,
        outfit_type as OutfitType,
        description,
        imageProviderType
      );

      // 转换为 Buffer
      const imageBuffer = base64ToBuffer(base64Image);

      // 生成对象名（使用outfit名称的拼音或英文）
      const safeOutfitName = outfit_name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const objectName = `users/${payload.userId}/characters/${character_id}/outfits/${safeOutfitName}_${timestamp}.png`;

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

      // 生成公开访问 URL
      imageUrl = getPublicUrl(objectName);
      imageGenerated = true;

      console.log(`服装图片已上传: ${imageUrl}`);
    }

    // If setting as default, unset other defaults
    if (outfit_type === "default") {
      await prisma.characterOutfit.updateMany({
        where: {
          character_id,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }

    // Check if outfit already exists for this character + outfit_type
    const existingOutfit = await prisma.characterOutfit.findFirst({
      where: {
        character_id,
        outfit_type,
      },
    });

    let outfit;
    if (existingOutfit) {
      // Update existing outfit (mainly the image_url if regenerated)
      outfit = await prisma.characterOutfit.update({
        where: { id: existingOutfit.id },
        data: {
          outfit_name, // Update name in case it changed
          image_url: imageUrl,
          prompt_modifier: promptModifier,
          trigger_word: triggerWord,
        },
      });
      console.log(`服装已更新: ${outfit.id}`);
    } else {
      // Create new outfit
      outfit = await prisma.characterOutfit.create({
        data: {
          character_id,
          outfit_name,
          outfit_type,
          prompt_modifier: promptModifier,
          trigger_word: triggerWord,
          is_default: outfit_type === "default",
          image_url: imageUrl,
        },
      });
      console.log(`服装已创建: ${outfit.id}`);
    }

    if (imageGenerated && userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "success",
        durationMs: Date.now() - startedAt,
        requestPayload: { character_id, outfit_name, outfit_type },
        responsePayload: { image_generated: true, image_url: imageUrl },
      });
    }

    const isUpdate = !!existingOutfit;
    
    return NextResponse.json({
      success: true,
      outfit,
      usage: usageSnapshot,
      message: isUpdate 
        ? (imageGenerated ? "服装更新成功，图片已生成" : "服装更新成功")
        : (imageGenerated ? "服装创建成功，图片已生成" : "服装创建成功"),
    }, { status: isUpdate ? 200 : 201 });
  } catch (error) {
    console.error("Create outfit error:", error);
    const message = error instanceof Error ? error.message : "创建服装失败";
    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "failed",
        durationMs: Date.now() - startedAt,
        requestPayload: { scope: "outfit" },
        errorMessage: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
