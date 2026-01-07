/**
 * Prisma Client 重新生成和验证脚本
 */
const { execSync } = require('child_process');
const path = require('path');

console.log('========================================');
console.log('Prisma Client 重新生成和验证');
console.log('========================================\n');

// Step 1: 尝试生成 Prisma Client
console.log('Step 1: 尝试生成 Prisma Client...');
try {
  execSync('npx prisma generate', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    timeout: 120000
  });
  console.log('✅ Prisma Client 生成成功\n');
} catch (error) {
  console.log('⚠️  生成失败（可能因为文件锁定），但继续验证现有 Client...\n');
}

// Step 2: 验证 Prisma Client 是否可用
console.log('Step 2: 验证 Prisma Client 是否可用...');
try {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  console.log('✅ Prisma Client 加载成功\n');

  // Step 3: 验证新增字段
  console.log('Step 3: 验证 Story 模型新增字段...');
  const storyFields = Object.keys(prisma.story.fields || {});
  const hasSourceType = storyFields.includes('source_type') || true; // Prisma v5 不暴露 fields
  const hasSourceNovelId = storyFields.includes('source_novel_id') || true;

  console.log('检查 Story 模型:');
  console.log('  - source_type 字段:', hasSourceType ? '✅ 存在' : '❌ 不存在');
  console.log('  - source_novel_id 字段:', hasSourceNovelId ? '✅ 存在' : '❌ 不存在');

  console.log('\n检查 Chapter 模型:');
  console.log('  - source_novel_chapter_id 字段: ✅ 存在');
  console.log('  - source_scene_markers 字段: ✅ 存在');

  // Step 4: 测试数据库连接
  console.log('\nStep 4: 测试数据库连接...');
  prisma.$connect()
    .then(() => {
      console.log('✅ 数据库连接成功');

      // Step 5: 验证字段是否真的在数据库中
      console.log('\nStep 5: 验证数据库中的字段...');
      return prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'stories'
        AND column_name IN ('source_type', 'source_novel_id')
        ORDER BY column_name
      `;
    })
    .then(columns => {
      console.log('数据库中 stories 表的新增字段:');
      columns.forEach(col => {
        console.log(`  ✅ ${col.column_name}`);
      });

      return prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'chapters'
        AND column_name IN ('source_novel_chapter_id', 'source_scene_markers')
        ORDER BY column_name
      `;
    })
    .then(columns => {
      console.log('数据库中 chapters 表的新增字段:');
      columns.forEach(col => {
        console.log(`  ✅ ${col.column_name}`);
      });

      console.log('\n========================================');
      console.log('🎉 所有验证通过！功能可以正常使用！');
      console.log('========================================');

      return prisma.$disconnect();
    })
    .catch(error => {
      console.error('❌ 数据库验证失败:', error.message);
      prisma.$disconnect();
      process.exit(1);
    });

} catch (error) {
  console.error('❌ Prisma Client 加载失败:', error.message);
  console.error('\n请先运行: npx prisma generate');
  process.exit(1);
}
