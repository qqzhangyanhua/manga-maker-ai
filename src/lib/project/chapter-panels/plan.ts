import { ApiError } from "@/lib/api-error";

/** 草稿里的一格。调用方已经按阅读顺序排好。 */
export interface DraftPanel {
  id: string;
  order: number;
}

export interface ChapterDraft {
  chapterId: string;
  panels: readonly DraftPanel[];
}

/** 在场角色的一格输入。顺序就是数组顺序。 */
export interface CastMemberInput {
  projectCharacterId: string;
  outfitId?: string | null;
  expression?: string | null;
}

export type InsertAt =
  | { index: number }
  | { after: string }
  | { before: string };

export interface PlannedInsert {
  key: string;
  order: number;
}

export interface PlannedOrder {
  id: string;
  order: number;
}

export interface PlannedCastRow {
  projectCharacterId: string;
  outfitId: string | null;
  expression: string | null;
  sortOrder: number;
}

export interface WriteDiff {
  chapterId: string;
  inserts: PlannedInsert[];
  /** 编号有变化的已有分镜，按新编号从小到大。 */
  orders: PlannedOrder[];
  cast: { panelId: string; rows: PlannedCastRow[] } | null;
  /** 从本章拿走的已有分镜。空的时候不出现，好让旧的插入结果保持原样。 */
  removed?: string[];
  /** 从别的章节移进来的已有分镜。 */
  arrivals?: PlannedOrder[];
}

export type ChapterEdit =
  | { op: "add"; keys: readonly string[]; at: InsertAt }
  | { op: "setCast"; panelId: string; cast: readonly CastMemberInput[] }
  | { op: "remove"; ids: readonly string[] }
  | { op: "place"; ids: readonly string[]; at: InsertAt }
  | { op: "split"; id: string; keys: readonly string[] }
  | { op: "merge"; ids: readonly string[]; key: string }
  | { op: "replace"; keys: readonly string[] };

/**
 * 在章节草稿上算出一次写入的差异。
 * 编号按草稿数组的顺序重排成 1..N，不看原来的空号。
 */
export function plan(draft: ChapterDraft, edit: ChapterEdit): WriteDiff {
  if (edit.op === "setCast") return planSetCast(draft, edit.panelId, edit.cast);
  if (edit.op === "remove") return planRemove(draft, edit.ids);
  if (edit.op === "place") return planPlace(draft, edit.ids, edit.at);
  if (edit.op === "split") return planSplit(draft, edit.id, edit.keys);
  if (edit.op === "merge") return planMerge(draft, edit.ids, edit.key);
  if (edit.op === "replace") return planReplace(draft, edit.keys);
  return planAdd(draft, edit.keys, edit.at);
}

function planSetCast(draft: ChapterDraft, panelId: string, cast: readonly CastMemberInput[]): WriteDiff {
  if (!draft.panels.some((panel) => panel.id === panelId)) {
    throw new ApiError(404, "NOT_FOUND", "分镜不存在");
  }
  return {
    chapterId: draft.chapterId,
    inserts: [],
    orders: [],
    cast: {
      panelId,
      rows: cast.map((row, sortOrder) => ({
        projectCharacterId: row.projectCharacterId,
        outfitId: row.outfitId ?? null,
        expression: row.expression ?? null,
        sortOrder,
      })),
    },
  };
}

function planAdd(draft: ChapterDraft, keys: readonly string[], at: InsertAt): WriteDiff {
  assertFreshKeys(draft, keys);
  const index = resolveIndex(draft.panels, at);
  const sequence = draft.panels.map((panel) => panel.id);
  sequence.splice(index, 0, ...keys);
  return sequenceDiff(draft, sequence, keys, [], []);
}

function planRemove(draft: ChapterDraft, ids: readonly string[]): WriteDiff {
  assertUnique(ids, "要删除的分镜重复了");
  assertPresent(draft, ids);
  const removing = new Set(ids);
  const removed = draft.panels.filter((panel) => removing.has(panel.id)).map((panel) => panel.id);
  const sequence = draft.panels.filter((panel) => !removing.has(panel.id)).map((panel) => panel.id);
  return sequenceDiff(draft, sequence, [], removed, []);
}

function planPlace(draft: ChapterDraft, ids: readonly string[], at: InsertAt): WriteDiff {
  if (ids.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "没有要移动的分镜");
  }
  assertUnique(ids, "要移动的分镜重复了");
  const present = ids.filter((id) => draft.panels.some((panel) => panel.id === id));
  if (present.length === ids.length) {
    const moving = new Set(ids);
    const staying = draft.panels.filter((panel) => !moving.has(panel.id));
    const index = resolveIndex(staying, at, moving);
    const sequence = staying.map((panel) => panel.id);
    sequence.splice(index, 0, ...ids);
    return sequenceDiff(draft, sequence, [], [], []);
  }
  if (present.length > 0) {
    throw new ApiError(400, "MIXED_CHAPTER_PLACE", "要移动的分镜不在同一章节");
  }
  assertFreshKeys(draft, ids);
  const index = resolveIndex(draft.panels, at);
  const sequence = draft.panels.map((panel) => panel.id);
  sequence.splice(index, 0, ...ids);
  return sequenceDiff(draft, sequence, [], [], ids);
}

