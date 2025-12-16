import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始添加 comic_style_id 字段到 characters 表...');

  try {
    // 使用 Prisma 的 raw query 执行 SQL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "characters"
      ADD COLUMN IF NOT EXISTS "comic_style_id" UUID;
    `);
    console.log('✓ 字段添加成功');

    // 创建索引
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_characters_comic_style"
      ON "characters"("comic_style_id");
    `);
    console.log('✓ 索引创建成功');

    // 添加外键约束
    // 先检查约束是否已存在
    const constraintExists = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count
       FROM information_schema.table_constraints
       WHERE constraint_name = 'characters_comic_style_id_fkey'
       AND table_name = 'characters'`
    );

    if (Number(constraintExists[0].count) === 0) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "characters"
        ADD CONSTRAINT "characters_comic_style_id_fkey"
        FOREIGN KEY ("comic_style_id")
        REFERENCES "comic_styles"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      `);
      console.log('✓ 外键约束添加成功');
    } else {
      console.log('✓ 外键约束已存在，跳过');
    }

    // 验证字段
    const verification = await prisma.$queryRawUnsafe<
      Array<{ column_name: string; data_type: string; is_nullable: string }>
    >(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'characters' AND column_name = 'comic_style_id'`
    );

    if (verification.length > 0) {
      console.log('\n✓ 迁移验证成功！');
      console.log('字段信息：', verification[0]);
    } else {
      console.log('\n✗ 警告：无法验证字段是否添加成功');
    }

    console.log('\n✅ 迁移完成！现在可以使用 comic_style_id 字段了。');
  } catch (error) {
    console.error('❌ 迁移失败：', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
