import { prisma } from "@/lib/db";
import { z } from "zod";
import { ApiError, parseWithSchema, withAuth } from "@/lib/api-helpers";
import { deleteProjectWithStory, ensureStoryProject, findStoryProject } from "@/lib/project";

const projectStatusSchema = z.enum(["draft", "in_progress", "completed", "archived"]);

const createProjectBodySchema = z.object({
  title: z.string().trim().min(1, "项目标题不能为空").max(200, "项目标题不能超过 200 字"),
  description: z.string().trim().max(2000, "项目描述不能超过 2000 字").optional().nullable(),
  style: z.string().trim().max(120, "风格标识过长").optional().nullable(),
  story_id: z.string().uuid("story_id 格式无效").optional().nullable(),
  status: projectStatusSchema.optional(),
  cover_image: z.string().max(2000, "封面地址过长").optional().nullable(),
});

const deleteProjectQuerySchema = z.object({
  id: z.string().uuid("项目 ID 格式无效"),
});

// GET /api/project - 获取用户的所有项目
export async function GET() {
  return withAuth(async ({ userId }) => {
    const projects = await prisma.project.findMany({
      where: { user_id: userId },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return { projects };
  });
}

// POST /api/project - 创建新项目
export async function POST(req: Request) {
  return withAuth(async ({ userId }) => {
    const body = parseWithSchema(
      createProjectBodySchema,
      await req.json(),
      "创建项目参数错误"
    );
    const { title, description, style, story_id, status, cover_image } = body;

    const fields = {
      title: title.trim(),
      description: description?.trim() || null,
      style: style || null,
      status: status || "draft",
      cover_image: cover_image || null,
    };

    if (story_id) {
      const story = await prisma.story.findUnique({
        where: { id: story_id },
      });

      if (!story) {
        throw new ApiError("关联的故事不存在", 404, "NOT_FOUND");
      }

      if (story.user_id !== userId) {
        throw new ApiError("无权关联该故事", 403, "FORBIDDEN");
      }

      // 一个故事只有一个项目，已存在时直接返回，调用方据此继续创作
      const existing = await findStoryProject(prisma, story_id);
      if (existing) {
        return { project: existing, message: "该故事已有项目" };
      }

      const created = await ensureStoryProject(prisma, story_id);
      const project = await prisma.project.update({
        where: { id: created.id },
        data: { ...fields, updated_at: new Date() },
      });
      return { project, message: "项目创建成功" };
    }

    const project = await prisma.project.create({
      data: { ...fields, user_id: userId, story_id: null },
    });

    return {
      project,
      message: "项目创建成功",
    };
  });
}

// DELETE /api/project?id=xxx - 删除项目
export async function DELETE(req: Request) {
  return withAuth(async ({ userId }) => {
    const { searchParams } = new URL(req.url);
    const { id: projectId } = parseWithSchema(
      deleteProjectQuerySchema,
      { id: searchParams.get("id") },
      "删除项目参数错误"
    );

    // 验证项目属于当前用户
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new ApiError("项目不存在", 404, "NOT_FOUND");
    }

    if (project.user_id !== userId) {
      throw new ApiError("项目不存在或无权限", 403, "FORBIDDEN");
    }

    // 删除项目（章节、分镜级联删除）；故事主项目连同故事一起删除
    await deleteProjectWithStory(prisma, projectId);

    return { message: "项目已删除" };
  });
}
