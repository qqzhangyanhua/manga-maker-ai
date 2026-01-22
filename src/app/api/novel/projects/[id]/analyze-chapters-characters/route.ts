/**
 * 分析章节内容并生成角色 API
 */
import { NextRequest, NextResponse } from "next/server";
import { readAuthCookie, verifyAuthToken, signAuthToken } from "@/lib/auth";

interface AnalyzeChaptersCharactersRequest {
  chapters_context: string;
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // 获取认证 token
    const token = await getAuthToken(request);

    if (!token) {
      console.log("[analyze-chapters-characters] 未授权：缺少认证 token");
      return NextResponse.json(
        { error: "Unauthorized", message: "请先登录" },
        { status: 401 }
      );
    }

    const body: AnalyzeChaptersCharactersRequest = await request.json();
    const { chapters_context } = body;

    console.log(`[analyze-chapters-characters] projectId: ${projectId}`);
    console.log(`[analyze-chapters-characters] chapters_context length: ${chapters_context?.length || 0}`);

    if (!chapters_context || chapters_context.trim().length === 0) {
      return NextResponse.json(
        { error: "章节内容不能为空" },
        { status: 400 }
      );
    }

    // 调用 novel-backend 的分析接口
    const backendUrl = process.env.NOVEL_BACKEND_URL || "http://localhost:8000";
    const url = `${backendUrl}/projects/${projectId}/analyze-chapters-characters`;

    console.log(`[analyze-chapters-characters] 调用后端: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, // ✅ 添加认证 header
      },
      body: JSON.stringify({
        chapters_context,
      }),
    });

    console.log(`[analyze-chapters-characters] 后端响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[analyze-chapters-characters] 后端错误:`, errorText);

      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { detail: errorText };
      }

      return NextResponse.json(
        { error: error.detail || "分析失败" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[analyze-chapters-characters] 成功返回 ${data.characters?.length || 0} 个角色`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[analyze-chapters-characters] 异常:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析失败，请重试" },
      { status: 500 }
    );
  }
}
