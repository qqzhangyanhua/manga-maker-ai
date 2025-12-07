import { cookies } from "next/headers";
import { verifyAuthToken, type AuthTokenPayload } from "@/lib/auth";
import { NextResponse } from "next/server";

// Helper to verify token from cookies
export async function verifyToken(token: string) {
  return verifyAuthToken(token);
}

// Helper to get current user from request
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  return payload;
}

// Helper to require admin role
export async function requireAdmin(): Promise<AuthTokenPayload | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  if (payload.role !== "admin") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  return payload;
}
