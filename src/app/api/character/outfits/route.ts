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
    const { character_id, outfit_name, outfit_type, description, generate_image = false, provider_type, reference_image_url } = body;
    imageProviderType = provider_type || DEFAULT_IMAGE_PROVIDER_TYPE;
    promptProviderType = DEFAULT_PROMPT_PROVIDER_TYPE;

    console.log('\n========== 服装创建请求信息 ==========');
    console.log(`角色ID: ${character_id}`);
    console.log(`服装名称: ${outfit_name}`);
    console.log(`服装类型: ${outfit_type}`);
    console.log(`是否生成图片: ${generate_image}`);
    console.log(`参考图URL: ${reference_image_url || '未提供'}`);
    console.log(`图片生成Provider: ${imageProviderType}`);
    console.log(`提示词生成Provider: ${promptProviderType}`);
    console.log('=====================================\n');

    if (!character_id || !outfit_name || !outfit_type) {
      return NextResponse.json(
        { error: "角色ID、服装名称和类型不能为空" },
        { status: 400 }
      );
    }

    // Verify character ownership and get character with views/expressions for reference
    const character = await prisma.character.findFirst({
      where: {
        id: character_id,
        user_id: payload.userId,
      },
      include: {
        views: true,
        expressions: true,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    // 如果没有提供参考图，尝试从角色图片中选择
    let finalReferenceImageUrl = reference_image_url;
    if (!finalReferenceImageUrl) {
      console.log('\n========== 查找角色参考图 ==========');
      console.log(`角色ID: ${character.id}`);
      console.log(`角色名称: ${character.name}`);
      console.log(`base_image_url: ${character.base_image_url || '无'}`);
      console.log(`表情数量: ${character.expressions.length}`);
      if (character.expressions.length > 0) {
        console.log(`  - 表情类型: ${character.expressions.map(e => e.expression_type).join(', ')}`);
      }
      console.log(`三视图数量: ${character.views?.length || 0}`);
      if (character.views && character.views.length > 0) {
        console.log(`  - 视图类型: ${character.views.map(v => v.view_type).join(', ')}`);
      }

      // 第一优先级：使用角色的主图片（base_image_url）
      if (character.base_image_url) {
        finalReferenceImageUrl = character.base_image_url;
        console.log(`✓ 使用角色主图作为参考图: ${finalReferenceImageUrl}`);
      }
      // 第二优先级：使用 neutral 表情作为参考
      else if (character.expressions.length > 0) {
        const neutralExpression = character.expressions.find(exp => exp.expression_type === 'neutral');
        if (neutralExpression?.image_url) {
          finalReferenceImageUrl = neutralExpression.image_url;
          console.log(`✓ 使用角色的 neutral 表情作为参考图: ${finalReferenceImageUrl}`);
        } else {
          // 使用任意一张表情图
          finalReferenceImageUrl = character.expressions[0].image_url;
          console.log(`✓ 使用角色的 ${character.expressions[0].expression_type} 表情作为参考图: ${finalReferenceImageUrl}`);
        }
      }
      // 第三优先级：使用正面三视图
      else if (character.views && character.views.length > 0) {
        const frontView = character.views.find(v => v.view_type === 'front');
        if (frontView?.image_url) {
          finalReferenceImageUrl = frontView.image_url;
          console.log(`✓ 使用角色的正面三视图作为参考图: ${finalReferenceImageUrl}`);
        } else if (character.views[0]?.image_url) {
          // 如果没有正面图，使用第一张三视图
          finalReferenceImageUrl = character.views[0].image_url;
          console.log(`✓ 使用角色的 ${character.views[0].view_type} 三视图作为参考图: ${finalReferenceImageUrl}`);
        }
      }

      // 如果还是没有找到参考图
      if (!finalReferenceImageUrl) {
        console.warn('✗ 未找到可用的参考图，将不使用参考图生成');
        console.warn('提示：请确保角色有 base_image_url、表情图或三视图');
      }
      console.log('====================================\n');
    } else {
      console.log(`✓ 使用用户指定的参考图: ${finalReferenceImageUrl}`);
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

    // 生成服装提示词修饰符（存储用，不用于图片生成）
    // 注意：有参考图时，图片生成的提示词由 outfit-generation.ts 控制，这里只是存储元数据
    let promptModifier = "";
    let triggerWord = "";

    // 如果用户提供了额外描述，用 LLM 简化为英文关键词
    if (description) {
      try {
        console.log('\n========== 调用 LLM 简化服装描述 ==========');
        const result = await callChatCompletionByType({
          providerType: promptProviderType,
          messages: [
            { 
              role: "system", 
              content: `你是翻译助手。将服装描述翻译为简短的英文关键词。
要求：只输出3-5个英文关键词，逗号分隔，不要任何解释。
示例输入：蓝白色水手服，有蝴蝶结
示例输出：blue and white, sailor style, bow tie` 
            },
            { role: "user", content: description },
          ],
          temperature: 0.1,
          maxTokens: 50,
        });
        promptModifier = result.content.trim();
        console.log(`简化后的描述: ${promptModifier}`);
        console.log('============================================\n');
      } catch (error) {
        console.warn("LLM 简化失败，使用原始描述:", error);
        promptModifier = description;
      }
    }
    
    triggerWord = outfit_type === "default" ? "" : `${outfit_type}_outfit`;

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

      // 角色描述处理策略：
      // - 有参考图时：不需要详细描述，参考图已包含所有信息
      // - 无参考图时：使用原始描述，不做过度优化
      const characterDesc = character.description || character.name;
      
      console.log('\n========== 服装生成策略 ==========');
      console.log(`角色名称: ${character.name}`);
      console.log(`角色描述: ${characterDesc}`);
      console.log(`服装类型: ${outfit_type}`);
      console.log(`附加描述: ${promptModifier || '无'}`);
      console.log(`参考图: ${finalReferenceImageUrl ? '有' : '无'}`);
      if (finalReferenceImageUrl) {
        console.log(`参考图URL: ${finalReferenceImageUrl}`);
        console.log(`>> 将使用参考图主导模式，提示词保持极简`);
      } else {
        console.log(`>> 无参考图，将使用角色描述`);
      }
      console.log('==================================\n');

      const base64Image = await generateOutfit(
        characterDesc,  // 直接使用原始描述，不做 LLM 优化
        outfit_type as OutfitType,
        promptModifier || undefined,  // 使用简化后的服装描述
        imageProviderType,
        finalReferenceImageUrl
      );

      console.log(`图片生成成功，Base64 长度: ${base64Image.length}\n`);

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
