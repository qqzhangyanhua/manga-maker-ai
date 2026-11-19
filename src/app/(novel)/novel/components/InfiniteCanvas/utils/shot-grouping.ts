import type { CanvasShotJson } from "@/lib/canvas/types";
import type { ShotGroup, LocationGroup } from "../DetailPanel/types";

/**
 * 将镜头数组按每9个一组进行分组
 * @param shots 镜头数组（需按 panel_order 排序）
 * @returns 分组后的数组
 */
export function groupShotsIntoNineGrids(shots: CanvasShotJson[]): ShotGroup[] {
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

    // P3-1: 统计该组的场景分布
    const locationStats = getLocationStats(groupShots);

    groups.push({
      groupIndex: i,
      startOrder: groupShots[0]?.panel_order || (i * 9 + 1),
      endOrder: groupShots[groupShots.length - 1]?.panel_order || (i * 9 + 9),
      shots: groupShots,
      isComplete: groupShots.length === 9,
      placeholderCount,
      locationStats, // P3-1: 添加场景统计
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

/**
 * P3-1: 统计镜头组中的场景分布
 * @param shots 镜头数组
 * @returns 场景统计信息
 */
export function getLocationStats(shots: CanvasShotJson[]): LocationGroup[] {
  const locationMap = new Map<string, { count: number; shotIds: string[] }>();
  
  for (const shot of shots) {
    const locationKey = shot.location_key || "unknown";
    const existing = locationMap.get(locationKey);
    
    if (existing) {
      existing.count++;
      existing.shotIds.push(shot.id);
    } else {
      locationMap.set(locationKey, { count: 1, shotIds: [shot.id] });
    }
  }
  
  // 转换为数组并按数量排序
  return Array.from(locationMap.entries())
    .map(([key, { count, shotIds }]) => ({
      locationKey: key,
      count,
      shotIds,
      label: formatLocationLabel(key),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * P3-1: 按 location_key 对镜头进行分组
 * @param shots 镜头数组
 * @returns 按场景分组的结果
 */
export function groupShotsByLocation(shots: CanvasShotJson[]): Map<string, CanvasShotJson[]> {
  const groups = new Map<string, CanvasShotJson[]>();
  
  for (const shot of shots) {
    const locationKey = shot.location_key || "unknown";
    const existing = groups.get(locationKey);
    
    if (existing) {
      existing.push(shot);
    } else {
      groups.set(locationKey, [shot]);
    }
  }
  
  return groups;
}

/**
 * P3-1: 格式化场景标签（将 snake_case 转为中文可读形式）
 */
export function formatLocationLabel(locationKey: string): string {
  if (!locationKey || locationKey === "unknown") {
    return "未分类场景";
  }
  
  // 常见场景的中文映射
  const labelMap: Record<string, string> = {
    classroom: "教室",
    hallway: "走廊",
    rooftop: "天台",
    street: "街道",
    cafe: "咖啡馆",
    bedroom: "卧室",
    office: "办公室",
    park: "公园",
    restaurant: "餐厅",
    library: "图书馆",
    gym: "健身房",
    hospital: "医院",
    station: "车站",
    beach: "海滩",
    forest: "森林",
    mountain: "山脉",
    river: "河边",
    temple: "寺庙",
    castle: "城堡",
    dungeon: "地牢",
  };
  
  // 尝试直接匹配
  const lowerKey = locationKey.toLowerCase();
  if (labelMap[lowerKey]) {
    return labelMap[lowerKey];
  }
  
  // 尝试部分匹配
  for (const [key, label] of Object.entries(labelMap)) {
    if (lowerKey.includes(key)) {
      return label;
    }
  }
  
  // 将 snake_case 转为可读形式
  return locationKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}
