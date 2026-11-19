/**
 * 获取章节最终漫画详情 API
 *
 * GET /api/canvas/chapter/[id]/final
 *
 * 最终漫画是画布镜头（项目分镜）上的 canvas_final 候选图；时间线未归属漫画项目时返回 409
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getAnchoredCanvasChapter, listChapterFinals } from '@/lib/canvas';
import { canvasErrorResponse } from '@/lib/canvas/route-error';

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

    await getAnchoredCanvasChapter(prisma, chapterId, payload.userId);
    const [timelineChapter, panels] = await Promise.all([
      prisma.timelineChapter.findUniqueOrThrow({
        where: { id: chapterId },
        select: { id: true, chapter_number: true, final_status: true },
      }),
      listChapterFinals(prisma, chapterId),
    ]);

    return NextResponse.json({
      chapterId: timelineChapter.id,
      chapterNumber: timelineChapter.chapter_number,
      status: timelineChapter.final_status,
      panels,
      totalCount: panels.length,
    });

  } catch (error) {
    return canvasErrorResponse(error, '获取漫画详情失败');
  }
}
