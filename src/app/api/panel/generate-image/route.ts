import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { generateImage, waitForTaskCompletion } from "@/lib/unified-image-generation";

// POST /api/panel/generate-image - 为单个分镜生成图像
export async function POST(req: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let usageSnapshot: { count: number; limit: number } | null = null;

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
    const { panel_id, prompt, style, wait = false } = body;

    if (!panel_id || !prompt) {
      return NextResponse.json(
        { error: "缺少 panel_id 或 prompt" },
        { status: 400 }
      );
    }

    // 获取panel并验证权限，包含资产关联
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: {
        project: true,
        character: {
          include: {
            outfits: true,
            expressions: true,
          },
        },
        outfit: true,
        scene: true,
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generation",
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

    // Phase 2: Build enhanced prompt using bound assets
    let enhancedPrompt = prompt;

    // Add character information
    if (panel.character) {
      const charDesc = panel.character.base_prompt || panel.character.name;
      enhancedPrompt += `, character: ${charDesc}`;

      // Add expression if specified
      if (panel.expression_type) {
        enhancedPrompt += `, expression: ${panel.expression_type}`;
      }

      // Add outfit if specified
      if (panel.outfit) {
        enhancedPrompt += `, wearing: ${panel.outfit.outfit_name}`;
      }
    }

    // Add scene information
    if (panel.scene) {
      enhancedPrompt += `, background: ${panel.scene.name} (${panel.scene.scene_type})`;
    }

    // 使用统一图片生成系统
    const stylePrompt = style || panel.project.style || "manga style";
    const fullPrompt = `${enhancedPrompt}, ${stylePrompt}, high quality, detailed`;

    const { taskId, status } = await generateImage(
      "panel",
      fullPrompt,
      userId,
      {
        style: stylePrompt,
        width: 1024,
        height: 768,
        metadata: {
          panel_id,
          project_id: panel.project_id,
          character_id: panel.character_id,
          scene_id: panel.scene_id,
        },
        // Phase 2: Pass reference images for IP-Adapter
        referenceImages: [
          panel.character?.reference_image,
          panel.outfit?.image_url,
          panel.scene?.image_url,
        ].filter(Boolean) as string[],
      }
    );

    // If wait=true, wait for completion
    let imageUrl: string | undefined;
    if (wait) {
      const result = await waitForTaskCompletion(taskId, 60000);
      if (result.status === "completed") {
        imageUrl = result.imageUrl;
      } else if (result.status === "failed") {
        throw new Error(result.error || "Image generation failed");
      }
    }

    // 更新panel的generated_image (如果已完成)
    if (imageUrl) {
      await prisma.panel.update({
        where: { id: panel_id },
        data: {
          generated_image: imageUrl,
          prompt_used: prompt,
        },
      });
    }

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        status: imageUrl ? "success" : "pending",
        durationMs: Date.now() - startedAt,
        requestPayload: { panel_id, style },
        responsePayload: { panel_id, task_id: taskId },
      });
    }

    return NextResponse.json({
      success: true,
      task_id: taskId,
      status: status.status,
      image_url: imageUrl,
      usage: usageSnapshot,
      message: wait
        ? "图片生成完成"
        : "图片生成任务已提交,请使用task_id查询进度",
    });
  } catch (error) {
    console.error("Generate image error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/panel/generate-batch - 批量生成项目的所有分镜图像
export async function PUT(req: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let usageSnapshot: { count: number; limit: number } | null = null;

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
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: "缺少 project_id" }, { status: 400 });
    }

    // 获取项目并验证权限
    const project = await prisma.project.findUnique({
      where: { id: project_id },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const panelsToGenerate = project.panels.filter((p) => p.prompt_used);

    if (panelsToGenerate.length === 0) {
      return NextResponse.json(
        { error: "没有可生成的分镜(缺少prompt)" },
        { status: 400 }
      );
    }

    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        amount: panelsToGenerate.length,
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

    // 使用统一图片生成系统批量提交任务
    const stylePrompt = project.style || "manga style";
    const taskIds: string[] = [];

    for (const panel of panelsToGenerate) {
      const fullPrompt = `${panel.prompt_used}, ${stylePrompt}, high quality, detailed`;

      const { taskId } = await generateImage(
        "panel",
        fullPrompt,
        userId,
        {
          style: stylePrompt,
          width: 1024,
          height: 768,
          metadata: { panel_id: panel.id, project_id },
        }
      );

      taskIds.push(taskId);
    }

    await recordGenerationLog({
      userId,
      action: "batch_image_generation",
      providerType: "image_generation",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: { project_id, panel_count: panelsToGenerate.length },
      responsePayload: { task_ids: taskIds },
    });

    return NextResponse.json({
      success: true,
      task_ids: taskIds,
      panel_count: panelsToGenerate.length,
      usage: usageSnapshot,
      message: `已提交${panelsToGenerate.length}个分镜的生成任务`,
    });
  } catch (error) {
    console.error("Batch generate error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    if (userId) {
      await recordGenerationLog({
        userId,
        action: "batch_image_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
