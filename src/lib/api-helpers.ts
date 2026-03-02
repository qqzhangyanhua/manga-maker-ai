/**
 * API 路由辅助函数
 * 提供统一的身份验证、错误处理等功能
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';
import { z } from "zod";
import { freezeCredits, settleFreeze, rollbackFreeze } from '@/lib/billing';

/**
 * API 错误类型
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 身份验证结果
 */
export interface AuthContext {
  userId: string;
}

/**
 * 带身份验证的 API 处理器
 *
 * @example
 * export async function GET(req: Request) {
 *   return withAuth(async ({ userId }) => {
 *     const stories = await prisma.story.findMany({ where: { user_id: userId } });
 *     return { stories };
 *   });
 * }
 */
export async function withAuth<T = unknown>(
  handler: (context: AuthContext) => Promise<T>
): Promise<NextResponse> {
  try {
    // 验证身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      throw new ApiError('未登录', 401, 'UNAUTHORIZED');
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      throw new ApiError('无效的token', 401, 'INVALID_TOKEN');
    }

    // 执行处理器
    const result = await handler({ userId: payload.userId });

    // 返回成功响应
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export function getErrorStatus(error: Error): number {
  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }
  return 500;
}

/**
 * 统一的错误处理
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    const status = getErrorStatus(error);
    return NextResponse.json(
      { error: error.message },
      { status }
    );
  }

  return NextResponse.json(
    { error: '未知错误' },
    { status: 500 }
  );
}

/**
 * 验证资源所有权
 * 
 * @example
 * const story = await validateOwnership(
 *   prisma.story,
 *   storyId,
 *   userId,
 *   '故事'
 * );
 */
export async function validateOwnership<T extends { user_id: string }>(
  model: { findUnique: (args: { where: { id: string } }) => Promise<T | null> },
  resourceId: string,
  userId: string,
  resourceName: string = '资源'
): Promise<T> {
  const resource = await model.findUnique({
    where: { id: resourceId },
  });

  if (!resource) {
    throw new ApiError(`${resourceName}不存在`, 404, 'NOT_FOUND');
  }

  if (resource.user_id !== userId) {
    throw new ApiError(`无权访问此${resourceName}`, 403, 'FORBIDDEN');
  }

  return resource;
}

/**
 * 分页参数解析
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultPageSize: number = 20,
  maxPageSize: number = 100
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(searchParams.get('pageSize') || String(defaultPageSize)))
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.pageSize);

  return {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * 使用 Zod 统一解析并校验入参
 *
 * @param schema Zod Schema
 * @param data 待校验数据
 * @param messagePrefix 错误前缀
 * @throws ApiError(400) 当校验失败时抛出
 */
export function parseWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  messagePrefix = "请求参数错误"
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const detail = firstIssue?.message || "参数格式不正确";
    throw new ApiError(`${messagePrefix}: ${detail}`, 400, "BAD_REQUEST");
  }
  return parsed.data;
}

/**
 * 扩展身份验证上下文（含配额冻结 ID）
 */
export interface AuthContextWithFreeze extends AuthContext {
  freezeId: string;
}

/**
 * 带配额事务保护的 API 处理器（三阶段：freeze -> settle/rollback）
 *
 * 使用三阶段配额事务机制，防止生成失败时配额无法回滚的问题：
 * 1. freeze: 冻结预估配额
 * 2. handler 执行: 生成任务
 * 3. settle/rollback: 成功结算或失败回滚
 *
 * @example
 * export async function POST(req: Request) {
 *   const { panel_id, prompt } = await req.json();
 *
 *   return withCreditFreeze(
 *     async ({ userId, freezeId }) => {
 *       // 验证权限
 *       const panel = await prisma.panel.findUnique({ where: { id: panel_id } });
 *       if (!panel) throw new ApiError('分镜不存在', 404);
 *
 *       // 生成图片
 *       const imageUrl = await callImageGenerationByType({ ... });
 *
 *       // 更新数据
 *       await prisma.panel.update({ where: { id: panel_id }, data: { generated_image: imageUrl } });
 *
 *       return { image_url: imageUrl };
 *     },
 *     {
 *       estimateCost: () => estimateImageCost('standard'),
 *       taskId: panel_id,
 *       description: '分镜图片生成',
 *     }
 *   );
 * }
 */
export async function withCreditFreeze<T = unknown>(
  handler: (context: AuthContextWithFreeze) => Promise<T>,
  options: {
    /** 预估费用计算函数 */
    estimateCost: () => number;
    /** 任务 ID（用于配额事务关联） */
    taskId: string;
    /** 任务描述（可选） */
    description?: string;
  }
): Promise<NextResponse> {
  try {
    // 阶段 0: 验证身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      throw new ApiError('未登录', 401, 'UNAUTHORIZED');
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      throw new ApiError('无效的token', 401, 'INVALID_TOKEN');
    }

    const userId = payload.userId;

    // 阶段 1: 冻结配额
    const freeze = await freezeCredits({
      userId,
      amount: options.estimateCost(),
      taskId: options.taskId,
      description: options.description || '生成任务',
    });

    try {
      // 阶段 2: 执行生成
      const result = await handler({
        userId,
        freezeId: freeze.freezeId
      });

      // 阶段 3: 结算（假设实际费用等于预估费用）
      await settleFreeze({
        userId,
        freezeId: freeze.freezeId,
        actualAmount: freeze.frozenAmount,
        taskId: options.taskId,
        description: `生成成功 - ${options.description || '任务完成'}`,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (error) {
      // 阶段 3: 回滚配额
      await rollbackFreeze({
        userId,
        freezeId: freeze.freezeId,
        taskId: options.taskId,
        reason: error instanceof Error ? error.message : '生成失败',
      });

      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
