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
import { consumeCredits, InsufficientCreditsError } from "@/lib/credits";

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

interface AuthResult {
  token: string;
  userId: string;
}

/**
 * 获取并验证认证 token（优化：一次验证即可）
 */
async function getAuthToken(req: NextRequest): Promise<AuthResult> {
  // 1. 尝试从 Authorization header 获取
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      throw new UnauthorizedError();
    }
    return { token, userId: payload.userId };
  }

  // 2. 从 Cookie 中读取 JWT token
  const cookieToken = readAuthCookie(req);
  if (!cookieToken) {
    throw new UnauthorizedError();
  }

  // 3. 验证 token
  const payload = verifyAuthToken(cookieToken);
  if (!payload?.userId) {
    throw new UnauthorizedError();
  }

  // 4. 重新签发 token（确保格式一致）
  const newToken = signAuthToken({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    status: payload.status,
  });

  return { token: newToken, userId: payload.userId };
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

/**
 * 计算算力费用（基于章节数）
 * 基础费用 30 算力 + 每章 5 算力
 */
function calculateCreditsCost(chapterCount: number): number {
  const BASE_COST = 30;
  const PER_CHAPTER_COST = 5;
  return BASE_COST + (chapterCount * PER_CHAPTER_COST);
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

    // 获取认证 token（已优化：一次验证）
    const { token, userId } = await getAuthToken(request);

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

    // 计算算力费用
    const creditsCost = calculateCreditsCost(chapter_count);

    logInfo("Starting outline generation", {
      endpoint: "/api/novel/projects/[id]/generate-outline",
      userId,
      projectId,
      mode,
      chapter_count,
      creditsCost,
    });

    // 校验后端 URL 配置
    const backendUrl = process.env.NOVEL_BACKEND_URL;
    if (!backendUrl) {
      throw new Error("NOVEL_BACKEND_URL 环境变量未配置");
    }

    const url = `${backendUrl}/api/novel/projects/${projectId}/generate-outline`;

    // 设置 120 秒超时控制（AI 生成可能耗时较长）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

        // 根据状态码抛出相应错误
        if (response.status === 401) {
          throw new UnauthorizedError("后端认证失败");
        } else if (response.status === 400) {
          const detail =
            typeof errorData === "object" && errorData !== null && "detail" in errorData
              ? String(errorData.detail)
              : "请求参数错误";
          throw new BadRequestError(detail);
        } else if (response.status === 404) {
          throw new NotFoundError("项目");
        }

        // 其他错误
        const detail =
          typeof errorData === "object" && errorData !== null && "detail" in errorData
            ? String(errorData.detail)
            : "生成失败";
        throw new Error(detail);
      }

      const data = await response.json();

      // 生成成功后扣除算力
      try {
        await consumeCredits({
          userId,
          amount: creditsCost,
          description: `生成章节大纲 (${chapter_count}章, ${mode === "full" ? "完整生成" : "续写模式"})`,
          refType: "generation_log",
          refId: projectId,
        });

        logInfo("Credits consumed successfully", {
          endpoint: "/api/novel/projects/[id]/generate-outline",
          userId,
          projectId,
          creditsCost,
        });
      } catch (creditsError) {
        if (creditsError instanceof InsufficientCreditsError) {
          logError("Insufficient credits after generation", creditsError, {
            endpoint: "/api/novel/projects/[id]/generate-outline",
            userId,
            projectId,
            required: creditsError.required,
            available: creditsError.available,
          });

          return NextResponse.json(
            {
              error: `算力不足：需要 ${creditsError.required}，当前余额 ${creditsError.available}`,
              code: "INSUFFICIENT_CREDITS",
              required: creditsError.required,
              available: creditsError.available,
            },
            { status: 402 }
          );
        }
        throw creditsError;
      }

      logInfo("Outline generation completed", {
        endpoint: "/api/novel/projects/[id]/generate-outline",
        userId,
        projectId,
        chaptersGenerated: data.chapters?.length || 0,
        creditsCost,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json(data);
    } catch (error) {
      clearTimeout(timeoutId);

      // 处理超时错误
      if (error instanceof Error && error.name === "AbortError") {
        logError("Request timeout", error, {
          endpoint: "/api/novel/projects/[id]/generate-outline",
          userId,
          projectId,
          durationMs: Date.now() - startedAt,
        });
        throw new Error("生成超时（120秒），请稍后重试");
      }

      throw error;
    }
  }
);
