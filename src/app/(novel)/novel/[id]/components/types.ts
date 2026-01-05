/**
 * 小说模块共享类型定义
 */

/**
 * 章节大纲
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
