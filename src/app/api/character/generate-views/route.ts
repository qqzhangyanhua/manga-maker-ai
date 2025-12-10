import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType, ensureLlmProvider } from "@/lib/llm-provider";
import { generateThreeViews, base64ToBuffer } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

const DEFAULT_IMAGE_PROVIDER_TYPE = "image_generation_turnaround";
const DEFAULT_PROMPT_PROVIDER_TYPE = "storyboard";

// POST /api/character/generate-views - Generate three-view images (front, side, back)
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
    const { character_id, description, provider_type } = body;
    imageProviderType = provider_type || DEFAULT_IMAGE_PROVIDER_TYPE;
    promptProviderType = DEFAULT_PROMPT_PROVIDER_TYPE;

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
        amount: 3, // 三视图一次占用三次额度
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

    // Step 2: 调用图片生成 API 生成三视图
    console.log(`开始生成三视图，角色描述: ${optimizedDescription}`);
    
    const { front, side, back, prompts } = await generateThreeViews(
      optimizedDescription,
      imageProviderType
    );

    // Step 3: 确保 MinIO bucket 存在
    await ensureBucketExists();

    // Step 4: 上传三张图片到 MinIO
    const views: Record<string, { image_url: string; prompt: string }> = {};
    
    for (const [viewType, base64Image] of Object.entries({ front, side, back })) {
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
        prompt: prompts[viewType as keyof typeof prompts],
      };

      console.log(`${viewType} 视图已上传: ${publicUrl}`);
    }

    // Step 5: 保存到数据库
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

    console.log("三视图生成完成");

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "success",
        projectId: null,
        durationMs: Date.now() - startedAt,
        requestPayload: { character_id, description, provider_type: imageProviderType },
        responsePayload: { views: Object.keys(views) },
      });
    }

    return NextResponse.json({ 
      success: true,
      views,
      prompts,
      usage: usageSnapshot,
      message: "三视图生成成功"
    });
  } catch (error) {
    console.error("Generate views error:", error);
    
    // 返回详细错误信息
    const errorMessage = error instanceof Error ? error.message : "生成三视图失败";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: imageProviderType,
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage,
      });
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
