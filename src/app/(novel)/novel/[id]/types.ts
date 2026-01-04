/**
 * 小说项目页面类型定义和工具函数
 */

/**
 * 章节大纲（前端格式 - camelCase）
 */
export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents: string[];
  characters: string[];
  plotLines: string[];
  isKeyChapter: boolean;
  content?: string;
  wordCount?: number;
  status?: "draft" | "completed";
}

/**
 * 章节大纲（后端格式 - snake_case）
 */
export interface ChapterOutlineBackend {
  chapter_number: number;
  title: string;
  outline: string;
  key_events: string[];
  characters: string[];
  plot_lines: string[];
  is_key_chapter: boolean;
  content?: string;
  word_count?: number;
  status?: "draft" | "completed";
}

/**
 * 小说项目
 */
export interface NovelProject {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  target_words: number | null;
  status: string;
  total_words: number;
  chapter_count: number;
  world_setting: Record<string, unknown> | null;
  characters: unknown[] | null;
  outlines: ChapterOutline[] | null;
}

/**
 * 转换后端 snake_case 格式的 outline 为前端 camelCase 格式
 */
export function normalizeOutline(outline: Partial<ChapterOutlineBackend & ChapterOutline>): ChapterOutline {
  return {
    chapterNumber: outline.chapterNumber ?? outline.chapter_number ?? 0,
    title: outline.title ?? "",
    outline: outline.outline ?? "",
    keyEvents: outline.keyEvents ?? outline.key_events ?? [],
    characters: outline.characters ?? [],
    plotLines: outline.plotLines ?? outline.plot_lines ?? [],
    isKeyChapter: outline.isKeyChapter ?? outline.is_key_chapter ?? false,
    content: outline.content ?? "",
    wordCount: outline.wordCount ?? outline.word_count ?? 0,
    status: outline.status ?? "draft",
  };
}

/**
 * 转换前端 camelCase 格式的 outline 为后端 snake_case 格式
 */
export function denormalizeOutline(outline: ChapterOutline): ChapterOutlineBackend {
  return {
    chapter_number: outline.chapterNumber,
    title: outline.title,
    outline: outline.outline,
    key_events: outline.keyEvents,
    characters: outline.characters,
    plot_lines: outline.plotLines,
    is_key_chapter: outline.isKeyChapter,
    content: outline.content,
    word_count: outline.wordCount,
    status: outline.status,
  };
}

/**
 * 创建新章节
 */
export function createNewChapter(chapterNumber: number): ChapterOutline {
  return {
    chapterNumber,
    title: `第 ${chapterNumber} 章`,
    outline: "",
    keyEvents: [],
    characters: [],
    plotLines: [],
    isKeyChapter: false,
    content: "",
    wordCount: 0,
    status: "draft",
  };
}
