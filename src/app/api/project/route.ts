import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/project - 获取用户的所有项目
export async function GET() {
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

    const projects = await prisma.project.findMany({
      where: { user_id: payload.userId },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "获取项目列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/project - 创建新项目
export async function POST(req: Request) {
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

    const body = await req.json();
    const { title, description, style, story_id, status, cover_image } = body;

    // 验证必填字段
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "项目标题不能为空" }, { status: 400 });
    }

    // 如果提供了 story_id，验证 Story 是否存在且属于当前用户
    if (story_id) {
      const story = await prisma.story.findUnique({
        where: { id: story_id },
      });

      if (!story) {
        return NextResponse.json({ error: "关联的故事不存在" }, { status: 404 });
      }

      if (story.user_id !== payload.userId) {
        return NextResponse.json({ error: "无权关联该故事" }, { status: 403 });
      }
    }

    // 创建项目
    const project = await prisma.project.create({
      data: {
        user_id: payload.userId,
        title: title.trim(),
        description: description?.trim() || null,
        style: style || null,
        story_id: story_id || null,
        status: status || "draft",
        cover_image: cover_image || null,
      },
    });

    return NextResponse.json({
      success: true,
      project,
      message: "项目创建成功",
    });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "创建项目失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/project?id=xxx - 删除项目
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("id");

    if (!projectId) {
      return NextResponse.json({ error: "缺少项目ID" }, { status: 400 });
    }

    // 验证项目属于当前用户
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.user_id !== payload.userId) {
      return NextResponse.json({ error: "项目不存在或无权限" }, { status: 403 });
    }

    // 删除项目（panels会级联删除）
    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true, message: "项目已删除" });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "删除项目失败" }, { status: 500 });
  }
}
