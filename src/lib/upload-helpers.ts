import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "./minio";

// 支持的图片类型
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// 最大文件大小：5MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 验证文件类型
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // 检查 MIME 类型
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的文件类型，仅支持 ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  // 检查扩展名
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `不支持的文件扩展名，仅支持 ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return { valid: true };
}

// 生成唯一文件名
export function generateUniqueFileName(
  userId: string,
  characterId: string,
  originalFileName: string,
  type: "base" | "reference" | "view" | "expression" = "reference"
): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalFileName.toLowerCase().match(/\.[^.]+$/)?.[0] || ".jpg";

  let folder = "";
  switch (type) {
    case "base":
      return `users/${userId}/characters/${characterId}/base${extension}`;
    case "reference":
      folder = "references";
      break;
    case "view":
      folder = "views";
      break;
    case "expression":
      folder = "expressions";
      break;
  }

  return `users/${userId}/characters/${characterId}/${folder}/${timestamp}_${randomStr}${extension}`;
}

// 上传文件到 MinIO
export async function uploadImageToMinio(
  file: File,
  userId: string,
  characterId: string,
  type: "base" | "reference" | "view" | "expression" = "reference"
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 验证文件
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 确保 bucket 存在
    await ensureBucketExists();

    // 生成对象名
    const objectName = generateUniqueFileName(userId, characterId, file.name, type);

    // 将 File 转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到 MinIO
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, file.size, {
      "Content-Type": file.type,
    });

    // 生成公开访问 URL
    const publicUrl = getPublicUrl(objectName);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "上传失败",
    };
  }
}

// 删除 MinIO 中的文件
export async function deleteImageFromMinio(
  objectName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await minioClient.removeObject(MINIO_BUCKET, objectName);
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除失败",
    };
  }
}

// 从 URL 提取对象名
export function extractObjectNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    // 移除第一个空字符串和 bucket 名称
    pathParts.shift(); // 移除空字符串
    pathParts.shift(); // 移除 bucket 名称
    return pathParts.join("/");
  } catch {
    return null;
  }
}

// 上传 base64 图片到 MinIO
export async function uploadBase64Image(
  base64Data: string,
  filename: string
): Promise<string> {
  try {
    // 解析 base64 数据
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      throw new Error("无效的 base64 格式");
    }

    const mimeType = matches[1];
    const base64String = matches[2];

    // 验证 MIME 类型
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(`不支持的图片类型: ${mimeType}`);
    }

    // 将 base64 转换为 Buffer
    const buffer = Buffer.from(base64String, "base64");

    // 检查文件大小
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // 确保 bucket 存在
    await ensureBucketExists();

    // 生成对象名（使用时间戳避免冲突）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = filename.match(/\.[^.]+$/)?.[0] || ".png";
    const objectName = `panels/${timestamp}_${randomStr}${extension}`;

    // 上传到 MinIO
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
      "Content-Type": mimeType,
    });

    // 返回公开访问 URL
    return getPublicUrl(objectName);
  } catch (error) {
    console.error("Upload base64 error:", error);
    throw error instanceof Error ? error : new Error("上传失败");
  }
}
