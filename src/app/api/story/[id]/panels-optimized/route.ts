/**
 * 优化版的分镜列表 API
 * 支持分页、按章节过滤、性能优化
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  withAuth,
  ApiError,
  parsePaginationParams,
  createPaginatedResponse,
} from "@/lib/api-helpers";
import { findStoryProject } from "@/lib/project";

/**
 * GET /api/story/[id]/panels-optimized
 * 
 * Query Parameters:
 * - page: 页码（默认 1）
 * - pageSize: 每页数量（默认 20，最大 100）
 * - chapter_id: 章节ID（可选，过滤特定章节）
 * 
 * Response:
 * {
 *   data: Panel[],
 *   pagination: { page, pageSize, total, totalPages, hasNext, hasPrev },
 *   projectId: string | null
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const { id: storyId } = params;
    const { searchParams } = new URL(req.url);

    // 解析分页参数
    const pagination = parsePaginationParams(searchParams, 20, 100);

    // 可选的章节过滤
    const chapterId = searchParams.get('chapter_id');

    // 验证故事所有权并获取项目 ID
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, user_id: true },
    });

    if (!story) {
      throw new ApiError('故事不存在', 404);
    }

    if (story.user_id !== userId) {
      throw new ApiError('无权访问', 403);
    }

    const project = await findStoryProject(prisma, story.id);

    // 如果没有关联项目，返回空列表
    if (!project) {
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize: pagination.pageSize,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        projectId: null,
      };
    }

    const projectId = project.id;

    // 构建查询条件
    const where = {
      project_id: projectId,
      ...(chapterId && { chapter_id: chapterId }),
    };

    // 并行查询数据和总数
    const [panels, total] = await Promise.all([
      prisma.panel.findMany({
        where,
        orderBy: { panel_order: 'asc' },
        skip: pagination.skip,
        take: pagination.take,
        // 只加载必要字段，减少数据传输
        select: {
          id: true,
          project_id: true,
          chapter_id: true,
          panel_order: true,
          panel_type: true,
          importance: true,
          description: true,
          visual_prompt: true,
          prompt_used: true,
          dialogue: true,
          character_name: true,
          emotion: true,
          camera_angle: true,
          shot_size: true,
          generated_image: true,
          character_id: true,
          expression_type: true,
          outfit_id: true,
          scene_id: true,
          created_at: true,
          // 关联章节信息
          chapter: {
            select: {
              id: true,
              title: true,
              chapter_order: true,
            },
          },
        },
      }),
      prisma.panel.count({ where }),
    ]);

    // 返回分页数据
    return {
      ...createPaginatedResponse(panels, total, pagination),
      projectId,
    };
  });
}

