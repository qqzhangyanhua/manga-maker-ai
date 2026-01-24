/**
 * 九宫格角色参考图问题诊断脚本
 * 
 * 用法:
 *   npx tsx scripts/diagnose-nine-grid-characters.ts <chapterId>
 * 
 * 功能:
 * 1. 检查章节是否存在
 * 2. 检查用户是否有角色
 * 3. 检查角色数据完整性
 * 4. 模拟 API 调用
 */

import { prisma } from "../src/lib/db";

interface DiagnosticResult {
  step: string;
  status: "✅ 通过" | "❌ 失败" | "⚠️ 警告";
  message: string;
  data?: any;
}

async function diagnose(chapterId: string): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Step 1: 检查章节是否存在
  console.log("\n📋 Step 1: 检查章节是否存在...");
  try {
    const chapter = await prisma.novelChapter.findUnique({
      where: { id: chapterId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            user_id: true,
          },
        },
      },
    });

    if (!chapter) {
      results.push({
        step: "章节检查",
        status: "❌ 失败",
        message: `章节 ${chapterId} 不存在`,
      });
      return results; // 后续检查无意义
    }

    results.push({
      step: "章节检查",
      status: "✅ 通过",
      message: `章节存在: 第 ${chapter.chapter_number} 章`,
      data: {
        chapterId: chapter.id,
        chapterNumber: chapter.chapter_number,
        projectId: chapter.project.id,
        projectTitle: chapter.project.title,
        userId: chapter.project.user_id,
      },
    });

    const userId = chapter.project.user_id;

    // Step 2: 检查用户是否有角色
    console.log("\n👤 Step 2: 检查用户是否有角色...");
    const characters = await prisma.character.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        name: true,
        description: true,
        base_image_url: true,
        reference_image: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
      take: 20,
    });

    if (characters.length === 0) {
      results.push({
        step: "角色检查",
        status: "❌ 失败",
        message: "用户没有创建任何角色",
        data: { userId, characterCount: 0 },
      });
      return results;
    }

    results.push({
      step: "角色检查",
      status: "✅ 通过",
      message: `用户有 ${characters.length} 个角色`,
      data: {
        userId,
        characterCount: characters.length,
        characters: characters.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.description || "(无描述)",
          hasAvatar: !!c.base_image_url,
          hasReference: !!c.reference_image,
          createdAt: c.created_at,
        })),
      },
    });

    // Step 3: 检查角色数据完整性
    console.log("\n🔍 Step 3: 检查角色数据完整性...");
    const charactersWithoutAvatar = characters.filter((c) => !c.base_image_url);
    const charactersWithoutReference = characters.filter((c) => !c.reference_image);

    if (charactersWithoutAvatar.length > 0) {
      results.push({
        step: "角色头像检查",
        status: "⚠️ 警告",
        message: `${charactersWithoutAvatar.length} 个角色没有头像`,
        data: {
          charactersWithoutAvatar: charactersWithoutAvatar.map((c) => c.name),
        },
      });
    } else {
      results.push({
        step: "角色头像检查",
        status: "✅ 通过",
        message: "所有角色都有头像",
      });
    }

    if (charactersWithoutReference.length > 0) {
      results.push({
        step: "角色参考图检查",
        status: "⚠️ 警告",
        message: `${charactersWithoutReference.length} 个角色没有参考图`,
        data: {
          charactersWithoutReference: charactersWithoutReference.map((c) => c.name),
        },
      });
    } else {
      results.push({
        step: "角色参考图检查",
        status: "✅ 通过",
        message: "所有角色都有参考图",
      });
    }

    // Step 4: 模拟 API 响应
    console.log("\n🌐 Step 4: 模拟 API 响应...");
    const apiResponse = {
      characters: characters.map((char) => ({
        id: char.id,
        name: char.name,
        role: char.description || undefined,
        avatar_url: char.base_image_url || undefined,
        reference_image_url: char.reference_image || undefined,
      })),
    };

    results.push({
      step: "API 响应模拟",
      status: "✅ 通过",
      message: `API 将返回 ${apiResponse.characters.length} 个角色`,
      data: apiResponse,
    });

    // Step 5: 检查章节-角色关联 (如果表存在)
    console.log("\n🔗 Step 5: 检查章节-角色关联...");
    try {
      // 尝试查询关联表 (可能不存在)
      const linkedCharacters = await (prisma as any).novelChapterCharacter.findMany({
        where: { chapter_id: chapterId },
        include: {
          character: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (linkedCharacters.length === 0) {
        results.push({
          step: "章节-角色关联",
          status: "⚠️ 警告",
          message: "章节没有关联任何角色 (使用降级策略: 返回用户所有角色)",
          data: { linkedCount: 0 },
        });
      } else {
        results.push({
          step: "章节-角色关联",
          status: "✅ 通过",
          message: `章节关联了 ${linkedCharacters.length} 个角色`,
          data: {
            linkedCount: linkedCharacters.length,
            linkedCharacters: linkedCharacters.map((lc: any) => lc.character.name),
          },
        });
      }
    } catch (error) {
      results.push({
        step: "章节-角色关联",
        status: "⚠️ 警告",
        message: "关联表不存在 (novel_chapter_characters 表未创建)",
        data: { error: (error as Error).message },
      });
    }

    return results;
  } catch (error) {
    results.push({
      step: "诊断过程",
      status: "❌ 失败",
      message: `诊断失败: ${(error as Error).message}`,
      data: { error: (error as Error).stack },
    });
    return results;
  }
}

async function main() {
  const chapterId = process.argv[2];

  if (!chapterId) {
    console.error("❌ 错误: 缺少章节ID参数");
    console.log("\n用法:");
    console.log("  npx tsx scripts/diagnose-nine-grid-characters.ts <chapterId>");
    console.log("\n示例:");
    console.log("  npx tsx scripts/diagnose-nine-grid-characters.ts 123e4567-e89b-12d3-a456-426614174000");
    process.exit(1);
  }

  console.log("🔍 九宫格角色参考图问题诊断");
  console.log("================================");
  console.log(`章节ID: ${chapterId}`);

  const results = await diagnose(chapterId);

  console.log("\n\n📊 诊断结果汇总");
  console.log("================================");

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.step}: ${result.status}`);
    console.log(`   ${result.message}`);
    if (result.data) {
      console.log(`   数据:`, JSON.stringify(result.data, null, 2));
    }
  });

  // 统计
  const passed = results.filter((r) => r.status === "✅ 通过").length;
  const failed = results.filter((r) => r.status === "❌ 失败").length;
  const warnings = results.filter((r) => r.status === "⚠️ 警告").length;

  console.log("\n\n📈 统计");
  console.log("================================");
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`⚠️ 警告: ${warnings}`);
  console.log(`总计: ${results.length}`);

  // 诊断建议
  console.log("\n\n💡 诊断建议");
  console.log("================================");

  if (failed > 0) {
    console.log("❌ 发现严重问题,需要立即修复:");
    results
      .filter((r) => r.status === "❌ 失败")
      .forEach((r) => {
        console.log(`   - ${r.message}`);
      });
  }

  if (warnings > 0) {
    console.log("\n⚠️ 发现警告,建议关注:");
    results
      .filter((r) => r.status === "⚠️ 警告")
      .forEach((r) => {
        console.log(`   - ${r.message}`);
      });
  }

  if (failed === 0 && warnings === 0) {
    console.log("✅ 所有检查通过,数据完整!");
    console.log("\n如果前端仍然显示'未检测到角色',请检查:");
    console.log("   1. 浏览器控制台是否有 JavaScript 错误");
    console.log("   2. chapterId 是否正确传递到组件");
    console.log("   3. 条件渲染是否阻止了组件显示");
    console.log("\n建议添加调试日志,参考: DEBUG_NINE_GRID_CHARACTERS.md");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ 脚本执行失败:", error);
  process.exit(1);
});
