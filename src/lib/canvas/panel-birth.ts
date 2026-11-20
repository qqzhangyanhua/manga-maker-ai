import type { Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "@/lib/api-error";
import { panels } from "@/lib/project/chapter-panels";

import type { AnchoredCanvasChapter } from "./context";
import { canvasShotInclude, isUuid, toCanvasShot } from "./shot-mapping";
import type { CanvasShot } from "./types";

const PANEL_TYPES = new Set(["closeup", "medium", "wide", "action", "dialogue", "transition"]);
const WRITE_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

/** 规划器实际发出的一格。只读这些字段。 */
export interface PlannedPanelFields {
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  character_ids: string[];
  expression_types: string[];
  prompt: string;
  negative_prompt: string;
  location_key: string;
}

export interface ChapterSegmentInput {
  id: string;
  content: string;
  scene_description: string;
  character_actions: string;
}

export interface PanelBirthPlanRequest {
  script_content: string;
  scene_description: string;
  character_actions: string;
  available_characters: Array<{ id: string; name: string }>;
}

export type PanelBirthPlanner = (request: PanelBirthPlanRequest) => Promise<PlannedPanelFields[]>;

export interface SkippedPanel {
  segment_id: string;
  shot_order: number;
  reason: string;
}

export interface PanelBirthResult {
  panels: CanvasShot[];
  skipped: SkippedPanel[];
}

interface LibraryCharacter {
  id: string;
  name: string;
}

interface ProjectCharacterRow {
  id: string;
  character_id: string;
}

interface CastRow {
  libraryCharacterId: string;
  projectCharacterId: string | null;
  expression: string | null;
}

interface AcceptedPanel {
  segmentId: string;
  panelType: string;
  description: string;
  cameraAngle: string;
  shotSize: string;
  compositionHint: string;
  locationKey: string;
  prompt: string;
  negativePrompt: string;
  rows: CastRow[];
  suggestions: string[];
}

type Db = PrismaClient;

export class NoPanelsWrittenError extends ApiError {
  readonly skipped: SkippedPanel[];

  constructor(skipped: SkippedPanel[]) {
    super(422, "NO_PANELS_WRITTEN", noPanelsMessage(skipped));
    this.name = "NoPanelsWrittenError";
    this.skipped = skipped;
  }
}

function noPanelsMessage(skipped: SkippedPanel[]): string {
  if (skipped.length === 0) {
    return "一格都没写上。规划没有返回可以写下的分镜";
  }
  const detail = skipped
    .map((item) => `片段 ${item.segment_id} 的第 ${item.shot_order} 格：${item.reason}`)
    .join("；");
  return `一格都没写上。${detail}`;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function text(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function expressionAt(values: string[] | undefined, index: number): string | null {
  const value = values?.[index];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function shotOrderOf(shot: PlannedPanelFields, index: number): number {
  return typeof shot.shot_order === "number" && Number.isFinite(shot.shot_order) ? shot.shot_order : index + 1;
}

function skipReason(description: string, panelType: string): string | null {
  const reasons: string[] = [];
  if (!description) reasons.push("没有描述");
  if (!PANEL_TYPES.has(panelType)) {
    reasons.push(`格子类型「${panelType}」不在分镜已有取值里`);
  }
  return reasons.length > 0 ? reasons.join("；") : null;
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * 把规划器给出的角色名单收成这一格要写入的项目角色。
 * 对不上角色库的名字记下来，调用方只在格子真正写下时才做成建议角色。
 */
function resolveCast(
  shot: PlannedPanelFields,
  libraryById: Map<string, LibraryCharacter>,
  libraryByName: Map<string, LibraryCharacter>,
  projectById: Map<string, ProjectCharacterRow>,
  projectByLibrary: Map<string, string>
): { rows: CastRow[]; suggestions: string[] } {
  const rows: CastRow[] = [];
  const suggestions: string[] = [];
  const seen = new Set<string>();
  const ids = Array.isArray(shot.character_ids) ? shot.character_ids : [];

  ids.forEach((raw, index) => {
    if (typeof raw !== "string") return;
    const token = raw.trim();
    if (!token) return;
    const expression = expressionAt(shot.expression_types, index);

    const projectCharacter = projectById.get(token);
    const libraryCharacter = projectCharacter
      ? { id: projectCharacter.character_id, name: "" }
      : libraryById.get(token) ?? libraryByName.get(nameKey(token));

    if (!libraryCharacter) {
      if (!isUuid(token)) suggestions.push(token);
      return;
    }

    if (seen.has(libraryCharacter.id)) return;
    seen.add(libraryCharacter.id);
    rows.push({
      libraryCharacterId: libraryCharacter.id,
      projectCharacterId: projectCharacter?.id ?? projectByLibrary.get(libraryCharacter.id) ?? null,
      expression,
    });
  });

  return { rows, suggestions };
}

function classifyShot(
  segmentId: string,
  shot: PlannedPanelFields,
  index: number,
  libraryById: Map<string, LibraryCharacter>,
  libraryByName: Map<string, LibraryCharacter>,
  projectById: Map<string, ProjectCharacterRow>,
  projectByLibrary: Map<string, string>
): { accepted?: AcceptedPanel; skipped?: SkippedPanel } {
  const description = text(shot.shot_description);
  const panelType = text(shot.panel_type);
  const reason = skipReason(description, panelType);
  const order = shotOrderOf(shot, index);
  if (reason) {
    return { skipped: { segment_id: segmentId, shot_order: order, reason } };
  }
  const cast = resolveCast(shot, libraryById, libraryByName, projectById, projectByLibrary);
  return {
    accepted: {
      segmentId,
      panelType,
      description,
      cameraAngle: text(shot.camera_angle),
      shotSize: text(shot.shot_size),
      compositionHint: text(shot.composition_hint),
      locationKey: text(shot.location_key),
      prompt: typeof shot.prompt === "string" ? shot.prompt : "",
      negativePrompt: typeof shot.negative_prompt === "string" ? shot.negative_prompt : "",
      rows: cast.rows,
      suggestions: cast.suggestions,
    },
  };
}

async function ensureProjectCharacters(
  tx: Prisma.TransactionClient,
  projectId: string,
  accepted: AcceptedPanel[]
): Promise<void> {
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const panel of accepted) {
    for (const row of panel.rows) {
      if (row.projectCharacterId || seen.has(row.libraryCharacterId)) continue;
      seen.add(row.libraryCharacterId);
      missing.push(row.libraryCharacterId);
    }
  }

  for (const libraryCharacterId of missing) {
    const created = await tx.projectCharacter.create({
      data: { project_id: projectId, character_id: libraryCharacterId, role: "minor" },
      select: { id: true },
    });
    for (const panel of accepted) {
      for (const row of panel.rows) {
        if (row.libraryCharacterId === libraryCharacterId && !row.projectCharacterId) {
          row.projectCharacterId = created.id;
        }
      }
    }
  }
}

function suggestionNames(accepted: AcceptedPanel[], existing: Array<{ name: string }>): string[] {
  const known = new Set(existing.map((row) => nameKey(row.name)));
  const names: string[] = [];
  for (const panel of accepted) {
    for (const name of panel.suggestions) {
      const key = nameKey(name);
      if (!key || known.has(key)) continue;
      known.add(key);
      names.push(name.trim());
    }
  }
  return names;
}

/**
 * 从一章的剧本片段生成分镜。
 * 规划器由调用方注入。调用失败或一格都没写上时不改库。
 */
export async function birthChapterPanels(
  db: Db,
  params: {
    chapter: AnchoredCanvasChapter;
    userId: string;
    segments: ChapterSegmentInput[];
    plan: PanelBirthPlanner;
  }
): Promise<PanelBirthResult> {
  const { chapter, userId, segments, plan } = params;
  if (segments.length === 0) {
    throw new NoPanelsWrittenError([]);
  }

  const segmentIds = Array.from(new Set(segments.map((segment) => segment.id)));
  const foundSegments = await db.scriptSegment.count({
    where: { id: { in: segmentIds }, timeline_chapter_id: chapter.timelineChapterId },
  });
  if (foundSegments !== segmentIds.length) {
    throw new ApiError(400, "SEGMENT_CHAPTER_MISMATCH", "剧本片段不属于该章节");
  }

  const [library, project, projectCharacters] = await Promise.all([
    db.character.findMany({
      where: { user_id: userId },
      select: { id: true, name: true },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    }),
    db.project.findUnique({
      where: { id: chapter.projectId },
      select: { story_id: true },
    }),
    db.projectCharacter.findMany({
      where: { project_id: chapter.projectId },
      select: { id: true, character_id: true },
    }),
  ]);

  const roster = library.map((character) => ({ id: character.id, name: character.name }));
  const libraryById = new Map(library.map((character) => [character.id, character]));
  const libraryByName = new Map<string, LibraryCharacter>();
  for (const character of library) {
    const key = nameKey(character.name);
    if (key && !libraryByName.has(key)) libraryByName.set(key, character);
  }
  const projectById = new Map(projectCharacters.map((row) => [row.id, row]));
  const projectByLibrary = new Map(projectCharacters.map((row) => [row.character_id, row.id]));

  const grouped: Array<{ segment: ChapterSegmentInput; shots: PlannedPanelFields[] }> = [];
  for (const segment of segments) {
    const shots = await plan({
      script_content: segment.content,
      scene_description: segment.scene_description,
      character_actions: segment.character_actions,
      available_characters: roster,
    });
    grouped.push({ segment, shots: Array.isArray(shots) ? shots : [] });
  }

  const accepted: AcceptedPanel[] = [];
  const skipped: SkippedPanel[] = [];
  for (const group of grouped) {
    group.shots.forEach((shot, index) => {
      const outcome = classifyShot(
        group.segment.id,
        shot,
        index,
        libraryById,
        libraryByName,
        projectById,
        projectByLibrary
      );
      if (outcome.skipped) skipped.push(outcome.skipped);
      if (outcome.accepted) accepted.push(outcome.accepted);
    });
  }

  if (accepted.length === 0) {
    throw new NoPanelsWrittenError(skipped);
  }

  const storyId = project?.story_id ?? null;
  const wantedNames = accepted.flatMap((panel) => panel.suggestions);
  const existingSuggestions = storyId && wantedNames.length > 0
    ? await db.suggestedCharacter.findMany({
        where: { story_id: storyId },
        select: { name: true },
      })
    : [];
  const namesToCreate = storyId ? suggestionNames(accepted, existingSuggestions) : [];

  const createdIds = await db.$transaction(async (tx) => {
    await ensureProjectCharacters(tx, chapter.projectId, accepted);
    const writer = panels(chapter.projectId, { tx });
    const created = await writer.add(
      accepted.map((panel) => ({
        segmentId: panel.segmentId,
        panelType: panel.panelType,
        importance: "medium",
        description: panel.description,
        cameraAngle: emptyToNull(panel.cameraAngle),
        shotSize: emptyToNull(panel.shotSize),
        compositionHint: emptyToNull(panel.compositionHint),
        locationKey: emptyToNull(panel.locationKey),
        visualPrompt: panel.prompt,
        negativePrompt: emptyToNull(panel.negativePrompt),
        generationStatus: "pending",
      })),
      { chapter: chapter.projectChapterId },
    );

    for (let index = 0; index < accepted.length; index += 1) {
      const panel = accepted[index];
      const createdPanel = created[index];
      if (!panel || !createdPanel) continue;
      const rows = panel.rows.filter((row): row is CastRow & { projectCharacterId: string } => (
        row.projectCharacterId !== null
      ));
      if (rows.length === 0) continue;
      await writer.setCast(
        createdPanel.id,
        rows.map((row) => ({
          projectCharacterId: row.projectCharacterId,
          outfitId: null,
          expression: row.expression,
        })),
      );
    }

    if (storyId) {
      for (const name of namesToCreate) {
        await tx.suggestedCharacter.create({
          data: {
            story_id: storyId,
            project_id: chapter.projectId,
            name,
            description: name,
            appearance: name,
          },
        });
      }
    }

    return created.map((panel) => panel.id);
  }, WRITE_TX_OPTIONS);

  const stored = await db.panel.findMany({
    where: { id: { in: createdIds } },
    include: canvasShotInclude,
    orderBy: [{ panel_order: "asc" }, { created_at: "asc" }, { id: "asc" }],
  });
  const byId = new Map(stored.map((panel) => [panel.id, toCanvasShot(panel)]));
  return {
    panels: createdIds.map((id) => byId.get(id)).filter((shot): shot is CanvasShot => shot !== undefined),
    skipped,
  };
}
