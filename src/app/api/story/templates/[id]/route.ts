import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/story/templates/[id]
 * Get a specific template
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const template = await prisma.storyTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            return NextResponse.json({ error: "模板不存在" }, { status: 404 });
        }

        // Increment usage count
        await prisma.storyTemplate.update({
            where: { id },
            data: { usage_count: { increment: 1 } },
        });

        return NextResponse.json({
            success: true,
            template,
        });
    } catch (error) {
        console.error("Get template error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * PATCH /api/story/templates/[id]
 * Update a template (only owner can update)
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

        const template = await prisma.storyTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            return NextResponse.json({ error: "模板不存在" }, { status: 404 });
        }

        if (template.user_id !== payload.userId) {
            return NextResponse.json({ error: "无权修改此模板" }, { status: 403 });
        }

        const body = await req.json();
        const { name, category, description, structure, prompts, isPublic } = body;

        const updated = await prisma.storyTemplate.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(category && { category }),
                ...(description !== undefined && { description }),
                ...(structure && { structure }),
                ...(prompts && { prompts }),
                ...(isPublic !== undefined && { is_public: isPublic }),
                updated_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            template: updated,
            message: "模板更新成功",
        });
    } catch (error) {
        console.error("Update template error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/story/templates/[id]
 * Delete a template (only owner can delete)
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

        const template = await prisma.storyTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            return NextResponse.json({ error: "模板不存在" }, { status: 404 });
        }

        if (template.user_id !== payload.userId) {
            return NextResponse.json({ error: "无权删除此模板" }, { status: 403 });
        }

        await prisma.storyTemplate.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "模板删除成功",
        });
    } catch (error) {
        console.error("Delete template error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
