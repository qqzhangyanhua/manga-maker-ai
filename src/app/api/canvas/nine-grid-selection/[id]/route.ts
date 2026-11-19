/**
 * 九宫格选择 API
 * POST /api/canvas/nine-grid-selection/[id] - 选择九宫格中的一张图片
 * GET /api/canvas/nine-grid-selection/[id] - 获取九宫格生成记录详情
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getCanvasShotForUser, updateCanvasShot, updateShotPipeline } from "@/lib/canvas";
import { canvasErrorResponse } from "@/lib/canvas/route-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 选择请求 Schema
const SelectImageRequestSchema = z.object({
  grid_position: z.number().int().min(1).max(9),
});

/**
 * POST - 选择九宫格中的一张图片
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

  const { id: nineGridId } = await params;

  try {
    const body = await req.json();

    // 验证请求参数
    const validation = SelectImageRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "请求参数验证失败",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { grid_position } = validation.data;

    // 获取九宫格生成记录
    const nineGridGeneration = await prisma.nineGridGeneration.findUnique({
      where: { id: nineGridId },
    });

    if (!nineGridGeneration) {
      return NextResponse.json({ error: "九宫格生成记录不存在" }, { status: 404 });
    }

    // 验证权限
    if (nineGridGeneration.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 验证状态
    if (nineGridGeneration.status !== "completed") {
      return NextResponse.json(
        { error: "九宫格生成尚未完成，无法选择" },
        { status: 400 }
      );
    }

    // 获取选中的图片
    const images = nineGridGeneration.images as Array<{
      grid_position: number;
      image_url: string;
      seed: number;
    }>;

    const selectedImage = images.find((img) => img.grid_position === grid_position);

    if (!selectedImage) {
      return NextResponse.json(
        { error: `位置 ${grid_position} 没有生成图片` },
        { status: 400 }
      );
    }

    if (!nineGridGeneration.panel_id) {
      return NextResponse.json({ error: "九宫格记录没有关联分镜" }, { status: 404 });
    }
    const context = await getCanvasShotForUser(prisma, nineGridGeneration.panel_id, payload.userId);

    // 更新九宫格选择
    await prisma.nineGridGeneration.update({
      where: { id: nineGridId },
      data: {
        selected_grid_position: grid_position,
        selected_image_url: selectedImage.image_url,
      },
    });

    // 更新分镜状态
    await updateCanvasShot(prisma, context, payload.userId, {
      selection_status: "selected",
      generated_image_url: selectedImage.image_url,
      generation_status: "completed",
    });

    return NextResponse.json({
      success: true,
      selected_image_url: selectedImage.image_url,
      panel_id: context.panel.id,
      message: `已选择位置 ${grid_position} 的图片`,
    });
  } catch (error) {
    return canvasErrorResponse(error, "选择失败");
  }
}

/**
 * GET - 获取九宫格生成记录详情
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

  const { id: nineGridId } = await params;

  try {
    // 获取九宫格生成记录
    const nineGridGeneration = await prisma.nineGridGeneration.findUnique({
      where: { id: nineGridId },
      include: {
        panel: { select: { id: true, description: true, panel_order: true } },
      },
    });

    if (!nineGridGeneration) {
      return NextResponse.json({ error: "九宫格生成记录不存在" }, { status: 404 });
    }

    // 验证权限
    if (nineGridGeneration.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限查看" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      generation: {
        id: nineGridGeneration.id,
        panel_id: nineGridGeneration.panel_id,
        shot_description: nineGridGeneration.panel?.description ?? null,
        status: nineGridGeneration.status,
        images: nineGridGeneration.images,
        selected_grid_position: nineGridGeneration.selected_grid_position,
        selected_image_url: nineGridGeneration.selected_image_url,
        generation_params: nineGridGeneration.generation_params,
        error_message: nineGridGeneration.error_message,
        created_at: nineGridGeneration.created_at.toISOString(),
        completed_at: nineGridGeneration.completed_at?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[NineGridSelection] Get error:", error);
    return NextResponse.json(
      { error: "获取九宫格生成记录失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 取消选择（重新选择）
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

  const { id: nineGridId } = await params;

  try {
    // 获取九宫格生成记录
    const nineGridGeneration = await prisma.nineGridGeneration.findUnique({
      where: { id: nineGridId },
    });

    if (!nineGridGeneration) {
      return NextResponse.json({ error: "九宫格生成记录不存在" }, { status: 404 });
    }

    // 验证权限
    if (nineGridGeneration.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 清除选择
    await prisma.nineGridGeneration.update({
      where: { id: nineGridId },
      data: {
        selected_grid_position: null,
        selected_image_url: null,
      },
    });

    // 更新分镜状态（不清除分镜图片，保留之前的图片）
    if (nineGridGeneration.panel_id) {
      await updateShotPipeline(prisma, nineGridGeneration.panel_id, { selection_status: "pending" });
    }

    return NextResponse.json({
      success: true,
      message: "已取消选择",
    });
  } catch (error) {
    console.error("[NineGridSelection] Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取消选择失败" },
      { status: 500 }
    );
  }
}
