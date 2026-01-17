/**
 * 获取章节最终漫画详情 API
 *
 * GET /api/canvas/chapter/[id]/final
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
        final_status: true,
        final_image_count: true,
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 });
    }

    // 查询最终漫画 (通过 shot_design 关联)
    const panels = await prisma.comicPanelResult.findMany({
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
        width: true,
        height: true,
        status: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return NextResponse.json({
      chapterId: timelineChapter.id,
      chapterNumber: timelineChapter.chapter_number,
      status: timelineChapter.final_status,
      panels,
      totalCount: panels.length,
    });

  } catch (error) {
    console.error('[API] Get final detail error:', error);
    return NextResponse.json({ error: '获取漫画详情失败' }, { status: 500 });
  }
}
