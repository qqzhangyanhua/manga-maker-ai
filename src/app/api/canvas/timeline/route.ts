/**
 * Canvas Timeline API
 * POST /api/canvas/timeline - 创建时间线
 * GET /api/canvas/timeline - 获取用户的时间线列表
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { anchorTimelineChapters, findUnambiguousNovelProject } from "@/lib/project";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { novel_project_id, title, config } = body;

    if (!novel_project_id || !title) {
      return NextResponse.json(
        { error: "缺少必填字段: novel_project_id, title" },
        { status: 400 }
      );
    }

    // **修复：先检查是否已存在该小说项目的时间线**
    const existingTimeline = await prisma.canvasTimeline.findFirst({
      where: {
        novel_project_id,
        user_id: payload.userId,
      },
      orderBy: {
        created_at: "desc", // 如果有多个，返回最新的
      },
    });

    if (existingTimeline) {
      console.log(`[Timeline API] 复用现有时间线: ${existingTimeline.id} for project ${novel_project_id}`);
      // 旧时间线还没关联漫画项目时，项目无歧义则顺手补上
      if (!existingTimeline.project_id) {
        const linked = await findUnambiguousNovelProject(prisma, payload.userId, novel_project_id);
        if (linked) {
          const healed = await prisma.canvasTimeline.update({
            where: { id: existingTimeline.id },
            data: { project_id: linked.id },
          });
          await anchorTimelineChapters(prisma, healed.id);
          return NextResponse.json({ success: true, timeline: healed });
        }
      }
      return NextResponse.json({ success: true, timeline: existingTimeline });
    }

    // 不存在才创建新时间线；小说只改编出一个漫画项目时自动关联，多个留给用户在画布中选择
    const linked = await findUnambiguousNovelProject(prisma, payload.userId, novel_project_id);
    console.log(`[Timeline API] 创建新时间线 for project ${novel_project_id}`);
    const timeline = await prisma.canvasTimeline.create({
      data: {
        novel_project_id,
        user_id: payload.userId,
        title,
        ...(linked ? { project_id: linked.id } : {}),
        config: config || {
          auto_generate: true,
          use_character_library: true,
          use_scene_library: true,
        },
      },
    });

    return NextResponse.json({ success: true, timeline });
  } catch (error) {
    console.error("创建时间线失败:", error);
    return NextResponse.json({ error: "创建时间线失败" }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  try {
    const timelines = await prisma.canvasTimeline.findMany({
      where: { user_id: payload.userId },
      orderBy: { created_at: "desc" },
      include: {
        chapters: {
          orderBy: { chapter_number: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, timelines });
  } catch (error) {
    console.error("获取时间线列表失败:", error);
    return NextResponse.json({ error: "获取时间线列表失败" }, { status: 500 });
  }
}
