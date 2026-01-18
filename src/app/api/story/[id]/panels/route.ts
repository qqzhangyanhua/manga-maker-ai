import { prisma } from "@/lib/db";
import { ApiError, withAuth } from "@/lib/api-helpers";

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
            include: {
                projects: {
                    select: { id: true },
                    take: 1,
                    orderBy: { updated_at: 'desc' }
                }
            }
        });

        if (!story) {
            throw new ApiError("故事不存在", 404, "NOT_FOUND");
        }

        if (story.user_id !== userId) {
            throw new ApiError("无权访问", 403, "FORBIDDEN");
        }

        if (!story.projects || story.projects.length === 0) {
            return {
                panels: [],
            };
        }

        const projectId = story.projects[0].id;

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
