/**
 * 统一 API 错误处理
 *
 * 定义标准错误类型和错误处理中间件
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * API 错误基类
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 认证错误 (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message = '未登录或登录已过期', details?: unknown) {
    super(401, 'UNAUTHORIZED', message, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 权限错误 (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message = '无权执行此操作', details?: unknown) {
    super(403, 'FORBIDDEN', message, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * 资源不存在 (404)
 */
export class NotFoundError extends ApiError {
  constructor(resource: string, details?: unknown) {
    super(404, 'NOT_FOUND', `${resource} 不存在`, details);
    this.name = 'NotFoundError';
  }
}

/**
 * 参数错误 (400)
 */
export class BadRequestError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
    this.name = 'BadRequestError';
  }
}

/**
 * 算力不足 (402)
 */
export class InsufficientCreditsError extends ApiError {
  constructor(
    public readonly required: number,
    public readonly available: number,
    message?: string
  ) {
    const msg = message || `算力不足，需要 ${required}，当前余额 ${available}`;
    super(402, 'INSUFFICIENT_CREDITS', msg, { required, available });
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * 服务器错误 (500)
 */
export class InternalServerError extends ApiError {
  constructor(message = '服务器内部错误', details?: unknown) {
    super(500, 'INTERNAL_ERROR', message, details);
    this.name = 'InternalServerError';
  }
}

/**
 * 服务不可用 (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = '服务暂时不可用，请稍后重试', details?: unknown) {
    super(503, 'SERVICE_UNAVAILABLE', message, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Next.js API 路由错误处理包装器（支持 params）
 *
 * @example
 * ```ts
 * // 简单路由
 * export const GET = withErrorHandler(async (req) => {
 *   return NextResponse.json(data);
 * });
 *
 * // 带 params 的路由
 * export const GET = withErrorHandler(
 *   async (req, { params }) => {
 *     const { id } = await params;
 *     return NextResponse.json(data);
 *   }
 * );
 * ```
 */
export function withErrorHandler<TParams = unknown>(
  handler: (req: Request, context?: { params: Promise<TParams> }) => Promise<NextResponse>,
  options?: {
    logErrors?: boolean;
    errorMessage?: string;
  }
) {
  return async (
    req: Request,
    context?: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      // ApiError 实例
      if (error instanceof ApiError) {
        if (options?.logErrors !== false) {
          console.error(`[API Error ${error.code}]`, error.message);
        }
        return NextResponse.json(error.toJSON(), { status: error.statusCode });
      }

      // 标准错误
      if (error instanceof Error) {
        console.error('[API Error]', error);

        return NextResponse.json(
          {
            error: options?.errorMessage || '操作失败，请稍后重试',
            code: 'UNKNOWN_ERROR',
          },
          { status: 500 }
        );
      }

      // 未知错误
      console.error('[Unknown Error]', error);
      return NextResponse.json(
        { error: '未知错误', code: 'UNKNOWN_ERROR' },
        { status: 500 }
      );
    }
  };
}

/**
 * 解析请求体并处理错误
 */
export async function parseJsonBody<T = unknown>(
  req: Request
): Promise<T> {
  try {
    return await req.json() as T;
  } catch (error) {
    throw new BadRequestError('请求体格式错误');
  }
}

/**
 * 从 Response 中解析标准 API 错误
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || data.message || '操作失败';
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
}

/**
 * 检查错误是否为特定类型
 */
export function isErrorType<T extends new (...args: unknown[]) => ApiError>(
  error: unknown,
  ErrorClass: T
): error is InstanceType<T> {
  return error instanceof ErrorClass;
}

/**
 * 从错误中提取用户友好的消息
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    // 开发环境显示详细错误
    if (process.env.NODE_ENV === 'development') {
      return error.message;
    }
    return '操作失败，请稍后重试';
  }

  return '未知错误';
}

/**
 * Next.js Request 类型
 */
export type NextApiRequest = NextRequest;

/**
 * Next.js params 类型
 */
export type NextParams<T = Record<string, string>> = Promise<T>;

/**
 * 认证用户信息
 */
export interface AuthContext {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  status?: string;
}
