import type { ShotDesign } from "@prisma/client";

/**
 * P3-1: 场景分组信息
 */
export interface LocationGroup {
  locationKey: string;          // 场景标识 (如 "classroom", "hallway")
  count: number;                // 该场景的镜头数量
  shotIds: string[];            // 该场景包含的镜头 ID
  label: string;                // 场景中文标签
}

export interface ShotGroup {
  groupIndex: number;           // 组索引：0, 1, 2, 3
  startOrder: number;           // 起始镜头序号：1, 10, 19, 28
  endOrder: number;             // 结束镜头序号：9, 18, 27, 30
  shots: ShotDesign[];          // 该组的镜头数组
  isComplete: boolean;          // 是否有完整的9个镜头
  placeholderCount: number;     // 占位符数量
  locationStats?: LocationGroup[]; // P3-1: 场景统计信息
}
