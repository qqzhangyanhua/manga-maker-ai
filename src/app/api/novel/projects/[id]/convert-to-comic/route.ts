/**
 * Novel to Comic Conversion API
 * POST /api/novel/projects/[id]/convert-to-comic
 *
 * 将小说项目转换为漫画项目（Story + Chapters + Characters）
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { ensureStoryProject, mapNovelGenreToStoryGenre } from "@/lib/project";

interface SceneSelection {
  chapter_number: number;
  scene_indices: number[];
  custom_scenes?: string[];
}

interface CharacterMapping {
  novel_character_name: string;
  action: "create" | "link";
  character_id?: string;
  role?: string;
}

interface ConvertRequest {
  selected_scenes: SceneSelection[];
  character_mappings?: CharacterMapping[];
  comic_style_id?: string;
}

interface NovelCharacter {
  name: string;
  role?: string;
  description?: string;
  traits?: string[];
  relationships?: Array<{ character: string; relation: string }>;
}

interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents?: string[];
  characters?: string[];
  plotLines?: string[];
  isKeyChapter?: boolean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Novel to comic conversion started", {
      endpoint: "/api/novel/projects/[id]/convert-to-comic",
      method: "POST",
      projectId,
    });

    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    userId = payload.userId;

    // 解析请求体
    const body: ConvertRequest = await req.json();
    const { selected_scenes, character_mappings = [], comic_style_id } = body;

    if (!selected_scenes || selected_scenes.length === 0) {
      return NextResponse.json(
        { error: "请至少选择一个场景进行转换" },
        { status: 400 }
      );
    }

    // 获取小说项目
    const novelProject = await prisma.novelProject.findUnique({
      where: { id: projectId },
      include: {
        chapters: {
          orderBy: { chapter_number: "asc" },
        },
      },
    });

    if (!novelProject) {
      return NextResponse.json({ error: "小说项目不存在" }, { status: 404 });
    }

    if (novelProject.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    const novelCharacters = (novelProject.characters as unknown as NovelCharacter[] | null) || [];
    const novelOutlines = (novelProject.outlines as unknown as ChapterOutline[] | null) || [];

    // ✅ 检测是否已经转换过（查找关联到此小说的 Story）
    let story = await prisma.story.findFirst({
      where: {
        source_novel_id: projectId,
        user_id: userId,
      },
    });

    let isNewStory = false;

    if (!story) {
      // 如果不存在，创建新 Story
      isNewStory = true;
      story = await prisma.story.create({
        data: {
          user_id: userId,
          title: `${novelProject.title}（漫画改编）`,
          premise: novelProject.description || `改编自小说《${novelProject.title}》`,
          genre: mapNovelGenreToStoryGenre(novelProject.genre),
          outline: buildStoryOutline(novelOutlines, selected_scenes) as object,
          comic_style_id: comic_style_id || null,
          source_type: "novel_adaptation",
          source_novel_id: projectId,
          status: "draft",
        },
      });
    } else {
      // 如果已存在，更新 Story 的 outline（合并新场景）
      const existingOutline = story.outline as Record<string, unknown>;
      const newOutline = buildStoryOutline(novelOutlines, selected_scenes);
      const mergedOutline = mergeStoryOutlines(existingOutline, newOutline);

      await prisma.story.update({
        where: { id: story.id },
        data: {
          outline: mergedOutline as object,
        },
      });
    }

    logInfo(isNewStory ? "Story created from novel" : "Story found, appending chapters", {
      endpoint: "/api/novel/projects/[id]/convert-to-comic",
      userId,
      novelProjectId: projectId,
      storyId: story.id,
      isNewStory,
    });

    const comicProject = await ensureStoryProject(prisma, story.id);

    // 创建 Chapters（基于选中的场景）
    const chaptersCreated: Array<{ id: string; title: string; order: number }> = [];
    // ✅ 如果是追加模式，从项目现有章节的最大 order + 1 开始
    // 章节按 project_id 归属，独立创建的章节没有 story_id，不能再用 story.chapters 计算
    const lastChapter = await prisma.chapter.findFirst({
      where: { project_id: comicProject.id },
      orderBy: { chapter_order: "desc" },
      select: { chapter_order: true },
    });
    let chapterOrder = (lastChapter?.chapter_order ?? 0) + 1;

    for (const sceneSelection of selected_scenes) {
      const novelChapter = novelProject.chapters.find(
        (ch) => ch.chapter_number === sceneSelection.chapter_number
      );
      const outline = novelOutlines.find(
        (o) => o.chapterNumber === sceneSelection.chapter_number
      );

      if (!novelChapter && !outline) continue;

      // ✅ 构建增强的章节摘要（包含完整上下文）
      const summary = buildEnhancedChapterSummary(
        novelChapter?.content || "",
        novelChapter?.outline || outline?.outline || "",
        outline?.keyEvents || [],
        sceneSelection.scene_indices,
        sceneSelection.custom_scenes,
        novelCharacters,
        novelProject.world_setting as Record<string, unknown> | null,
        outline?.characters || []
      );

      const chapter = await prisma.chapter.create({
        data: {
          // story_id 保持双写到阶段 6（兼容层读取仍按 story_id 查章节），
          // 数据库触发器会校验 story_id 与 project_id 属于同一项目
          story_id: story.id,
          project_id: comicProject.id,
          title: novelChapter?.title || outline?.title || `第${sceneSelection.chapter_number}章`,
          summary,
          chapter_order: chapterOrder,
          content: novelChapter?.content || null, // ✅ 保存完整章节内容
          is_key_chapter: novelChapter?.is_key_chapter || outline?.isKeyChapter || false,
          source_novel_chapter_id: novelChapter?.id || null,
          source_scene_markers: sceneSelection.scene_indices.map((idx, i) => ({
            index: idx,
            label: outline?.keyEvents?.[idx] || `场景${i + 1}`,
          })),
        },
      });

      chaptersCreated.push({
        id: chapter.id,
        title: chapter.title,
        order: chapterOrder,
      });
      chapterOrder++;
    }

    logInfo("Chapters created", {
      endpoint: "/api/novel/projects/[id]/convert-to-comic",
      userId,
      storyId: story.id,
      chaptersCount: chaptersCreated.length,
    });

    // 处理角色迁移
    let charactersCreated = 0;
    let charactersLinked = 0;

    for (const mapping of character_mappings) {
      const novelChar = novelCharacters.find(
        (c) => c.name === mapping.novel_character_name
      );

      if (mapping.action === "create" && novelChar) {
        // 创建新角色
        const character = await prisma.character.create({
          data: {
            user_id: userId,
            name: novelChar.name,
            description: novelChar.description || "",
            style_prompt: buildCharacterStylePrompt(novelChar),
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
            story_id: story.id,
            character_id: character.id,
            role: mapNovelRoleToStoryRole(mapping.role || novelChar.role),
            display_order: charactersCreated,
          },
        });

        charactersCreated++;
      } else if (mapping.action === "link" && mapping.character_id) {
        // 关联已有角色
        await prisma.storyCharacter.create({
          data: {
            story_id: story.id,
            character_id: mapping.character_id,
            role: mapNovelRoleToStoryRole(mapping.role || novelChar?.role),
            display_order: charactersLinked,
          },
        });

        charactersLinked++;
      }
    }

    logInfo("Novel to comic conversion completed", {
      endpoint: "/api/novel/projects/[id]/convert-to-comic",
      userId,
      novelProjectId: projectId,
      storyId: story.id,
      chaptersCreated: chaptersCreated.length,
      charactersCreated,
      charactersLinked,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      story_id: story.id,
      project_id: comicProject.id,
      story_title: story.title,
      is_new_story: isNewStory,
      chapters_created: chaptersCreated.length,
      chapters: chaptersCreated,
      characters_created: charactersCreated,
      characters_linked: charactersLinked,
      message: isNewStory
        ? `成功创建漫画项目，共生成 ${chaptersCreated.length} 个章节`
        : `成功追加到现有漫画项目，新增 ${chaptersCreated.length} 个章节`,
    });
  } catch (error) {
    logError("Novel to comic conversion failed", error, {
      endpoint: "/api/novel/projects/[id]/convert-to-comic",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "转换失败，请稍后重试" },
      { status: 500 }
    );
  }
}

function mapNovelRoleToStoryRole(novelRole: string | undefined): string {
  const roleMap: Record<string, string> = {
    主角: "protagonist",
    配角: "supporting",
    反派: "antagonist",
    龙套: "minor",
    protagonist: "protagonist",
    supporting: "supporting",
    antagonist: "antagonist",
    minor: "minor",
  };
  return roleMap[novelRole || "supporting"] || "supporting";
}

function buildStoryOutline(
  novelOutlines: ChapterOutline[],
  selectedScenes: SceneSelection[]
): Record<string, unknown> {
  const selectedChapterNumbers = new Set(selectedScenes.map((s) => s.chapter_number));
  const filteredOutlines = novelOutlines.filter((o) =>
    selectedChapterNumbers.has(o.chapterNumber)
  );

  return {
    acts: filteredOutlines.map((o) => ({
      title: o.title,
      description: o.outline,
      keyEvents: o.keyEvents || [],
    })),
    scenes: selectedScenes.flatMap((s) => {
      const outline = novelOutlines.find((o) => o.chapterNumber === s.chapter_number);
      return s.scene_indices.map((idx) => ({
        chapterNumber: s.chapter_number,
        event: outline?.keyEvents?.[idx] || `场景${idx + 1}`,
      }));
    }),
  };
}

/**
 * ✅ 增强版章节摘要构建函数
 * 包含完整的小说上下文信息，用于生成高质量的分镜
 */
