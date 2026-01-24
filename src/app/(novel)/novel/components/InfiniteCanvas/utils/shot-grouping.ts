import type { ShotDesign } from "@prisma/client";
import type { ShotGroup } from "../DetailPanel/types";

/**
 * 将镜头数组按每9个一组进行分组
 * @param shots 镜头数组（需按 shot_order 排序）
 * @returns 分组后的数组
 */
export function groupShotsIntoNineGrids(shots: ShotDesign[]): ShotGroup[] {
  if (!shots || shots.length === 0) {
    return [];
  }

  const groups: ShotGroup[] = [];
  const totalGroups = Math.ceil(shots.length / 9);

  for (let i = 0; i < totalGroups; i++) {
    const startIndex = i * 9;
    const endIndex = Math.min(startIndex + 9, shots.length);
    const groupShots = shots.slice(startIndex, endIndex);
    const placeholderCount = 9 - groupShots.length;

    groups.push({
      groupIndex: i,
      startOrder: groupShots[0]?.shot_order || (i * 9 + 1),
      endOrder: groupShots[groupShots.length - 1]?.shot_order || (i * 9 + 9),
      shots: groupShots,
      isComplete: groupShots.length === 9,
      placeholderCount,
    });
  }

  return groups;
}

/**
 * 生成占位符数组
 * @param count 占位符数量
 * @param startOrder 起始序号
 * @returns 占位符数组（用于渲染）
 */
export function generatePlaceholders(count: number, startOrder: number): number[] {
  return Array.from({ length: count }, (_, i) => startOrder + i);
}
