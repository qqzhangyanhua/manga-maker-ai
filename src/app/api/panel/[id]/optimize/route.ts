import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

type OptimizeAspect = "dialogue" | "scene_description" | "visual_prompt";

/**
 * POST /api/panel/[id]/optimize
 * AI优化单个分镜（对话、画面描述或视觉提示词）
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

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

    const { id: panelId } = await context.params;
    const body = await request.json();
    const { aspect, instruction } = body as {
      aspect: OptimizeAspect;
      instruction?: string;
    };

    if (!aspect || !["dialogue", "scene_description", "visual_prompt"].includes(aspect)) {
      return NextResponse.json(
        { error: "aspect 必须是 dialogue, scene_description 或 visual_prompt" },
        { status: 400 }
      );
    }

    // 获取分镜及其关联的项目
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        project: {
          select: { user_id: true }
        }
      }
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    // 验证所有权
    if (panel.project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此分镜" }, { status: 403 });
    }

    // 检查配额
    try {
      await assertAndIncrementUsage({
        userId,
        action: "panel_optimization",
        providerType: "prompt_optimizer"
      });
    } catch (quotaError: unknown) {
      const error = quotaError as { code?: string; message?: string; limit?: number; count?: number };
      if (error?.code === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            error: error.message,
            code: "QUOTA_EXCEEDED",
            limit: error.limit,
            used: error.count
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    // 根据优化类型构建不同的提示词
    let systemPrompt = "";
    let userPrompt = "";

    switch (aspect) {
      case "dialogue":
        systemPrompt = `你是一位专业的漫画对话编写专家。你的任务是优化漫画分镜中的对话，使其更自然、有张力、符合角色性格。

规则：
1. 保持对话简洁有力，漫画对话不宜过长
2. 体现角色个性和情感状态
3. 与画面内容相呼应
4. 只返回优化后的对话文本，不要额外说明`;

        userPrompt = `当前画面描述：${panel.description}
当前对话：${panel.dialogue || "（无对话）"}
${instruction ? `\n优化要求：${instruction}` : ""}

请优化对话，使其更生动、更符合漫画表达。`;
        break;

      case "scene_description":
        systemPrompt = `你是一位专业的分镜脚本师。你的任务是优化漫画分镜的画面描述，使其更清晰、更具画面感。

规则：
1. 描述要具体可视化，避免抽象概念
2. 包含角色动作、表情、场景细节
3. 考虑镜头角度和构图
4. 长度控制在100-150字
5. 只返回优化后的描述文本，不要额外说明`;

        userPrompt = `当前画面描述：${panel.description}
镜头类型：${panel.panel_type}
镜头角度：${panel.camera_angle || "未指定"}
景别：${panel.shot_size || "未指定"}
${instruction ? `\n优化要求：${instruction}` : ""}

请优化画面描述，使其更生动、更具画面感。`;
        break;

      case "visual_prompt":
        systemPrompt = `你是一位AI绘图提示词专家。你的任务是优化漫画分镜的视觉提示词（prompt），使其更适合AI图像生成。

规则：
1. 使用具体的视觉元素描述（人物、动作、表情、场景、光影、氛围）
2. 包含构图和镜头信息
3. 风格化描述（例如：manga style, dramatic lighting, dynamic angle）
4. 长度适中，重点突出
5. 只返回优化后的提示词，不要额外说明`;

        userPrompt = `画面描述：${panel.description}
当前视觉提示词：${panel.visual_prompt}
镜头类型：${panel.panel_type}
镜头角度：${panel.camera_angle || "未指定"}
景别：${panel.shot_size || "未指定"}
${instruction ? `\n优化要求：${instruction}` : ""}

请优化视觉提示词，使其更适合AI图像生成。`;
        break;
    }

    // 调用 LLM 进行优化
    const result = await callChatCompletionByType({
      providerType: "prompt_optimizer",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      maxTokens: 500,
      options: {
        userId: userId!,
      },
    });

    const optimizedText = result.content.trim();

    // 更新分镜
    const updateData: {
      dialogue?: string | null;
      description?: string;
      visual_prompt?: string;
    } = {};

    if (aspect === "dialogue") {
      updateData.dialogue = optimizedText;
    } else if (aspect === "scene_description") {
      updateData.description = optimizedText;
    } else if (aspect === "visual_prompt") {
      updateData.visual_prompt = optimizedText;
    }

    const updatedPanel = await prisma.panel.update({
      where: { id: panelId },
      data: updateData
    });

    // 记录生成日志
    await recordGenerationLog({
      userId,
      projectId: panel.project_id,
      action: "panel_optimization",
      providerType: "prompt_optimizer",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: {
        panel_id: panelId,
        aspect,
        instruction
      },
      responsePayload: {
        optimized_text: optimizedText
      }
    });

    return NextResponse.json({
      success: true,
      panel: updatedPanel,
      optimized_text: optimizedText,
      message: `成功优化${aspect === "dialogue" ? "对话" : aspect === "scene_description" ? "画面描述" : "视觉提示词"}`
    });
  } catch (error) {
    console.error("分镜优化失败:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "panel_optimization",
        providerType: "prompt_optimizer",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
