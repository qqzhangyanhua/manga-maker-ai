import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, withAuth } from "@/lib/api-helpers";

// GET /api/project/[id] - 获取单个项目详情
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
        script: true,
      },
    });

    if (!project) {
      throw new ApiError("项目不存在", 404, "NOT_FOUND");
    }

    if (project.user_id !== userId) {
      throw new ApiError("无权限访问", 403, "FORBIDDEN");
    }

    return { project };
  });
}

// PATCH /api/project/[id] - 更新项目信息
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      throw new ApiError("项目不存在", 404, "NOT_FOUND");
    }

    if (project.user_id !== userId) {
      throw new ApiError("无权限", 403, "FORBIDDEN");
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
        script: true,
      },
    });

    return { project: updatedProject };
  });
}
