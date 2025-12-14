import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SharePanelRequest } from "@/lib/gallery-types";

/**
 * POST /api/panel/[id]/share - 分享作品到画廊
 * 需要认证，只有作品所有者可以分享
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { id } = await params;

    // 解析请求体
    const body = (await request.json()) as SharePanelRequest;
    const { show_prompt } = body;

    // 查询 Panel 并验证所有权
    const panel = await prisma.panel.findUnique({
      where: { id },
      select: {
        id: true,
        is_shared: true,
        generated_image: true,
        project: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    // 验证所有权
    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作此作品" }, { status: 403 });
    }

    // 检查是否有生成的图片
    if (!panel.generated_image) {
      return NextResponse.json({ error: "作品尚未生成图片，无法分享" }, { status: 400 });
    }

    // 检查是否已分享
    if (panel.is_shared) {
      return NextResponse.json({ error: "作品已分享" }, { status: 400 });
    }

    // 更新分享状态
    const updatedPanel = await prisma.panel.update({
      where: { id },
      data: {
        is_shared: true,
        shared_at: new Date(),
        show_prompt,
      },
      select: {
        id: true,
        is_shared: true,
        shared_at: true,
        show_prompt: true,
        view_count: true,
      },
    });

    return NextResponse.json({
      message: "分享成功",
      panel: updatedPanel,
    });
  } catch (error) {
    console.error("Share panel error:", error);
    return NextResponse.json({ error: "分享失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/panel/[id]/share - 取消分享
 * 需要认证，只有作品所有者可以取消分享
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { id } = await params;

    // 查询 Panel 并验证所有权
    const panel = await prisma.panel.findUnique({
      where: { id },
      select: {
        id: true,
        is_shared: true,
        project: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    // 验证所有权
    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作此作品" }, { status: 403 });
    }

    // 检查是否已分享
    if (!panel.is_shared) {
      return NextResponse.json({ error: "作品未分享" }, { status: 400 });
    }

    // 取消分享
    const updatedPanel = await prisma.panel.update({
      where: { id },
      data: {
        is_shared: false,
        shared_at: null,
      },
      select: {
        id: true,
        is_shared: true,
        shared_at: true,
      },
    });

    return NextResponse.json({
      message: "取消分享成功",
      panel: updatedPanel,
    });
  } catch (error) {
    console.error("Unshare panel error:", error);
    return NextResponse.json({ error: "取消分享失败" }, { status: 500 });
  }
}
