/**
 * Novel Project World Setting API
 * GET /api/novel/projects/[id]/world-setting - 获取世界观设定
 * PUT /api/novel/projects/[id]/world-setting - 更新世界观设定
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Request received", {
      endpoint: "/api/novel/projects/[id]/world-setting",
      method: "GET",
      projectId,
    });

    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    userId = payload.userId;

    // 查询项目世界观
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        world_setting: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证权限
    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    logInfo("World setting fetched successfully", {
      endpoint: "/api/novel/projects/[id]/world-setting",
      userId,
      projectId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      world_setting: project.world_setting || {
        locations: [],
        factions: [],
        rules: [],
        timeline: [],
      },
    });
  } catch (error) {
    logError("Failed to fetch world setting", error, {
      endpoint: "/api/novel/projects/[id]/world-setting",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "获取世界观失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Request received", {
      endpoint: "/api/novel/projects/[id]/world-setting",
      method: "PUT",
      projectId,
    });

    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    userId = payload.userId;

    // 验证项目归属
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: { user_id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权修改此项目" }, { status: 403 });
    }

    // 解析请求体
    const body = await req.json();
    const { world_setting } = body;

    if (!world_setting || typeof world_setting !== "object") {
      return NextResponse.json({ error: "world_setting 格式错误" }, { status: 400 });
    }

    // 验证必需字段
    const requiredFields = ["locations", "factions", "rules", "timeline"];
    for (const field of requiredFields) {
      if (!Array.isArray(world_setting[field])) {
        return NextResponse.json(
          { error: `world_setting.${field} 必须是数组` },
          { status: 400 }
        );
      }
    }

    logInfo("Updating world setting", {
      endpoint: "/api/novel/projects/[id]/world-setting",
      userId,
      projectId,
    });

    // 更新世界观
    const updatedProject = await prisma.novelProject.update({
      where: { id: projectId },
      data: {
        world_setting,
        updated_at: new Date(),
      },
      select: {
        id: true,
        world_setting: true,
        updated_at: true,
      },
    });

    logInfo("World setting updated successfully", {
      endpoint: "/api/novel/projects/[id]/world-setting",
      userId,
      projectId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    logError("Failed to update world setting", error, {
      endpoint: "/api/novel/projects/[id]/world-setting",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "更新世界观失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
