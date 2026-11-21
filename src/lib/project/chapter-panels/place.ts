import type { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api-error";

import { plan, type InsertAt } from "./plan";
import {
  applyOrders,
  assertUniqueIds,
  loadDraft,
  loadPanels,
  lockChapters,
  parkPanels,
  type PanelInsertWhere,
  requireChapter,
  requirePanel,
} from "./session";

type Tx = Prisma.TransactionClient;

export interface PlacedPanel {
  id: string;
  chapterId: string;
  panelOrder: number;
}

/**
 * 章内重排和跨章移动用同一条路：目标章的草稿先拿掉被移动的格子，
 * 再把它们当成新到的格子插进去。涉及的章节按 id 排序加锁。
 */
export async function placeInTransaction(
  tx: Tx,
  projectId: string,
  ids: readonly string[],
  where: PanelInsertWhere,
): Promise<PlacedPanel[]> {
  if (ids.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "没有要移动的分镜");
  }
  assertUniqueIds(ids, "要移动的分镜重复了");
  assertAnchorOutsideSelection(ids, where);

  const movers = await loadPanels(tx, projectId, ids);
  const targetChapterId = await resolveTargetChapter(tx, projectId, where);
  const moving = new Set(ids);
  await lockChapters(tx, [...movers.map((panel) => panel.chapter_id), targetChapterId]);

  const targetRows = await loadDraft(tx, projectId, targetChapterId);
  const reduced = targetRows.filter((panel) => !moving.has(panel.id));
  const targetDiff = plan(
    { chapterId: targetChapterId, panels: reduced.map((panel) => ({ id: panel.id, order: panel.panel_order })) },
    { op: "place", ids, at: toPlaceAt(where, reduced.length) },
  );

  const sourceDiffs = [];
  const sourceChapters = [...new Set(movers.map((panel) => panel.chapter_id))].filter((chapterId) => chapterId !== targetChapterId);
  for (const chapterId of sourceChapters) {
    const draft = await loadDraft(tx, projectId, chapterId);
    const leaving = draft.filter((panel) => moving.has(panel.id)).map((panel) => panel.id);
    if (leaving.length === 0) continue;
    sourceDiffs.push(plan(
      { chapterId, panels: draft.map((panel) => ({ id: panel.id, order: panel.panel_order })) },
      { op: "remove", ids: leaving },
    ));
  }

  await parkPanels(tx, ids);
  for (const diff of sourceDiffs) {
    await applyOrders(tx, diff.orders);
  }
  await applyOrders(tx, targetDiff.orders);

  const placed: PlacedPanel[] = [];
  for (const arrival of targetDiff.arrivals ?? []) {
    await tx.panel.update({
      where: { id: arrival.id },
      data: { chapter_id: targetChapterId, panel_order: arrival.order },
    });
    placed.push({ id: arrival.id, chapterId: targetChapterId, panelOrder: arrival.order });
  }
  return placed;
}

function assertAnchorOutsideSelection(ids: readonly string[], where: PanelInsertWhere): void {
  if ("chapter" in where) return;
  const anchorId = "after" in where ? where.after : where.before;
  if (ids.includes(anchorId)) {
    throw new ApiError(400, "ANCHOR_IN_SELECTION", "不能把分镜放到自己前面或后面");
  }
}

async function resolveTargetChapter(tx: Tx, projectId: string, where: PanelInsertWhere): Promise<string> {
  if ("chapter" in where) {
    await requireChapter(tx, projectId, where.chapter);
    return where.chapter;
  }
  const panelId = "after" in where ? where.after : where.before;
  const panel = await requirePanel(tx, projectId, panelId);
  return panel.chapter_id;
}

function toPlaceAt(where: PanelInsertWhere, reducedLength: number): InsertAt {
  if (!("chapter" in where)) return where;
  return { index: where.index ?? reducedLength };
}
