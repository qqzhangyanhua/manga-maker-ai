import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { uploadBase64Image } from "@/lib/upload-helpers";

/**
 * POST /api/story/upload-style-ref
 * 上传故事风格参考图（base64）
 *
 * Request body:
 * - base64Data: string (必填，不包含 data:image/... 前缀)
 * - filename: string (可选，默认自动生成)
 */
export async function POST(request: NextRequest) {
  try {
    // 验证身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 解析 JSON body
    const body = await request.json();
    const { base64Data, filename } = body;

    // 验证参数
    if (!base64Data || typeof base64Data !== "string") {
      return NextResponse.json({ error: "缺少 base64Data" }, { status: 400 });
    }

    // 生成文件名
    const finalFilename = filename || `style-ref-${Date.now()}.png`;

    // 上传到 MinIO
    const imageUrl = await uploadBase64Image(base64Data, finalFilename);

    return NextResponse.json({
      success: true,
      url: imageUrl,
      message: "上传成功",
    });
  } catch (error) {
    console.error("Upload style reference error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
