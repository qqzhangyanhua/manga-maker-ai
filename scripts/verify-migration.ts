/**
 * 验证迁移结果并检查现有数据
 */
import { prisma } from "../src/lib/db";

async function main() {
  try {
    console.log("📊 验证数据库迁移结果\n");

    // 1. 检查字段定义
    console.log("1️⃣ 字段定义:");
    const columnInfo = await prisma.$queryRawUnsafe<
      Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>
    >(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'novel_projects'
         AND column_name = 'cover_image'`
    );

    if (columnInfo.length > 0) {
      console.table(columnInfo);
    } else {
      console.error("❌ 未找到 cover_image 字段");
      return;
    }

    // 2. 统计现有项目
    const totalProjects = await prisma.novelProject.count();
    console.log(`\n2️⃣ 数据统计:`);
    console.log(`   总项目数: ${totalProjects}`);

    // 3. 检查现有项目的封面状态
    const projectsWithCover = await prisma.novelProject.count({
      where: {
        cover_image: {
          not: null,
        },
      },
    });

    const projectsWithoutCover = totalProjects - projectsWithCover;

    console.log(`   有封面项目: ${projectsWithCover}`);
    console.log(`   无封面项目: ${projectsWithoutCover}`);

    // 4. 列出前5个项目
    if (totalProjects > 0) {
      console.log(`\n3️⃣ 项目示例（前5个）:`);
      const projects = await prisma.novelProject.findMany({
        take: 5,
        select: {
          id: true,
          title: true,
          cover_image: true,
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      projects.forEach((p, index) => {
        console.log(
          `   ${index + 1}. ${p.title} - 封面: ${p.cover_image ? "✅" : "❌"}`
        );
      });
    }

    console.log("\n✅ 迁移验证完成！");
  } catch (error) {
    console.error("❌ 验证失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
