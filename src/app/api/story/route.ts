import { Prisma, prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

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

        const stories = await prisma.story.findMany({
            where: whereCondition,
            orderBy: {
                created_at: "desc",
            },
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                genre: true,
                premise: true,
                status: true,
                created_at: true,
                updated_at: true,
            },
        });

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

        const story = await prisma.story.create({
            data: {
                user_id: userId,
                title,
                premise,
                genre: genre || "suspense",
                outline: outline || {},
                // characters: characters || [], // REMOVED
                status,
            },
        });

        return {
            story,
            message: "故事保存成功",
        };
    });
}
