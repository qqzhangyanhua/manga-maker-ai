/**
 * AI 图片生成工具函数
 */

import sharp from 'sharp';

/**
 * 压缩图片
 * @param buffer 原始图片 Buffer
 * @param maxSizeBytes 目标大小（字节）
 * @returns 压缩后的 Buffer
 */
async function compressImage(buffer: Buffer, maxSizeBytes: number): Promise<Buffer> {
  const MAX_WIDTH = 1920; // 最大宽度
  const MIN_QUALITY = 60; // 最低质量
  const INITIAL_QUALITY = 80; // 初始质量

  let quality = INITIAL_QUALITY;
  let compressedBuffer = buffer;

  console.log(`开始压缩图片，原始大小: ${(buffer.length / 1024).toFixed(2)} KB`);

  // 获取图片元数据
  const metadata = await sharp(buffer).metadata();
  console.log(`原始尺寸: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}`);

  // 先尝试调整尺寸（如果宽度超过限制）
  let sharpInstance = sharp(buffer);
  if (metadata.width && metadata.width > MAX_WIDTH) {
    console.log(`调整宽度: ${metadata.width} -> ${MAX_WIDTH}`);
    sharpInstance = sharpInstance.resize(MAX_WIDTH, undefined, {
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  // 转换为 JPEG 并压缩
  while (quality >= MIN_QUALITY) {
    compressedBuffer = await sharpInstance
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    const compressedSizeMB = compressedBuffer.length / (1024 * 1024);
    console.log(`质量 ${quality}%: ${(compressedBuffer.length / 1024).toFixed(2)} KB (${compressedSizeMB.toFixed(2)} MB)`);

    if (compressedBuffer.length <= maxSizeBytes) {
      console.log(`✓ 压缩成功，最终质量: ${quality}%`);
      break;
    }

    quality -= 10;
  }

  if (compressedBuffer.length > maxSizeBytes) {
    const sizeMB = compressedBuffer.length / (1024 * 1024);
    const maxMB = maxSizeBytes / (1024 * 1024);
    console.warn(`⚠️ 即使最低质量 ${MIN_QUALITY}% 仍超过限制 (${sizeMB.toFixed(2)} MB > ${maxMB.toFixed(2)} MB)`);
  }

  return compressedBuffer;
}

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

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sizeMB = buffer.length / (1024 * 1024);

    console.log(`下载完成，原始大小: ${(buffer.length / 1024).toFixed(2)} KB (${sizeMB.toFixed(2)} MB)`);

    // 压缩图片
    const compressedBuffer = await compressImage(buffer, MAX_IMAGE_SIZE_BYTES);
    const compressedSizeMB = compressedBuffer.length / (1024 * 1024);

    // 检查压缩后大小
    if (compressedBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `参考图过大 (压缩后仍有 ${compressedSizeMB.toFixed(2)} MB)，超过限制 ${MAX_IMAGE_SIZE_MB} MB。` +
        `请使用更小的图片。`
      );
    }

    // 转换为 base64
    const base64 = compressedBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    console.log(`✓ 参考图处理成功，最终 base64 大小: ${(dataUrl.length / 1024).toFixed(2)} KB`);
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
