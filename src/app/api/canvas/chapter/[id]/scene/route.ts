/**
 * 获取章节场景图片详情 API
 *
 * GET /api/canvas/chapter/[id]/scene
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

    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        chapter_number: true,
        scene_status: true,
        scene_image_count: true,
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 });
    }

    // 查询场景图片 (通过 shot_design 关联)
    const scenes = await prisma.sceneImage.findMany({
      where: {
        shot_design: {
          script_segment: {
            timeline_chapter_id: chapterId,
          },
        },
      },
      select: {
        id: true,
        image_url: true,
        generation_prompt: true,
        width: true,
        height: true,
        status: true,
        location_key: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // 转换字段名以匹配前端期望
    const formattedScenes = scenes.map(scene => ({
      id: scene.id,
      image_url: scene.image_url,
      prompt: scene.generation_prompt, // 前端期望 prompt 而非 generation_prompt
      width: scene.width,
      height: scene.height,
      status: scene.status,
      location_key: scene.location_key,
      created_at: scene.created_at,
    }));

    return NextResponse.json({
      chapterId: timelineChapter.id,
      chapterNumber: timelineChapter.chapter_number,
      status: timelineChapter.scene_status,
      scenes: formattedScenes,
      totalCount: formattedScenes.length,
    });

  } catch (error) {
    console.error('[API] Get scene detail error:', error);
    return NextResponse.json({ error: '获取场景详情失败' }, { status: 500 });
  }
}
