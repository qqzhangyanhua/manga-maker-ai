import type { NextRequest } from "next/server";

/** 取转发链上的第一个地址。没有转发头时退回连接地址。 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.ip ?? "unknown";
}
