import type { NewPanelInput } from "./session";

/** 快照里的一格，已经映射成写入字段。编号仍是快照里的旧值。 */
export interface RestoredPanelSource {
  index: number;
  chapterId: string | null;
  panelOrder: number | null;
  field: NewPanelInput;
}

export interface ChapterRestorePlan {
  chapterId: string;
  fields: NewPanelInput[];
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * 版本快照里的一格映射成新分镜。
 * 主角色和外键不在这里。片段 id 只有这次恢复写回去的才保留。
 */
export function snapshotPanelField(
  panel: Record<string, unknown>,
  restoredSegmentIds: ReadonlySet<string>,
): NewPanelInput {
  const segmentId = text(panel.segment_id);
  return {
    segmentId: segmentId && restoredSegmentIds.has(segmentId) ? segmentId : null,
    panelType: text(panel.panel_type) ?? "medium",
    importance: text(panel.importance) ?? "medium",
    description: text(panel.description) ?? "无描述",
    dialogue: text(panel.dialogue),
    cameraAngle: text(panel.camera_angle),
    shotSize: text(panel.shot_size),
    emotion: text(panel.emotion),
    promptUsed: text(panel.prompt_used),
    generatedImage: text(panel.generated_image),
    characterName: text(panel.character_name),
  };
}

/**
 * 按章节分组。章节顺序沿用传入的阅读顺序。
 * 同一章内按快照编号升序，编号相同则保持快照里的先后。
 * 章节已不在项目里、或没有章节的格子，归到默认章节，仍按编号穿插。
 * 快照里没有格子的章节也会留下空列表。那不是再清一次：调用方在恢复片段之前已经清空这些章节。
 */
export function planChapterRestores(
  panels: readonly RestoredPanelSource[],
  chapterIdsInOrder: readonly string[],
  fallbackChapterId: string,
): ChapterRestorePlan[] {
  const known = new Set(chapterIdsInOrder);
  const buckets = new Map<string, RestoredPanelSource[]>();
  for (const chapterId of chapterIdsInOrder) buckets.set(chapterId, []);
  if (!buckets.has(fallbackChapterId)) buckets.set(fallbackChapterId, []);

  for (const panel of panels) {
    const chapterId = panel.chapterId && known.has(panel.chapterId) ? panel.chapterId : fallbackChapterId;
    const bucket = buckets.get(chapterId);
    if (!bucket) continue;
    bucket.push(panel);
  }

  const plans: ChapterRestorePlan[] = [];
  for (const [chapterId, bucket] of buckets) {
    const ordered = [...bucket].sort((left, right) => {
      const leftOrder = typeof left.panelOrder === "number" ? left.panelOrder : left.index + 1;
      const rightOrder = typeof right.panelOrder === "number" ? right.panelOrder : right.index + 1;
      return leftOrder - rightOrder || left.index - right.index;
    });
    plans.push({ chapterId, fields: ordered.map((panel) => panel.field) });
  }
  return plans;
}
