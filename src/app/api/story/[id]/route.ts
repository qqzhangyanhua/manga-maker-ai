import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

/**
 * GET /api/story/[id]
 * Get story details
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    return withAuth(async ({ userId }) => {
        const { id } = params;

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
                },
                chapters: {
                    select: {
                        id: true,
                        title: true,
                        summary: true,
                        chapter_order: true,
                        publish_status: true,
                        published_at: true,
                        created_at: true,
                    },
                    orderBy: { chapter_order: 'asc' }
                }
            }
        });

        if (!story) {
            throw new Error("故事不存在");
        }

        if (story.user_id !== userId) {
            const error = new Error("无权访问") as any;
            error.status = 403;
            throw error;
        }

        // Extract projectId if exists
        const projectId = story.projects && story.projects.length > 0
            ? story.projects[0].id
            : null;

        // Remove projects from story object but keep comic_style and chapters
        const { projects, chapters, ...storyData } = story;

        return {
            story: storyData,
            projectId,
            chapters: chapters || [],
        };
    });
}

/**
 * PATCH /api/story/[id]
 * Update story
 */
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    return withAuth(async ({ userId }) => {
        const { id } = params;

        // Get story
        const story = await prisma.story.findUnique({
            where: { id },
        });

        if (!story) {
            throw new Error("故事不存在");
        }

        if (story.user_id !== userId) {
            const error = new Error("无权修改") as any;
            error.status = 403;
            throw error;
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

        return {
            story: updated,
            message: "故事更新成功",
        };
    });
}

/**
 * DELETE /api/story/[id]
 * Delete story
 */
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    return withAuth(async ({ userId }) => {
        const { id } = params;

        // Get story
        const story = await prisma.story.findUnique({
            where: { id },
        });

        if (!story) {
            throw new Error("故事不存在");
        }

        if (story.user_id !== userId) {
            const error = new Error("无权删除") as any;
            error.status = 403;
            throw error;
        }

        // Delete story
        await prisma.story.delete({
            where: { id },
        });

        return {
            message: "故事删除成功",
        };
    });
}
