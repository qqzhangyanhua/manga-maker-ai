/**
 * 生成章节大纲 API
 * POST /api/novel/projects/[id]/generate-outline
 *
 * 支持两种模式：
 * - full: 完整生成（基于项目描述、角色、世界观）
 * - continue: 续写模式（基于现有章节续写后续章节）
 */
import { NextRequest, NextResponse } from "next/server";
import { readAuthCookie, verifyAuthToken, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  withErrorHandler,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  parseJsonBody,
} from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface GenerateOutlineRequest {
  chapter_count: number;
  style?: string;
  mode?: "full" | "continue";
  existing_outlines?: Array<{
    chapter_number: number;
    title: string;
    outline: string;
    key_events: string[];
    characters: string[];
    plot_lines: string[];
    is_key_chapter: boolean;
  }>;
  start_chapter?: number;
}

/**
 * 获取认证 token
 */
async function getAuthToken(req: NextRequest): Promise<string> {
  // 1. 尝试从 Authorization header 获取
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 2. 从 Cookie 中读取 JWT token
  const cookieToken = readAuthCookie(req);
  if (!cookieToken) {
    throw new UnauthorizedError();
  }

  // 3. 验证 token 并返回
  const payload = verifyAuthToken(cookieToken);
  if (!payload?.userId) {
    throw new UnauthorizedError();
  }

  // 4. 重新签发 token（确保格式一致）
  return signAuthToken({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    status: payload.status,
  });
}

/**
 * 验证项目归属
 */
async function validateProjectAccess(
  projectId: string,
  userId: string
): Promise<void> {
  const project = await prisma.novelProject.findUnique({
    where: { id: projectId },
    select: { user_id: true },
  });

  if (!project) {
    throw new NotFoundError("项目");
  }

  if (project.user_id !== userId) {
    throw new UnauthorizedError("无权访问此项目");
  }
}

/**
 * 验证请求参数
 */
function validateGenerateRequest(body: GenerateOutlineRequest): void {
  const { chapter_count, mode, existing_outlines, start_chapter } = body;

  if (!chapter_count || typeof chapter_count !== "number") {
    throw new BadRequestError("章节数必须是一个有效的数字");
  }

  if (chapter_count < 1 || chapter_count > 100) {
    throw new BadRequestError("章节数必须在 1-100 之间");
  }

  if (mode === "continue" && existing_outlines && existing_outlines.length > 0) {
    if (!start_chapter || typeof start_chapter !== "number") {
      throw new BadRequestError("续写模式需要指定起始章节号");
    }
  }
}

export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const startedAt = Date.now();
    const { id: projectId } = await params;

    logInfo("Request received", {
      endpoint: "/api/novel/projects/[id]/generate-outline",
      method: "POST",
      projectId,
    });

    // 获取认证 token
    const token = await getAuthToken(request);
    const payload = verifyAuthToken(token);
    const userId = payload?.userId;

    if (!userId) {
      throw new UnauthorizedError();
    }

    logInfo("User authenticated", {
      endpoint: "/api/novel/projects/[id]/generate-outline",
      userId,
      projectId,
    });

    // 验证项目归属
    await validateProjectAccess(projectId, userId);

    // 解析请求体
    const body = await parseJsonBody<GenerateOutlineRequest>(request);

    // 验证参数
    validateGenerateRequest(body);

    const {
      chapter_count,
      style,
      mode = "full",
      existing_outlines = [],
      start_chapter = 1,
    } = body;

    logInfo("Starting outline generation", {
      endpoint: "/api/novel/projects/[id]/generate-outline",
      userId,
      projectId,
      mode,
      chapter_count,
    });

    // 调用 novel-backend 的生成接口
    const backendUrl = process.env.NOVEL_BACKEND_URL || "http://localhost:8000";
    const url = `${backendUrl}/api/novel/projects/${projectId}/generate-outline`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chapter_count,
        style,
        mode,
        existing_outlines,
        start_chapter,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: unknown;

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: errorText };
      }

      logError("Backend generation failed", new Error(errorText), {
        endpoint: "/api/novel/projects/[id]/generate-outline",
        userId,
        projectId,
        status: response.status,
      });

      // 尝试解析后端错误格式
      const detail =
        typeof errorData === "object" && errorData !== null && "detail" in errorData
          ? String(errorData.detail)
          : "生成失败";

      throw new Error(detail);
    }

    const data = await response.json();

    logInfo("Outline generation completed", {
      endpoint: "/api/novel/projects/[id]/generate-outline",
      userId,
      projectId,
      chaptersGenerated: data.chapters?.length || 0,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(data);
  }
);
