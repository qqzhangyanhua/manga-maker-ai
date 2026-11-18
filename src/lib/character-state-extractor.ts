/**
 * 自动角色状态提取器
 * 在生成分镜后，自动分析并记录角色状态
 */

import { callChatCompletionByType } from "./llm-provider";
import { prisma } from "./db";

interface ExtractedCharacterState {
  characterId: string;
  characterName: string;
  location: string;
  physicalCondition: string;
  mentalState: string;
  keyItems: string[];
  relationshipChanges: Record<string, string>;
}

const CHARACTER_STATE_EXTRACTION_PROMPT = `你是一位专业的剧情分析师，擅长从章节内容中提取角色状态信息。

任务：分析章节内容，提取所有角色在章节结束时的状态。

输出格式（严格JSON）：
{
  "characters": [
    {
      "characterName": "角色名称",
      "location": "章节结束时角色所在位置（具体地点）",
      "physicalCondition": "身体状况（健康/受伤/疲惫/中毒等，要具体）",
      "mentalState": "心理/情绪状态（平静/愤怒/恐惧/绝望/坚定等）",
      "keyItems": ["持有的关键物品1", "关键物品2"],
      "relationshipChanges": {
        "其他角色名": "关系变化描述"
      },
      "notes": "其他重要状态信息"
    }
  ],
  "keyEvents": ["本章的关键事件1", "关键事件2"],
  "unsolvedMysteries": ["未解之谜1", "伏笔2"]
}

分析要点：
1. 身体状况要具体（不要只说"正常"，而要说"无伤，体力充沛"或"右臂骨折，失血约500ml"）
2. 心理状态要细腻（区分"愤怒"和"压抑的愤怒"）
3. 关键物品只记录对剧情有影响的（不要记录"手机"这种常见物品，除非它很重要）
4. 关系变化只记录本章有变化的（从陌生到熟悉、从信任到怀疑等）
5. 如果角色死亡，physicalCondition写"已死亡"，location写"死亡地点"`;

/**
 * 从章节内容中自动提取角色状态
 */
