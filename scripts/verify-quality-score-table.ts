/**
 * 验证 quality_scores 表结构和关系
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 验证 quality_scores 表结构...\n');

  try {
    // 1. 检查表是否存在
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'quality_scores'
      ) as exists;
    `;

    if (!tableExists[0]?.exists) {
      console.log('❌ quality_scores 表不存在!');
      return;
    }

    console.log('✅ quality_scores 表存在');

    // 2. 检查列结构
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quality_scores'
      ORDER BY ordinal_position;
    `;

    console.log('\n📋 列结构:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });

    // 3. 检查索引
    const indexes = await prisma.$queryRaw<Array<{
      indexname: string;
    }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'quality_scores';
    `;

    console.log('\n🔑 索引:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    // 4. 检查外键约束
    const constraints = await prisma.$queryRaw<Array<{
      constraint_name: string;
      constraint_type: string;
    }>>`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'quality_scores';
    `;

    console.log('\n🔗 约束:');
    constraints.forEach(con => {
      console.log(`   - ${con.constraint_name}: ${con.constraint_type}`);
    });

    // 5. 检查与 novel_chapter_versions 的关联
    const foreignKey = await prisma.$queryRaw<Array<{
      constraint_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>>`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'quality_scores';
    `;

    if (foreignKey.length > 0) {
      console.log('\n🔗 外键关联:');
      foreignKey.forEach(fk => {
        console.log(`   - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

    console.log('\n✅ 所有验证通过!');

  } catch (error) {
    console.error('❌ 验证失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
