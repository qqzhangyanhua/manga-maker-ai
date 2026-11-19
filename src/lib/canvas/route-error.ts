import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-helpers";

/** 画布接口统一错误响应：业务错误（ApiError）按其状态码返回，其余记日志后返回 500 */
export function canvasErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  console.error(`${fallbackMessage}:`, error);
  return NextResponse.json(
    { error: fallbackMessage, detail: error instanceof Error ? error.message : undefined },
    { status: 500 }
  );
}
