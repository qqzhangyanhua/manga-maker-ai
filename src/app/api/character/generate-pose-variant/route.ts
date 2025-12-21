import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType, ensureLlmProvider } from "@/lib/llm-provider";
import { generatePoseVariant, base64ToBuffer } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

const DEFAULT_IMAGE_PROVIDER_TYPE = "image_generation_turnaround";
const DEFAULT_PROMPT_PROVIDER_TYPE = "storyboard";

// POST /api/character/generate-pose-variant - Generate character pose variant without overwriting three-views
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
    const { character_id, pose_description, pose_name, provider_type } = body;
    imageProviderType = provider_type || DEFAULT_IMAGE_PROVIDER_TYPE;
    promptProviderType = DEFAULT_PROMPT_PROVIDER_TYPE;

    if (!character_id) {
      return NextResponse.json({ error: "角色ID不能为空" }, { status: 400 });
    }

    if (!pose_description) {
      return NextResponse.json({ error: "姿势描述不能为空" }, { status: 400 });
    }

    // 确认相关模型已配置
    try {
      await ensureLlmProvider(imageProviderType);
    } catch (providerError: unknown) {
      const message =
        providerError instanceof Error ? providerError.message : "模型未配置，请先在 /admin/llm-providers 添加";
      return NextResponse.json(
        { error: message, code: "MODEL_NOT_CONFIGURED", provider_type: imageProviderType },
        { status: 400 }
      );
    }
    try {
      await ensureLlmProvider(promptProviderType);
    } catch (providerError: unknown) {
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
        amount: 1,
      });
    } catch (quotaError: unknown) {
      if ((quotaError as { code?: string })?.code === "QUOTA_EXCEEDED") {
        const error = quotaError as { message: string; limit?: number; count?: number };
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

    // Verify character ownership
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

    // Step 1: 使用 LLM 优化角色描述
    const characterDesc = character.description || character.name;
    const fullDescription = `${characterDesc}, ${pose_description}`;

    let optimizedDescription = fullDescription;
    try {
      const systemPrompt = `你是一个专业的角色设计师。请将用户的角色描述优化为适合 AI 绘画的详细提示词。
要求：
1. 保留核心特征（外貌、服装、风格、姿势）
2. 添加专业术语（如 anime style, detailed, 8k 等）
3. 描述要具体且富有画面感
4. 输出纯文本，不要 JSON 格式`;

      const { content } = await callChatCompletionByType({
        providerType: promptProviderType,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `角色描述：${fullDescription}` },
        ],
        temperature: 0.7,
        maxTokens: 500,
        options: {
          userId: payload.userId,
        },
      });

      optimizedDescription = content.trim();
    } catch (error) {
      console.warn("LLM 优化失败，使用原始描述:", error);
    }

    // Step 2: 查找参考图
    let referenceImageUrl: string | undefined;

    if (character.base_image_url) {
      referenceImageUrl = character.base_image_url;
    } else if (character.expressions.length > 0) {
      const neutralExpression = character.expressions.find(exp => exp.expression_type === 'neutral');
      if (neutralExpression?.image_url) {
        referenceImageUrl = neutralExpression.image_url;
      } else {
        referenceImageUrl = character.expressions[0].image_url;
      }
    } else if (character.views && character.views.length > 0) {
      const frontView = character.views.find(v => v.view_type === 'front');
      if (frontView?.image_url) {
        referenceImageUrl = frontView.image_url;
      } else if (character.views[0]?.image_url) {
        referenceImageUrl = character.views[0].image_url;
      }
    }

    // Step 3: 调用姿势变体生成 API（专门的函数，不会强制 T-pose）
    console.log(`开始生成姿势变体: ${pose_description}`);
    console.log(`角色描述: ${optimizedDescription}`);
    if (referenceImageUrl) {
      console.log(`使用参考图: ${referenceImageUrl}`);
    }

    const { image: base64Image, prompt: usedPrompt } = await generatePoseVariant(
      optimizedDescription,
      pose_description,
      imageProviderType,
      referenceImageUrl,
      { userId }
    );

    if (!base64Image) {
      throw new Error("未能生成图片");
    }

    // Step 4: 确保 MinIO bucket 存在
    await ensureBucketExists();

    // Step 5: 上传生成的图片到 MinIO
    // 转换 base64 为 Buffer
    const imageBuffer = base64ToBuffer(base64Image);

    // 生成唯一的对象名
    const timestamp = Date.now();
    const objectName = `users/${payload.userId}/characters/${character_id}/poses/pose_${timestamp}.png`;

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

    // Step 6: 保存到 generated_images 表
    const generatedImage = await prisma.generatedImage.create({
      data: {
        user_id: payload.userId,
        character_id: character_id,
        image_url: publicUrl,
        prompt: usedPrompt, // 使用实际生成时的提示词
        style: character.base_prompt || undefined,
        generation_params: {
          pose_name: pose_name || "自定义姿势",
          pose_description: pose_description,
          reference_image: referenceImageUrl,
          provider_type: imageProviderType,
          generated_at: new Date().toISOString(),
        },
      },
    });

    console.log(`姿势变体生成完成: ${publicUrl}`);

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "success",
        projectId: null,
        durationMs: Date.now() - startedAt,
        requestPayload: { character_id, pose_description, provider_type: imageProviderType },
        responsePayload: { image_id: generatedImage.id, image_url: publicUrl },
      });
    }

    return NextResponse.json({
      success: true,
      image: {
        id: generatedImage.id,
        image_url: publicUrl,
        pose_name: pose_name || "自定义姿势",
        pose_description: pose_description,
        created_at: generatedImage.created_at,
      },
      usage: usageSnapshot,
      message: "姿势变体生成成功"
    });
  } catch (error) {
    console.error('\n========== Generate pose variant error ==========');
    console.error('错误类型:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('错误消息:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    console.error('==========================================\n');

    const errorMessage = error instanceof Error ? error.message : "生成姿势变体失败";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: errorMessage,
      });
    }

    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
