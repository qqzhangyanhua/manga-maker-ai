/**
 * 设置 MinIO Bucket 为公开访问
 * 运行: npx tsx scripts/setup-minio.ts
 */

import { minioClient, MINIO_BUCKET, ensureBucketExists } from "../src/lib/minio";

async function setupMinIO() {
  try {
    console.log("🔧 开始配置 MinIO...");
    console.log(`📦 Bucket: ${MINIO_BUCKET}`);

    // 确保 bucket 存在并设置为公开
    await ensureBucketExists();

    console.log("✅ MinIO 配置成功！");
    console.log(`📸 图片现在可以通过 URL 直接访问`);
  } catch (error) {
    console.error("❌ 配置失败:", error);
    process.exit(1);
  }
}

setupMinIO();
