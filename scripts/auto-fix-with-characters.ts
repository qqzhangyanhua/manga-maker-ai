/**
 * 改进版角色状态提取器 - 自动创建缺失的角色
 * 如果故事没有关联角色，会自动创建并关联
 */

import { PrismaClient } from "@prisma/client";
import { batchExtractStoryStates } from "../src/lib/character-state-extractor";

const prisma = new PrismaClient();

/**
 * 为故事自动创建并关联角色
 */
async function ensureStoryCharacters(storyId: string, userId: string): Promise<void> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      chapters: {
        select: {
          id: true,
          title: true,
          summary: true,
        },
        orderBy: { chapter_order: "asc" },
        take: 3, // 只看前3章
      },
      story_characters: {
        include: {
          character: true,
        },
      },
    },
  });

  if (!story) {
    throw new Error(`Story ${storyId} not found`);
  }

  // 如果已经有角色，直接返回
  if (story.story_characters.length > 0) {
    console.log(
      `  已有 ${story.story_characters.length} 个角色：${story.story_characters.map((sc) => sc.character.name).join("、")}`
    );
    return;
  }

  console.log(`  没有关联角色，正在分析故事内容...`);

  // 从故事大纲和前3章中提取角色信息
  const storyContent = `
故事标题：${story.title}
故事前提：${story.premise}
故事大纲：${JSON.stringify(story.outline)}

前面章节：
${story.chapters.map((ch) => `${ch.title}\n${ch.summary || ""}`).join("\n\n")}
`.trim();

  // 调用 LLM 分析角色
  const { callChatCompletionByType } = await import("../src/lib/llm-provider");

  const result = await callChatCompletionByType({
    providerType: "character_analyzer",
    messages: [
      {
        role: "system",
        content: `你是一位专业的故事分析师，擅长从故事中提取主要角色信息。

任务：分析故事内容，列出所有主要角色。

输出格式（严格JSON）：
{
  "characters": [
    {
      "name": "角色名称",
      "description": "简短的角色描述（50字以内）",
      "role": "protagonist/antagonist/supporting/minor"
    }
  ]
}

规则：
1. 只提取有名字的角色（不要提取"路人甲"这种）
2. 主角标记为 protagonist
3. 反派标记为 antagonist
4. 重要配角标记为 supporting
5. 次要角色标记为 minor
6. 最多提取10个角色`,
      },
      {
        role: "user",
        content: `请分析以下故事内容，提取所有主要角色：\n\n${storyContent}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 1500,
    options: { skipCreditsCheck: true },
  });

  // 解析结果
  let charactersData: {
    characters: Array<{
      name: string;
      description: string;
      role: string;
    }>;
  };

  try {
    const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    charactersData = JSON.parse(cleaned);
  } catch (error) {
    console.error("  ❌ 无法解析角色信息:", error);
    console.error("  Raw response:", result.content);
    return;
  }

  if (!charactersData.characters || charactersData.characters.length === 0) {
    console.log("  ⚠️  未找到角色");
    return;
  }

  console.log(`  找到 ${charactersData.characters.length} 个角色，正在创建...`);

  // 为每个角色创建 Character 记录并关联到故事
  for (const charData of charactersData.characters) {
    try {
      // 创建角色
      const character = await prisma.character.create({
        data: {
          user_id: userId,
          name: charData.name,
          description: charData.description,
          base_prompt: charData.description,
          training_status: "pending",
        },
      });

      // 创建默认服装
      await prisma.characterOutfit.create({
        data: {
          character_id: character.id,
          outfit_name: "默认服装",
          outfit_type: "default",
          prompt_modifier: "",
          is_default: true,
        },
      });

      // 关联到故事
      await prisma.storyCharacter.create({
        data: {
          story_id: storyId,
          character_id: character.id,
          role: charData.role,
        },
      });

      console.log(`    ✅ ${charData.name} (${charData.role})`);
    } catch (error) {
      console.error(`    ❌ 创建角色 ${charData.name} 失败:`, error);
    }
  }
}

/**
 * 改进版自动修复脚本
 */
async function autoFixWithCharacterCreation() {
  console.log("🚀 开始改进版自动修复...\n");

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
          story_characters: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  console.log(`找到 ${stories.length} 个故事需要处理\n`);

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];

    console.log("━".repeat(60));
    console.log(`[${i + 1}/${stories.length}] ${story.title}`);
    console.log(`  章节数: ${story._count.chapters}`);
    console.log(`  当前角色数: ${story._count.story_characters}`);
    console.log("━".repeat(60));

    try {
      // 步骤1: 确保故事有角色（没有的话自动创建）
      await ensureStoryCharacters(story.id, story.user_id);

      // 步骤2: 提取角色状态
      console.log(`  开始提取角色状态...`);
      await batchExtractStoryStates(story.id, story.user_id);

      console.log(`✅ ${story.title} - 处理完成\n`);
    } catch (error) {
      console.error(`❌ ${story.title} - 处理失败:`, error);
      console.log("继续处理下一个故事...\n");
    }

    // API 限流保护
    if (i < stories.length - 1) {
      console.log("⏳ 等待 3 秒...\n");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("🎉 改进版自动修复完成！");
  console.log("═".repeat(60));

  // 生成报告
  const totalStates = await prisma.chapterCharacterState.count();
  const totalCharacters = await prisma.character.count();
  const totalStoryCharacters = await prisma.storyCharacter.count();

  console.log("\n📊 修复报告:");
  console.log(`  总角色数: ${totalCharacters}`);
  console.log(`  故事-角色关联数: ${totalStoryCharacters}`);
  console.log(`  角色状态记录数: ${totalStates}`);
}

autoFixWithCharacterCreation()
  .catch((error) => {
    console.error("❌ 修复失败:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
