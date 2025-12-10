import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/panel
 * Create a new panel (shot)
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
            project_id,
            description,
            panel_type = "medium",
            importance = "medium",
            camera_angle,
            shot_size,
            dialogue,
            character_name,
            emotion,
            panel_order, // optional, if not provided will append
        } = body;

        if (!project_id) {
            return NextResponse.json({ error: "缺少项目ID" }, { status: 400 });
        }

        // Verify project ownership
        const project = await prisma.project.findUnique({
            where: { id: project_id },
        });

        if (!project) {
            return NextResponse.json({ error: "项目不存在" }, { status: 404 });
        }

        if (project.user_id !== payload.userId) {
            return NextResponse.json({ error: "无权操作" }, { status: 403 });
        }

        // Determine order
        let newOrder = panel_order;
        if (newOrder === undefined) {
            const lastPanel = await prisma.panel.findFirst({
                where: { project_id },
                orderBy: { panel_order: 'desc' },
            });
            newOrder = (lastPanel?.panel_order ?? 0) + 1;
        } else {
            // Shift existing panels if inserting
            await prisma.panel.updateMany({
                where: {
                    project_id,
                    panel_order: { gte: newOrder }
                },
                data: {
                    panel_order: { increment: 1 }
                }
            });
        }

        // Create panel
        const panel = await prisma.panel.create({
            data: {
                project_id,
                panel_order: newOrder,
                description: description || "",
                panel_type,
                importance,
                camera_angle,
                shot_size,
                dialogue,
                character_name,
                emotion,
            },
        });

        return NextResponse.json({
            success: true,
            panel,
            message: "分镜创建成功",
        });
    } catch (error) {
        console.error("Create panel error:", error);
        return NextResponse.json(
            { error: "创建分镜失败" },
            { status: 500 }
        );
    }
}
