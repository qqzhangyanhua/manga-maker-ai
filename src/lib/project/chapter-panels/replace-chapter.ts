import type { Prisma } from "@prisma/client";

import { countDiscarded, type Discarded } from "./discard";
import { plan } from "./plan";
import {
  createPanelRecord,
  loadDraft,
  lockChapter,
  requireChapter,
  type AddedPanel,
  type NewPanelInput,
} from "./session";

type Tx = Prisma.TransactionClient;

export interface ReplacedChapter {
  panels: AddedPanel[];
  discarded: Discarded;
}

/** 删掉这一章的旧分镜并写上新的，两步在同一个事务里。调用方失败时整个事务回滚。 */
export async function replaceChapterInTransaction(
  tx: Tx,
  projectId: string,
  chapterId: string,
  fields: readonly NewPanelInput[],
): Promise<ReplacedChapter> {
  await requireChapter(tx, projectId, chapterId);
  await lockChapter(tx, chapterId);
  const draft = await loadDraft(tx, projectId, chapterId);
  const keys = fields.map((_field, index) => `replace:${index}`);
  const diff = plan(
    { chapterId, panels: draft.map((panel) => ({ id: panel.id, order: panel.panel_order })) },
    { op: "replace", keys },
  );
  const removed = draft.map((panel) => panel.id);
  const discarded = await countDiscarded(tx, removed);
  if (removed.length > 0) {
    await tx.panel.deleteMany({ where: { id: { in: removed } } });
  }

  const panels: AddedPanel[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    const inserted = diff.inserts[index];
    if (!field || !inserted) continue;
    panels.push(await createPanelRecord(tx, projectId, chapterId, inserted.order, field));
  }
  return { panels, discarded };
}
