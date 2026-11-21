import type { Prisma } from "@prisma/client";

import { countDiscarded, type Discarded, emptyDiscarded } from "./discard";
import { plan } from "./plan";
import { applyOrders, assertUniqueIds, loadDraft, loadPanels, lockChapters } from "./session";

type Tx = Prisma.TransactionClient;

/**
 * 先按章节算出留下的编号，再删掉分镜，最后才改剩余编号。
 * 这样被删的那一格腾出来之后，后面的格子才去占它的位置。
 */
export async function removeInTransaction(
  tx: Tx,
  projectId: string,
  ids: readonly string[],
): Promise<Discarded> {
  if (ids.length === 0) return emptyDiscarded();
  assertUniqueIds(ids, "要删除的分镜重复了");
  const targets = await loadPanels(tx, projectId, ids);
  const chapterIds = targets.map((panel) => panel.chapter_id);
  await lockChapters(tx, chapterIds);

  const diffs = [];
  for (const chapterId of [...new Set(chapterIds)]) {
    const draft = await loadDraft(tx, projectId, chapterId);
    const present = new Set(draft.map((panel) => panel.id));
    const leaving = ids.filter((id) => present.has(id));
    if (leaving.length === 0) continue;
    diffs.push(plan(
      { chapterId, panels: draft.map((panel) => ({ id: panel.id, order: panel.panel_order })) },
      { op: "remove", ids: leaving },
    ));
  }

  const discarded = await countDiscarded(tx, ids);
  await tx.panel.deleteMany({ where: { id: { in: [...ids] } } });
  for (const diff of diffs) {
    await applyOrders(tx, diff.orders);
  }
  return discarded;
}
