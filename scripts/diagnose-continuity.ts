/**
 * 剧情连贯性诊断脚本
 * 检查关键数据是否完整
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function diagnoseContinuity() {
  console.log("🔍 开始诊断剧情连贯性问题...\n");

  // 1. 检查章节内容完整性
  console.log("📖 检查章节内容完整性:");
  const chapters = await prisma.chapter.findMany({
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      is_key_chapter: true,
      key_chapter_reason: true,
      story: {
        select: {
          title: true,
        },
      },
    },
  });

  const emptySummary = chapters.filter((c) => !c.summary);
  const emptyContent = chapters.filter((c) => !c.content);
  const unmarkedKeyChapters = chapters.filter(
    (c) => !c.is_key_chapter && c.title.includes("第一章")
  );

  console.log(`  总章节数: ${chapters.length}`);
  console.log(`  ❌ 缺少梗概(summary): ${emptySummary.length} 个`);
  console.log(`  ⚠️  缺少详细内容(content): ${emptyContent.length} 个`);
  console.log(
    `  ⚠️  未标记关键章节: ${unmarkedKeyChapters.length} 个`
  );

  if (emptySummary.length > 0) {
    console.log("\n  缺少梗概的章节:");
    emptySummary.forEach((c) => {
      console.log(`    - ${c.story.title} / ${c.title}`);
    });
  }

  // 2. 检查角色状态追踪
  console.log("\n👤 检查角色状态追踪:");
  const characterStates = await prisma.chapterCharacterState.findMany({
    select: {
      chapter: {
        select: {
          title: true,
        },
      },
      character: {
        select: {
          name: true,
        },
      },
      location: true,
      physical_condition: true,
      mental_state: true,
    },
  });

  console.log(`  总状态记录数: ${characterStates.length}`);

  if (characterStates.length === 0) {
    console.log(
      "  ❌ 没有任何角色状态记录！这是导致不连贯的主要原因。"
    );
  } else {
    const incompleteStates = characterStates.filter(
      (s) => !s.location || !s.physical_condition || !s.mental_state
    );
    console.log(`  ⚠️  不完整的状态记录: ${incompleteStates.length} 个`);
  }

  // 3. 检查故事大纲完整性
  console.log("\n📝 检查故事大纲完整性:");
  const stories = await prisma.story.findMany({
    select: {
      title: true,
      premise: true,
      outline: true,
      genre: true,
      _count: {
        select: {
          chapters: true,
        },
      },
    },
  });

  console.log(`  总故事数: ${stories.length}`);

  stories.forEach((story) => {
    const hasOutline = story.outline && Object.keys(story.outline as object).length > 0;
    const outlineStatus = hasOutline ? "✅" : "❌";
    console.log(
      `  ${outlineStatus} ${story.title} (${story._count.chapters}章) - 大纲: ${hasOutline ? "完整" : "缺失"}`
    );
  });

  // 4. 检查关键章节标记
  console.log("\n🔖 检查关键章节标记:");
  const keyChapters = await prisma.chapter.findMany({
    where: {
      is_key_chapter: true,
    },
    select: {
      title: true,
      key_chapter_reason: true,
      story: {
        select: {
          title: true,
        },
      },
    },
  });

  console.log(`  标记为关键章节: ${keyChapters.length} 个`);

  if (keyChapters.length === 0) {
    console.log(
      "  ⚠️  建议：标记重要的章节（剧情转折、角色死亡等）为关键章节"
    );
  } else {
    keyChapters.forEach((kc) => {
      console.log(
        `    - ${kc.story.title} / ${kc.title}: ${kc.key_chapter_reason || "未说明原因"}`
      );
    });
  }

  // 5. 生成诊断报告
  console.log("\n\n📋 诊断报告:");
  console.log("═".repeat(60));

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (emptySummary.length > 0) {
    issues.push(`${emptySummary.length} 个章节缺少梗概`);
    recommendations.push("为每个章节添加详细梗概（summary字段）");
  }

  if (emptyContent.length > chapters.length * 0.5) {
    issues.push(`${emptyContent.length} 个章节缺少详细内容`);
    recommendations.push(
      "为关键章节添加详细内容（content字段，2000-5000字）"
    );
  }

  if (characterStates.length === 0) {
    issues.push("没有角色状态追踪记录");
    recommendations.push(
      "在每章结束时记录角色状态（位置、身体状况、心理状态）"
    );
  }

  if (keyChapters.length === 0 && chapters.length > 5) {
    issues.push("没有标记关键章节");
    recommendations.push("标记重要章节为关键章节（转折点、高潮等）");
  }

  if (issues.length === 0) {
    console.log("✅ 数据完整性检查通过！");
    console.log("\n如果仍然遇到连贯性问题，可能的原因：");
    console.log("  1. LLM模型质量不足");
    console.log("  2. 上下文窗口过小（仅加载最近10章）");
    console.log("  3. Prompt设计需要优化");
  } else {
    console.log("❌ 发现以下问题:");
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });

    console.log("\n💡 改进建议:");
    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }

  console.log("═".repeat(60));
}

diagnoseContinuity()
  .catch((error) => {
    console.error("诊断失败:", error);
  })
  .finally(() => {
    prisma.$disconnect();
  });
