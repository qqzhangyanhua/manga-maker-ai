/**
 * API 路由辅助函数
 * 提供统一的身份验证、错误处理等功能
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';

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

