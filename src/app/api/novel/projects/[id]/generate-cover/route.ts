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
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";

interface GenerateCoverRequest {
  customPrompt?: string; // 可选的自定义提示词
}

/**
 * 下载外部图片并上传到 MinIO
 */
async function downloadAndUploadToMinio(
  imageUrl: string,
  userId: string,
  projectId: string
): Promise<string> {
  try {
    logInfo("Downloading external image", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      sourceUrl: imageUrl,
    });

    // 下载图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    logInfo("Image downloaded successfully", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      size: imageBuffer.length,
    });

    // 确保 bucket 存在
    await ensureBucketExists();

    // 生成对象名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const objectName = `users/${userId}/novel-projects/${projectId}/cover_${timestamp}_${randomStr}.png`;

    // 上传到 MinIO
    await minioClient.putObject(MINIO_BUCKET, objectName, imageBuffer, imageBuffer.length, {
      "Content-Type": "image/png",
    });

    const minioUrl = getPublicUrl(objectName);

    logInfo("Image uploaded to MinIO", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      minioUrl,
    });

    return minioUrl;
  } catch (error) {
    logError("Failed to download and upload image", error, {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      sourceUrl: imageUrl,
    });
    throw error;
  }
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
    // 检查 prisma 客户端
    if (!prisma || typeof prisma.novelProject === 'undefined') {
      logError("Prisma client not initialized", new Error("prisma is undefined"), {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        prismaExists: !!prisma,
        novelProjectExists: !!(prisma && prisma.novelProject),
      });
      return NextResponse.json({ error: "数据库客户端未初始化" }, { status: 500 });
    }

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
      // 尝试使用 prompt_optimizer 优化提示词，如果不可用则使用默认格式
      try {
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

        logInfo("Generated cover prompt with optimizer", {
          endpoint: "/api/novel/projects/[id]/generate-cover",
          projectId,
          prompt: coverPrompt,
        });
      } catch (optimizerError) {
        // 如果 prompt_optimizer 不可用，使用默认格式
        logInfo("Prompt optimizer not available, using default format", {
          endpoint: "/api/novel/projects/[id]/generate-cover",
          projectId,
          error: optimizerError instanceof Error ? optimizerError.message : String(optimizerError),
        });

        // 根据类型构建默认提示词
        const genreMap: Record<string, string> = {
          "suspense": "mystery thriller style, dark atmosphere",
          "romance": "romantic style, warm and soft colors",
          "adventure": "adventure style, dynamic and exciting",
          "scifi": "sci-fi style, futuristic and technological",
          "fantasy": "fantasy style, magical and mystical",
          "daily": "slice of life style, warm and cozy",
        };

        const genreStyle = genreMap[project.genre || ""] || "modern illustration style";
        const title = project.title || "untitled novel";

        coverPrompt = `book cover art, ${genreStyle}, ${title}, professional illustration, high quality, detailed, attractive composition`;

        logInfo("Using default cover prompt", {
          endpoint: "/api/novel/projects/[id]/generate-cover",
          projectId,
          prompt: coverPrompt,
        });
      }
    }

    // 调用图像生成API
    logInfo("Calling image generation API", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      prompt: coverPrompt,
    });

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

    logInfo("Image generation API response received", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      responseLength: imageResult.content.length,
      responsePreview: imageResult.content.substring(0, 200),
      creditsCost: imageResult.creditsCost,
    });

    // 解析返回的图像数据（假设返回base64或URL）
    let imageUrl = "";
    const responseContent = imageResult.content;

    logInfo("Parsing image generation response", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      contentLength: responseContent.length,
      startsWithDataImage: responseContent.startsWith("data:image/"),
      includesBase64: responseContent.includes("base64,"),
      startsWithHttp: responseContent.startsWith("http"),
      firstChars: responseContent.substring(0, 50),
    });

    // 检查是否是base64格式
    if (responseContent.startsWith("data:image/") || responseContent.includes("base64,")) {
      logInfo("Detected base64 image format", {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        projectId,
      });

      // 上传到MinIO
      const filename = `novel-cover-${projectId}-${Date.now()}.png`;
      imageUrl = await uploadBase64Image(responseContent, filename);

      logInfo("Uploaded cover image to MinIO", {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        projectId,
        imageUrl,
      });
    } else if (responseContent.startsWith("http")) {
      // 如果返回的是URL，下载并上传到 MinIO
      logInfo("Detected direct URL format", {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        projectId,
        url: responseContent,
      });

      const externalUrl = responseContent.trim();
      imageUrl = await downloadAndUploadToMinio(externalUrl, userId, projectId);
    } else if (responseContent.includes("![") && responseContent.includes("](")) {
      // Markdown格式: ![alt](url)
      logInfo("Detected Markdown image format", {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        projectId,
        content: responseContent,
      });

      const markdownMatch = responseContent.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
      if (markdownMatch && markdownMatch[1]) {
        const externalUrl = markdownMatch[1];
        logInfo("Extracted URL from Markdown", {
          endpoint: "/api/novel/projects/[id]/generate-cover",
          projectId,
          extractedUrl: externalUrl,
        });

        // 下载并上传到 MinIO
        imageUrl = await downloadAndUploadToMinio(externalUrl, userId, projectId);
      } else {
        logError("Failed to extract URL from Markdown", new Error("Invalid Markdown format"), {
          endpoint: "/api/novel/projects/[id]/generate-cover",
          projectId,
          content: responseContent,
        });
      }
    } else {
      // 尝试从JSON中提取
      logInfo("Attempting to parse as JSON", {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        projectId,
        content: responseContent,
      });

      try {
        const parsed = JSON.parse(responseContent);
        logInfo("Successfully parsed JSON response", {
          endpoint: "/api/novel/projects/[id]/generate-cover",
          projectId,
          parsedKeys: Object.keys(parsed),
          parsedContent: JSON.stringify(parsed),
        });

        const externalUrl = parsed.url || parsed.image_url || parsed.data?.[0]?.url || parsed.data?.url || parsed.output?.[0] || parsed.output || "";

        if (!externalUrl) {
          logError("No image URL found in parsed JSON", new Error("Missing URL in response"), {
            endpoint: "/api/novel/projects/[id]/generate-cover",
            projectId,
            parsedStructure: JSON.stringify(parsed, null, 2),
          });
        } else {
          // 下载并上传到 MinIO
          imageUrl = await downloadAndUploadToMinio(externalUrl, userId, projectId);
        }
      } catch (parseError) {
        logError("Failed to parse JSON response", parseError, {
          endpoint: "/api/novel/projects/[id]/generate-cover",
          projectId,
          rawContent: responseContent,
          contentType: typeof responseContent,
          contentLength: responseContent.length,
        });
        throw new Error(`无法解析图像生成结果：${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    }

    if (!imageUrl) {
      logError("No valid image URL obtained", new Error("Empty image URL"), {
        endpoint: "/api/novel/projects/[id]/generate-cover",
        projectId,
        responseContent: responseContent,
      });
      throw new Error("图像生成失败，未获取到有效的图片URL");
    }

    logInfo("Image URL successfully obtained", {
      endpoint: "/api/novel/projects/[id]/generate-cover",
      projectId,
      imageUrl,
    });

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
