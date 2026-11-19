/**
 * 获取章节镜头详情 API
 *
 * GET /api/canvas/chapter/[id]/shot
 *
 * 镜头即项目分镜；时间线未归属漫画项目时返回 409
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getAnchoredCanvasChapter, listChapterShots } from '@/lib/canvas';
import { canvasErrorResponse } from '@/lib/canvas/route-error';

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

    const chapter = await getAnchoredCanvasChapter(prisma, chapterId, payload.userId);
    const [timelineChapter, shots] = await Promise.all([
      prisma.timelineChapter.findUniqueOrThrow({
        where: { id: chapterId },
        select: { id: true, chapter_number: true, shot_status: true, timeline_id: true },
      }),
      listChapterShots(prisma, chapterId),
    ]);

    return NextResponse.json({
      chapterId: timelineChapter.id,
      chapterNumber: timelineChapter.chapter_number,
      timelineId: timelineChapter.timeline_id,
      novelProjectId: chapter.novelProjectId,
      projectId: chapter.projectId,
      status: timelineChapter.shot_status,
      shots,
      totalCount: shots.length,
    });

  } catch (error) {
    return canvasErrorResponse(error, '获取镜头详情失败');
  }
}
