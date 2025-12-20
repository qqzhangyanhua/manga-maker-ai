/**
 * Chapter Context Loader - Load intelligent context for panel generation
 *
 * Strategy: Sliding window + key chapters
 * - Recent 10 chapters (detailed)
 * - First chapter (story foundation)
 * - Key chapters (manually marked)
 * - Character states from previous chapter
 * - Story outline (global context)
 */

import { prisma } from "./db";

export interface ChapterContext {
  // Current chapter
  currentChapter: {
    id: string;
    title: string;
    summary: string | null;
    content: string | null;
    chapter_order: number;
  };

  // Story information
  story: {
    id: string;
    title: string;
    premise: string;
    genre: string;
    outline: Record<string, unknown>;
    comic_style_id: string | null;
  };

  // First chapter (if not in recent chapters)
  firstChapter: {
    title: string;
    summary: string | null;
    content: string | null;
    chapter_order: number;
  } | null;

  // Recent chapters (last 10)
  recentChapters: Array<{
    title: string;
    summary: string | null;
    content: string | null;
    chapter_order: number;
  }>;

  // Key chapters
  keyChapters: Array<{
    title: string;
    summary: string | null;
    content: string | null;
    chapter_order: number;
    key_chapter_reason: string | null;
  }>;

  // Character states from previous chapter
  characterStates: Array<{
    character: {
      id: string;
      name: string;
    };
    location: string | null;
    physical_condition: string | null;
    mental_state: string | null;
    key_items: string[];
    relationship_changes: Record<string, unknown> | null;
  }>;
}

/**
 * Load intelligent context for a chapter
 *
 * @param chapterId - Chapter ID
 * @param options - Loading options
 * @returns ChapterContext
 */