function planSplit(draft: ChapterDraft, id: string, keys: readonly string[]): WriteDiff {
  if (keys.length === 0) {
    throw new ApiError(400, "BAD_REQUEST", "拆分至少要留下一格");
  }
  assertPresent(draft, [id]);
  assertFreshKeys(draft, keys);
  const sequence = draft.panels.flatMap((panel) => (panel.id === id ? [...keys] : [panel.id]));
  return sequenceDiff(draft, sequence, keys, [id], []);
}

function planMerge(draft: ChapterDraft, ids: readonly string[], key: string): WriteDiff {
  if (ids.length < 2) {
    throw new ApiError(400, "BAD_REQUEST", "至少要合并两格分镜");
  }
  assertUnique(ids, "要合并的分镜重复了");
  assertPresent(draft, ids);
  assertFreshKeys(draft, [key]);
  const selected = new Set(ids);
  const firstIndex = draft.panels.findIndex((panel) => selected.has(panel.id));
  const stayingBefore = draft.panels.slice(0, firstIndex).filter((panel) => !selected.has(panel.id)).length;
  const staying = draft.panels.filter((panel) => !selected.has(panel.id)).map((panel) => panel.id);
  staying.splice(stayingBefore, 0, key);
  const removed = draft.panels.filter((panel) => selected.has(panel.id)).map((panel) => panel.id);
  return sequenceDiff(draft, staying, [key], removed, []);
}

function planReplace(draft: ChapterDraft, keys: readonly string[]): WriteDiff {
  assertUnique(keys, "新分镜的临时键重复了");
  assertFreshKeys(draft, keys);
  const removed = draft.panels.map((panel) => panel.id);
  return sequenceDiff(draft, [...keys], keys, removed, []);
}

function sequenceDiff(
  draft: ChapterDraft,
  sequence: readonly string[],
  insertedKeys: readonly string[],
  removed: readonly string[],
  arrivalIds: readonly string[],
): WriteDiff {
  const nextOrder = new Map(sequence.map((id, position) => [id, position + 1]));
  const removedSet = new Set(removed);
  const orders = draft.panels.flatMap((panel) => {
    if (removedSet.has(panel.id)) return [];
    const order = nextOrder.get(panel.id);
    if (order === undefined || order === panel.order) return [];
    return [{ id: panel.id, order }];
  });
  orders.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const diff: WriteDiff = {
    chapterId: draft.chapterId,
    inserts: insertedKeys.map((key) => ({ key, order: nextOrder.get(key) ?? 0 })),
    orders,
    cast: null,
  };
  if (removed.length > 0) diff.removed = [...removed];
  if (arrivalIds.length > 0) {
    diff.arrivals = arrivalIds.map((id) => ({ id, order: nextOrder.get(id) ?? 0 }));
  }
  return diff;
}

function assertUnique(ids: readonly string[], message: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new ApiError(400, "BAD_REQUEST", message);
  }
}

function assertPresent(draft: ChapterDraft, ids: readonly string[]): void {
  const known = new Set(draft.panels.map((panel) => panel.id));
  if (ids.some((id) => !known.has(id))) {
    throw new ApiError(404, "NOT_FOUND", "分镜不存在");
  }
}

function assertFreshKeys(draft: ChapterDraft, keys: readonly string[]): void {
  const existingIds = new Set(draft.panels.map((panel) => panel.id));
  if (keys.some((key) => existingIds.has(key))) {
    throw new ApiError(400, "BAD_REQUEST", "新分镜的临时键和已有分镜重复");
  }
}

function resolveIndex(panels: readonly DraftPanel[], at: InsertAt, moving?: ReadonlySet<string>): number {
  if ("index" in at) {
    if (!Number.isInteger(at.index) || at.index < 0 || at.index > panels.length) {
      throw new ApiError(400, "INDEX_OUT_OF_RANGE", "插入位置超出这一章的分镜范围");
    }
    return at.index;
  }

  const anchorId = "after" in at ? at.after : at.before;
  if (moving?.has(anchorId)) {
    throw new ApiError(400, "ANCHOR_IN_SELECTION", "不能把分镜放到自己前面或后面");
  }
  const position = panels.findIndex((panel) => panel.id === anchorId);
  if (position < 0) {
    throw new ApiError(404, "NOT_FOUND", "分镜不存在");
  }
  return "after" in at ? position + 1 : position;
}
