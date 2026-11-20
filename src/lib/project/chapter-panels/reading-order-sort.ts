/**
 * 浏览器里的阅读顺序，和 panelReadingOrderBy 同一条规则：
 * 先章节顺序，再章节内 panel_order，最后按 id。
 * 章节各自从 1 编号时，不能只比 panel_order。
 */

export type ReadingOrderPanel = {
  id: string;
  panel_order: number;
  chapter_order?: number | null;
  chapter?: { chapter_order?: number | null } | null;
};

export function readingChapterOrder(panel: {
  chapter_order?: number | null;
  chapter?: { chapter_order?: number | null } | null;
}): number {
  if (typeof panel.chapter?.chapter_order === "number") return panel.chapter.chapter_order;
  if (typeof panel.chapter_order === "number") return panel.chapter_order;
  return 0;
}

export function compareReadingOrder(left: ReadingOrderPanel, right: ReadingOrderPanel): number {
  const byChapter = readingChapterOrder(left) - readingChapterOrder(right);
  if (byChapter !== 0) return byChapter;
  const byPanel = left.panel_order - right.panel_order;
  if (byPanel !== 0) return byPanel;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function sortByReadingOrder<T extends ReadingOrderPanel>(panels: readonly T[]): T[] {
  return [...panels].sort(compareReadingOrder);
}
