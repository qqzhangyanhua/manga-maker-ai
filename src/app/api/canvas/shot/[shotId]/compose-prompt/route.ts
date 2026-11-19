/**
 * 分镜 Prompt 合成 API
 * POST /api/canvas/shot/[shotId]/compose-prompt - 为分镜合成最终 Prompt
 * GET  /api/canvas/shot/[shotId]/compose-prompt - 获取分镜的 Prompt 合成记录
 *
 * shotId 是画布镜头（项目分镜）ID
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  composeShotPrompt,
  saveShotPromptComposition,
  incrementTemplateUsageCount,
} from "@/lib/shot-prompt-composer";
import { getCanvasShotForUser, updateShotPipeline } from "@/lib/canvas";
import { canvasErrorResponse } from "@/lib/canvas/route-error";

interface RouteParams {
  params: Promise<{ shotId: string }>;
}

// 请求参数校验 Schema
const ComposePromptRequestSchema = z.object({
  // 该分镜使用的角色 Prompt 模板 ID 列表
  character_template_ids: z.array(z.string().uuid()).min(0),
  // 角色位置提示 (key: character_id, value: position)
  character_positions: z.record(
    z.enum(["left", "center", "right", "foreground", "background"])
  ).optional(),
  // 用户手动补充的内容
  manual_adjustments: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { shotId } = await params;

  try {
    const body = await req.json();

    // 验证请求参数
    const validation = ComposePromptRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "请求参数验证失败",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { character_template_ids, character_positions, manual_adjustments } = validation.data;

    // 验证分镜存在且属于当前用户
    const { panel } = await getCanvasShotForUser(prisma, shotId, payload.userId);

    await updateShotPipeline(prisma, panel.id, { final_prompt_status: "generating" });

    try {
      // 合成 Prompt
      const composed = await composeShotPrompt({
        panelId: panel.id,
        characterTemplateIds: character_template_ids,
        characterPositions: character_positions,
        manualAdjustments: manual_adjustments,
        userId: payload.userId,
      });

      // 保存合成结果
      const compositionId = await saveShotPromptComposition(panel.id, payload.userId, composed);

      // 更新模板使用计数
      await incrementTemplateUsageCount(character_template_ids);

      // 返回合成结果
      return NextResponse.json({
        success: true,
        composition: {
          id: compositionId,
          panel_id: panel.id,
          ...composed,
        },
      });
    } catch (error) {
      await updateShotPipeline(prisma, panel.id, { final_prompt_status: "error" });
      throw error;
    }
  } catch (error) {
    return canvasErrorResponse(error, "合成分镜 Prompt 失败");
  }
}

/**
 * GET - 获取分镜的 Prompt 合成记录
 */
export async function GET(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { shotId } = await params;

  try {
    const { panel } = await getCanvasShotForUser(prisma, shotId, payload.userId);
    const composition = await prisma.shotPromptComposition.findUnique({ where: { panel_id: panel.id } });

    if (!composition) {
      return NextResponse.json({
        success: true,
        composition: null,
        message: "尚未合成 Prompt",
      });
    }

    return NextResponse.json({
      success: true,
      composition: {
        ...composition,
        created_at: composition.created_at.toISOString(),
        updated_at: composition.updated_at.toISOString(),
      },
    });
  } catch (error) {
    return canvasErrorResponse(error, "获取分镜 Prompt 合成记录失败");
  }
}
