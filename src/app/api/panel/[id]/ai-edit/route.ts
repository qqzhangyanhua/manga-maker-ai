import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { recordGenerationLog } from "@/lib/generation-log";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    // 验证用户身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const panelId = params.id;

    // 检查 panel 是否存在且属于当前用户
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { project: true },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限修改此分镜" }, { status: 403 });
    }

    const body = await req.json();
    const { imageUrl, modifyPrompt } = body;

    if (!imageUrl || !modifyPrompt) {
      return NextResponse.json(
        { error: "缺少必要参数：imageUrl 和 modifyPrompt" },
        { status: 400 }
      );
    }

    // 调用 LLM 生成图片修改指令（使用 image_edit provider）
    // 这里我们使用文本转图片的方式，因为大多数 AI 图片生成服务支持 img2img
    const llmResponse = await callChatCompletionByType({
      providerType: "image_edit",
      messages: [
        {
          role: "system",
          content: `你是一个专业的图片编辑助手。用户会提供一个修改需求，你需要将其转换为详细的图片生成提示词。
要求：
1. 保持原图的主体内容和构图
2. 根据用户需求进行修改
3. 输出简洁的英文提示词（不超过200词）
4. 不要包含任何解释，只输出提示词`,
        },
        {
          role: "user",
          content: `原图描述：${panel.description || "无描述"}
修改需求：${modifyPrompt}

请生成修改后的图片提示词：`,
        },
      ],
      temperature: 0.7,
      maxTokens: 300,
    });

    const optimizedPrompt = llmResponse.content.trim();

    // 记录生成日志（准备阶段）
    await recordGenerationLog({
      userId: payload.userId,
      action: "ai_edit_image",
      providerType: "image_edit",
      status: "success",
      projectId: panel.project_id,
      durationMs: Date.now() - startTime,
      requestPayload: {
        panelId,
        originalImageUrl: imageUrl,
        modifyPrompt,
        optimizedPrompt,
      },
      responsePayload: {
        prompt: optimizedPrompt,
      },
    });

    // TODO: 这里应该调用实际的图片生成 API（如 Stable Diffusion img2img）
    // 目前返回一个占位符，表示功能框架已就绪
    // 实际实现时，需要：
    // 1. 下载原始图片
    // 2. 调用 img2img API
    // 3. 上传生成的新图片到 MinIO
    // 4. 返回新图片的 URL

    // 占位符实现：使用优化后的提示词调用文本生成图片
    const newImageUrl = await generateImagePlaceholder(optimizedPrompt);

    // 更新面板的图片 URL
    await prisma.panel.update({
      where: { id: panelId },
      data: {
        generated_image: newImageUrl,
        prompt_used: optimizedPrompt,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: newImageUrl,
      optimizedPrompt,
      message: "图片修改成功",
    });
  } catch (error) {
    console.error("AI edit image error:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    // 记录失败日志
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
      const payload = token ? verifyAuthToken(token) : null;

      if (payload?.userId) {
        const body = await req.json().catch(() => ({}));
        await recordGenerationLog({
          userId: payload.userId,
          action: "ai_edit_image",
          providerType: "image_edit",
          status: "failed",
          durationMs: Date.now() - startTime,
          requestPayload: body,
          errorMessage: message,
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 占位符函数：生成图片
 * 实际实现时应该替换为真实的图片生成逻辑
 */
async function generateImagePlaceholder(prompt: string): Promise<string> {
  // TODO: 替换为实际的图片生成 API 调用
  // 例如：调用 Stable Diffusion、DALL-E 等服务

  // 占位符：返回一个示例图片 URL
  // 实际实现时，这里应该：
  // 1. 调用图片生成 API
  // 2. 获取生成的图片（通常是 base64 或 URL）
  // 3. 上传到 MinIO
  // 4. 返回公开访问的 URL

  console.warn("generateImagePlaceholder: This is a placeholder implementation");
  console.log("Prompt:", prompt);

  // 返回一个占位符图片 URL（实际项目中应该生成真实图片）
  return `https://via.placeholder.com/800x600.png?text=${encodeURIComponent("AI Generated: " + prompt.substring(0, 30))}`;
}
