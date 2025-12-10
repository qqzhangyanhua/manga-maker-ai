import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/story
 * List all stories for the current user
 */
export async function GET(req: Request) {
    try {
        // Verify authentication
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
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status"); // optional filter by status

        const skip = (page - 1) * limit;

        const whereCondition: any = {
            user_id: payload.userId,
        };

        if (status) {
            whereCondition.status = status;
        }

        // Get total count
        const total = await prisma.story.count({
            where: whereCondition,
        });

        // Get stories
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
                // Don't fetch full JSON blobs for list view potentially
            },
        });

        return NextResponse.json({
            success: true,
            stories,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("List stories error:", error);
        return NextResponse.json(
            { error: "获取剧本列表失败" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/story
 * Create a new story (for manual save from draft mode)
 */
export async function POST(req: Request) {
    try {
        // Verify authentication
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
        const {
            title,
            premise,
            genre,
            outline,
            characters,
            status = "draft",
        } = body;

        if (!title || !premise) {
            return NextResponse.json(
                { error: "缺少必填字段：title, premise" },
                { status: 400 }
            );
        }

        // Create story
        const story = await prisma.story.create({
            data: {
                user_id: payload.userId,
                title,
                premise,
                genre: genre || "suspense",
                outline: outline || {},
                characters: characters || [],
                status,
            },
        });

        return NextResponse.json({
            success: true,
            story,
            message: "故事保存成功",
        });
    } catch (error) {
        console.error("Create story error:", error);
        return NextResponse.json(
            { error: "保存故事失败" },
            { status: 500 }
        );
    }
}
