/**
 * 分镜角色关联迁移脚本
 * 
 * 功能：
 * 1. 从分镜描述中提取角色名称
 * 2. 查找匹配的角色资产
 * 3. 自动关联 character_id
 * 
 * 使用方法：
 * pnpm tsx scripts/migrate-panel-characters.ts [--dry-run] [--story-id=xxx]
 */

import { prisma } from "../src/lib/db";
import { extractCharacterNames } from "../src/lib/panel-prompt-builder";

interface MigrationOptions {
  dryRun: boolean;
  storyId?: string;
  chapterId?: string;
}

interface MigrationResult {
  totalPanels: number;
  updatedPanels: number;
  skippedPanels: number;
  errors: Array<{ panelId: string; error: string }>;
  updates: Array<{
    panelId: string;
    panelOrder: number;
    description: string;
    extractedNames: string[];
    matchedCharacter: string | null;
  }>;
}

/**
 * 执行迁移
 */
async function migratePanelCharacters(
  options: MigrationOptions
): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalPanels: 0,
    updatedPanels: 0,
    skippedPanels: 0,
    errors: [],
    updates: [],
  };

  console.log("\n========== 分镜角色关联迁移 ==========");
  console.log(`模式: ${options.dryRun ? "预览模式（不会实际修改）" : "执行模式"}`);
  if (options.storyId) {
    console.log(`范围: Story ${options.storyId}`);
  } else if (options.chapterId) {
    console.log(`范围: Chapter ${options.chapterId}`);
  } else {
    console.log(`范围: 所有分镜`);
  }
  console.log("=====================================\n");

  // 构建查询条件
  const where: any = {
    character_id: null, // 只处理未关联的分镜
  };

  if (options.storyId) {
    where.chapter = {
      story_id: options.storyId,
    };
  } else if (options.chapterId) {
    where.chapter_id = options.chapterId;
  }

  // 获取需要处理的分镜
  const panels = await prisma.panel.findMany({
    where,
    include: {
      chapter: {
        include: {
          story: {
            select: {
              id: true,
              title: true,
              project_id: true,
            },
          },
        },
      },
      project: {
        select: {
          user_id: true,
        },
      },
    },
    orderBy: [
      { chapter_id: "asc" },
      { panel_order: "asc" },
    ],
  });

  result.totalPanels = panels.length;
  console.log(`找到 ${panels.length} 个未关联角色的分镜\n`);

  if (panels.length === 0) {
    console.log("✓ 所有分镜都已关联角色，无需迁移");
    return result;
  }

  // 按用户分组处理
  const panelsByUser = new Map<string, typeof panels>();
  for (const panel of panels) {
    const userId = panel.project.user_id;
    if (!panelsByUser.has(userId)) {
      panelsByUser.set(userId, []);
    }
    panelsByUser.get(userId)!.push(panel);
  }

  // 处理每个用户的分镜
  for (const [userId, userPanels] of panelsByUser) {
    console.log(`\n--- 处理用户 ${userId} 的 ${userPanels.length} 个分镜 ---\n`);

    // 获取该用户的所有角色
    const characters = await prisma.character.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        name: true,
        reference_image: true,
        base_image_url: true,
      },
    });

    console.log(`用户有 ${characters.length} 个角色: ${characters.map((c) => c.name).join(", ")}\n`);

    // 处理每个分镜
    for (const panel of userPanels) {
      try {
        // 提取角色名称
        const description = panel.description || "";
        const extractedNames = extractCharacterNames(description);

        if (extractedNames.length === 0) {
          result.skippedPanels++;
          console.log(
            `⊘ Panel ${panel.panel_order} (${panel.id.substring(0, 8)}...): 未提取到角色名称`
          );
          continue;
        }

        // 查找匹配的角色（优先完全匹配）
        let matchedCharacter = characters.find((c) =>
          extractedNames.includes(c.name)
        );

        // 如果没有完全匹配，尝试模糊匹配
        if (!matchedCharacter) {
          matchedCharacter = characters.find((c) =>
            extractedNames.some((name) => name.includes(c.name) || c.name.includes(name))
          );
        }

        if (!matchedCharacter) {
          result.skippedPanels++;
          console.log(
            `⊘ Panel ${panel.panel_order} (${panel.id.substring(0, 8)}...): 提取到 [${extractedNames.join(", ")}] 但未找到匹配角色`
          );
          continue;
        }

        // 记录更新
        result.updates.push({
          panelId: panel.id,
          panelOrder: panel.panel_order,
          description: description.substring(0, 60) + "...",
          extractedNames,
          matchedCharacter: matchedCharacter.name,
        });

        // 执行更新（如果不是预览模式）
        if (!options.dryRun) {
          await prisma.panel.update({
            where: { id: panel.id },
            data: { character_id: matchedCharacter.id },
          });
        }

        result.updatedPanels++;
        console.log(
          `✓ Panel ${panel.panel_order} (${panel.id.substring(0, 8)}...): [${extractedNames.join(", ")}] → ${matchedCharacter.name}`
        );
      } catch (error) {
        result.errors.push({
          panelId: panel.id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(
          `✗ Panel ${panel.panel_order} (${panel.id.substring(0, 8)}...): 错误 - ${error}`
        );
      }
    }
  }

  return result;
}

/**
 * 生成迁移报告
 */
function generateReport(result: MigrationResult, options: MigrationOptions): void {
  console.log("\n========== 迁移报告 ==========");
  console.log(`总分镜数: ${result.totalPanels}`);
  console.log(`已更新: ${result.updatedPanels}`);
  console.log(`已跳过: ${result.skippedPanels}`);
  console.log(`错误数: ${result.errors.length}`);
  console.log("============================\n");

  if (options.dryRun && result.updatedPanels > 0) {
    console.log("⚠️ 这是预览模式，未实际修改数据");
    console.log("要执行实际迁移，请移除 --dry-run 参数\n");
  }

  if (result.updates.length > 0) {
    console.log("详细更新列表:");
    result.updates.forEach((update, index) => {
      console.log(
        `${index + 1}. Panel ${update.panelOrder}: ${update.matchedCharacter}`
      );
      console.log(`   描述: ${update.description}`);
      console.log(`   提取: [${update.extractedNames.join(", ")}]`);
    });
    console.log();
  }

  if (result.errors.length > 0) {
    console.log("错误列表:");
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. Panel ${error.panelId}: ${error.error}`);
    });
    console.log();
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes("--dry-run"),
    storyId: args.find((arg) => arg.startsWith("--story-id="))?.split("=")[1],
    chapterId: args.find((arg) => arg.startsWith("--chapter-id="))?.split("=")[1],
  };

  try {
    const result = await migratePanelCharacters(options);
    generateReport(result, options);

    if (!options.dryRun && result.updatedPanels > 0) {
      console.log("✓ 迁移完成！");
    }
  } catch (error) {
    console.error("迁移失败:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行
main();
