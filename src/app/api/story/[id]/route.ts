import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, withAuth } from "@/lib/api-helpers";

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
                },
                story_characters: {
                    include: {
                        character: true
                    },
                    orderBy: { display_order: 'asc' }
                }
            }
        });

        if (!story) {
            throw new ApiError("故事不存在", 404, "NOT_FOUND");
        }

        if (story.user_id !== userId) {
            throw new ApiError("无权访问", 403, "FORBIDDEN");
        }

        // Extract projectId if exists
        const projectId = story.projects && story.projects.length > 0
            ? story.projects[0].id
            : null;

        // Query source novel if story is an adaptation
        let sourceNovel = null;
        if (story.source_novel_id) {
            const novel = await prisma.novelProject.findUnique({
                where: { id: story.source_novel_id },
                select: {
                    id: true,
                    title: true,
                    user_id: true,
                    created_at: true,
                }
            });

            // Only return novel info if it exists and belongs to the same user
            if (novel && novel.user_id === userId) {
                sourceNovel = {
                    id: novel.id,
                    title: novel.title,
                    created_at: novel.created_at,
                };
            }
        }

        // Remove projects and story_characters from story object, but keep comic_style and chapters
        const { projects, chapters, story_characters, ...storyData } = story;

        // Transform story_characters to flat character list with role info
        const characters = story_characters?.map(sc => ({
            ...sc.character,
            role: sc.role,
            character_arc: sc.character_arc,
            display_order: sc.display_order
        })) || [];

        return {
            story: storyData,
            projectId,
            chapters: chapters || [],
            characters,
            sourceNovel,
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
            throw new ApiError("故事不存在", 404, "NOT_FOUND");
        }

        if (story.user_id !== userId) {
            throw new ApiError("无权修改", 403, "FORBIDDEN");
        }

        // Update story
        const body = await req.json();
        const { title, premise, genre, outline, status, comic_style_id, style_reference_image } = body;

        const updated = await prisma.story.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(premise && { premise }),
                ...(genre && { genre }),
                ...(outline && { outline }),
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
            throw new ApiError("故事不存在", 404, "NOT_FOUND");
        }

        if (story.user_id !== userId) {
            throw new ApiError("无权删除", 403, "FORBIDDEN");
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
