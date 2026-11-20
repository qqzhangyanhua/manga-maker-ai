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
}

export type ChapterEdit =
  | { op: "add"; keys: readonly string[]; at: InsertAt }
  | { op: "setCast"; panelId: string; cast: readonly CastMemberInput[] };

/**
 * 在章节草稿上算出一次写入的差异。
 * 编号按草稿数组的顺序重排成 1..N，不看原来的空号。
 */
export function plan(draft: ChapterDraft, edit: ChapterEdit): WriteDiff {
  if (edit.op === "setCast") {
    if (!draft.panels.some((panel) => panel.id === edit.panelId)) {
      throw new ApiError(404, "NOT_FOUND", "分镜不存在");
    }
    return {
      chapterId: draft.chapterId,
      inserts: [],
      orders: [],
      cast: {
        panelId: edit.panelId,
        rows: edit.cast.map((row, sortOrder) => ({
          projectCharacterId: row.projectCharacterId,
          outfitId: row.outfitId ?? null,
          expression: row.expression ?? null,
          sortOrder,
        })),
      },
    };
  }

  const index = resolveIndex(draft.panels, edit.at);
  const existingIds = new Set(draft.panels.map((panel) => panel.id));
  edit.keys.forEach((key) => {
    if (existingIds.has(key)) {
      throw new ApiError(400, "BAD_REQUEST", "新分镜的临时键和已有分镜重复");
    }
  });

  const sequence = draft.panels.map((panel) => panel.id);
  sequence.splice(index, 0, ...edit.keys);
  const nextOrder = new Map(sequence.map((id, position) => [id, position + 1]));
  const inserts = edit.keys.map((key) => ({ key, order: nextOrder.get(key) ?? 0 }));
  const orders = draft.panels.flatMap((panel) => {
    const order = nextOrder.get(panel.id) ?? panel.order;
    return order === panel.order ? [] : [{ id: panel.id, order }];
  });

  return { chapterId: draft.chapterId, inserts, orders, cast: null };
}

function resolveIndex(panels: readonly DraftPanel[], at: InsertAt): number {
  if ("index" in at) {
    if (!Number.isInteger(at.index) || at.index < 0 || at.index > panels.length) {
      throw new ApiError(400, "INDEX_OUT_OF_RANGE", "插入位置超出这一章的分镜范围");
    }
    return at.index;
  }

  const anchorId = "after" in at ? at.after : at.before;
  const position = panels.findIndex((panel) => panel.id === anchorId);
  if (position < 0) {
    throw new ApiError(404, "NOT_FOUND", "分镜不存在");
  }
  return "after" in at ? position + 1 : position;
}
