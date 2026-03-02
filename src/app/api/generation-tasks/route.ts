/**
 * Generation Tasks API
 *
 * GET  /api/generation-tasks - Get user's generation tasks
 * POST /api/generation-tasks - Create batch generation task
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { Prisma, prisma } from "@/lib/db";
import { enqueueBatchImageGeneration } from "@/lib/queue";
import type { SuccessResponse, BatchGenerateInput, BatchGenerateResponse } from "@/types/template";

/**
 * GET /api/generation-tasks
 *
 * Get user's generation tasks with pagination
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - status: string (optional filter)
 * - projectId: string (optional filter)
 */
export async function GET(req: NextRequest) {
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    // Build where clause
    const where: Prisma.GenerationTaskWhereInput = {
      user_id: payload.userId
    };

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.project_id = projectId;
    }

    // Count total results
    const total = await prisma.generationTask.count({ where });

    // Query tasks with pagination
    const tasks = await prisma.generationTask.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });

    const response: SuccessResponse<{
      tasks: typeof tasks;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }> = {
      success: true,
      data: {
        tasks,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/generation-tasks error:", error);
    return NextResponse.json(
      { success: false, error: "获取任务列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/generation-tasks
 *
 * Create a new batch generation task
 *
 * Body:
 * - projectId: string (required)
 * - panelIds: string[] (required, 1-50 panels)
 * - settings: GenerationSettings (required)
 *   - style?: string
 *   - quality?: "standard" | "high"
 *   - failureMode?: "skip" | "stop"
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body: BatchGenerateInput = await req.json();
    const { projectId, panelIds, settings } = body;

    // Validate input
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { success: false, error: "项目ID不能为空" },
        { status: 400 }
      );
    }

    if (!Array.isArray(panelIds) || panelIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "请选择至少一个分镜" },
        { status: 400 }
      );
    }

    if (panelIds.length > 50) {
      return NextResponse.json(
        { success: false, error: "单次批量生成最多50个分镜" },
        { status: 400 }
      );
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { success: false, error: "生成设置不能为空" },
        { status: 400 }
      );
    }

    // Validate quality
    if (settings.quality && !["standard", "high"].includes(settings.quality)) {
      return NextResponse.json(
        { success: false, error: "质量参数必须是 standard 或 high" },
        { status: 400 }
      );
    }

    // Validate failure mode
    if (settings.failureMode && !["skip", "stop"].includes(settings.failureMode)) {
      return NextResponse.json(
        { success: false, error: "失败模式必须是 skip 或 stop" },
        { status: 400 }
      );
    }

    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, user_id: true }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权操作此项目" },
        { status: 403 }
      );
    }

    // Verify panels exist and belong to project
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panelIds },
        project_id: projectId
      },
      select: { id: true, description: true }
    });

    if (panels.length !== panelIds.length) {
      return NextResponse.json(
        { success: false, error: "部分分镜不存在" },
        { status: 404 }
      );
    }

    // Create generation task
    const task = await prisma.generationTask.create({
      data: {
        user_id: payload.userId,
        project_id: projectId,
        panel_ids: panelIds,
        task_type: "batch",
        status: "pending",
        progress: 0,
        current_panel_index: 0,
        settings: settings as Prisma.InputJsonValue,
        error_logs: undefined
      }
    });

    // 将图像生成任务加入 BullMQ 队列，由后台 Worker 处理
    const panelsData = panels.map((p) => ({
      id: p.id,
      prompt: p.description || ""
    }));

    await enqueueBatchImageGeneration(
      task.id,
      panelsData,
      payload.userId,
      projectId,
      settings.style,
      settings.quality
    );

    // Estimate time (rough calculation: 10 seconds per panel)
    const estimatedTime = panelIds.length * 10;

    const response: SuccessResponse<BatchGenerateResponse> = {
      success: true,
      data: {
        taskId: task.id,
        panelCount: panelIds.length,
        estimatedTime
      },
      message: "批量生成任务已创建"
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/generation-tasks error:", error);
    return NextResponse.json(
      { success: false, error: "创建生成任务失败" },
      { status: 500 }
    );
  }
}
