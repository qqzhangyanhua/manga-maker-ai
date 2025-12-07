import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/project - 获取用户的所有项目
export async function GET() {
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

// DELETE /api/project?id=xxx - 删除项目
export async function DELETE(req: Request) {
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
