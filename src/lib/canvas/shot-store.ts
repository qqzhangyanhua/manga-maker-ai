import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizePanelCast, panels } from "@/lib/project/chapter-panels";
import { canvasShotInclude, isUuid, toCanvasFinal, toCanvasShots } from "./shot-mapping";
import type { CanvasShotContext } from "./context";
import type {
  CanvasFinal,
  CanvasShot,
  CanvasShotPatch,
  CanvasShotPipelineFields,
} from "./types";

type Db = PrismaClient | Prisma.TransactionClient;
type Tx = Prisma.TransactionClient;

const WRITE_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** 时间线章节下的全部画布镜头，按剧本片段、分镜编号排序 */
export async function listChapterShots(db: Db, timelineChapterId: string): Promise<CanvasShot[]> {
  const panels = await db.panel.findMany({
    where: { segment: { timeline_chapter_id: timelineChapterId } },
    include: canvasShotInclude,
    orderBy: [{ segment: { segment_order: "asc" } }, { panel_order: "asc" }, { created_at: "asc" }, { id: "asc" }],
  });
  return toCanvasShots(panels);
}

/** 时间线章节下的画布最终漫画（canvas_final 候选图） */
export async function listChapterFinals(db: Db, timelineChapterId: string): Promise<CanvasFinal[]> {
  const variants = await db.panelVariant.findMany({
    where: { variant_type: "canvas_final", panel: { segment: { timeline_chapter_id: timelineChapterId } } },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  return variants.map(toCanvasFinal);
}

/** 时间线章节的镜头里出现的已入库角色，及每个角色出现的镜头数 */
export async function countChapterCharacters(db: Db, timelineChapterId: string): Promise<Map<string, number>> {
  const rows = await db.panelCharacter.findMany({
    where: {
      project_character_id: { not: null },
      panel: { segment: { timeline_chapter_id: timelineChapterId } },
    },
    select: { panel_id: true, project_character: { select: { character_id: true } } },
  });
  const panelsByCharacter = new Map<string, Set<string>>();
  for (const row of rows) {
    const characterId = row.project_character?.character_id;
    if (!characterId) continue;
    const panels = panelsByCharacter.get(characterId) ?? new Set<string>();
    panels.add(row.panel_id);
    panelsByCharacter.set(characterId, panels);
  }
  return new Map(Array.from(panelsByCharacter, ([id, panels]) => [id, panels.size]));
}

async function upsertPipelineState(tx: Tx, panelId: string, fields: CanvasShotPipelineFields): Promise<void> {
  const data = {
    updated_at: new Date(),
    character_prompt_template_ids: fields.character_prompt_template_ids?.filter(isUuid),
    prompt_composition_id: fields.prompt_composition_id,
    nine_grid_generation_id: fields.nine_grid_generation_id,
    character_prompt_status: fields.character_prompt_status,
    final_prompt_status: fields.final_prompt_status,
    nine_grid_status: fields.nine_grid_status,
    selection_status: fields.selection_status,
  };

  // undefined 字段 Prisma 会跳过
  await tx.panelPipelineState.upsert({
    where: { panel_id: panelId },
    update: data,
    create: { ...data, panel_id: panelId },
  });
}

function hasPipelineFields(fields: CanvasShotPipelineFields): boolean {
  return (
    fields.character_prompt_template_ids !== undefined ||
    fields.prompt_composition_id !== undefined ||
    fields.nine_grid_generation_id !== undefined ||
    fields.character_prompt_status !== undefined ||
    fields.final_prompt_status !== undefined ||
    fields.nine_grid_status !== undefined ||
    fields.selection_status !== undefined
  );
}

/** 只更新画布流程状态（角色提示词、最终提示词、九宫格、选图） */
export async function updateShotPipeline(db: Db, panelId: string, fields: CanvasShotPipelineFields): Promise<void> {
  if (!hasPipelineFields(fields)) return;
  if ("$transaction" in db) {
    await db.$transaction((tx) => upsertPipelineState(tx, panelId, fields));
  } else {
    await upsertPipelineState(db, panelId, fields);
  }
}

/** 更新画布上的一格分镜；只写传了的字段。传了出场角色就整体替换。主角色由触发器派生。 */
export async function updateCanvasShot(
  db: PrismaClient,
  context: CanvasShotContext,
  _userId: string,
  patch: CanvasShotPatch
): Promise<void> {
  const data: Prisma.PanelUncheckedUpdateInput = {};
  if (patch.camera_angle !== undefined) data.camera_angle = emptyToNull(patch.camera_angle);
  if (patch.shot_size !== undefined) data.shot_size = emptyToNull(patch.shot_size);
  if (patch.panel_type !== undefined) data.panel_type = emptyToNull(patch.panel_type) ?? "medium";
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.composition_hint !== undefined) data.composition_hint = emptyToNull(patch.composition_hint);
  if (patch.location_key !== undefined) data.location_key = emptyToNull(patch.location_key);
  if (patch.prompt !== undefined) data.visual_prompt = patch.prompt;
  if (patch.negative_prompt !== undefined) data.negative_prompt = patch.negative_prompt;
  if (patch.generated_image_url !== undefined) data.generated_image = patch.generated_image_url;
  if (patch.generation_status !== undefined) data.generation_status = patch.generation_status;

  const cast = patch.characters !== undefined
    ? await normalizePanelCast(db, context.projectId, patch.characters.map((row) => ({
      projectCharacterId: row.project_character_id,
      outfitId: row.outfit_id,
      expression: row.expression,
    })))
    : undefined;

  await db.$transaction(async (tx) => {
    if (patch.scene_id !== undefined) {
      const scene =
        patch.scene_id && isUuid(patch.scene_id)
          ? await tx.scene.findUnique({ where: { id: patch.scene_id }, select: { id: true } })
          : null;
      data.scene_id = scene?.id ?? null;
    }
    if (Object.keys(data).length > 0) {
      await tx.panel.update({ where: { id: context.panel.id }, data });
    }
    if (cast !== undefined) {
      await panels(context.projectId, { tx }).setCast(context.panel.id, cast);
    }
    if (hasPipelineFields(patch)) {
      await upsertPipelineState(tx, context.panel.id, patch);
    }
  }, WRITE_TX_OPTIONS);
}

/** 记录一张画布最终漫画（不自动选中） */
export async function addCanvasFinal(
  db: Db,
  params: {
    panelId: string;
    imageUrl: string;
    prompt: string;
    width?: number;
    height?: number;
    generationParams?: Record<string, Prisma.InputJsonValue | null>;
  }
): Promise<CanvasFinal> {
  const variant = await db.panelVariant.create({
    data: {
      panel_id: params.panelId,
      image_url: params.imageUrl,
      prompt: params.prompt,
      variant_type: "canvas_final",
      is_selected: false,
      generation_params: {
        ...(params.generationParams ?? {}),
        width: params.width ?? 1024,
        height: params.height ?? 768,
      },
    },
  });
  return toCanvasFinal(variant);
}

/** 按实际数据刷新章节与时间线的镜头数、成图数 */
export async function refreshCanvasCounters(db: Db, timelineChapterId: string): Promise<void> {
  const tc = await db.timelineChapter.findUnique({ where: { id: timelineChapterId }, select: { timeline_id: true } });
  if (!tc) return;
  const [shotCount, finalCount] = await Promise.all([
    db.panel.count({ where: { segment: { timeline_chapter_id: timelineChapterId } } }),
    db.panelVariant.count({
      where: { variant_type: "canvas_final", panel: { segment: { timeline_chapter_id: timelineChapterId } } },
    }),
  ]);
  await db.timelineChapter.update({
    where: { id: timelineChapterId },
    data: { shot_count: shotCount, final_image_count: finalCount },
  });
  const totals = await db.timelineChapter.aggregate({
    where: { timeline_id: tc.timeline_id },
    _sum: { shot_count: true, final_image_count: true },
  });
  await db.canvasTimeline.update({
    where: { id: tc.timeline_id },
    data: {
      total_shots: totals._sum.shot_count ?? 0,
      total_images: totals._sum.final_image_count ?? 0,
    },
  });
}
