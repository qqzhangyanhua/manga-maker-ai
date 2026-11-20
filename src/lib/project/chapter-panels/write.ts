import type { Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "@/lib/api-error";

import { plan } from "./plan";
import type { CastMemberInput, InsertAt } from "./plan";

type Tx = Prisma.TransactionClient;
type Db = PrismaClient | Tx;

const WRITE_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 新建一格时写入的内容。主角色由在场角色触发器派生，这里不接收。 */
export interface NewPanelInput {
  segmentId?: string | null;
  panelType: string;
  importance?: string;
  description: string;
  dialogue?: string | null;
  cameraAngle?: string | null;
  shotSize?: string | null;
  compositionHint?: string | null;
  locationKey?: string | null;
  visualPrompt?: string | null;
  negativePrompt?: string | null;
  generationStatus?: string | null;
  sceneId?: string | null;
}

export type PanelInsertWhere =
  | { chapter: string; index?: number }
  | { after: string }
  | { before: string };

export interface AddedPanel {
  id: string;
  panelOrder: number;
}

export interface PanelWriterOptions {
  /** 不传 tx 时用它自己开事务。 */
  db?: PrismaClient;
  tx?: Tx;
}

export interface ChapterPanels {
  add(input: NewPanelInput | readonly NewPanelInput[], where: PanelInsertWhere): Promise<AddedPanel[]>;
  setCast(panelId: string, cast: readonly CastMemberInput[]): Promise<void>;
}

interface DraftRow {
  id: string;
  panel_order: number;
  project_id: string;
}

interface NormalizedCast {
  projectCharacterId: string;
  outfitId: string | null;
  expression: string | null;
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
    setCast(panelId, cast) {
      return withTransaction(options, (tx) => setCastInTransaction(tx, projectId, panelId, cast));
    },
  };
}

/** 校验在场角色。通过后返回要写入的行，不改库。 */
export async function normalizePanelCast(
  db: Db,
  projectId: string,
  cast: readonly CastMemberInput[],
): Promise<NormalizedCast[]> {
  const seen = new Set<string>();
  const normalized = cast.map((row) => {
    const projectCharacterId = row.projectCharacterId.trim();
    if (!UUID_RE.test(projectCharacterId)) {
      throw new ApiError(400, "PROJECT_CHARACTER_REQUIRED", "出场角色必须是项目角色");
    }
    if (seen.has(projectCharacterId)) {
      throw new ApiError(400, "DUPLICATE_PROJECT_CHARACTER", "同一格不能重复同一个项目角色");
    }
    seen.add(projectCharacterId);
    return {
      projectCharacterId,
      outfitId: row.outfitId?.trim() || null,
      expression: row.expression?.trim() || null,
    };
  });
  if (normalized.length === 0) return [];

  const found = await db.projectCharacter.findMany({
    where: { id: { in: normalized.map((row) => row.projectCharacterId) }, project_id: projectId },
    select: { id: true, character: { select: { outfits: { select: { id: true } } } } },
  });
  const byId = new Map(found.map((row) => [row.id, row]));
  return normalized.map((row) => {
    const projectCharacter = byId.get(row.projectCharacterId);
    if (!projectCharacter) {
      throw new ApiError(400, "PROJECT_CHARACTER_MISMATCH", "项目角色不属于这个项目");
    }
    if (row.outfitId && !projectCharacter.character.outfits.some((outfit) => outfit.id === row.outfitId)) {
      throw new ApiError(400, "OUTFIT_MISMATCH", "服装不属于该项目角色");
    }
    return row;
  });
}

async function withTransaction<T>(options: PanelWriterOptions, work: (tx: Tx) => Promise<T>): Promise<T> {
  if (options.tx) return work(options.tx);
  const client = options.db ?? (await loadPrisma());
  return client.$transaction((tx) => work(tx), WRITE_TX_OPTIONS);
}

async function loadPrisma(): Promise<PrismaClient> {
  const loaded = await import("@/lib/db");
  return loaded.prisma;
}

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
    const panel = await tx.panel.create({
      data: {
        project_id: projectId,
        chapter_id: chapterId,
        panel_order: inserted.order,
        panel_type: field.panelType,
        importance: field.importance ?? "medium",
        description: field.description,
        segment_id: field.segmentId,
        dialogue: field.dialogue,
        camera_angle: field.cameraAngle,
        shot_size: field.shotSize,
        composition_hint: field.compositionHint,
        location_key: field.locationKey,
        visual_prompt: field.visualPrompt,
        negative_prompt: field.negativePrompt,
        generation_status: field.generationStatus,
        scene_id: field.sceneId,
        pipeline_state: { create: {} },
      },
      select: { id: true },
    });
    created.push({ id: panel.id, panelOrder: inserted.order });
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

async function resolveChapterId(tx: Tx, projectId: string, where: PanelInsertWhere): Promise<string> {
  if ("chapter" in where) {
    await requireChapter(tx, projectId, where.chapter);
    return where.chapter;
  }
  const panelId = "after" in where ? where.after : where.before;
  const panel = await requirePanel(tx, projectId, panelId);
  await requireChapter(tx, projectId, panel.chapter_id);
  return panel.chapter_id;
}

function toInsertAt(where: PanelInsertWhere, length: number): InsertAt {
  if (!("chapter" in where)) return where;
  return { index: where.index ?? length };
}

async function requireChapter(tx: Tx, projectId: string, chapterId: string): Promise<void> {
  const chapter = await tx.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, project_id: true },
  });
  if (!chapter) throw new ApiError(404, "NOT_FOUND", "章节不存在");
  if (chapter.project_id !== projectId) {
    throw new ApiError(400, "CHAPTER_PROJECT_MISMATCH", "章节不属于该项目");
  }
}

async function requirePanel(tx: Tx, projectId: string, panelId: string): Promise<{ chapter_id: string }> {
  const panel = await tx.panel.findUnique({
    where: { id: panelId },
    select: { id: true, project_id: true, chapter_id: true },
  });
  if (!panel) throw new ApiError(404, "NOT_FOUND", "分镜不存在");
  if (panel.project_id !== projectId) {
    throw new ApiError(400, "PANEL_PROJECT_MISMATCH", "分镜不属于该项目");
  }
  return panel;
}

async function lockChapter(tx: Tx, chapterId: string): Promise<void> {
  // 与 canvas_renumber_chapter_panels 同一个锁键
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('canvas_panels'), hashtext(${chapterId}))`;
}

async function loadDraft(tx: Tx, projectId: string, chapterId: string): Promise<DraftRow[]> {
  const rows = await tx.panel.findMany({
    where: { chapter_id: chapterId },
    orderBy: [{ panel_order: "asc" }, { created_at: "asc" }, { id: "asc" }],
    select: { id: true, panel_order: true, project_id: true },
  });
  if (rows.some((row) => row.project_id !== projectId)) {
    throw new ApiError(400, "PANEL_PROJECT_MISMATCH", "分镜不属于该项目");
  }
  return rows;
}

async function applyOrders(tx: Tx, orders: readonly { id: string; order: number }[]): Promise<void> {
  const descending = [...orders].sort((left, right) => right.order - left.order);
  for (const update of descending) {
    await tx.panel.update({ where: { id: update.id }, data: { panel_order: update.order } });
  }
}
