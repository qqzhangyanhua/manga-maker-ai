import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "@/lib/api-helpers";
import { filterOwnedCharacterIds } from "@/lib/project";
import { preparePanelCast } from "./panel-cast";
import { canvasShotInclude, isUuid, planPanelCharacters, toCanvasFinal, toCanvasShots } from "./shot-mapping";
import type { AnchoredCanvasChapter, CanvasShotContext } from "./context";
import type {
  CanvasFinal,
  CanvasShot,
  CanvasShotCharacters,
  CanvasShotInput,
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

async function lockChapterPanels(tx: Tx, chapterId: string): Promise<void> {
  // 与数据库函数 canvas_renumber_chapter_panels 同一个锁键
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('canvas_panels'), hashtext(${chapterId}))`;
}

async function renumberChapterPanels(tx: Tx, chapterId: string): Promise<void> {
  await tx.$executeRaw`SELECT canvas_renumber_chapter_panels(${chapterId}::uuid)`;
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

/** 主角色兼容字段（panel.character_id 等）取第一个已入库角色 */
async function syncMainCharacter(tx: Tx, panelId: string): Promise<void> {
  const first = await tx.panelCharacter.findFirst({
    where: { panel_id: panelId, project_character_id: { not: null } },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    include: { project_character: { select: { character_id: true } } },
  });
  await tx.panel.update({
    where: { id: panelId },
    data: {
      character_id: first?.project_character?.character_id ?? null,
      outfit_id: first?.outfit_id ?? null,
      expression_type: first?.expression_type ?? null,
    },
  });
}

/**
 * 整体替换分镜角色。已在当前用户角色库里的写成项目角色（不在项目里的自动加入），
 * unbound-xxx 写成待绑定，其余丢弃。待绑定角色的名称没传时沿用原来记录的。
 */
export async function replacePanelCharacters(
  tx: Tx,
  params: { panelId: string; projectId: string; userId: string; characters: CanvasShotCharacters }
): Promise<void> {
  const { panelId, projectId, userId, characters } = params;
  const existing = await tx.panelCharacter.findMany({
    where: { panel_id: panelId, pending_character_key: { not: null } },
    select: { pending_character_key: true, pending_character_name: true },
  });
  const pendingNames = new Map<string, string>();
  for (const row of existing) {
    if (row.pending_character_key && row.pending_character_name) {
      pendingNames.set(row.pending_character_key, row.pending_character_name);
    }
  }
  characters.pendingNames?.forEach((name, key) => pendingNames.set(key, name));

  const ownedCharacterIds = await filterOwnedCharacterIds(
    tx,
    userId,
    characters.character_ids.filter(isUuid)
  );
  const outfitIds = (characters.outfit_ids ?? []).filter(isUuid);
  const outfits = outfitIds.length
    ? await tx.characterOutfit.findMany({ where: { id: { in: outfitIds } }, select: { id: true, character_id: true } })
    : [];

  const plans = planPanelCharacters({
    characterIds: characters.character_ids,
    outfitIds: characters.outfit_ids,
    expressionTypes: characters.expression_types,
    ownedCharacterIds,
    outfitOwners: new Map(outfits.map((o) => [o.id, o.character_id])),
    pendingNames,
  });

  const realIds = plans.map((p) => p.characterId).filter((id): id is string => id !== null);
  const projectCharacterIds = new Map<string, string>();
  if (realIds.length > 0) {
    await tx.projectCharacter.createMany({
      data: realIds.map((characterId) => ({ project_id: projectId, character_id: characterId, role: "minor" })),
      skipDuplicates: true,
    });
    const rows = await tx.projectCharacter.findMany({
      where: { project_id: projectId, character_id: { in: realIds } },
      select: { id: true, character_id: true },
    });
    rows.forEach((row) => projectCharacterIds.set(row.character_id, row.id));
  }

  await tx.panelCharacter.deleteMany({ where: { panel_id: panelId } });
  if (plans.length > 0) {
    await tx.panelCharacter.createMany({
      data: plans.map((plan) => ({
        panel_id: panelId,
        project_character_id: plan.characterId ? projectCharacterIds.get(plan.characterId) ?? null : null,
        pending_character_key: plan.pendingKey,
        pending_character_name: plan.pendingName,
        outfit_id: plan.outfitId,
        expression_type: plan.expression,
        sort_order: plan.sortOrder,
      })),
    });
  }
  await syncMainCharacter(tx, panelId);
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

export interface NewCanvasShot extends CanvasShotInput {
  segmentId: string;
  outfit_ids?: string[];
  expression_types?: string[];
}

/**
 * 在锚定的项目章节里新建画布镜头（分镜），接在同一剧本片段已有镜头之后，然后统一重编号。
 * 返回新建的镜头，顺序与输入一致。
 */
export async function createCanvasShots(
  db: PrismaClient,
  params: {
    chapter: AnchoredCanvasChapter;
    userId: string;
    shots: NewCanvasShot[];
    pendingNames?: Map<string, string>;
  }
): Promise<CanvasShot[]> {
  const { chapter, userId, shots } = params;
  if (shots.length === 0) return [];

  const segmentIds = Array.from(new Set(shots.map((s) => s.segmentId)));
  const validSegments = await db.scriptSegment.count({
    where: { id: { in: segmentIds }, timeline_chapter_id: chapter.timelineChapterId },
  });
  if (validSegments !== segmentIds.length) {
    throw new ApiError("剧本片段不属于该章节", 400, "SEGMENT_CHAPTER_MISMATCH");
  }

  const createdIds = await db.$transaction(async (tx) => {
    await lockChapterPanels(tx, chapter.projectChapterId);
    const max = await tx.panel.aggregate({
      where: { chapter_id: chapter.projectChapterId },
      _max: { panel_order: true },
    });
    let nextOrder = (max._max.panel_order ?? 0) + 1;
    const ids: string[] = [];

    for (const shot of shots) {
      const panel = await tx.panel.create({
        data: {
          project_id: chapter.projectId,
          chapter_id: chapter.projectChapterId,
          segment_id: shot.segmentId,
          panel_order: nextOrder++,
          panel_type: emptyToNull(shot.panel_type) ?? "medium",
          importance: "medium",
          description: shot.shot_description,
          camera_angle: emptyToNull(shot.camera_angle),
          shot_size: emptyToNull(shot.shot_size),
          composition_hint: emptyToNull(shot.composition_hint),
          location_key: emptyToNull(shot.location_key),
          visual_prompt: shot.prompt,
          negative_prompt: shot.negative_prompt,
          generation_status: "pending",
          pipeline_state: { create: {} },
        },
        select: { id: true },
      });
      if (shot.character_ids.length > 0) {
        await replacePanelCharacters(tx, {
          panelId: panel.id,
          projectId: chapter.projectId,
          userId,
          characters: {
            character_ids: shot.character_ids,
            outfit_ids: shot.outfit_ids,
            expression_types: shot.expression_types,
            pendingNames: params.pendingNames,
          },
        });
      }
      ids.push(panel.id);
    }

    await renumberChapterPanels(tx, chapter.projectChapterId);
    return ids;
  }, WRITE_TX_OPTIONS);

  const all = await listChapterShots(db, chapter.timelineChapterId);
  const byId = new Map(all.map((s) => [s.id, s]));
  return createdIds.map((id) => byId.get(id)).filter((s): s is CanvasShot => s !== undefined);
}

/** 更新画布上的一格分镜；只写传了的字段。传了出场角色就整体替换，并同步主角色。 */
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

  const cast =
    patch.characters !== undefined
      ? await preparePanelCast(db, context.projectId, patch.characters)
      : null;
  if (cast) {
    data.character_id = cast.leadCharacterId;
    data.outfit_id = cast.leadOutfitId;
    data.expression_type = cast.leadExpression;
  }

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
    if (cast) {
      await tx.panelCharacter.deleteMany({ where: { panel_id: context.panel.id } });
      if (cast.rows.length > 0) {
        await tx.panelCharacter.createMany({
          data: cast.rows.map((row) => ({ panel_id: context.panel.id, ...row })),
        });
      }
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
