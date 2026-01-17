/**
 * 获取章节剧本详情 API
 *
 * GET /api/canvas/chapter/[id]/script
 *
 * 功能:
 * 1. 返回章节的所有剧本分段
 * 2. 按 segment_order 排序
 * 3. 包含章节基本信息
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
    // 1. 验证身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    // 2. 获取参数
    const { id: chapterId } = await params;

    // 3. 查询章节信息
    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        chapter_number: true,
        timeline_id: true,
        script_status: true,
        script_segment_count: true,
      },
    });

    if (!timelineChapter) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      );
    }

    // 4. 查询所有剧本分段
    const segments = await prisma.scriptSegment.findMany({
      where: {
        timeline_chapter_id: chapterId,
      },
      select: {
        id: true,
        segment_order: true,
        content: true,
        scene_description: true,
        character_actions: true,
        dialogue: true,
        emotion_tone: true,
        estimated_duration: true,
        created_at: true,
      },
      orderBy: {
        segment_order: 'asc',
      },
    });

    // 5. 返回数据
    return NextResponse.json({
      chapterId: timelineChapter.id,
      chapterNumber: timelineChapter.chapter_number,
      status: timelineChapter.script_status,
      segments,
      totalCount: segments.length,
    });

  } catch (error) {
    console.error('[API] Get script detail error:', error);
    return NextResponse.json(
      { error: '获取剧本详情失败' },
      { status: 500 }
    );
  }
}
