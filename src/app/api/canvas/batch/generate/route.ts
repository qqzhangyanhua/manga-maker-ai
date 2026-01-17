import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 验证身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();
    const { chapterIds, stage } = body as {
      chapterIds: string[];
      stage: 'script' | 'shot' | 'scene' | 'final';
    };

    if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
      return NextResponse.json({ error: '章节ID列表不能为空' }, { status: 400 });
    }

    if (!['script', 'shot', 'scene', 'final'].includes(stage)) {
      return NextResponse.json({ error: '无效的生成阶段' }, { status: 400 });
    }

    // 验证所有章节是否存在
    const chapters = await prisma.timelineChapter.findMany({
      where: {
        id: { in: chapterIds },
      },
      select: {
        id: true,
        chapter_number: true,
        timeline_id: true,
        script_status: true,
        shot_status: true,
        scene_status: true,
        final_status: true,
      },
    });

    if (chapters.length !== chapterIds.length) {
      return NextResponse.json({ error: '部分章节不存在' }, { status: 404 });
    }

    // 检查所有章节是否属于同一时间轴
    const timelineIds = new Set(chapters.map(ch => ch.timeline_id));
    if (timelineIds.size > 1) {
      return NextResponse.json(
        { error: '不能批量操作不同时间轴的章节' },
        { status: 400 }
      );
    }

    // 批量更新状态为 generating
    const statusField = `${stage}_status` as 'script_status' | 'shot_status' | 'scene_status' | 'final_status';

    await prisma.timelineChapter.updateMany({
      where: {
        id: { in: chapterIds },
      },
      data: {
        [statusField]: 'generating',
      },
    });

    // 依次调用各个章节的生成 API (并发执行)
    const apiEndpoints: Record<typeof stage, string> = {
      script: 'generate-script',
      shot: 'generate-shots',
      scene: 'generate-scenes',
      final: 'generate-finals',
    };

    const endpoint = apiEndpoints[stage];
    const results = await Promise.allSettled(
      chapterIds.map(async (chapterId) => {
        const response = await fetch(
          `${request.nextUrl.origin}/api/canvas/chapter/${chapterId}/${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Cookie': `${AUTH_COOKIE_NAME}=${token}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '生成失败');
        }

        return response.json();
      })
    );

    // 统计结果
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // 收集错误信息
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, index) => ({
        chapterId: chapterIds[index],
        error: r.reason.message,
      }));

    return NextResponse.json({
      success: true,
      total: chapterIds.length,
      succeeded,
      failed,
      errors: failed > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Batch Generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量生成失败' },
      { status: 500 }
    );
  }
}
