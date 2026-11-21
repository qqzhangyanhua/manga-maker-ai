import type { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api-error";

import { readCastForPanels, type PanelCastRow, writeCastRows } from "./cast";
import { plan } from "./plan";
import {
  applyOrders,
  assertUniqueIds,
  createPanelRecord,
  inheritPanelInput,
  loadDraft,
  loadPanels,
  lockChapter,
  parkPanels,
  type AddedPanel,
  type NewPanelInput,
} from "./session";

type Tx = Prisma.TransactionClient;

export async function mergeInTransaction(
  tx: Tx,
  projectId: string,
  ids: readonly string[],
  fields: Partial<NewPanelInput> = {},
): Promise<AddedPanel> {
  if (ids.length < 2) {
    throw new ApiError(400, "BAD_REQUEST", "至少要合并两格分镜");
  }
  assertUniqueIds(ids, "要合并的分镜重复了");
  const rows = await loadPanels(tx, projectId, ids);
  const chapterIds = [...new Set(rows.map((row) => row.chapter_id))];
  const chapterId = chapterIds[0];
  if (!chapterId || chapterIds.length !== 1) {
    throw new ApiError(400, "DIFFERENT_CHAPTERS", "只能合并同一章节的分镜");
  }

  await lockChapter(tx, chapterId);
  const draft = await loadDraft(tx, projectId, chapterId);
  const diff = plan(
    { chapterId, panels: draft.map((panel) => ({ id: panel.id, order: panel.panel_order })) },
    { op: "merge", ids, key: "merged" },
  );
  const selected = new Set(ids);
  const orderedIds = draft.filter((panel) => selected.has(panel.id)).map((panel) => panel.id);
  const firstId = orderedIds[0];
  const first = rows.find((row) => row.id === firstId);
  if (!first) throw new ApiError(404, "NOT_FOUND", "分镜不存在");

  const cast = unionCast(orderedIds, await readCastForPanels(tx, orderedIds));
  await parkPanels(tx, orderedIds);
  await applyOrders(tx, diff.orders);
  const inserted = diff.inserts[0];
  if (!inserted) throw new ApiError(500, "INTERNAL", "合并没有产生新分镜");
  const created = await createPanelRecord(tx, projectId, chapterId, inserted.order, inheritPanelInput(first, fields));
  await writeCastRows(tx, created.id, cast);
  await tx.panel.deleteMany({ where: { id: { in: [...ids] } } });
  return created;
}

/** 第一格按草稿里最靠前的那格算。在场角色先保留它的，再按后面各格补上，不重复。 */
export function unionCast(panelIds: readonly string[], rows: readonly PanelCastRow[]): PanelCastRow[] {
  const seenProject = new Set<string>();
  const seenPending = new Set<string>();
  const union: PanelCastRow[] = [];
  for (const panelId of panelIds) {
    const members = rows
      .filter((row) => row.panel_id === panelId)
      .sort((left, right) => left.sort_order - right.sort_order);
    for (const row of members) {
      if (row.project_character_id) {
        if (seenProject.has(row.project_character_id)) continue;
        seenProject.add(row.project_character_id);
      } else if (row.pending_character_key) {
        if (seenPending.has(row.pending_character_key)) continue;
        seenPending.add(row.pending_character_key);
      }
      union.push(row);
    }
  }
  return union;
}
