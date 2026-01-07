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

    const novelCharacters = (novelProject.characters as NovelCharacter[] | null) || [];
    const novelOutlines = (novelProject.outlines as ChapterOutline[] | null) || [];

    // 创建 Story
    const story = await prisma.story.create({
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

    logInfo("Story created from novel", {
      endpoint: "/api/novel/projects/[id]/convert-to-comic",
      userId,
      novelProjectId: projectId,
      storyId: story.id,
    });

    // 创建 Chapters（基于选中的场景）
    const chaptersCreated: Array<{ id: string; title: string; order: number }> = [];
    let chapterOrder = 1;

    for (const sceneSelection of selected_scenes) {
      const novelChapter = novelProject.chapters.find(
        (ch) => ch.chapter_number === sceneSelection.chapter_number
      );
      const outline = novelOutlines.find(
        (o) => o.chapterNumber === sceneSelection.chapter_number
      );

      if (!novelChapter && !outline) continue;

      // 构建章节摘要（用于分镜生成）
      const summary = buildChapterSummary(
        novelChapter?.content || "",
        novelChapter?.outline || outline?.outline || "",
        outline?.keyEvents || [],
        sceneSelection.scene_indices,
        sceneSelection.custom_scenes
      );

      const chapter = await prisma.chapter.create({
        data: {
          story_id: story.id,
          title: novelChapter?.title || outline?.title || `第${sceneSelection.chapter_number}章`,
          summary,
          chapter_order: chapterOrder,
          content: novelChapter?.content || null,
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
      story_title: story.title,
      chapters_created: chaptersCreated.length,
      chapters: chaptersCreated,
      characters_created: charactersCreated,
      characters_linked: charactersLinked,
      message: `成功将小说转换为漫画项目，共创建 ${chaptersCreated.length} 个章节`,
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

function mapNovelGenreToStoryGenre(novelGenre: string | null): string {
  const genreMap: Record<string, string> = {
    suspense: "suspense",
    romance: "romance",
    adventure: "adventure",
    scifi: "scifi",
    fantasy: "fantasy",
    other: "daily",
  };
  return genreMap[novelGenre || "other"] || "daily";
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

function buildChapterSummary(
  content: string,
  outline: string,
  keyEvents: string[],
  selectedIndices: number[],
  customScenes?: string[]
): string {
  const parts: string[] = [];

  // 章节大纲
  if (outline) {
    parts.push(`【章节概要】${outline}`);
  }

  // 选中的关键事件
  const selectedEvents = selectedIndices
    .map((idx) => keyEvents[idx])
    .filter(Boolean);
  if (selectedEvents.length > 0) {
    parts.push(`【关键场景】\n${selectedEvents.map((e, i) => `${i + 1}. ${e}`).join("\n")}`);
  }

  // 自定义场景
  if (customScenes && customScenes.length > 0) {
    parts.push(`【自定义场景】\n${customScenes.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
  }

  // 截取内容摘要（前500字）
  if (content && content.length > 0) {
    const excerpt = content.slice(0, 500);
    parts.push(`【内容片段】${excerpt}${content.length > 500 ? "..." : ""}`);
  }

  return parts.join("\n\n");
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
