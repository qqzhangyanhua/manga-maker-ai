/**
 * 分镜质量检查 CLI 工具
 * 
 * 使用方法：
 * pnpm tsx scripts/check-panel-quality.ts --story-id=xxx
 * pnpm tsx scripts/check-panel-quality.ts --chapter-id=xxx
 * pnpm tsx scripts/check-panel-quality.ts --chapter-id=xxx --report
 */

import { prisma } from "../src/lib/db";
import { checkChapterQuality, generateQualityReport } from "../src/lib/panel-quality-checker";
import * as fs from "fs";
import * as path from "path";

interface CheckOptions {
  storyId?: string;
  chapterId?: string;
  generateReport: boolean;
  outputDir: string;
}

/**
 * 检查章节质量
 */
async function checkChapter(chapterId: string, options: CheckOptions) {
  console.log(`\n正在检查章节 ${chapterId}...`);

  // 获取章节数据
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      story: {
        select: { title: true },
      },
    },
  });

  if (!chapter) {
    console.error(`✗ 章节 ${chapterId} 不存在`);
    return;
  }

  // 获取分镜
  const panels = await prisma.panel.findMany({
    where: { chapter_id: chapterId },
    orderBy: { panel_order: "asc" },
  });

  if (panels.length === 0) {
    console.log(`⊘ 章节 "${chapter.title}" 没有分镜`);
    return;
  }

  // 获取角色和场景
  const characterIds = panels
    .map((p) => p.character_id)
    .filter((id): id is string => id !== null);
  const sceneIds = panels
    .map((p) => p.scene_id)
    .filter((id): id is string => id !== null);

  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
  });

  const scenes = await prisma.scene.findMany({
    where: { id: { in: sceneIds } },
  });

  const characterMap = new Map(characters.map((c) => [c.id, c]));
  const sceneMap = new Map(scenes.map((s) => [s.id, s]));

  // 执行质量检查
  const result = checkChapterQuality(panels as any, characterMap as any, sceneMap as any);

  // 显示结果
  console.log(`\n========== 章节: ${chapter.title} ==========`);
  console.log(`总体得分: ${result.overallScore}/100 (${result.overallLevel})`);
  console.log(`分镜数量: ${panels.length}`);
  console.log();

  if (result.commonIssues.length > 0) {
    console.log("常见问题:");
    result.commonIssues.forEach((issue) => {
      console.log(`  ⚠️  ${issue}`);
    });
    console.log();
  }

  if (result.recommendations.length > 0) {
    console.log("推荐操作:");
    result.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    console.log();
  }

  // 显示分镜详情
  console.log("分镜详情:");
  result.panelResults.forEach((pr) => {
    const icon =
      pr.result.level === "excellent"
        ? "✅"
        : pr.result.level === "good"
        ? "✅"
        : pr.result.level === "warning"
        ? "⚠️"
        : "❌";

    console.log(
      `  ${icon} Panel ${pr.panelOrder}: ${pr.result.score}/100 (${pr.result.issues.length} 问题)`
    );

    if (pr.result.issues.length > 0) {
      pr.result.issues.forEach((issue) => {
        const typeIcon =
          issue.type === "error" ? "❌" : issue.type === "warning" ? "⚠️" : "ℹ️";
        console.log(`     ${typeIcon} ${issue.message}`);
      });
    }
  });

  // 生成报告文件
  if (options.generateReport) {
    const chapterTitle = `${chapter.title} (${chapter.chapter_order})`;
    const report = generateQualityReport(chapterTitle, result);
    const filename = `quality-report-${chapterId}-${Date.now()}.md`;
    const filepath = path.join(options.outputDir, filename);

    // 确保输出目录存在
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    fs.writeFileSync(filepath, report, "utf-8");
    console.log(`\n✓ 报告已生成: ${filepath}`);
  }
}

/**
 * 检查故事的所有章节
 */
async function checkStory(storyId: string, options: CheckOptions) {
  console.log(`\n正在检查故事 ${storyId} 的所有章节...`);

  const chapters = await prisma.chapter.findMany({
    where: { story_id: storyId },
    orderBy: { chapter_order: "asc" },
  });

  if (chapters.length === 0) {
    console.log(`⊘ 故事没有章节`);
    return;
  }

  console.log(`找到 ${chapters.length} 个章节\n`);

  for (const chapter of chapters) {
    await checkChapter(chapter.id, options);
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options: CheckOptions = {
    storyId: args.find((arg) => arg.startsWith("--story-id="))?.split("=")[1],
    chapterId: args.find((arg) => arg.startsWith("--chapter-id="))?.split("=")[1],
    generateReport: args.includes("--report"),
    outputDir: args.find((arg) => arg.startsWith("--output="))?.split("=")[1] || "./reports",
  };

  if (!options.storyId && !options.chapterId) {
    console.error("错误: 必须指定 --story-id 或 --chapter-id");
    console.log("\n使用方法:");
    console.log("  pnpm tsx scripts/check-panel-quality.ts --story-id=xxx");
    console.log("  pnpm tsx scripts/check-panel-quality.ts --chapter-id=xxx");
    console.log("  pnpm tsx scripts/check-panel-quality.ts --chapter-id=xxx --report");
    console.log("  pnpm tsx scripts/check-panel-quality.ts --chapter-id=xxx --report --output=./my-reports");
    process.exit(1);
  }

  try {
    if (options.chapterId) {
      await checkChapter(options.chapterId, options);
    } else if (options.storyId) {
      await checkStory(options.storyId, options);
    }

    console.log("\n✓ 检查完成");
  } catch (error) {
    console.error("检查失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行
main();
