import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType, ensureLlmProvider } from "@/lib/llm-provider";
import { generateCharacterViews, base64ToBuffer } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

const DEFAULT_IMAGE_PROVIDER_TYPE = "image_generation_turnaround";
const DEFAULT_PROMPT_PROVIDER_TYPE = "storyboard";

// POST /api/character/generate-views - Generate character views (front, side, back or specific views)
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
    const { character_id, description, provider_type, view_types } = body;
    imageProviderType = provider_type || DEFAULT_IMAGE_PROVIDER_TYPE;
    promptProviderType = DEFAULT_PROMPT_PROVIDER_TYPE;

    // 验证和标准化 view_types
    const requestedViews: string[] = Array.isArray(view_types) && view_types.length > 0
      ? view_types.filter((v: string) => ['front', 'side', 'back'].includes(v))
      : ['front', 'side', 'back']; // 默认生成全部三个视图

    if (requestedViews.length === 0) {
      return NextResponse.json({ error: "无效的 view_types 参数" }, { status: 400 });
    }

    if (!character_id) {
      return NextResponse.json({ error: "角色ID不能为空" }, { status: 400 });
    }

    // 确认相关模型已配置（避免未配置时扣额度）
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

    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        amount: requestedViews.length, // 根据实际生成的视图数量计算额度
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

    // Step 1: 使用 LLM 优化角色描述（可选，提高生成质量）
    const characterDesc = description || character.description || character.name;
    
    let optimizedDescription = characterDesc;
    try {
      const systemPrompt = `你是一个专业的角色设计师。请将用户的角色描述优化为适合 AI 绘画的详细提示词。
要求：
1. 保留核心特征（外貌、服装、风格）
2. 添加专业术语（如 anime style, detailed, 8k 等）
3. 描述要具体且富有画面感
4. 输出纯文本，不要 JSON 格式`;

      const { content } = await callChatCompletionByType({
        providerType: promptProviderType,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `角色描述：${characterDesc}` },
        ],
        temperature: 0.7,
        maxTokens: 500,
      });

      optimizedDescription = content.trim();
    } catch (error) {
      console.warn("LLM 优化失败，使用原始描述:", error);
    }

    // Step 2: 智能查找参考图（优先级：base_image_url → neutral表情 → 任意表情 → 正面三视图）
    let referenceImageUrl: string | undefined;

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
      referenceImageUrl = character.base_image_url;
      console.log(`✓ 使用角色主图作为参考图: ${referenceImageUrl}`);
    }
    // 第二优先级：使用 neutral 表情作为参考
    else if (character.expressions.length > 0) {
      const neutralExpression = character.expressions.find(exp => exp.expression_type === 'neutral');
      if (neutralExpression?.image_url) {
        referenceImageUrl = neutralExpression.image_url;
        console.log(`✓ 使用角色的 neutral 表情作为参考图: ${referenceImageUrl}`);
      } else {
        // 使用任意一张表情图
        referenceImageUrl = character.expressions[0].image_url;
        console.log(`✓ 使用角色的 ${character.expressions[0].expression_type} 表情作为参考图: ${referenceImageUrl}`);
      }
    }
    // 第三优先级：使用正面三视图（注意：这可能导致循环依赖，仅在重新生成时有效）
    else if (character.views && character.views.length > 0) {
      const frontView = character.views.find(v => v.view_type === 'front');
      if (frontView?.image_url) {
        referenceImageUrl = frontView.image_url;
        console.log(`✓ 使用角色的正面三视图作为参考图: ${referenceImageUrl}`);
      } else if (character.views[0]?.image_url) {
        // 如果没有正面图，使用第一张三视图
        referenceImageUrl = character.views[0].image_url;
        console.log(`✓ 使用角色的 ${character.views[0].view_type} 三视图作为参考图: ${referenceImageUrl}`);
      }
    }

    // 如果还是没有找到参考图
    if (!referenceImageUrl) {
      console.warn('✗ 未找到可用的参考图，将不使用参考图生成');
      console.warn('提示：请确保角色有 base_image_url、表情图或三视图');
    }
    console.log('====================================\n');

    // Step 3: 调用图片生成 API 生成指定的视图
    console.log(`开始生成视图: ${requestedViews.join(', ')}, 角色描述: ${optimizedDescription}`);
    if (referenceImageUrl) {
      console.log(`使用参考图: ${referenceImageUrl}`);
    }

    const { views: generatedViews, prompts } = await generateCharacterViews(
      optimizedDescription,
      imageProviderType,
      referenceImageUrl,
      requestedViews
    );

    // Step 4: 确保 MinIO bucket 存在
    await ensureBucketExists();

    // Step 5: 上传生成的图片到 MinIO
    const views: Record<string, { image_url: string; prompt: string }> = {};

    for (const viewType of Object.keys(generatedViews)) {
      const base64Image = generatedViews[viewType];

      // 转换 base64 为 Buffer
      const imageBuffer = base64ToBuffer(base64Image);

      // 生成对象名
      const objectName = `users/${payload.userId}/characters/${character_id}/views/${viewType}.png`;

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

      views[viewType] = {
        image_url: publicUrl,
        prompt: prompts[viewType],
      };

      console.log(`${viewType} 视图已上传: ${publicUrl}`);
    }

    // Step 6: 保存到数据库
    for (const [viewType, viewData] of Object.entries(views)) {
      await prisma.characterView.upsert({
        where: {
          character_id_view_type: {
            character_id,
            view_type: viewType,
          },
        },
        update: {
          image_url: viewData.image_url,
        },
        create: {
          character_id,
          view_type: viewType,
          image_url: viewData.image_url,
        },
      });
    }

    console.log(`视图生成完成: ${Object.keys(views).join(', ')}`);

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "success",
        projectId: null,
        durationMs: Date.now() - startedAt,
        requestPayload: { character_id, description, provider_type: imageProviderType, view_types: requestedViews },
        responsePayload: { views: Object.keys(views) },
      });
    }

    const viewCount = Object.keys(views).length;
    const viewNames = requestedViews.map(v =>
      v === 'front' ? '正面' : v === 'side' ? '侧面' : '背面'
    ).join('、');

    return NextResponse.json({
      success: true,
      views,
      prompts,
      usage: usageSnapshot,
      message: viewCount === 3 ? "三视图生成成功" : `${viewNames}视图生成成功`
    });
  } catch (error) {
    console.error('\n========== Generate views error ==========');
    console.error('错误类型:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('错误消息:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    console.error('==========================================\n');

    // 返回详细错误信息
    const errorMessage = error instanceof Error ? error.message : "生成三视图失败";

    // 判断错误类型，给出更友好的提示
    let userFriendlyMessage = errorMessage;
    let statusCode = 500;

    if (errorMessage.includes('参考图过大') || errorMessage.includes('超过限制')) {
      userFriendlyMessage = errorMessage;
      statusCode = 400; // 客户端错误
    } else if (errorMessage.includes('terminated') || errorMessage.includes('other side closed')) {
      userFriendlyMessage = '请求超时或连接中断。可能原因：\n' +
        '1. 参考图过大导致请求超时\n' +
        '2. 网络不稳定\n' +
        '3. AI 服务器响应超时\n' +
        '建议：使用较小的参考图（< 3MB）或不使用参考图重试';
      statusCode = 504; // Gateway Timeout
    } else if (errorMessage.includes('未从响应中提取到图片数据')) {
      userFriendlyMessage = 'AI 模型未返回图片数据。可能原因：\n' +
        '1. 模型不支持当前的提示词格式\n' +
        '2. 参考图格式不兼容\n' +
        '3. 模型配置错误\n' +
        '建议：检查模型配置或联系管理员';
      statusCode = 500;
    }

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
        error: userFriendlyMessage,
        originalError: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
