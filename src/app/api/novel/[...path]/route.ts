/**
 * Novel API 代理层
 * 
 * 将所有 /api/novel/* 请求转发到 Python 后端服务
 * 统一处理认证、错误和流式响应
 */
import { NextRequest, NextResponse } from "next/server";
import { readAuthCookie, verifyAuthToken, signAuthToken } from "@/lib/auth";

const NOVEL_SERVICE_URL = process.env.NOVEL_SERVICE_URL || "http://localhost:8000";

/**
 * 获取认证 token
 */
async function getAuthToken(req: NextRequest): Promise<string | null> {
  // 1. 尝试从 Authorization header 获取
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 2. 从 Cookie 中读取 JWT token
  const cookieToken = readAuthCookie(req);
  if (!cookieToken) {
    return null;
  }

  // 3. 验证 token 并返回
  const payload = verifyAuthToken(cookieToken);
  if (!payload) {
    return null;
  }

  // 4. 重新签发 token（确保格式一致）
  const token = signAuthToken({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    status: payload.status,
  });

  return token;
}

/**
 * 通用请求处理函数
 */
async function handleRequest(
  req: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<Response> {
  try {
    // 获取认证 token
    const token = await getAuthToken(req);
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized", message: "请先登录" },
        { status: 401 }
      );
    }

    // 构建目标 URL
    const path = params.path.join("/");
    const url = new URL(req.url);
    const targetUrl = `${NOVEL_SERVICE_URL}/api/novel/${path}${url.search}`;

    console.log(`[Novel API Proxy] ${req.method} ${targetUrl}`);

    // 准备请求头
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    // 准备请求体
    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      // 检查 Content-Type 来决定如何读取
      const contentType = req.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        try {
          const jsonBody = await req.json();
          body = JSON.stringify(jsonBody);
        } catch (error) {
          console.error("[Novel API Proxy] Failed to parse JSON:", error);
          // JSON 解析失败，使用空对象
          body = JSON.stringify({});
        }
      } else {
        // 非 JSON 内容，读取为文本
        try {
          body = await req.text();
        } catch (error) {
          console.error("[Novel API Proxy] Failed to read body:", error);
        }
      }
    }

    // 转发请求到 Python 服务
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    // 处理流式响应（SSE）
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // 处理普通 JSON 响应
    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Novel API Proxy] Error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

// 导出所有 HTTP 方法
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
