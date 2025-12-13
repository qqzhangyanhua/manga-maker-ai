/**
 * 多格合成 API - 将多个分镜合成为一张多格漫画图片
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { composeMultiPanels } from "@/lib/image-composer";

interface RequestBody {
  panel_ids: string[];
}

export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 解析请求体
    const body = (await request.json()) as RequestBody;
    const { panel_ids } = body;

    if (!panel_ids || !Array.isArray(panel_ids) || panel_ids.length < 2 || panel_ids.length > 6) {
      return NextResponse.json(
        { error: "panel_ids 必须是包含 2-6 个元素的数组" },
        { status: 400 }
      );
    }

    // 查询分镜数据
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panel_ids },
      },
      orderBy: {
        panel_order: "asc",
      },
    });

    if (panels.length !== panel_ids.length) {
      return NextResponse.json(
        { error: "部分分镜不存在" },
        { status: 404 }
      );
    }

    // 验证分镜所属项目是否属于当前用户
    const projectIds = [...new Set(panels.map((p) => p.project_id))];
    if (projectIds.length !== 1) {
      return NextResponse.json(
        { error: "选中的分镜必须属于同一个项目" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectIds[0] },
    });

    if (!project || project.user_id !== payload.userId) {
      return NextResponse.json(
        { error: "无权操作此项目" },
        { status: 403 }
      );
    }

    // 调用图片合成服务
    const composedImageUrl = await composeMultiPanels(panels);

    // 保存到 GeneratedImage 表
    const generatedImage = await prisma.generatedImage.create({
      data: {
        user_id: payload.userId,
        image_url: composedImageUrl,
        prompt: `多格合成 - ${panels.length}个分镜`,
        source_type: "panel",
        source_id: project.id,
      },
    });

    return NextResponse.json({
      success: true,
      composed_image_url: composedImageUrl,
      generated_image_id: generatedImage.id,
    });
  } catch (error) {
    console.error("[API] Compose multi panels error:", error);
    const message = error instanceof Error ? error.message : "合成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
