/**
 * Story Generated Images API Route
 *
 * GET /api/story/[id]/generated-images - Get all generated images for a story
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/story/[id]/generated-images
 *
 * Get all generated images for a specific story
 * Includes images from all panels and multi-panel compositions under this story's projects
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "无效的token" },
        { status: 401 }
      );
    }

    // Get story ID from params
    const { id: storyId } = await context.params;

    console.log(`[Story Images] === DEBUG START ===`);
    console.log(`[Story Images] Story ID: ${storyId}`);

    // Verify story ownership
    const story = await prisma.story.findFirst({
      where: {
        id: storyId,
        user_id: payload.userId,
      },
      select: { id: true, title: true },
    });

    if (!story) {
      return NextResponse.json(
        { success: false, error: "故事不存在或无权限" },
        { status: 404 }
      );
    }

    console.log(`[Story Images] Story found: ${story.title}`);

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const projectIdParam = searchParams.get("projectId"); // Get projectId from query

    let projectIds: string[] = [];

    // If projectId is provided directly, use it
    if (projectIdParam) {
      console.log(`[Story Images] Using projectId from query param: ${projectIdParam}`);
      projectIds = [projectIdParam];
    } else {
      // WORKAROUND: Since story_id might not be set in projects table,
      // we use the same logic as /api/story/[id]/panels to find the project
      const storyWithProjects = await prisma.story.findUnique({
        where: { id: storyId },
        include: {
          projects: {
            select: { id: true },
            take: 1,
            orderBy: { updated_at: 'desc' }
          }
        }
      });

      console.log(`[Story Images] Projects via Prisma relation:`, storyWithProjects?.projects);

      // Try to get projects via relation first
      if (storyWithProjects?.projects && storyWithProjects.projects.length > 0) {
        projectIds = storyWithProjects.projects.map(p => p.id);
        console.log(`[Story Images] Found projects via relation:`, projectIds);
      } else {
        // Fallback: If relation doesn't work, try to find projects by story_id field
        const projectsByStoryId = await prisma.project.findMany({
          where: {
            story_id: storyId,
          },
          select: { id: true },
        });
        projectIds = projectsByStoryId.map(p => p.id);
        console.log(`[Story Images] Found projects via story_id field:`, projectIds);
      }
    }

    if (projectIds.length === 0) {
      console.log(`[Story Images] No projects found, returning empty`);
      return NextResponse.json({
        success: true,
        data: {
          images: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    // Get all panels from these projects
    const panels = await prisma.panel.findMany({
      where: {
        project_id: { in: projectIds },
        generated_image: { not: null }, // Only get panels with images
      },
      select: {
        id: true,
        generated_image: true,
        prompt_used: true,
        created_at: true,
        panel_order: true,
        description: true,
      },
      orderBy: { created_at: "desc" },
    });
    console.log(`[Story Images] Found ${panels.length} panels with images`);

    // Also get images from generated_images table
    const generatedImages = await prisma.generatedImage.findMany({
      where: {
        user_id: payload.userId,
        source_type: "panel",
        source_id: { in: projectIds },
      },
      orderBy: { created_at: "desc" },
    });
    console.log(`[Story Images] Found ${generatedImages.length} images in generated_images table`);

    // Combine both sources into a unified format
    type UnifiedImage = {
      id: string;
      image_url: string;
      prompt: string;
      style: string | null;
      source_type: string | null;
      source_id: string | null;
      created_at: string;
    };

    const allImages: UnifiedImage[] = [
      // From panels table
      ...panels.map(panel => ({
        id: panel.id,
        image_url: panel.generated_image!,
        prompt: panel.prompt_used || panel.description || "",
        style: null,
        source_type: "panel" as const,
        source_id: panel.id,
        created_at: panel.created_at.toISOString(),
      })),
      // From generated_images table
      ...generatedImages.map(img => ({
        id: img.id,
        image_url: img.image_url,
        prompt: img.prompt,
        style: img.style,
        source_type: img.source_type,
        source_id: img.source_id,
        created_at: img.created_at.toISOString(),
      })),
    ];

    // Sort by created_at desc
    allImages.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = allImages.length;
    console.log(`[Story Images] Total ${total} images combined`);

    // Apply pagination
    const images = allImages.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: {
        images,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/story/[id]/generated-images error:", error);
    return NextResponse.json(
      { success: false, error: "获取图像列表失败" },
      { status: 500 }
    );
  }
}
