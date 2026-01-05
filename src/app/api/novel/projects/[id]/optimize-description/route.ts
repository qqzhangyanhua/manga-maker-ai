/**
 * AI优化/生成项目描述 API
 */
import { NextRequest, NextResponse } from "next/server";
import { readAuthCookie, verifyAuthToken, signAuthToken } from "@/lib/auth";

interface OptimizeDescriptionRequest {
  description: string;
  mode: "optimize" | "generate";
}

/**
 * 获取认证 token
 */
async function getAuthToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  const cookieToken = readAuthCookie(req);
  if (!cookieToken) {
    return null;
  }

  const payload = verifyAuthToken(cookieToken);
  if (!payload) {
    return null;
  }

  const token = signAuthToken({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    status: payload.status,
  });

  return token;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized", message: "请先登录" },
        { status: 401 }
      );
    }

    const body: OptimizeDescriptionRequest = await request.json();
    const { description, mode } = body;

    console.log(`[optimize-description] projectId: ${projectId}, mode: ${mode}`);

    const backendUrl = process.env.NOVEL_BACKEND_URL || "http://localhost:8000";
    const url = `${backendUrl}/api/novel/projects/${projectId}/optimize-description`;

    console.log(`[optimize-description] 调用后端: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        description,
        mode,
      }),
    });

    console.log(`[optimize-description] 后端响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[optimize-description] 后端错误:`, errorText);

      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { detail: errorText };
      }

      return NextResponse.json(
        { error: error.detail || "处理失败" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[optimize-description] 成功返回`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[optimize-description] 异常:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理失败，请重试" },
      { status: 500 }
    );
  }
}
