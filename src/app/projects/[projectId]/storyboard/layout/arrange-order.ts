import { sortByReadingOrder, type ReadingOrderPanel } from "@/lib/project/chapter-panels/reading-order-sort";

type ArrangePanel = ReadingOrderPanel & {
  generated_image: string | null;
};

/** 排版页自动编排的摆放顺序：有图的分镜按阅读顺序从上到下。 */
export function panelsForAutoArrange<T extends ArrangePanel>(panels: readonly T[]): T[] {
  return sortByReadingOrder(panels.filter((panel) => panel.generated_image));
}
