/**
 * AI 图片生成工具函数
 */

/**
 * 下载图片并转换为 base64
 * @param imageUrl 图片 URL
 * @returns base64 格式的图片数据（包含 data:image/...;base64, 前缀）
 */
export async function urlToBase64(imageUrl: string): Promise<string> {
  const MAX_IMAGE_SIZE_MB = 3; // 最大 3MB
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

  try {
    console.log(`\n========== 下载参考图 ==========`);
    console.log(`URL: ${imageUrl}`);

    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`下载参考图失败: ${response.status} ${response.statusText}`);
    }

    // 检查 Content-Length（如果服务器提供）
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      const sizeMB = sizeBytes / (1024 * 1024);
      console.log(`Content-Length: ${(sizeBytes / 1024).toFixed(2)} KB (${sizeMB.toFixed(2)} MB)`);

      if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
        throw new Error(
          `参考图过大 (${sizeMB.toFixed(2)} MB)，超过限制 ${MAX_IMAGE_SIZE_MB} MB。` +
          `大图片会导致请求超时或被服务器拒绝。请使用较小的图片或压缩后再使用。`
        );
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sizeMB = buffer.length / (1024 * 1024);

    console.log(`下载完成，实际大小: ${(buffer.length / 1024).toFixed(2)} KB (${sizeMB.toFixed(2)} MB)`);

    // 再次检查实际大小
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `参考图过大 (${sizeMB.toFixed(2)} MB)，超过限制 ${MAX_IMAGE_SIZE_MB} MB。` +
        `大图片会导致请求超时或被服务器拒绝。请使用较小的图片或压缩后再使用。`
      );
    }

    // 警告：接近限制
    if (buffer.length > MAX_IMAGE_SIZE_BYTES * 0.8) {
      console.warn(`⚠️ 警告: 参考图较大 (${sizeMB.toFixed(2)} MB)，接近 ${MAX_IMAGE_SIZE_MB} MB 限制，可能导致请求缓慢或失败`);
    }

    const base64 = buffer.toString('base64');

    // 从 URL 或 Content-Type 推断图片类型
    const contentType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log(`✓ 参考图转换成功，base64 大小: ${(dataUrl.length / 1024).toFixed(2)} KB`);
    console.log('================================\n');

    return dataUrl;
  } catch (error) {
    console.error('\n========== 参考图下载失败 ==========');
    console.error('URL:', imageUrl);
    console.error('错误:', error instanceof Error ? error.message : String(error));
    console.error('====================================\n');
    throw new Error(`无法下载参考图: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * Base64 转 Buffer（用于上传到 MinIO）
 */
export function base64ToBuffer(base64: string): Buffer {
  // 移除 data:image/png;base64, 前缀（如果有）
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}
