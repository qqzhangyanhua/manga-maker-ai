/**
 * 执行 quality_scores 表迁移脚本
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始执行数据库迁移: quality_scores 表');

  try {
    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add_quality_score.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 读取迁移 SQL 文件成功');

    // 拆分 SQL 语句(Prisma 不支持多语句执行)
    const sqlStatements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\n📋 共 ${sqlStatements.length} 条 SQL 语句需要执行\n`);

    // 逐条执行 SQL
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      console.log(`⏳ [${i + 1}/${sqlStatements.length}] 执行中...`);
      console.log(`   ${statement.substring(0, 60)}...`);

      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`   ✅ 执行成功\n`);
      } catch (error: any) {
        // 如果是"已存在"的错误,可以忽略
        if (error.message?.includes('already exists') || error.code === '42P07') {
          console.log(`   ⚠️  已存在,跳过\n`);
        } else {
          console.error(`   ❌ 执行失败:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ 数据库迁移执行成功!');
    console.log('\n📊 验证表是否创建成功...');

    // 验证表是否存在
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'quality_scores'
      ) as exists;
    `;

    if (result[0]?.exists) {
      console.log('✅ quality_scores 表已成功创建!');
    } else {
      console.log('⚠️  警告: quality_scores 表可能未创建');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
