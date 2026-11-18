import { prisma } from "@/lib/db";
import { ApiError, withAuth } from "@/lib/api-helpers";
import { findStoryProject } from "@/lib/project";

/**
 * GET /api/story/[id]/panels
 * Get all panels (shots) for a story
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    return withAuth(async ({ userId }) => {
        const { id } = params;

        const story = await prisma.story.findUnique({
            where: { id },
            select: { id: true, user_id: true },
        });

        if (!story) {
            throw new ApiError("故事不存在", 404, "NOT_FOUND");
        }

        if (story.user_id !== userId) {
            throw new ApiError("无权访问", 403, "FORBIDDEN");
        }

        const project = await findStoryProject(prisma, story.id);
        if (!project) {
            return {
                panels: [],
            };
        }

        const projectId = project.id;

        const panels = await prisma.panel.findMany({
            where: { project_id: projectId },
            orderBy: { panel_order: 'asc' },
            include: {
                chapter: {
                    select: {
                        id: true,
                        title: true,
                        chapter_order: true,
                    },
                },
            },
        });

        return {
            panels,
            projectId,
        };
    });
}
