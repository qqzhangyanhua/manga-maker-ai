import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { recordGenerationLog } from "@/lib/generation-log";
import { uploadBase64Image } from "@/lib/upload-helpers";
import { assertAndIncrementUsage } from "@/lib/usage";

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

    // 检查配额并增加使用次数
    try {
      await assertAndIncrementUsage({
        userId: payload.userId,
        action: "image_edit",
        providerType: "image_edit",
      });
    } catch (quotaError: unknown) {
      const error = quotaError as { code?: string; message?: string; limit?: number; count?: number };
      if (error?.code === "QUOTA_EXCEEDED") {
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

    // 构建完整的提示词：结合面板描述和用户修改需求
    const fullPrompt = `${panel.description || "漫画面板"}, ${modifyPrompt}, manga style, high quality, detailed`;

    console.log(`\n========== AI 图片编辑 ==========`);
    console.log(`Panel ID: ${panelId}`);
    console.log(`Reference Image: ${imageUrl}`);
    console.log(`Modify Prompt: ${modifyPrompt}`);
    console.log(`Full Prompt: ${fullPrompt}`);
    console.log(`=====================================\n`);

    // 直接调用图片生成 API，将原图作为参考
    const result = await callImageGenerationByType({
      providerType: "image_edit",
      prompt: fullPrompt,
      width: 1024,
      height: 768,
      referenceImageUrls: [imageUrl], // 关键：传递原图作为参考
    });

    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || "图片修改失败");
    }

    console.log(`✓ 图片生成成功，收到 ${result.images.length} 张图片`);

    // 提取生成的图片 URL（可能是 base64 或 URL）
    let newImageUrl: string = result.images[0];

    // 如果是 base64，上传到 MinIO
    if (newImageUrl.startsWith("data:")) {
      console.log("正在上传生成的图片到 MinIO...");
      newImageUrl = await uploadBase64Image(
        newImageUrl,
        `edited-${panelId}-${Date.now()}.png`
      );
      console.log(`✓ 图片已上传: ${newImageUrl}`);
    }

    // 如果返回的是 Markdown 格式的图片链接，提取 URL
    const extractedUrls = extractImageUrlsFromMarkdown(newImageUrl);
    if (extractedUrls.length > 0) {
      newImageUrl = extractedUrls[0];
      console.log(`✓ 从 Markdown 提取图片 URL: ${newImageUrl}`);
    }

    // 记录生成日志
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
      },
      responsePayload: {
        imageUrl: newImageUrl,
        extractedUrls: extractedUrls.length > 0 ? extractedUrls : undefined,
      },
    });

    // 更新面板的图片 URL
    await prisma.panel.update({
      where: { id: panelId },
      data: {
        generated_image: newImageUrl,
        prompt_used: fullPrompt,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: newImageUrl,
      optimizedPrompt: fullPrompt,
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
 * 从 Markdown 文本中提取图片 URL
 * 支持格式：![alt](url) 和 <img src="url">
 */
function extractImageUrlsFromMarkdown(markdown: string): string[] {
  const urls: string[] = [];

  // 匹配 Markdown 格式的图片：![alt](url)
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownImageRegex.exec(markdown)) !== null) {
    const url = match[2].trim();
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      urls.push(url);
    }
  }

  // 匹配 HTML img 标签：<img src="url">
  const htmlImageRegex = /<img[^>]+src=["']([^"']+)["']/g;
  while ((match = htmlImageRegex.exec(markdown)) !== null) {
    const url = match[1].trim();
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      urls.push(url);
    }
  }

  return urls;
}
