/**
 * 统一的 API 响应格式工具
 */

import { NextResponse } from "next/server";

/**
 * 统一的 API 响应接口
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    succeeded?: number;
    failed?: number;
    skipped?: number;
    [key: string]: unknown;
  };
}

/**
 * 成功响应
 */
export function successResponse<T>(
  data: T,
  meta?: ApiResponse<T>["meta"],
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
    },
    { status }
  );
}

/**
 * 错误响应
 */
export function errorResponse(
  error: string,
  status = 500
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * 验证错误响应
 */
export function validationErrorResponse(
  error: string
): NextResponse<ApiResponse<never>> {
  return errorResponse(error, 400);
}

/**
 * 未授权响应
 */
export function unauthorizedResponse(
  error = "未登录"
): NextResponse<ApiResponse<never>> {
  return errorResponse(error, 401);
}

/**
 * 禁止访问响应
 */
export function forbiddenResponse(
  error = "无权限访问"
): NextResponse<ApiResponse<never>> {
  return errorResponse(error, 403);
}

/**
 * 未找到响应
 */
export function notFoundResponse(
  error = "资源不存在"
): NextResponse<ApiResponse<never>> {
  return errorResponse(error, 404);
}

/**
 * 速率限制响应
 */
export function rateLimitResponse(
  error = "操作过于频繁，请稍后再试"
): NextResponse<ApiResponse<never>> {
  return errorResponse(error, 429);
}
