import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { uploadBase64Image } from "@/lib/upload-helpers";

/**
 * POST /api/upload/base64
 * 上传 base64 编码的图片到 MinIO
 *
 * Request body (JSON):
 * - base64Data: string (必填) - base64 编码的图片数据（包含 data:image/...;base64, 前缀）
 * - filename: string (可选) - 文件名，默认为 "image.png"
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

    // 解析请求体
    const body = await request.json();
    const { base64Data, filename = "image.png" } = body;

    // 验证参数
    if (!base64Data) {
      return NextResponse.json({ error: "缺少 base64 数据" }, { status: 400 });
    }

    if (typeof base64Data !== "string" || !base64Data.startsWith("data:")) {
      return NextResponse.json({ error: "无效的 base64 格式" }, { status: 400 });
    }

    // 上传到 MinIO
    const url = await uploadBase64Image(base64Data, filename);

    return NextResponse.json({
      success: true,
      url,
      message: "上传成功",
    });
  } catch (error) {
    console.error("Upload base64 API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
