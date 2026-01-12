/**
 * 生成章节大纲 API
 * POST /api/novel/projects/[id]/generate-outline
 *
 * 支持两种模式：
 * - full: 完整生成（基于项目描述、角色、世界观）
 * - continue: 续写模式（基于现有章节续写后续章节）
 */
import { NextRequest, NextResponse } from "next/server";
import { readAuthCookie, verifyAuthToken, signAuthToken } from "@/lib/auth";

interface GenerateOutlineRequest {
  chapter_count: number;
  style?: string;
  mode?: "full" | "continue";
  existing_outlines?: Array<{
    chapter_number: number;
    title: string;
    outline: string;
    key_events: string[];
    characters: string[];
    plot_lines: string[];
    is_key_chapter: boolean;
  }>;
  start_chapter?: number;
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
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const { id: projectId } = await params;

    // 获取认证 token
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized", message: "请先登录" },
        { status: 401 }
      );
    }

    userId = verifyAuthToken(token)?.userId || null;

    const body: GenerateOutlineRequest = await request.json();
    const {
      chapter_count,
      style,
      mode = "full",
      existing_outlines = [],
      start_chapter = 1,
    } = body;

    console.log(`[generate-outline] projectId: ${projectId}, mode: ${mode}, chapter_count: ${chapter_count}`);

    // 验证参数
    if (!chapter_count || chapter_count < 1 || chapter_count > 100) {
      return NextResponse.json(
        { error: "章节数必须在 1-100 之间" },
        { status: 400 }
      );
    }

    // 调用 novel-backend 的生成接口
    const backendUrl = process.env.NOVEL_BACKEND_URL || "http://localhost:8000";
    const url = `${backendUrl}/api/novel/projects/${projectId}/generate-outline`;

    console.log(`[generate-outline] 调用后端: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        chapter_count,
        style,
        mode,
        existing_outlines,
        start_chapter,
      }),
    });

    console.log(`[generate-outline] 后端响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate-outline] 后端错误:`, errorText);

      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { detail: errorText };
      }

      return NextResponse.json(
        { error: error.detail || "生成失败" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[generate-outline] 成功生成 ${data.chapters?.length || 0} 章`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[generate-outline] 异常:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败,请重试" },
      { status: 500 }
    );
  }
}
