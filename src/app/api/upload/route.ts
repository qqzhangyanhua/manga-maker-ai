import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { uploadImageToMinio } from "@/lib/upload-helpers";

/**
 * POST /api/upload
 * 上传图片到 MinIO
 *
 * Request body (FormData):
 * - file: File (必填)
 * - characterId: string (必填)
 * - type: "base" | "reference" | "view" | "expression" (可选，默认 "reference")
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

    // 解析 FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const characterId = formData.get("characterId") as string | null;
    const type = (formData.get("type") as "base" | "reference" | "view" | "expression") || "reference";

    // 验证参数
    if (!file) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }

    if (!characterId) {
      return NextResponse.json({ error: "缺少角色ID" }, { status: 400 });
    }

    // 上传到 MinIO
    const result = await uploadImageToMinio(file, payload.userId, characterId, type);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "上传失败" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      message: "上传成功",
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}
