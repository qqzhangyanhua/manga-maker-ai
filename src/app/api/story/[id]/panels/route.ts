import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/story/[id]/panels
 * Get all panels (shots) for a story
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

        // Verify story access and get associated project(s)
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
            return NextResponse.json({ error: "故事不存在" }, { status: 404 });
        }

        if (story.user_id !== payload.userId) {
            return NextResponse.json({ error: "无权访问" }, { status: 403 });
        }

        // If no project associated, return empty list
        if (!story.projects || story.projects.length === 0) {
            return NextResponse.json({
                success: true,
                panels: [],
            });
        }

        const projectId = story.projects[0].id;

        // Get panels for the project (include chapter info)
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

        return NextResponse.json({
            success: true,
            panels,
            projectId, // Return projectId so frontend knows where to add new panels
        });
    } catch (error) {
        console.error("Get story panels error:", error);
        return NextResponse.json(
            { error: "获取分镜列表失败" },
            { status: 500 }
        );
    }
}
