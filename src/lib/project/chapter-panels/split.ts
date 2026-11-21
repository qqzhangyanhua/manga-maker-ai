import type { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api-error";

import { readCast, writeCastRows } from "./cast";
import { plan } from "./plan";
import {
  applyOrders,
  createPanelRecord,
  inheritPanelInput,
  loadDraft,
  loadPanel,
  lockChapter,
  parkPanels,
  type AddedPanel,
  type NewPanelInput,
} from "./session";

type Tx = Prisma.TransactionClient;

export async function splitInTransaction(
  tx: Tx,
  projectId: string,
  panelId: string,
  parts: readonly Partial<NewPanelInput>[],
): Promise<AddedPanel[]> {
  if (parts.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "拆分至少要留下一格");
  }
  const source = await loadPanel(tx, projectId, panelId);
  await lockChapter(tx, source.chapter_id);
  const draft = await loadDraft(tx, projectId, source.chapter_id);
  const keys = parts.map((_part, index) => `split:${index}`);
  const diff = plan(
    { chapterId: source.chapter_id, panels: draft.map((panel) => ({ id: panel.id, order: panel.panel_order })) },
    { op: "split", id: panelId, keys },
  );
  const cast = await readCast(tx, panelId);

  await parkPanels(tx, [panelId]);
  await applyOrders(tx, diff.orders);

  const created: AddedPanel[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const inserted = diff.inserts[index];
    if (!part || !inserted) continue;
    const panel = await createPanelRecord(
      tx,
      projectId,
      source.chapter_id,
      inserted.order,
      inheritPanelInput(source, part),
    );
    await writeCastRows(tx, panel.id, cast);
    created.push(panel);
  }
  await tx.panel.delete({ where: { id: panelId } });
  return created;
}
