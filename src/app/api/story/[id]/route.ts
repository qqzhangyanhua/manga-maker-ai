import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/story/[id]
 * Get story details
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

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

        // Get story
        const story = await prisma.story.findUnique({
            where: { id },
            include: {
                projects: {
                    select: { id: true },
                    take: 1,
                    orderBy: { updated_at: 'desc' }
                },
                comic_style: {
                    select: {
                        id: true,
                        style_key: true,
                        name_zh: true,
                        name_en: true,
                        prompt_prefix: true,
                    }
                }
            }
        });

        if (!story) {
            return NextResponse.json({ error: "故事不存在" }, { status: 404 });
        }

        if (story.user_id !== payload.userId) {
            return NextResponse.json({ error: "无权访问" }, { status: 403 });
        }

        // Extract projectId if exists
        const projectId = story.projects && story.projects.length > 0
            ? story.projects[0].id
            : null;

        // Remove projects from story object but keep comic_style
        const { projects, ...storyData } = story;

        return NextResponse.json({
            success: true,
            story: storyData,
            projectId,
        });
    } catch (error) {
        console.error("Get story error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * PATCH /api/story/[id]
 * Update story
 */
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

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

        // Get story
        const story = await prisma.story.findUnique({
            where: { id },
        });

        if (!story) {
            return NextResponse.json({ error: "故事不存在" }, { status: 404 });
        }

        if (story.user_id !== payload.userId) {
            return NextResponse.json({ error: "无权修改" }, { status: 403 });
        }

        // Update story
        const body = await req.json();
        const { title, premise, genre, outline, characters, status, comic_style_id, style_reference_image } = body;

        const updated = await prisma.story.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(premise && { premise }),
                ...(genre && { genre }),
                ...(outline && { outline }),
                ...(characters !== undefined && { characters }),
                ...(status && { status }),
                ...(comic_style_id !== undefined && { comic_style_id }),
                ...(style_reference_image !== undefined && { style_reference_image }),
                updated_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            story: updated,
            message: "故事更新成功",
        });
    } catch (error) {
        console.error("Update story error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/story/[id]
 * Delete story
 */
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

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

        // Get story
        const story = await prisma.story.findUnique({
            where: { id },
        });

        if (!story) {
            return NextResponse.json({ error: "故事不存在" }, { status: 404 });
        }

        if (story.user_id !== payload.userId) {
            return NextResponse.json({ error: "无权删除" }, { status: 403 });
        }

        // Delete story
        await prisma.story.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "故事删除成功",
        });
    } catch (error) {
        console.error("Delete story error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
