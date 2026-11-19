/**
 * 确认使用微调后的图片 API
 * POST /api/canvas/shot/[shotId]/confirm-refined
 * 
 * 用户确认使用微调后的图片
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getCanvasShotForUser, updateCanvasShot } from "@/lib/canvas";
import { canvasErrorResponse } from "@/lib/canvas/route-error";

interface RouteParams {
  params: Promise<{ shotId: string }>;
}

// 请求参数 Schema
const ConfirmRefinedRequestSchema = z.object({
  refined_image_url: z.string().url("请提供有效的图片 URL"),
  refined_composition_id: z.string().uuid().optional(),
});

/**
 * POST - 确认使用微调后的图片
 */
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
    const validation = ConfirmRefinedRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "请求参数验证失败",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { refined_image_url, refined_composition_id } = validation.data;

    // 获取分镜信息并验证权限
    const context = await getCanvasShotForUser(prisma, shotId, payload.userId);

    // 微调记录必须属于这个分镜
    if (refined_composition_id) {
      const composition = await prisma.shotPromptComposition.findUnique({
        where: { id: refined_composition_id },
        select: { panel_id: true },
      });
      if (composition?.panel_id !== context.panel.id) {
        return NextResponse.json({ error: "微调记录不属于该分镜" }, { status: 400 });
      }
    }

    await updateCanvasShot(prisma, context, payload.userId, {
      generated_image_url: refined_image_url,
      selection_status: "refined",
      generation_status: "completed",
      ...(refined_composition_id ? { prompt_composition_id: refined_composition_id } : {}),
    });

    console.log("[ConfirmRefined] 确认使用微调图片:", {
      shotId,
      imageUrl: refined_image_url,
    });

    return NextResponse.json({
      success: true,
      message: "已确认使用微调后的图片",
    });
  } catch (error) {
    return canvasErrorResponse(error, "确认失败");
  }
}

/**
 * DELETE - 放弃微调图片，恢复使用九宫格选中的图片
 */
export async function DELETE(req: Request, { params }: RouteParams) {
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
    // 获取分镜信息并验证权限
    const context = await getCanvasShotForUser(prisma, shotId, payload.userId);
    const nineGridId = context.shot.nine_grid_generation_id;
    const nineGrid = nineGridId
      ? await prisma.nineGridGeneration.findUnique({ where: { id: nineGridId }, select: { selected_image_url: true } })
      : null;

    // 如果有九宫格选中的图片，恢复使用
    const originalImageUrl = nineGrid?.selected_image_url ?? null;

    await updateCanvasShot(prisma, context, payload.userId, {
      generated_image_url: originalImageUrl,
      selection_status: originalImageUrl ? "selected" : "pending",
    });

    console.log("[ConfirmRefined] 放弃微调图片，恢复原图:", {
      shotId,
      restoredImageUrl: originalImageUrl,
    });

    return NextResponse.json({
      success: true,
      restored_image_url: originalImageUrl,
      message: originalImageUrl ? "已恢复使用九宫格选中的图片" : "已清除图片",
    });
  } catch (error) {
    return canvasErrorResponse(error, "操作失败");
  }
}
