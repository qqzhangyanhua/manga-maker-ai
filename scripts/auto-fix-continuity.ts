/**
 * 一键修复脚本：自动为所有故事提取角色状态
 * 使用方法：npx tsx scripts/auto-fix-continuity.ts
 */

import { PrismaClient } from "@prisma/client";
import { batchExtractStoryStates } from "../src/lib/character-state-extractor";

const prisma = new PrismaClient();

async function autoFixContinuity() {
  console.log("🚀 开始自动修复剧情连贯性问题...\n");

  // 1. 获取所有有章节的故事
  const stories = await prisma.story.findMany({
    where: {
      chapters: {
        some: {},
      },
    },
    include: {
      _count: {
        select: {
          chapters: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  console.log(`找到 ${stories.length} 个故事需要处理\n`);

  if (stories.length === 0) {
    console.log("✅ 没有需要处理的故事");
    return;
  }

  // 2. 逐个处理故事
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];

    console.log("━".repeat(60));
    console.log(`[${i + 1}/${stories.length}] ${story.title}`);
    console.log(`  章节数: ${story._count.chapters}`);
    console.log(`  用户ID: ${story.user_id}`);
    console.log("━".repeat(60));

    try {
      // 提取所有章节的角色状态
      await batchExtractStoryStates(story.id, story.user_id);

      console.log(`✅ ${story.title} - 处理完成\n`);
    } catch (error) {
      console.error(`❌ ${story.title} - 处理失败:`, error);
      console.log("继续处理下一个故事...\n");
    }

    // API 限流保护
    if (i < stories.length - 1) {
      console.log("⏳ 等待 5 秒以避免 API 限流...\n");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("🎉 自动修复完成！");
  console.log("═".repeat(60));

  // 3. 生成修复报告
  console.log("\n📊 修复报告:");

  const totalStates = await prisma.chapterCharacterState.count();
  const statesPerStory = await prisma.chapterCharacterState.groupBy({
    by: ["chapter_id"],
    _count: {
      _all: true,
    },
  });

  console.log(`  总角色状态记录: ${totalStates}`);
  console.log(`  有状态记录的章节: ${statesPerStory.length}`);

  const keyChapters = await prisma.chapter.count({
    where: {
      is_key_chapter: true,
    },
  });

  console.log(`  标记为关键的章节: ${keyChapters}`);

  // 4. 生成建议
  console.log("\n💡 后续建议:");
  console.log("  1. 在前端页面添加「查看角色状态」功能，让用户可以查看和编辑");
  console.log("  2. 在生成分镜后自动调用状态提取（已创建API）");
  console.log("  3. 添加「连贯性检查」功能，检测剧情冲突（如受伤状态消失）");
  console.log("  4. 为重要章节补充详细内容（content字段）");
}

autoFixContinuity()
  .catch((error) => {
    console.error("❌ 自动修复失败:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
