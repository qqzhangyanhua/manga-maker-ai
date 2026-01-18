import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType, ensureLlmProvider } from "@/lib/llm-provider";
import {
  generateExpression,
  generateAllExpressions,
  EXPRESSION_TYPES,
  EXPRESSION_LABELS,
  type ExpressionType,
} from "@/lib/expression-generation";
import { base64ToBuffer } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { QuotaExceededError, assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { findBestReferenceImage } from "@/lib/character-reference";

const DEFAULT_IMAGE_PROVIDER_TYPE = "image_generation_expression";
const DEFAULT_PROMPT_PROVIDER_TYPE = "storyboard";

// POST /api/character/generate-expressions - Generate expression matrix
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
    const { character_id, expression_type, generate_all, provider_type } = body;
    imageProviderType = provider_type || DEFAULT_IMAGE_PROVIDER_TYPE;
    promptProviderType = DEFAULT_PROMPT_PROVIDER_TYPE;

    if (!character_id) {
      return NextResponse.json({ error: "角色ID不能为空" }, { status: 400 });
    }

    // Verify character ownership and get character with views/expressions for reference
    const character = await prisma.character.findFirst({
      where: {
        id: character_id,
        user_id: payload.userId,
      },
      include: {
        views: {
          select: {
            view_type: true,
            image_url: true,
          },
        },
        expressions: {
          select: {
            expression_type: true,
            image_url: true,
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    // Determine which expressions to generate
    const expressionsToGenerate = generate_all
      ? [...EXPRESSION_TYPES]
      : expression_type
      ? [expression_type as ExpressionType]
      : [];

    if (expressionsToGenerate.length === 0) {
      return NextResponse.json(
        { error: "请指定要生成的表情类型" },
        { status: 400 }
      );
    }

    try {
      await ensureLlmProvider(imageProviderType);
    } catch (providerError) {
      const message =
        providerError instanceof Error ? providerError.message : "模型未配置，请先在 /admin/llm-providers 添加";
      return NextResponse.json(
        { error: message, code: "MODEL_NOT_CONFIGURED", provider_type: imageProviderType },
        { status: 400 }
      );
    }
    try {
      await ensureLlmProvider(promptProviderType);
    } catch (providerError) {
      const message =
        providerError instanceof Error ? providerError.message : "模型未配置，请先在 /admin/llm-providers 添加";
      return NextResponse.json(
        { error: message, code: "MODEL_NOT_CONFIGURED", provider_type: promptProviderType },
        { status: 400 }
      );
    }

    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        amount: expressionsToGenerate.length,
      });
    } catch (quotaError) {
      if (quotaError instanceof QuotaExceededError) {
        return NextResponse.json(
          {
            error: quotaError.message,
            code: quotaError.code,
            limit: quotaError.limit,
            used: quotaError.count,
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    // Step 1: 使用 LLM 优化角色描述（可选）
    const characterDesc = character.description || character.name;
    let optimizedDescription = characterDesc;
    
    try {
      const systemPrompt = `你是一个专业的角色设计师。请将角色描述优化为适合生成表情图的详细提示词。
要求：
1. 保留核心外观特征
2. 添加专业术语
3. 适合生成人物肖像
4. 输出纯文本`;

      const { content } = await callChatCompletionByType({
        providerType: promptProviderType,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `角色：${characterDesc}` },
        ],
        temperature: 0.7,
        maxTokens: 300,
        options: {
          userId: payload.userId,
        },
      });

      optimizedDescription = content.trim();
    } catch (error) {
      console.warn("LLM 优化失败，使用原始描述:", error);
    }

    // Step 2: 智能查找参考图（使用通用函数）
    const referenceImageUrl = findBestReferenceImage({
      id: character.id,
      name: character.name,
      reference_image: character.reference_image,
      base_image_url: character.base_image_url,
      expressions: character.expressions,
      views: character.views,
    });

    console.log(`开始生成 ${expressionsToGenerate.length} 个表情，角色描述: ${optimizedDescription}`);
    if (referenceImageUrl) {
      console.log(`使用参考图: ${referenceImageUrl}`);
    }

    // Step 3: 确保 MinIO bucket 存在
    await ensureBucketExists();

    // Step 4: 生成表情图片
    const expressions: Record<string, { image_url: string; prompt: string }> = {};

    for (const expType of expressionsToGenerate) {
      try {
        console.log(`生成表情: ${EXPRESSION_LABELS[expType]} (${expType})`);

        // 调用图片生成
        const base64Image = await generateExpression(
          optimizedDescription,
          expType as ExpressionType,
          imageProviderType,
          referenceImageUrl,
          { userId: payload.userId }
        );

        // 转换为 Buffer
        const imageBuffer = base64ToBuffer(base64Image);

        // 生成对象名
        const objectName = `users/${payload.userId}/characters/${character_id}/expressions/${expType}.png`;

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
        const publicUrl = getPublicUrl(objectName);

        expressions[expType] = {
          image_url: publicUrl,
          prompt: `${optimizedDescription}, ${expType} expression`,
        };

        console.log(`${expType} 表情已上传: ${publicUrl}`);

        // 保存到数据库
        await prisma.characterExpression.upsert({
          where: {
            character_id_expression_type: {
              character_id,
              expression_type: expType,
            },
          },
          update: {
            image_url: publicUrl,
            prompt_suffix: expressions[expType].prompt,
          },
          create: {
            character_id,
            expression_type: expType,
            image_url: publicUrl,
            prompt_suffix: expressions[expType].prompt,
          },
        });
      } catch (error) {
        console.error(`生成表情 ${expType} 失败:`, error);
        throw new Error(
          `生成表情失败（${EXPRESSION_LABELS[expType]}）: ${
            error instanceof Error ? error.message : "未知错误"
          }`
        );
      }
    }

    console.log("表情生成完成");

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "success",
        durationMs: Date.now() - startedAt,
        requestPayload: { character_id, expression_type, generate_all },
        responsePayload: { generated: expressionsToGenerate.length },
      });
    }

    return NextResponse.json({
      success: true,
      expressions,
      usage: usageSnapshot,
      message: `成功生成 ${expressionsToGenerate.length} 个表情`,
    });
  } catch (error) {
    console.error("Generate expressions error:", error);
    const message = error instanceof Error ? error.message : "生成表情矩阵失败";
    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