function buildEnhancedChapterSummary(
  content: string,
  outline: string,
  keyEvents: string[],
  selectedIndices: number[],
  customScenes: string[] | undefined,
  characters: NovelCharacter[],
  worldSetting: Record<string, unknown> | null,
  chapterCharacters: string[]
): string {
  const parts: string[] = [];

  // 1. 章节大纲
  if (outline) {
    parts.push(`【章节概要】\n${outline}`);
  }

  // 2. 选中的关键场景（分镜生成的核心依据）
  const selectedEvents = selectedIndices
    .map((idx) => keyEvents[idx])
    .filter(Boolean);
  if (selectedEvents.length > 0) {
    parts.push(`【关键场景】\n${selectedEvents.map((e, i) => `${i + 1}. ${e}`).join("\n")}`);
  }

  // 3. 自定义场景
  if (customScenes && customScenes.length > 0) {
    parts.push(`【自定义场景】\n${customScenes.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
  }

  // 4. ✅ 本章登场角色信息（用于分镜生成时的角色描述）
  const relevantCharacters = characters.filter((c) => chapterCharacters.includes(c.name));
  if (relevantCharacters.length > 0) {
    const charDescriptions = relevantCharacters.map((c) => {
      const traits = c.traits ? ` | 特点: ${c.traits.join("、")}` : "";
      return `- ${c.name}${c.role ? `（${c.role}）` : ""}: ${c.description || ""}${traits}`;
    });
    parts.push(`【登场角色】\n${charDescriptions.join("\n")}`);
  }

  // 5. ✅ 世界观设定（场景和氛围的重要参考）
  if (worldSetting) {
    const settingParts: string[] = [];
    if (worldSetting.locations && Array.isArray(worldSetting.locations)) {
      const locations = (worldSetting.locations as Array<{ name: string; description?: string }>)
        .slice(0, 3)
        .map((loc) => `${loc.name}${loc.description ? `: ${loc.description}` : ""}`)
        .join("、");
      if (locations) settingParts.push(`场景: ${locations}`);
    }
    if (worldSetting.rules && Array.isArray(worldSetting.rules)) {
      const rules = (worldSetting.rules as string[]).slice(0, 2).join("、");
      if (rules) settingParts.push(`规则: ${rules}`);
    }
    if (settingParts.length > 0) {
      parts.push(`【世界观】\n${settingParts.join("\n")}`);
    }
  }

  // 6. ✅ 完整章节内容（最重要的上下文，用于理解情节和对话）
  if (content && content.length > 0) {
    // 保留完整内容，不截断（分镜生成时需要完整上下文）
    parts.push(`【章节原文】\n${content}`);
  }

  return parts.join("\n\n");
}

/**
 * 合并 Story 的 outline（追加模式）
 */
function mergeStoryOutlines(
  existing: Record<string, unknown>,
  newOutline: Record<string, unknown>
): Record<string, unknown> {
  const existingActs = (existing.acts || []) as Array<unknown>;
  const newActs = (newOutline.acts || []) as Array<unknown>;
  const existingScenes = (existing.scenes || []) as Array<unknown>;
  const newScenes = (newOutline.scenes || []) as Array<unknown>;

  return {
    acts: [...existingActs, ...newActs],
    scenes: [...existingScenes, ...newScenes],
  };
}

function buildCharacterStylePrompt(character: NovelCharacter): string {
  const parts: string[] = [];

  if (character.description) {
    parts.push(character.description);
  }

  if (character.traits && character.traits.length > 0) {
    parts.push(`性格特点：${character.traits.join("、")}`);
  }

  return parts.join("\n") || character.name;
}
