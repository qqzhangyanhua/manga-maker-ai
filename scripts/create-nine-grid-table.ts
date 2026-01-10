/**
 * 创建 nine_grid_images 表的脚本
 * 使用 Prisma 的 $executeRaw 直接执行 SQL
 */

import { prisma } from "../src/lib/db";

async function createNineGridTable() {
  try {
    console.log("开始创建 nine_grid_images 表...");

    // 创建表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "nine_grid_images" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "chapter_id" UUID NOT NULL,
        "panel_ids" TEXT[] NOT NULL,
        "image_url" TEXT NOT NULL,
        "prompt_combined" TEXT NOT NULL,
        "comic_style_id" UUID,
        "reference_image" TEXT,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "nine_grid_images_pkey" PRIMARY KEY ("id")
      )
    `;

    console.log("✅ 表创建成功");

    // 创建索引
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_nine_grid_images_user" ON "nine_grid_images"("user_id")
    `;

    console.log("✅ 用户索引创建成功");

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_nine_grid_images_chapter" ON "nine_grid_images"("chapter_id")
    `;

    console.log("✅ 章节索引创建成功");

    // 验证表是否存在
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'nine_grid_images'
      )
    `;

    if (result[0]?.exists) {
      console.log("\n🎉 nine_grid_images 表已成功创建并验证！");
    } else {
      console.error("\n❌ 表创建失败，请检查数据库连接");
    }
  } catch (error) {
    console.error("❌ 创建表时出错:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行脚本
createNineGridTable()
  .then(() => {
    console.log("\n✅ 脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 脚本执行失败:", error);
    process.exit(1);
  });
