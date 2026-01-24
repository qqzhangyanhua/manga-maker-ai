/**
 * Novel Project World Setting API
 * GET /api/novel/projects/{id}/world-setting - 获取世界观设定
 * PUT /api/novel/projects/{id}/world-setting - 更新世界观设定
 *
 * 职责单一：仅处理 world_setting 数据
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface WorldSetting {
  worldName?: string;
  background?: string;
  era?: string;
  geography?: string;
  magicSystem?: string;
  technology?: string;
  society?: string;
  factions?: Array<{
    name: string;
    description: string;
  }>;
  rules?: string[];
  [key: string]: unknown;
}

interface WorldSettingResponse {
  world_setting: WorldSetting;
  _links: {
    self: string;
    project: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("World setting request received", {
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

    // 查询项目的 world_setting 字段
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

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    const worldSetting = (project.world_setting as WorldSetting) || {};

    const response: WorldSettingResponse = {
      world_setting: worldSetting,
      _links: {
        self: `/api/novel/projects/${projectId}/world-setting`,
        project: `/api/novel/projects/${projectId}`,
      },
    };

    logInfo("World setting fetched successfully", {
      endpoint: "/api/novel/projects/[id]/world-setting",
      userId,
      projectId,
      hasWorldSetting: Object.keys(worldSetting).length > 0,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
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

    logInfo("Update world setting request", {
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

    if (typeof world_setting !== 'object' || world_setting === null) {
      return NextResponse.json({ error: "world_setting 必须是对象" }, { status: 400 });
    }

    // 更新 world_setting
    const updatedProject = await prisma.novelProject.update({
      where: { id: projectId },
      data: {
        world_setting,
        updated_at: new Date(),
      },
      select: {
        world_setting: true,
      },
    });

    logInfo("World setting updated successfully", {
      endpoint: "/api/novel/projects/[id]/world-setting",
      userId,
      projectId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      world_setting: updatedProject.world_setting,
    });
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
