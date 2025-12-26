/**
 * 检查故事角色关联情况
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkStoryCharacters() {
  console.log("🔍 检查故事角色关联情况...\n");

  const stories = await prisma.story.findMany({
    where: {
      chapters: {
        some: {},
      },
    },
    include: {
      story_characters: {
        include: {
          character: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          chapters: true,
        },
      },
    },
  });

  console.log(`总故事数: ${stories.length}\n`);

  let totalWithCharacters = 0;
  let totalWithoutCharacters = 0;

  stories.forEach((story) => {
    const hasCharacters = story.story_characters.length > 0;

    if (hasCharacters) {
      totalWithCharacters++;
      console.log(`✅ ${story.title}`);
      console.log(`   章节: ${story._count.chapters}`);
      console.log(
        `   角色: ${story.story_characters.map((sc) => sc.character.name).join("、")}`
      );
    } else {
      totalWithoutCharacters++;
      console.log(`❌ ${story.title}`);
      console.log(`   章节: ${story._count.chapters}`);
      console.log(`   角色: 无`);
    }
    console.log();
  });

  console.log("═".repeat(60));
  console.log(`✅ 有角色关联的故事: ${totalWithCharacters} 个`);
  console.log(`❌ 没有角色关联的故事: ${totalWithoutCharacters} 个`);
  console.log("═".repeat(60));

  if (totalWithoutCharacters > 0) {
    console.log("\n⚠️  问题诊断:");
    console.log(
      "大部分故事没有关联角色，这导致角色状态提取失败！"
    );
    console.log("\n💡 解决方案:");
    console.log(
      "1. 在故事详情页面为故事添加角色（从角色库选择）"
    );
    console.log("2. 或者使用 AI 生成角色功能");
    console.log(
      "3. 只有关联了角色的故事才能提取角色状态"
    );
  }
}

checkStoryCharacters()
  .catch((error) => {
    console.error("检查失败:", error);
  })
  .finally(() => {
    prisma.$disconnect();
  });
