import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { validateImageFile } from "@/lib/upload-helpers";

/**
 * POST /api/admin/upload
 * 管理员通用图片上传到 MinIO
 *
 * Request body (FormData):
 * - file: File (必填)
 * - folder: string (可选，默认 "admin")
 */
export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if (result instanceof NextResponse) return result;

    // 解析 FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "admin";

    // 验证参数
    if (!file) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }

    // 验证文件
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 确保 bucket 存在
    await ensureBucketExists();

    // 生成对象名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || ".jpg";
    const objectName = `${folder}/${timestamp}_${randomStr}${extension}`;

    // 将 File 转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到 MinIO
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, file.size, {
      "Content-Type": file.type,
    });

    // 生成公开访问 URL
    const publicUrl = getPublicUrl(objectName);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: "上传成功",
    });
  } catch (error) {
    console.error("Admin upload API error:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}
