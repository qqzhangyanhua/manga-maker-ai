/**
 * 删除阻塞的数据库视图
 * 这个脚本会删除 v_chapter_search_metadata 视图，以便 Prisma 可以继续 schema 变更
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 开始删除阻塞的数据库视图...');

  try {
    // 删除视图（使用 CASCADE 自动删除所有依赖对象）
    await prisma.$executeRawUnsafe(`
      DROP VIEW IF EXISTS v_chapter_search_metadata CASCADE;
    `);

    console.log('✅ 视图已成功删除');
    console.log('');
    console.log('现在可以继续执行: npx prisma db push --accept-data-loss');

  } catch (error) {
    console.error('❌ 删除视图失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
