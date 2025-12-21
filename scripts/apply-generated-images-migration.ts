/**
 * 手动应用 generated_images 表的迁移
 * 添加 chapter_id 和 panel_ids 字段
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log("正在应用迁移...");

    // 1. 添加 chapter_id 列（如果不存在）
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "generated_images" 
      ADD COLUMN IF NOT EXISTS "chapter_id" UUID;
    `);
    console.log("✓ 添加 chapter_id 列");

    // 2. 添加 panel_ids 列（如果不存在）
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "generated_images" 
      ADD COLUMN IF NOT EXISTS "panel_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
    `);
    console.log("✓ 添加 panel_ids 列");

    // 3. 创建索引（如果不存在）
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_generated_images_chapter" 
      ON "generated_images"("chapter_id");
    `);
    console.log("✓ 创建索引 idx_generated_images_chapter");

    console.log("\n✅ 迁移完成！");
  } catch (error) {
    console.error("❌ 迁移失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

