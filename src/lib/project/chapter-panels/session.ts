import type { Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "@/lib/api-error";

import type { InsertAt } from "./plan";

type Tx = Prisma.TransactionClient;

const WRITE_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

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
  cameraMovement?: string | null;
  movementSpeed?: string | null;
  movementDirection?: string | null;
  emotion?: string | null;
  promptUsed?: string | null;
  scriptStart?: number | null;
  scriptEnd?: number | null;
  layoutHint?: string | null;
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

const PANEL_SELECT = {
  id: true,
  project_id: true,
  chapter_id: true,
  panel_order: true,
  segment_id: true,
  panel_type: true,
  importance: true,
  description: true,
  dialogue: true,
  camera_angle: true,
  shot_size: true,
  composition_hint: true,
  location_key: true,
  visual_prompt: true,
  negative_prompt: true,
  generation_status: true,
  scene_id: true,
  emotion: true,
  prompt_used: true,
  script_start: true,
  script_end: true,
  layout_hint: true,
  camera_movement: true,
  movement_speed: true,
  movement_direction: true,
} satisfies Prisma.PanelSelect;

export type PanelContent = Prisma.PanelGetPayload<{ select: typeof PANEL_SELECT }>;

interface DraftRow {
  id: string;
  panel_order: number;
  project_id: string;
}

export async function withTransaction<T>(options: PanelWriterOptions, work: (tx: Tx) => Promise<T>): Promise<T> {
  if (options.tx) return work(options.tx);
  const client = options.db ?? (await loadPrisma());
  return client.$transaction((tx) => work(tx), WRITE_TX_OPTIONS);
}

async function loadPrisma(): Promise<PrismaClient> {
  const loaded = await import("@/lib/db");
  return loaded.prisma;
}

export function assertUniqueIds(ids: readonly string[], message: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new ApiError(400, "BAD_REQUEST", message);
  }
}

export async function createPanelRecord(
  tx: Tx,
  projectId: string,
  chapterId: string,
  panelOrder: number,
  field: NewPanelInput,
): Promise<AddedPanel> {
  const panel = await tx.panel.create({
    data: {
      project_id: projectId,
      chapter_id: chapterId,
      panel_order: panelOrder,
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
      emotion: field.emotion,
      prompt_used: field.promptUsed,
      script_start: field.scriptStart,
      script_end: field.scriptEnd,
      layout_hint: field.layoutHint,
      camera_movement: field.cameraMovement,
      movement_speed: field.movementSpeed,
      movement_direction: field.movementDirection,
      pipeline_state: { create: {} },
    },
    select: { id: true },
  });
  return { id: panel.id, panelOrder };
}

/** 没在补丁里写出的字段沿用原分镜。主角色列不在这里。 */
export function inheritPanelInput(source: PanelContent, patch: Partial<NewPanelInput> = {}): NewPanelInput {
  const inherited: NewPanelInput = {
    segmentId: source.segment_id,
    panelType: source.panel_type,
    importance: source.importance,
    description: source.description,
    dialogue: source.dialogue,
    cameraAngle: source.camera_angle,
    shotSize: source.shot_size,
    compositionHint: source.composition_hint,
    locationKey: source.location_key,
    visualPrompt: source.visual_prompt,
    negativePrompt: source.negative_prompt,
    generationStatus: source.generation_status,
    sceneId: source.scene_id,
    emotion: source.emotion,
    promptUsed: source.prompt_used,
    scriptStart: source.script_start,
    scriptEnd: source.script_end,
    layoutHint: source.layout_hint,
    cameraMovement: source.camera_movement,
    movementSpeed: source.movement_speed,
    movementDirection: source.movement_direction,
  };
  const keys = Object.keys(patch) as (keyof NewPanelInput)[];
  for (const key of keys) {
    if (patch[key] !== undefined) {
      Object.assign(inherited, { [key]: patch[key] });
    }
  }
  return inherited;
}

export async function resolveChapterId(tx: Tx, projectId: string, where: PanelInsertWhere): Promise<string> {
  if ("chapter" in where) {
    await requireChapter(tx, projectId, where.chapter);
    return where.chapter;
  }
  const panelId = "after" in where ? where.after : where.before;
  const panel = await requirePanel(tx, projectId, panelId);
  await requireChapter(tx, projectId, panel.chapter_id);
  return panel.chapter_id;
}

export function toInsertAt(where: PanelInsertWhere, length: number): InsertAt {
  if (!("chapter" in where)) return where;
  return { index: where.index ?? length };
}

export async function requireChapter(tx: Tx, projectId: string, chapterId: string): Promise<void> {
  const chapter = await tx.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, project_id: true },
  });
  if (!chapter) throw new ApiError(404, "NOT_FOUND", "章节不存在");
  if (chapter.project_id !== projectId) {
    throw new ApiError(400, "CHAPTER_PROJECT_MISMATCH", "章节不属于该项目");
  }
}

export async function requirePanel(tx: Tx, projectId: string, panelId: string): Promise<{ chapter_id: string }> {
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

export async function loadPanel(tx: Tx, projectId: string, panelId: string): Promise<PanelContent> {
  const panel = await tx.panel.findUnique({ where: { id: panelId }, select: PANEL_SELECT });
  if (!panel) throw new ApiError(404, "NOT_FOUND", "分镜不存在");
  if (panel.project_id !== projectId) {
    throw new ApiError(400, "PANEL_PROJECT_MISMATCH", "分镜不属于该项目");
  }
  return panel;
}

export async function loadPanels(tx: Tx, projectId: string, ids: readonly string[]): Promise<PanelContent[]> {
  const rows = await tx.panel.findMany({
    where: { id: { in: [...ids] } },
    select: PANEL_SELECT,
  });
  if (rows.length !== new Set(ids).size) {
    throw new ApiError(404, "NOT_FOUND", "分镜不存在");
  }
  if (rows.some((row) => row.project_id !== projectId)) {
    throw new ApiError(400, "PANEL_PROJECT_MISMATCH", "分镜不属于该项目");
  }
  return rows;
}

/** 与 canvas_renumber_chapter_panels 同一个锁键。多章时按章节 id 排序再加锁。 */
export async function lockChapter(tx: Tx, chapterId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('canvas_panels'), hashtext(${chapterId}))`;
}

export async function lockChapters(tx: Tx, chapterIds: readonly string[]): Promise<void> {
  const sorted = [...new Set(chapterIds)].sort((left, right) => left.localeCompare(right));
  for (const chapterId of sorted) {
    await lockChapter(tx, chapterId);
  }
}

export async function loadDraft(tx: Tx, projectId: string, chapterId: string): Promise<DraftRow[]> {
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

export async function applyOrders(tx: Tx, orders: readonly { id: string; order: number }[]): Promise<void> {
  const descending = [...orders].sort((left, right) => right.order - left.order);
  for (const update of descending) {
    await tx.panel.update({ where: { id: update.id }, data: { panel_order: update.order } });
  }
}

/** 先把还在表里的分镜挪到负数编号，后面的 1..N 才不会和它们撞号。 */
export async function parkPanels(tx: Tx, ids: readonly string[]): Promise<void> {
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (!id) continue;
    await tx.panel.update({ where: { id }, data: { panel_order: -(index + 1) } });
  }
}
