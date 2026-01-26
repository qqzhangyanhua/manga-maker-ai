/**
 * 获取章节镜头详情 API
 *
 * GET /api/canvas/chapter/[id]/shot
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const { id: chapterId } = await params;

    // 查询章节信息（包含时间线和项目 ID）
    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        chapter_number: true,
        shot_status: true,
        shot_count: true,
        timeline_id: true,
        timeline: {
          select: {
            novel_project_id: true,
          },
        },
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 });
    }

    // 查询所有镜头 (通过 script_segments 关联)
    const shots = await prisma.shotDesign.findMany({
      where: {
        script_segment: {
          timeline_chapter_id: chapterId,
        },
      },
      select: {
        id: true,
        shot_order: true,
        camera_angle: true,
        shot_size: true,
        panel_type: true,
        shot_description: true,
        composition_hint: true,
        prompt: true,
        generated_image_url: true,
        generation_status: true,
        created_at: true,
        // 新增：角色身份证相关字段
        character_prompt_template_ids: true,
        prompt_composition_id: true,
        character_prompt_status: true,
        final_prompt_status: true,
        nine_grid_status: true,
        selection_status: true,
      },
      orderBy: {
        shot_order: 'asc',
      },
    });

    return NextResponse.json({
      chapterId: timelineChapter.id,
      chapterNumber: timelineChapter.chapter_number,
      timelineId: timelineChapter.timeline_id,
      novelProjectId: timelineChapter.timeline?.novel_project_id || null,
      status: timelineChapter.shot_status,
      shots,
      totalCount: shots.length,
    });

  } catch (error) {
    console.error('[API] Get shot detail error:', error);
    return NextResponse.json({ error: '获取镜头详情失败' }, { status: 500 });
  }
}
