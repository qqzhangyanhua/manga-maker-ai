/**
 * Shot Design Edit API
 * PATCH /api/canvas/shot-design/[id] - 更新镜头设计
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
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

  try {
    const shot = await prisma.shotDesign.findUnique({
      where: { id },
      include: {
        script_segment: {
          include: {
            timeline_chapter: {
              include: { timeline: true },
            },
          },
        },
      },
    });

    if (!shot) {
      return NextResponse.json({ error: "镜头设计不存在" }, { status: 404 });
    }

    if (
      shot.script_segment.timeline_chapter.timeline.user_id !== payload.userId
    ) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const body = await req.json();
    const {
      camera_angle,
      shot_size,
      panel_type,
      shot_description,
      composition_hint,
      character_ids,
      scene_id,
      expression_types,
      outfit_ids,
      prompt,
      negative_prompt,
      // 新增：角色身份证相关字段
      character_prompt_template_ids,
      character_prompt_status,
      final_prompt_status,
      nine_grid_status,
      selection_status,
    } = body;

    const updated = await prisma.shotDesign.update({
      where: { id },
      data: {
        ...(camera_angle && { camera_angle }),
        ...(shot_size && { shot_size }),
        ...(panel_type && { panel_type }),
        ...(shot_description && { shot_description }),
        ...(composition_hint && { composition_hint }),
        ...(character_ids && { character_ids }),
        ...(scene_id !== undefined && { scene_id }),
        ...(expression_types && { expression_types }),
        ...(outfit_ids && { outfit_ids }),
        ...(prompt && { prompt }),
        ...(negative_prompt !== undefined && { negative_prompt }),
        // 新增：角色身份证相关字段
        ...(character_prompt_template_ids && { character_prompt_template_ids }),
        ...(character_prompt_status && { character_prompt_status }),
        ...(final_prompt_status && { final_prompt_status }),
        ...(nine_grid_status && { nine_grid_status }),
        ...(selection_status && { selection_status }),
      },
    });

    return NextResponse.json({ success: true, shot: updated });
  } catch (error) {
    console.error("更新镜头设计失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
