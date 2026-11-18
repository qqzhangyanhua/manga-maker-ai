import { prisma } from "@/lib/db";
import { z } from "zod";
import { ApiError, parseWithSchema, withAuth } from "@/lib/api-helpers";
import { deleteProjectWithStory } from "@/lib/project";

const projectStatusSchema = z.enum(["draft", "in_progress", "completed", "archived"]);

const routeParamsSchema = z.object({
  id: z.string().uuid("项目 ID 格式无效"),
});

const updateProjectBodySchema = z
  .object({
    title: z.string().trim().min(1, "项目标题不能为空").max(200, "项目标题不能超过 200 字").optional(),
    description: z.string().trim().max(2000, "项目描述不能超过 2000 字").nullable().optional(),
    style: z.string().trim().max(120, "风格标识过长").nullable().optional(),
    status: projectStatusSchema.optional(),
    cover_image: z.string().max(2000, "封面地址过长").nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "至少提供一个更新字段",
  });

// GET /api/project/[id] - 获取单个项目详情
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const { id } = parseWithSchema(routeParamsSchema, params, "项目参数错误");
    const project = await prisma.project.findUnique({
      where: { id },
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
    const { id } = parseWithSchema(routeParamsSchema, params, "项目参数错误");
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new ApiError("项目不存在", 404, "NOT_FOUND");
    }

    if (project.user_id !== userId) {
      throw new ApiError("无权限", 403, "FORBIDDEN");
    }

    const body = parseWithSchema(
      updateProjectBodySchema,
      await req.json(),
      "更新项目参数错误"
    );
    const { title, description, style, status, cover_image } = body;

    const updatedProject = await prisma.project.update({
      where: { id },
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

// DELETE /api/project/[id] - 删除项目
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const { id } = parseWithSchema(routeParamsSchema, params, "项目参数错误");
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new ApiError("项目不存在", 404, "NOT_FOUND");
    }

    if (project.user_id !== userId) {
      throw new ApiError("无权限", 403, "FORBIDDEN");
    }

    await deleteProjectWithStory(prisma, id);

    return { success: true, message: "项目已删除" };
  });
}
