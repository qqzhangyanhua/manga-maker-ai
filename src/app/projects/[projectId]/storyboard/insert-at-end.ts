import { sortByReadingOrder, type ReadingOrderPanel } from "@/lib/project/chapter-panels/reading-order-sort";

/** 分镜页“插入到末尾”要接在阅读顺序的最后一格后面。 */
export function insertAtEndAnchor<T extends ReadingOrderPanel>(panels: readonly T[]): T | null {
  const ordered = sortByReadingOrder(panels);
  return ordered.length === 0 ? null : ordered[ordered.length - 1];
}
