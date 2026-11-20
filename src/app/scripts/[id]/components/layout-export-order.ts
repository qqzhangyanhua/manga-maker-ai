import { compareReadingOrder } from "@/lib/project/chapter-panels/reading-order-sort";

type LayoutExportPanel = {
  id: string;
  panel_order?: number;
  chapter_id?: string;
  chapter_order?: number | null;
  chapter?: { chapter_order?: number | null } | null;
  generated_image?: string;
  image_url?: string;
};

type LayoutExportChapter = {
  id: string;
  chapter_order: number;
};

function chapterOrderOf(panel: LayoutExportPanel, chapters: ReadonlyMap<string, number>): number {
  if (typeof panel.chapter?.chapter_order === "number") return panel.chapter.chapter_order;
  if (typeof panel.chapter_order === "number") return panel.chapter_order;
  if (panel.chapter_id) return chapters.get(panel.chapter_id) ?? 0;
  return 0;
}

/** 排版导出页签里有图的分镜，按阅读顺序。 */
export function panelsForLayoutExport<T extends LayoutExportPanel>(
  panels: readonly T[],
  chapters: readonly LayoutExportChapter[],
): T[] {
  const chapterOrder = new Map(chapters.map((chapter) => [chapter.id, chapter.chapter_order]));
  return panels
    .filter((panel) => panel.generated_image || panel.image_url)
    .sort((left, right) =>
      compareReadingOrder(
        { id: left.id, panel_order: left.panel_order ?? 0, chapter_order: chapterOrderOf(left, chapterOrder) },
        { id: right.id, panel_order: right.panel_order ?? 0, chapter_order: chapterOrderOf(right, chapterOrder) },
      ),
    );
}
