import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { getTaskStatus } from '@/lib/unified-image-generation';

/**
 * GET /api/image/task-status?task_id=xxx
 * 查询图片生成任务状态
 */
export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const payload = verifyAuthToken(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: '无效的token' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get('task_id');

        if (!taskId) {
            return NextResponse.json({ error: '缺少 task_id' }, { status: 400 });
        }

        const status = await getTaskStatus(taskId);

        return NextResponse.json({
            success: true,
            ...status,
        });
    } catch (error) {
        console.error('Get task status error:', error);
        return NextResponse.json(
            { error: '查询任务状态失败' },
            { status: 500 }
        );
    }
}
