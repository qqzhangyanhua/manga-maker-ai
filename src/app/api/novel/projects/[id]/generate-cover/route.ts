/**
 * 生成小说封面 API
 * POST /api/novel/projects/[id]/generate-cover
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { uploadBase64Image } from "@/lib/upload-helpers";
import { logInfo, logError } from "@/lib/api-logger";

interface GenerateCoverRequest {
  customPrompt?: string; // 可选的自定义提示词
}

/**
 * 生成小说封面
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    // 身份验证
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

    const { id: projectId } = await context.params;
    const body: GenerateCoverRequest = await request.json();

    logInfo("Generate cover request", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      userId,
      hasCustomPrompt: !!body.customPrompt,
    });

    // 获取项目信息
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        user_id: true,
        title: true,
        description: true,
        genre: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证权限
    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    // 构建封面生成提示词
    let coverPrompt = "";

    if (body.customPrompt) {
      // 使用自定义提示词
      coverPrompt = body.customPrompt;
    } else {
      // 自动生成提示词 - 使用prompt_optimizer来优化
      const systemPrompt = `你是一位专业的小说封面设计师。你的任务是根据小说信息生成AI绘图提示词。

要求：
1. 只返回英文提示词，不要添加任何解释或前后缀
2. 提示词要包含：主题、风格、氛围、色彩基调
3. 适合制作小说封面，有视觉冲击力
4. 长度控制在80-120字符
5. 禁止涉及敏感内容

示例格式：
"book cover art, [genre style], [main theme], [color tone], [atmosphere], professional illustration, high quality"`;

      const userPrompt = `小说信息：
标题：${project.title}
类型：${project.genre || "未知"}
简介：${project.description || "暂无简介"}

请生成适合这部小说的封面图提示词。`;

      // 调用LLM优化提示词
      const promptResult = await callChatCompletionByType({
        providerType: "prompt_optimizer",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 200,
        options: {
          userId,
        },
      });

      coverPrompt = promptResult.content.trim();

      logInfo("Generated cover prompt", {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        projectId,
        prompt: coverPrompt,
      });
    }

    // 调用图像生成API
    const imageResult = await callChatCompletionByType({
      providerType: "image_generation",
      messages: [
        { role: "user", content: coverPrompt },
      ],
      temperature: 0.8,
      maxTokens: 1000,
      options: {
        userId,
      },
    });

    // 解析返回的图像数据（假设返回base64或URL）
    let imageUrl = "";
    const responseContent = imageResult.content;

    // 检查是否是base64格式
    if (responseContent.startsWith("data:image/") || responseContent.includes("base64,")) {
      // 上传到MinIO
      const filename = `novel-cover-${projectId}-${Date.now()}.png`;
      imageUrl = await uploadBase64Image(responseContent, filename);

      logInfo("Uploaded cover image to MinIO", {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        projectId,
        imageUrl,
      });
    } else if (responseContent.startsWith("http")) {
      // 如果返回的是URL，直接使用
      imageUrl = responseContent;
    } else {
      // 尝试从JSON中提取
      try {
        const parsed = JSON.parse(responseContent);
        imageUrl = parsed.url || parsed.image_url || "";
      } catch {
        throw new Error("无法解析图像生成结果");
      }
    }

    if (!imageUrl) {
      throw new Error("图像生成失败，未获取到有效的图片URL");
    }

    // 更新项目封面
    const updatedProject = await prisma.novelProject.update({
      where: { id: projectId },
      data: { cover_image: imageUrl },
    });

    logInfo("Cover generated successfully", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      userId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      cover_url: imageUrl,
      prompt: coverPrompt,
      project: updatedProject,
    });
  } catch (error) {
    logError("Cover generation failed", error, {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "封面生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
