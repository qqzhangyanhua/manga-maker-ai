/**
 * 执行数据库迁移 - 添加 cover_image 字段
 */
import { prisma } from "../src/lib/db";

async function main() {
  try {
    console.log("开始执行数据库迁移...");

    // 执行 SQL 添加字段
    await prisma.$executeRawUnsafe(
      "ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS cover_image TEXT"
    );

    console.log("✅ 成功添加 cover_image 字段");

    // 添加注释
    await prisma.$executeRawUnsafe(
      "COMMENT ON COLUMN novel_projects.cover_image IS 'AI生成的封面图URL'"
    );

    console.log("✅ 成功添加字段注释");

    // 验证字段是否存在
    const result = await prisma.$queryRawUnsafe<
      Array<{ column_name: string; data_type: string; is_nullable: string }>
    >(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'novel_projects' AND column_name = 'cover_image'"
    );

    if (result.length > 0) {
      console.log("✅ 迁移验证成功:");
      console.log(result[0]);
    } else {
      console.error("❌ 字段验证失败 - 未找到 cover_image 字段");
    }

    console.log("\n迁移完成！");
  } catch (error) {
    console.error("❌ 迁移失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
