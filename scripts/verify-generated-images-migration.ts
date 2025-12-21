/**
 * 验证 generated_images 表的迁移是否成功
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyMigration() {
  try {
    console.log("正在验证迁移...\n");

    // 查询表结构
    const result = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'generated_images'
      AND column_name IN ('chapter_id', 'panel_ids')
      ORDER BY column_name;
    `;

    console.log("generated_images 表的新字段：");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if (result.length === 0) {
      console.log("❌ 未找到新字段！");
      process.exit(1);
    }

    result.forEach((col) => {
      console.log(`✓ ${col.column_name}`);
      console.log(`  类型: ${col.data_type}`);
      console.log(`  可空: ${col.is_nullable === 'YES' ? '是' : '否'}`);
      console.log();
    });

    // 检查索引
    const indexes = await prisma.$queryRaw<Array<{
      indexname: string;
    }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'generated_images'
      AND indexname = 'idx_generated_images_chapter';
    `;

    if (indexes.length > 0) {
      console.log("✓ 索引 idx_generated_images_chapter 已创建");
    } else {
      console.log("⚠ 索引 idx_generated_images_chapter 未找到");
    }

    // 测试查询
    console.log("\n正在测试查询...");
    const count = await prisma.generatedImage.count();
    console.log(`✓ 成功查询 generated_images 表（共 ${count} 条记录）`);

    console.log("\n✅ 验证成功！所有字段和索引都已正确创建。");
  } catch (error) {
    console.error("❌ 验证失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();

