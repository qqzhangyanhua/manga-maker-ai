/**
 * Shot Design Update Image API
 * PATCH /api/canvas/shot-design/[id]/update-image - 更新镜头生成结果
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface UpdateImageRequestBody {
  image_url: string;
  generation_status: "completed" | "error";
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

  let body: Partial<UpdateImageRequestBody> = {};
  try {
    body = (await req.json()) as Partial<UpdateImageRequestBody>;
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const imageUrl = typeof body.image_url === "string" ? body.image_url : "";
  const status = body.generation_status;

  if (!imageUrl) {
    return NextResponse.json({ error: "image_url 不能为空" }, { status: 400 });
  }

  if (status !== "completed" && status !== "error") {
    return NextResponse.json({ error: "generation_status 无效" }, { status: 400 });
  }

  try {
    const shot = await prisma.shotDesign.findUnique({
      where: { id },
      select: {
        id: true,
        script_segment: {
          select: {
            timeline_chapter: {
              select: {
                timeline: { select: { user_id: true } },
              },
            },
          },
        },
      },
    });

    if (!shot) {
      return NextResponse.json({ error: "镜头设计不存在" }, { status: 404 });
    }

    if (shot.script_segment.timeline_chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const updated = await prisma.shotDesign.update({
      where: { id },
      data: {
        generated_image_url: imageUrl,
        generation_status: status,
      },
      select: {
        id: true,
        generated_image_url: true,
        generation_status: true,
      },
    });

    return NextResponse.json({ success: true, shot: updated });
  } catch (error) {
    console.error("[PATCH /api/canvas/shot-design/[id]/update-image]", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
