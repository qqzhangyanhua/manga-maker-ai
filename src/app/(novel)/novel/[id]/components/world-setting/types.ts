/**
 * 世界观设定模块类型定义
 */

/**
 * 地点
 */
export interface Location {
  name: string;
  description: string;
  type: string; // 城市、森林、山脉等
}

/**
 * 派系
 */
export interface Faction {
  name: string;
  description: string;
  leader: string;
  members: string[];
}

/**
 * 规则
 */
export interface Rule {
  title: string;
  description: string;
  category: string; // 魔法、科技、社会等
}

/**
 * 时间线事件
 */
export interface TimelineEvent {
  year: string;
  event: string;
  importance: "high" | "medium" | "low";
}

/**
 * 世界观设定
 */
export interface WorldSetting {
  locations: Location[];
  factions: Faction[];
  rules: Rule[];
  timeline: TimelineEvent[];
}

/**
 * 地点类型选项
 */
export const LOCATION_TYPES = [
  "城市", "村庄", "森林", "山脉", "海洋", "沙漠", "平原", "洞穴", "遗迹", "其他"
] as const;

/**
 * 规则分类选项
 */
export const RULE_CATEGORIES = [
  "魔法", "科技", "社会", "政治", "经济", "宗教", "军事", "其他"
] as const;

/**
 * 事件重要性选项
 */
export const IMPORTANCE_OPTIONS = [
  { value: "high", label: "重要" },
  { value: "medium", label: "一般" },
  { value: "low", label: "次要" },
] as const;

/**
 * 确保 WorldSetting 所有字段都正确初始化
 */
export function ensureWorldSettingFields(data: Partial<WorldSetting> | null): WorldSetting {
  return {
    locations: Array.isArray(data?.locations)
      ? data.locations.map((loc) => ({
          name: loc?.name ?? "",
          description: loc?.description ?? "",
          type: loc?.type ?? "",
        }))
      : [],
    factions: Array.isArray(data?.factions)
      ? data.factions.map((faction) => ({
          name: faction?.name ?? "",
          description: faction?.description ?? "",
          leader: faction?.leader ?? "",
          members: Array.isArray(faction?.members) ? faction.members : [],
        }))
      : [],
    rules: Array.isArray(data?.rules)
      ? data.rules.map((rule) => ({
          title: rule?.title ?? "",
          description: rule?.description ?? "",
          category: rule?.category ?? "",
        }))
      : [],
    timeline: Array.isArray(data?.timeline)
      ? data.timeline.map((event) => ({
          year: event?.year ?? "",
          event: event?.event ?? "",
          importance: event?.importance ?? "medium",
        }))
      : [],
  };
}

/**
 * 创建新地点
 */
export function createNewLocation(): Location {
  return { name: "", description: "", type: "" };
}

/**
 * 创建新派系
 */
export function createNewFaction(): Faction {
  return { name: "", description: "", leader: "", members: [] };
}

/**
 * 创建新规则
 */
export function createNewRule(): Rule {
  return { title: "", description: "", category: "" };
}

/**
 * 创建新时间线事件
 */
export function createNewTimelineEvent(): TimelineEvent {
  return { year: "", event: "", importance: "medium" };
}
