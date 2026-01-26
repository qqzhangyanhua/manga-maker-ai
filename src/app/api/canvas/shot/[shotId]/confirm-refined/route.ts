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

    // 获取分镜设计信息
    const shotDesign = await prisma.shotDesign.findUnique({
      where: { id: shotId },
      include: {
        script_segment: {
          include: {
            timeline_chapter: {
              include: {
                timeline: true,
              },
            },
          },
        },
      },
    });

    if (!shotDesign) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    // 验证权限
    const timeline = shotDesign.script_segment?.timeline_chapter?.timeline;
    if (!timeline || timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限访问该分镜" }, { status: 403 });
    }

    // 更新分镜状态
    const updateData: {
      generated_image_url: string;
      selection_status: string;
      generation_status: string;
      prompt_composition_id?: string;
    } = {
      generated_image_url: refined_image_url,
      selection_status: "refined",
      generation_status: "completed",
    };

    // 如果提供了微调后的 composition ID，更新关联
    if (refined_composition_id) {
      updateData.prompt_composition_id = refined_composition_id;
    }

    await prisma.shotDesign.update({
      where: { id: shotId },
      data: updateData,
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
    console.error("[ConfirmRefined] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "确认失败" },
      { status: 500 }
    );
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
    // 获取分镜设计信息
    const shotDesign = await prisma.shotDesign.findUnique({
      where: { id: shotId },
      include: {
        nine_grid: true,
        script_segment: {
          include: {
            timeline_chapter: {
              include: {
                timeline: true,
              },
            },
          },
        },
      },
    });

    if (!shotDesign) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    // 验证权限
    const timeline = shotDesign.script_segment?.timeline_chapter?.timeline;
    if (!timeline || timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限访问该分镜" }, { status: 403 });
    }

    // 如果有九宫格选中的图片，恢复使用
    let originalImageUrl = null;
    if (shotDesign.nine_grid?.selected_image_url) {
      originalImageUrl = shotDesign.nine_grid.selected_image_url;
    }

    // 更新分镜状态
    await prisma.shotDesign.update({
      where: { id: shotId },
      data: {
        generated_image_url: originalImageUrl,
        selection_status: originalImageUrl ? "selected" : "pending",
      },
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
    console.error("[ConfirmRefined] Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
