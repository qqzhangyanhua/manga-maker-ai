import { Prisma, prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";
import { ensureStoryProject } from "@/lib/project";

export const dynamic = "force-dynamic";

/**
 * GET /api/story
 * List all stories for the current user
 */
export async function GET(req: Request) {
    return withAuth(async ({ userId }) => {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status");

        const skip = (page - 1) * limit;

        const whereCondition: Prisma.StoryWhereInput = {
            user_id: userId,
        };

        if (status) {
            whereCondition.status = status;
        }

        const total = await prisma.story.count({
            where: whereCondition,
        });

        const storiesRaw = await prisma.story.findMany({
            where: whereCondition,
            orderBy: {
                created_at: "desc",
            },
            skip,
            take: limit,
            include: {
                chapters: {
                    include: {
                        _count: { select: { panels: true } },
                    },
                },
            },
        });

        const stories = storiesRaw.map(({ chapters, ...rest }) => ({
            id: rest.id,
            title: rest.title,
            genre: rest.genre,
            premise: rest.premise,
            status: rest.status,
            created_at: rest.created_at,
            updated_at: rest.updated_at,
            _count: {
                panels: chapters.reduce(
                    (acc, ch) => acc + ch._count.panels,
                    0
                ),
            },
        }));

        return {
            stories,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    });
}

/**
 * POST /api/story
 * Create a new story (for manual save from draft mode)
 */
export async function POST(req: Request) {
    return withAuth(async ({ userId }) => {
        const body = await req.json();
        const {
            title,
            premise,
            genre,
            outline,
            // characters, // REMOVED: Use story_characters relation instead
            status = "draft",
        } = body;

        if (!title) {
            const error = new Error("缺少必填字段：title") as Error & { status?: number };
            error.status = 400;
            throw error;
        }

        const { story, project } = await prisma.$transaction(async (tx) => {
            const story = await tx.story.create({
                data: {
                    user_id: userId,
                    title,
                    premise,
                    genre: genre || "suspense",
                    outline: outline || {},
                    status,
                },
            });
            return { story, project: await ensureStoryProject(tx, story.id) };
        });

        return {
            story,
            projectId: project.id,
            message: "故事保存成功",
        };
    });
}
