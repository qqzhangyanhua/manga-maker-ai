/**
 * 世界观设定模块类型定义
 * 更新版本：重新导出主类型文件中的类型，保持兼容性
 */

// ✅ 导入并重新导出主类型文件中的类型
import type {
  Location as BaseLocation,
  Faction as BaseFaction,
  Rule as BaseRule,
  TimelineEvent as BaseTimelineEvent,
  WorldSetting as BaseWorldSetting,
} from "../../types";

export type Location = BaseLocation;
export type Faction = BaseFaction;
export type Rule = BaseRule;
export type TimelineEvent = BaseTimelineEvent;
export type WorldSetting = BaseWorldSetting;

/**
 * 地点类型选项
 * ✅ 更新为英文值，符合类型定义
 */
export const LOCATION_TYPES = [
  { value: "indoor", label: "室内" },
  { value: "outdoor", label: "室外" },
  { value: "urban", label: "城市" },
  { value: "nature", label: "自然" },
  { value: "fantasy", label: "奇幻" },
  { value: "scifi", label: "科幻" },
  { value: "other", label: "其他" },
] as const;

/**
 * 规则分类选项
 * ✅ 更新为英文值，符合类型定义
 */
export const RULE_CATEGORIES = [
  { value: "magic", label: "魔法" },
  { value: "technology", label: "科技" },
  { value: "social", label: "社会" },
  { value: "natural", label: "自然" },
  { value: "other", label: "其他" },
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
          id: loc?.id,
          name: loc?.name ?? "",
          description: loc?.description ?? "",
          type: (loc?.type as "indoor" | "outdoor" | "urban" | "nature" | "fantasy" | "scifi" | "other") ?? "other",
          atmosphere: loc?.atmosphere,
        }))
      : [],
    factions: Array.isArray(data?.factions)
      ? data.factions.map((faction) => ({
          id: faction?.id,
          name: faction?.name ?? "",
          description: faction?.description ?? "",
          leader: faction?.leader,
          members: faction?.members,
          goals: faction?.goals,
        }))
      : [],
    rules: Array.isArray(data?.rules)
      ? data.rules.map((rule) => ({
          id: rule?.id,
          title: rule?.title ?? "",
          content: rule?.content ?? "",
          category: (rule?.category as "magic" | "technology" | "social" | "natural" | "other") ?? "other",
        }))
      : [],
    timeline: Array.isArray(data?.timeline)
      ? data.timeline.map((event) => ({
          id: event?.id,
          date: event?.date ?? "",
          event: event?.event ?? "",
          description: event?.description,
          importance: event?.importance ?? "medium",
        }))
      : [],
  };
}

/**
 * 创建新地点
 */
export function createNewLocation(): Location {
  return { name: "", description: "", type: "other" };
}

/**
 * 创建新派系
 */
export function createNewFaction(): Faction {
  return { name: "", description: "" };
}

/**
 * 创建新规则
 */
export function createNewRule(): Rule {
  return { title: "", content: "", category: "other" };
}

/**
 * 创建新时间线事件
 */
export function createNewTimelineEvent(): TimelineEvent {
  return { date: "", event: "", importance: "medium" };
}