export async function loadChapterContext(
  chapterId: string,
  options: {
    recentChaptersCount?: number; // Default 10
    includeFirstChapter?: boolean; // Default true
    includeKeyChapters?: boolean; // Default true
    includeCharacterStates?: boolean; // Default true
  } = {}
): Promise<ChapterContext> {
  const {
    recentChaptersCount = 10,
    includeFirstChapter = true,
    includeKeyChapters = true,
    includeCharacterStates = true,
  } = options;

  // 1. Get current chapter with story
  const currentChapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      story: {
        select: {
          id: true,
          user_id: true,
          title: true,
          premise: true,
          genre: true,
          outline: true,
          comic_style_id: true,
        },
      },
    },
  });

  if (!currentChapter) {
    throw new Error(`Chapter not found: ${chapterId}`);
  }

  const { chapter_order, story_id, story } = currentChapter;

  // 2. Load recent chapters (last N before current)
  const recentChapters = await prisma.chapter.findMany({
    where: {
      story_id,
      chapter_order: {
        gte: Math.max(1, chapter_order - recentChaptersCount),
        lt: chapter_order,
      },
    },
    orderBy: { chapter_order: "asc" },
    select: {
      title: true,
      summary: true,
      content: true,
      chapter_order: true,
    },
  });

  // 3. Load first chapter (if not already in recent chapters and if requested)
  let firstChapter: ChapterContext["firstChapter"] = null;
  if (includeFirstChapter && chapter_order > recentChaptersCount + 1) {
    firstChapter = await prisma.chapter.findFirst({
      where: { story_id, chapter_order: 1 },
      select: {
        title: true,
        summary: true,
        content: true,
        chapter_order: true,
      },
    });
  }

  // 4. Load key chapters (if requested)
  let keyChapters: ChapterContext["keyChapters"] = [];
  if (includeKeyChapters) {
    keyChapters = await prisma.chapter.findMany({
      where: {
        story_id,
        is_key_chapter: true,
        chapter_order: { lt: chapter_order }, // Only chapters before current
      },
      orderBy: { chapter_order: "asc" },
      select: {
        title: true,
        summary: true,
        content: true,
        chapter_order: true,
        key_chapter_reason: true,
      },
    });
  }

  // 5. Load character states from previous chapter (if requested)
  let characterStates: ChapterContext["characterStates"] = [];
  if (includeCharacterStates && chapter_order > 1) {
    const previousChapter = await prisma.chapter.findFirst({
      where: {
        story_id,
        chapter_order: chapter_order - 1,
      },
      select: { id: true },
    });

    if (previousChapter) {
      const states = await prisma.chapterCharacterState.findMany({
        where: { chapter_id: previousChapter.id },
        include: {
          character: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      characterStates = states.map((state) => ({
        character: state.character,
        location: state.location,
        physical_condition: state.physical_condition,
        mental_state: state.mental_state,
        key_items: state.key_items,
        relationship_changes: state.relationship_changes as Record<string, unknown> | null,
      }));
    }
  }

  return {
    currentChapter: {
      id: currentChapter.id,
      title: currentChapter.title,
      summary: currentChapter.summary,
      content: currentChapter.content,
      chapter_order: currentChapter.chapter_order,
    },
    story: {
      id: story.id,
      title: story.title,
      premise: story.premise,
      genre: story.genre,
      outline: story.outline as Record<string, unknown>,
      comic_style_id: story.comic_style_id,
    },
    firstChapter,
    recentChapters,
    keyChapters,
    characterStates,
  };
}

/**
 * Format chapter context as prompt text
 */
export function formatChapterContextForPrompt(context: ChapterContext): string {
  const parts: string[] = [];

  // Story background
  parts.push(`【故事背景】`);
  parts.push(`标题: ${context.story.title}`);
  parts.push(`类型: ${context.story.genre}`);
  parts.push(`前提: ${context.story.premise}`);
  parts.push(``);
  parts.push(`【故事大纲】`);
  parts.push(JSON.stringify(context.story.outline, null, 2));
  parts.push(``);

  // First chapter (story foundation)
  if (context.firstChapter) {
    parts.push(`【开篇章节】`);
    parts.push(`${context.firstChapter.title}`);
    const firstContent = context.firstChapter.content || context.firstChapter.summary;
    if (firstContent) {
      parts.push(firstContent);
    }
    parts.push(``);
  }

  // Key chapters
  if (context.keyChapters.length > 0) {
    parts.push(`【关键章节回顾】`);
    context.keyChapters.forEach((keyChapter) => {
      parts.push(`${keyChapter.title}${keyChapter.key_chapter_reason ? ` (${keyChapter.key_chapter_reason})` : ""}`);
      const keyContent = keyChapter.content || keyChapter.summary;
      if (keyContent) {
        parts.push(keyContent);
      }
      parts.push(``);
    });
  }

  // Recent chapters
  if (context.recentChapters.length > 0) {
    parts.push(`【最近章节回顾】`);
    context.recentChapters.forEach((recentChapter) => {
      parts.push(`${recentChapter.title}`);
      const recentContent = recentChapter.content || recentChapter.summary;
      if (recentContent) {
        parts.push(recentContent);
      }
      parts.push(``);
    });
  }

  // Character states
  if (context.characterStates.length > 0) {
    parts.push(`【角色当前状态】`);
    context.characterStates.forEach((state) => {
      parts.push(`${state.character.name}:`);
      parts.push(`  位置: ${state.location || "未知"}`);
      parts.push(`  身体状况: ${state.physical_condition || "正常"}`);
      parts.push(`  心理状态: ${state.mental_state || "平静"}`);
      if (state.key_items && state.key_items.length > 0) {
        parts.push(`  持有物品: ${state.key_items.join(", ")}`);
      }
      parts.push(``);
    });
  }

  // Current chapter
  parts.push(`【当前章节】`);
  parts.push(`${context.currentChapter.title}`);
  const currentContent = context.currentChapter.content || context.currentChapter.summary;
  if (currentContent) {
    parts.push(currentContent);
  }

  return parts.join("\n");
}

/**
 * Estimate token count for context (rough approximation)
 * 1 Chinese character ≈ 2 tokens, 1 English word ≈ 1.3 tokens
 */
export function estimateContextTokens(context: ChapterContext): number {
  const text = formatChapterContextForPrompt(context);

  // Count Chinese characters
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

  // Count English words
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

  // Count JSON structures (outline)
  const jsonLength = JSON.stringify(context.story.outline).length;

  return Math.ceil(chineseChars * 2 + englishWords * 1.3 + jsonLength * 0.5);
}