export async function extractCharacterStates(
  chapterId: string,
  userId?: string
): Promise<void> {
  console.log(`[State Extractor] 开始提取章节 ${chapterId} 的角色状态...`);

  // 1. 获取章节信息
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      project: {
        include: {
          project_characters: {
            include: {
              character: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      panels: {
        select: {
          description: true,
          dialogue: true,
        },
        orderBy: {
          panel_order: "asc",
        },
      },
    },
  });

  if (!chapter) {
    throw new Error(`Chapter ${chapterId} not found`);
  }

  // 2. 构建章节内容（优先使用content，否则用summary+panels）
  let chapterContent = "";

  if (chapter.content) {
    chapterContent = chapter.content;
  } else {
    // 从分镜重建内容
    chapterContent = `章节梗概：\n${chapter.summary || ""}\n\n分镜内容：\n`;
    chapter.panels.forEach((panel, index) => {
      chapterContent += `\n[分镜 ${index + 1}]\n`;
      chapterContent += `描述: ${panel.description}\n`;
      if (panel.dialogue) {
        chapterContent += `对话: ${panel.dialogue}\n`;
      }
    });
  }

  if (!chapterContent.trim()) {
    console.log(
      `[State Extractor] 章节 ${chapterId} 没有内容，跳过状态提取`
    );
    return;
  }

  // 3. 准备角色列表
  const projectCharacters = chapter.project.project_characters;
  const storyCharacters = projectCharacters.map((pc) => pc.character.name);

  const userPrompt = `
章节标题：${chapter.title}
故事中的角色：${storyCharacters.join("、")}

章节内容：
${chapterContent}

请分析以上内容，提取所有角色在章节结束时的状态。
`.trim();

  // 4. 调用 LLM 提取状态
  const result = await callChatCompletionByType({
    providerType: "script_analyzer",
    messages: [
      { role: "system", content: CHARACTER_STATE_EXTRACTION_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3, // 低温度保证准确性
    maxTokens: 2000,
    options: { skipCreditsCheck: true },
  });

  // 5. 解析结果
  let extractedData: {
    characters: Array<{
      characterName: string;
      location: string;
      physicalCondition: string;
      mentalState: string;
      keyItems?: string[];
      relationshipChanges?: Record<string, string>;
      notes?: string;
    }>;
    keyEvents?: string[];
    unsolvedMysteries?: string[];
  };

  try {
    const cleaned = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    extractedData = JSON.parse(cleaned);
  } catch (error) {
    console.error("[State Extractor] 解析失败:", error);
    console.error("Raw response:", result.content);
    throw new Error("状态提取失败：无法解析LLM响应");
  }

  // 6. 保存到数据库
  const stateRecords = [];

  for (const charData of extractedData.characters) {
    // 查找角色ID
    const storyChar = projectCharacters.find(
      (sc) => sc.character.name === charData.characterName
    );

    if (!storyChar) {
      console.warn(
        `[State Extractor] 角色 "${charData.characterName}" 未在故事角色列表中，跳过`
      );
      continue;
    }

    // 检查是否已存在状态记录
    const existingState = await prisma.chapterCharacterState.findUnique({
      where: {
        chapter_id_character_id: {
          chapter_id: chapterId,
          character_id: storyChar.character_id,
        },
      },
    });

    if (existingState) {
      // 更新现有记录
      await prisma.chapterCharacterState.update({
        where: { id: existingState.id },
        data: {
          location: charData.location,
          physical_condition: charData.physicalCondition,
          mental_state: charData.mentalState,
          key_items: charData.keyItems || [],
          relationship_changes: charData.relationshipChanges || {},
          notes: charData.notes || null,
          updated_at: new Date(),
        },
      });

      stateRecords.push(`更新: ${charData.characterName}`);
    } else {
      // 创建新记录
      await prisma.chapterCharacterState.create({
        data: {
          chapter_id: chapterId,
          character_id: storyChar.character_id,
          location: charData.location,
          physical_condition: charData.physicalCondition,
          mental_state: charData.mentalState,
          key_items: charData.keyItems || [],
          relationship_changes: charData.relationshipChanges || {},
          notes: charData.notes || null,
        },
      });

      stateRecords.push(`新建: ${charData.characterName}`);
    }
  }

  // 7. 更新章节元数据（如果有关键事件）
  if (extractedData.keyEvents && extractedData.keyEvents.length > 0) {
    const hasKeyEvent = extractedData.keyEvents.some((event) =>
      /死亡|转折|揭秘|真相|背叛|高潮/.test(event)
    );

    if (hasKeyEvent && !chapter.is_key_chapter) {
      await prisma.chapter.update({
        where: { id: chapterId },
        data: {
          is_key_chapter: true,
          key_chapter_reason: extractedData.keyEvents.join("；"),
        },
      });

      console.log(
        `[State Extractor] 自动标记为关键章节: ${extractedData.keyEvents.join("；")}`
      );
    }
  }

  console.log(
    `[State Extractor] 完成！提取了 ${stateRecords.length} 个角色状态:`
  );
  stateRecords.forEach((record) => console.log(`  - ${record}`));
}

/**
 * 批量提取项目所有章节的角色状态
 */
export async function batchExtractProjectStates(
  projectId: string,
  userId?: string
): Promise<void> {
  const chapters = await prisma.chapter.findMany({
    where: { project_id: projectId },
    orderBy: { chapter_order: "asc" },
    select: { id: true, title: true },
  });

  console.log(`[Batch Extractor] 开始批量提取 ${chapters.length} 个章节的状态...`);

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    console.log(`\n[${i + 1}/${chapters.length}] ${chapter.title}`);

    try {
      await extractCharacterStates(chapter.id, userId);
    } catch (error) {
      console.error(`  ❌ 失败:`, error);
      // 继续处理下一章
    }

    // 避免API限流
    if (i < chapters.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n[Batch Extractor] 批量提取完成！");
}
