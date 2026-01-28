/**
 * P0-1: 数据修复脚本 - 修复 TimelineChapter.chapter_id 为空的问题
 *
 * 使用方法:
 * npx ts-node scripts/fix-timeline-chapter-ids.ts
 *
 * 功能:
 * 1. 检查所有 TimelineChapter 记录
 * 2. 找出 chapter_id 为空或无效的记录
 * 3. 尝试通过 timeline_id + chapter_number 匹配 NovelChapter 并修复
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FixResult {
  timelineChapterId: string;
  chapterNumber: number;
  status: "fixed" | "unfixable" | "already_valid";
  reason?: string;
  novelChapterId?: string;
}

async function fixTimelineChapterIds(): Promise<void> {
  console.log("=".repeat(60));
  console.log("P0-1: 修复 TimelineChapter.chapter_id 数据一致性问题");
  console.log("=".repeat(60));
  console.log("");

  // 1. 获取所有 TimelineChapter 记录
  const timelineChapters = await prisma.timelineChapter.findMany({
    include: {
      timeline: {
        select: {
          id: true,
          novel_project_id: true,
          title: true,
        },
      },
    },
  });

  console.log(`找到 ${timelineChapters.length} 条 TimelineChapter 记录`);
  console.log("");

  const results: FixResult[] = [];
  let fixedCount = 0;
  let unfixableCount = 0;
  let validCount = 0;

  for (const tc of timelineChapters) {
    // 检查 chapter_id 是否有效
    if (tc.chapter_id) {
      // 验证 chapter_id 指向的 NovelChapter 是否存在
      const novelChapter = await prisma.novelChapter.findUnique({
        where: { id: tc.chapter_id },
        select: { id: true },
      });

      if (novelChapter) {
        validCount++;
        results.push({
          timelineChapterId: tc.id,
          chapterNumber: tc.chapter_number,
          status: "already_valid",
          novelChapterId: tc.chapter_id,
        });
        continue;
      }
    }

    // chapter_id 为空或无效，尝试修复
    console.log(`⚠️ TimelineChapter ${tc.id} (章节 ${tc.chapter_number}) chapter_id 为空或无效`);

    if (!tc.timeline.novel_project_id) {
      console.log(`  ❌ 无法修复：Timeline 未关联 NovelProject`);
      unfixableCount++;
      results.push({
        timelineChapterId: tc.id,
        chapterNumber: tc.chapter_number,
        status: "unfixable",
        reason: "Timeline 未关联 NovelProject",
      });
      continue;
    }

    // 尝试通过 project_id + chapter_number 查找 NovelChapter
    const matchingNovelChapter = await prisma.novelChapter.findFirst({
      where: {
        project_id: tc.timeline.novel_project_id,
        chapter_number: tc.chapter_number,
      },
      select: { id: true, title: true },
    });

    if (!matchingNovelChapter) {
      console.log(`  ❌ 无法修复：未找到匹配的 NovelChapter`);
      console.log(`     project_id: ${tc.timeline.novel_project_id}`);
      console.log(`     chapter_number: ${tc.chapter_number}`);
      unfixableCount++;
      results.push({
        timelineChapterId: tc.id,
        chapterNumber: tc.chapter_number,
        status: "unfixable",
        reason: `未找到 project_id=${tc.timeline.novel_project_id}, chapter_number=${tc.chapter_number} 的 NovelChapter`,
      });
      continue;
    }

    // 修复数据
    await prisma.timelineChapter.update({
      where: { id: tc.id },
      data: { chapter_id: matchingNovelChapter.id },
    });

    console.log(`  ✅ 已修复：关联到 NovelChapter ${matchingNovelChapter.id} (${matchingNovelChapter.title})`);
    fixedCount++;
    results.push({
      timelineChapterId: tc.id,
      chapterNumber: tc.chapter_number,
      status: "fixed",
      novelChapterId: matchingNovelChapter.id,
    });
  }

  // 输出统计
  console.log("");
  console.log("=".repeat(60));
  console.log("修复结果统计");
  console.log("=".repeat(60));
  console.log(`总记录数: ${timelineChapters.length}`);
  console.log(`已有效: ${validCount}`);
  console.log(`已修复: ${fixedCount}`);
  console.log(`无法修复: ${unfixableCount}`);
  console.log("");

  if (unfixableCount > 0) {
    console.log("⚠️ 无法修复的记录需要手动处理或删除:");
    results
      .filter((r) => r.status === "unfixable")
      .forEach((r) => {
        console.log(`  - TimelineChapter ${r.timelineChapterId}: ${r.reason}`);
      });
  }

  console.log("");
  console.log("修复完成！");
}

// 执行
fixTimelineChapterIds()
  .catch((error) => {
    console.error("修复脚本执行失败:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
