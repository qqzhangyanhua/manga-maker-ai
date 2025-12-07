import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/project/[id] - 获取单个项目详情
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}

// PATCH /api/project/[id] - 更新项目信息
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, style, status, cover_image } = body;

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(style !== undefined && { style }),
        ...(status !== undefined && { status }),
        ...(cover_image !== undefined && { cover_image }),
        updated_at: new Date(),
      },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
    });

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "更新项目失败" }, { status: 500 });
  }
}
