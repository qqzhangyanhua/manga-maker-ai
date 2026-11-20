import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** 项目范围的阅读顺序：先章节顺序，再章节内顺序，最后按 id。 */
export const panelReadingOrderBy: Prisma.PanelOrderByWithRelationInput[] = [
  { chapter: { chapter_order: "asc" } },
  { panel_order: "asc" },
  { id: "asc" },
];

/**
 * 按阅读顺序读取一个项目的全部分镜。
 * 调用方已经校验过项目归属。额外筛选、分页的查询直接使用 panelReadingOrderBy。
 */
export function readingOrder<S extends Prisma.PanelSelect>(
  db: Db,
  projectId: string,
  args: { select: S },
): Promise<Prisma.PanelGetPayload<{ select: S }>[]>;
export function readingOrder<I extends Prisma.PanelInclude>(
  db: Db,
  projectId: string,
  args: { include: I },
): Promise<Prisma.PanelGetPayload<{ include: I }>[]>;
export function readingOrder(
  db: Db,
  projectId: string,
  args: { select: Prisma.PanelSelect } | { include: Prisma.PanelInclude },
): Promise<unknown> {
  if ("select" in args) {
    return db.panel.findMany({
      where: { project_id: projectId },
      orderBy: panelReadingOrderBy,
      select: args.select,
    });
  }
  return db.panel.findMany({
    where: { project_id: projectId },
    orderBy: panelReadingOrderBy,
    include: args.include,
  });
}
