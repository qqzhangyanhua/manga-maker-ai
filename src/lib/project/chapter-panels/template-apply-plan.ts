import type { Prisma } from "@prisma/client";

import type { NewPanelInput } from "./session";

/** 应用模板时要原样带回的格子。主角色列不在这里。 */
export const keptPanelSelect = {
  id: true,
  chapter_id: true,
  description: true,
  panel_type: true,
  importance: true,
  dialogue: true,
  camera_angle: true,
  shot_size: true,
  emotion: true,
  prompt_used: true,
  generated_image: true,
  character_name: true,
  sketch_image_url: true,
  script_segment_id: true,
  is_shared: true,
  shared_at: true,
  view_count: true,
  show_prompt: true,
  segment_id: true,
  visual_prompt: true,
  negative_prompt: true,
  composition_hint: true,
  location_key: true,
  generation_status: true,
  scene_id: true,
  camera_movement: true,
  movement_speed: true,
  movement_direction: true,
  script_start: true,
  script_end: true,
  layout_hint: true,
} satisfies Prisma.PanelSelect;

export type KeptPanelRow = Prisma.PanelGetPayload<{ select: typeof keptPanelSelect }>;

export interface TemplateShot {
  panel_type: string | null;
  camera_angle: string | null;
  shot_size: string | null;
  importance: string | null;
}

export interface TemplateApplyPlan {
  chapterId: string;
  fields: NewPanelInput[];
  /** 模板新格在 fields 里的下标，用来从替换结果里挑出新建的格子。 */
  templateIndexes: number[];
}

export function templateShotInput(shot: TemplateShot, description: string): NewPanelInput {
  return {
    panelType: shot.panel_type || "medium",
    cameraAngle: shot.camera_angle,
    shotSize: shot.shot_size,
    importance: shot.importance || "medium",
    description,
    dialogue: null,
  };
}

export function keptPanelInput(row: KeptPanelRow): NewPanelInput {
  return {
    segmentId: row.segment_id,
    panelType: row.panel_type,
    importance: row.importance,
    description: row.description,
    dialogue: row.dialogue,
    cameraAngle: row.camera_angle,
    shotSize: row.shot_size,
    compositionHint: row.composition_hint,
    locationKey: row.location_key,
    visualPrompt: row.visual_prompt,
    negativePrompt: row.negative_prompt,
    generationStatus: row.generation_status,
    sceneId: row.scene_id,
    emotion: row.emotion,
    promptUsed: row.prompt_used,
    scriptStart: row.script_start,
    scriptEnd: row.script_end,
    layoutHint: row.layout_hint,
    cameraMovement: row.camera_movement,
    movementSpeed: row.movement_speed,
    movementDirection: row.movement_direction,
    generatedImage: row.generated_image,
    characterName: row.character_name,
    sketchImageUrl: row.sketch_image_url,
    scriptSegmentId: row.script_segment_id,
    isShared: row.is_shared,
    sharedAt: row.shared_at,
    viewCount: row.view_count,
    showPrompt: row.show_prompt,
  };
}

function withTemplate(
  chapterId: string,
  before: readonly NewPanelInput[],
  templateFields: readonly NewPanelInput[],
  after: readonly NewPanelInput[],
): TemplateApplyPlan {
  return {
    chapterId,
    fields: [...before, ...templateFields, ...after],
    templateIndexes: templateFields.map((_field, index) => before.length + index),
  };
}

/**
 * 按阅读顺序决定模板插进哪一章。
 * 小于等于 0 插在第一章开头；超过现有格数则接到最后一章末尾。
 * 其它章节不放进这一次替换。
 */
export function planTemplateInsert(
  panelsInReadingOrder: readonly KeptPanelRow[],
  insertAfterOrder: number,
  templateFields: readonly NewPanelInput[],
  defaultChapterId: string,
): TemplateApplyPlan {
  const first = panelsInReadingOrder[0];
  if (!first) {
    return withTemplate(defaultChapterId, [], templateFields, []);
  }
  if (insertAfterOrder <= 0) {
    const inChapter = panelsInReadingOrder.filter((panel) => panel.chapter_id === first.chapter_id);
    return withTemplate(first.chapter_id, [], templateFields, inChapter.map(keptPanelInput));
  }

  const anchorAt = Math.min(insertAfterOrder, panelsInReadingOrder.length) - 1;
  const anchor = panelsInReadingOrder[anchorAt] ?? first;
  const inChapter = panelsInReadingOrder.filter((panel) => panel.chapter_id === anchor.chapter_id);
  const anchorIndex = inChapter.findIndex((panel) => panel.id === anchor.id);
  const splitAt = anchorIndex < 0 ? inChapter.length : anchorIndex + 1;
  return withTemplate(
    anchor.chapter_id,
    inChapter.slice(0, splitAt).map(keptPanelInput),
    templateFields,
    inChapter.slice(splitAt).map(keptPanelInput),
  );
}

/**
 * 模板放在这一章里最先被替换的那格。没被点到的格子按原顺序留下。
 * 调用方已经确认这些格子属于同一章。
 */
export function planTemplateReplace(
  chapterPanels: readonly KeptPanelRow[],
  targetIds: readonly string[],
  templateFields: readonly NewPanelInput[],
): TemplateApplyPlan {
  const first = chapterPanels[0];
  const chapterId = first?.chapter_id ?? "";
  const targets = new Set(targetIds);
  const firstTarget = chapterPanels.findIndex((panel) => targets.has(panel.id));
  const keptBefore = (firstTarget < 0 ? chapterPanels : chapterPanels.slice(0, firstTarget))
    .filter((panel) => !targets.has(panel.id))
    .map(keptPanelInput);
  const keptAfter = (firstTarget < 0 ? [] : chapterPanels.slice(firstTarget))
    .filter((panel) => !targets.has(panel.id))
    .map(keptPanelInput);
  return withTemplate(chapterId, keptBefore, templateFields, keptAfter);
}
