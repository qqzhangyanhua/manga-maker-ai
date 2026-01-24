/**
 * 直接删除场景图相关的数据库字段和表
 * 绕过 Prisma 的完整性检查
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 开始删除场景图相关的数据库结构...\n');

  try {
    // 1. 删除 comic_panel_results.scene_image_id 字段
    console.log('1️⃣ 删除 comic_panel_results.scene_image_id...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE comic_panel_results DROP COLUMN IF EXISTS scene_image_id CASCADE;
    `);
    console.log('   ✅ 已删除\n');

    // 2. 删除 shot_designs.shared_scene_id 字段
    console.log('2️⃣ 删除 shot_designs.shared_scene_id...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE shot_designs DROP COLUMN IF EXISTS shared_scene_id CASCADE;
    `);
    console.log('   ✅ 已删除\n');

    // 3. 删除 timeline_chapters 的场景相关字段
    console.log('3️⃣ 删除 timeline_chapters.scene_status 和 scene_image_count...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE timeline_chapters DROP COLUMN IF EXISTS scene_status CASCADE;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE timeline_chapters DROP COLUMN IF EXISTS scene_image_count CASCADE;
    `);
    console.log('   ✅ 已删除\n');

    // 4. 删除 scene_images 表
    console.log('4️⃣ 删除 scene_images 表...');
    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS scene_images CASCADE;
    `);
    console.log('   ✅ 已删除\n');

    console.log('🎉 场景图相关结构删除完成！');
    console.log('');
    console.log('下一步：运行 npx prisma db pull 同步 schema.prisma');

  } catch (error) {
    console.error('❌ 删除失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
