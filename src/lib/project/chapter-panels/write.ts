import type { Prisma } from "@prisma/client";

import { normalizePanelCast } from "./cast";
import type { Discarded } from "./discard";
import { setLeadInTransaction } from "./lead";
import { mergeInTransaction } from "./merge";
import { placeInTransaction, type PlacedPanel } from "./place";
import { plan } from "./plan";
import type { CastMemberInput } from "./plan";
import { removeInTransaction } from "./remove";
import { replaceChapterInTransaction, type ReplacedChapter } from "./replace-chapter";
import {
  applyOrders,
  createPanelRecord,
  loadDraft,
  lockChapter,
  requirePanel,
  resolveChapterId,
  toInsertAt,
  withTransaction,
  type AddedPanel,
  type NewPanelInput,
  type PanelInsertWhere,
  type PanelWriterOptions,
} from "./session";
import { splitInTransaction } from "./split";

export type { Discarded } from "./discard";
export type { PlacedPanel } from "./place";
export type { ReplacedChapter } from "./replace-chapter";
export type { AddedPanel, NewPanelInput, PanelInsertWhere, PanelWriterOptions } from "./session";
export { normalizePanelCast } from "./cast";

export interface ChapterPanels {
  add(input: NewPanelInput | readonly NewPanelInput[], where: PanelInsertWhere): Promise<AddedPanel[]>;
  remove(ids: readonly string[]): Promise<Discarded>;
  place(ids: readonly string[], where: PanelInsertWhere): Promise<PlacedPanel[]>;
  split(id: string, parts: readonly Partial<NewPanelInput>[]): Promise<AddedPanel[]>;
  merge(ids: readonly string[], fields?: Partial<NewPanelInput>): Promise<AddedPanel>;
  setCast(panelId: string, cast: readonly CastMemberInput[]): Promise<void>;
  setLead(ids: readonly string[], projectCharacterId: string): Promise<void>;
  replaceChapter(chapterId: string, fields: readonly NewPanelInput[]): Promise<ReplacedChapter>;
}

/**
 * 章节内分镜序列和在场角色的写入入口。
 * 调用方已经校验过项目归属。不传事务时自己开一个。
 */
export function panels(projectId: string, options: PanelWriterOptions = {}): ChapterPanels {
  return {
    add(input, where) {
      const fields = Array.isArray(input) ? input : [input];
      if (fields.length === 0) return Promise.resolve([]);
      return withTransaction(options, (tx) => addInTransaction(tx, projectId, fields, where));
    },
    remove(ids) {
      return withTransaction(options, (tx) => removeInTransaction(tx, projectId, ids));
    },
    place(ids, where) {
      return withTransaction(options, (tx) => placeInTransaction(tx, projectId, ids, where));
    },
    split(id, parts) {
      return withTransaction(options, (tx) => splitInTransaction(tx, projectId, id, parts));
    },
    merge(ids, fields) {
      return withTransaction(options, (tx) => mergeInTransaction(tx, projectId, ids, fields));
    },
    setCast(panelId, cast) {
      return withTransaction(options, (tx) => setCastInTransaction(tx, projectId, panelId, cast));
    },
    setLead(ids, projectCharacterId) {
      return withTransaction(options, (tx) => setLeadInTransaction(tx, projectId, ids, projectCharacterId));
    },
    replaceChapter(chapterId, fields) {
      return withTransaction(options, (tx) => replaceChapterInTransaction(tx, projectId, chapterId, fields));
    },
  };
}

type Tx = Prisma.TransactionClient;

async function addInTransaction(
  tx: Tx,
  projectId: string,
  fields: readonly NewPanelInput[],
  where: PanelInsertWhere,
): Promise<AddedPanel[]> {
  const chapterId = await resolveChapterId(tx, projectId, where);
  await lockChapter(tx, chapterId);
  const draft = await loadDraft(tx, projectId, chapterId);
  const diff = plan(
    { chapterId, panels: draft.map((panel) => ({ id: panel.id, order: panel.panel_order })) },
    { op: "add", keys: fields.map((_field, index) => `new:${index}`), at: toInsertAt(where, draft.length) },
  );
  await applyOrders(tx, diff.orders);
  const created: AddedPanel[] = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    const inserted = diff.inserts[index];
    if (!field || !inserted) continue;
    created.push(await createPanelRecord(tx, projectId, chapterId, inserted.order, field));
  }
  return created;
}

async function setCastInTransaction(
  tx: Tx,
  projectId: string,
  panelId: string,
  cast: readonly CastMemberInput[],
): Promise<void> {
  const panel = await requirePanel(tx, projectId, panelId);
  const normalized = await normalizePanelCast(tx, projectId, cast);
  await lockChapter(tx, panel.chapter_id);
  const draft = await loadDraft(tx, projectId, panel.chapter_id);
  const diff = plan(
    { chapterId: panel.chapter_id, panels: draft.map((row) => ({ id: row.id, order: row.panel_order })) },
    { op: "setCast", panelId, cast: normalized },
  );
  await tx.panelCharacter.deleteMany({ where: { panel_id: panelId } });
  if (!diff.cast || diff.cast.rows.length === 0) return;
  await tx.panelCharacter.createMany({
    data: diff.cast.rows.map((row) => ({
      panel_id: panelId,
      project_character_id: row.projectCharacterId,
      outfit_id: row.outfitId,
      expression_type: row.expression,
      sort_order: row.sortOrder,
      pending_character_key: null,
      pending_character_name: null,
    })),
  });
}
