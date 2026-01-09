/**
 * 角色管理模块类型定义
 * 更新版本：导出主类型文件中的类型，保持兼容性
 */

// ✅ 导入并重新导出主类型文件中的类型
import type { Character as BaseCharacter, ChapterOutline as BaseChapterOutline } from "../../types";

export type Character = BaseCharacter;
export type ChapterOutline = BaseChapterOutline;

/**
 * 角色关系（扩展定义，兼容旧代码）
 */
export interface CharacterRelationship {
  characterId: string;
  characterName?: string; // 可选，用于显示
  relation: string; // 朋友、敌人、恋人、师徒等
  description?: string;
}

/**
 * 角色定位选项
 * ✅ 更新为英文值，符合类型定义
 */
export const CHARACTER_ROLES = [
  { value: "protagonist", label: "主角" },
  { value: "supporting", label: "配角" },
  { value: "antagonist", label: "反派" },
  { value: "minor", label: "路人" },
] as const;

/**
 * 关系类型选项
 */
export const RELATIONSHIP_TYPES = [
  { value: "朋友", label: "朋友" },
  { value: "恋人", label: "恋人" },
  { value: "敌人", label: "敌人" },
  { value: "师徒", label: "师徒" },
  { value: "亲人", label: "亲人" },
  { value: "同事", label: "同事" },
] as const;

/**
 * 确保 character 对象所有字段都正确初始化
 */
export function ensureCharacterFields(character: Partial<Character> & { role?: string }): Character {
  // ✅ 角色定位映射：中文 -> 英文
  const roleMapping: Record<string, "protagonist" | "antagonist" | "supporting" | "minor"> = {
    "主角": "protagonist",
    "反派": "antagonist",
    "配角": "supporting",
    "路人": "minor",
  };

  const normalizedRole = character.role as string;
  const role = (roleMapping[normalizedRole] || character.role || "supporting") as "protagonist" | "antagonist" | "supporting" | "minor";

  return {
    id: character.id ?? `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: character.name ?? "",
    role,
    description: character.description ?? "",
    traits: Array.isArray(character.traits) ? character.traits : [],
    appearance: character.appearance,
    background: character.background,
    relationships: Array.isArray(character.relationships) ? character.relationships : [],
  };
}

/**
 * 创建新角色
 */
export function createNewCharacter(): Character {
  return {
    id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: "",
    role: "supporting",
    description: "",
    traits: [],
    relationships: [],
  };
}

/**
 * 获取角色定位颜色
 * ✅ 支持英文和中文角色定位
 */
export function getRoleColor(role: string): string {
  switch (role) {
    case "protagonist":
    case "主角":
      return "bg-red-500";
    case "supporting":
    case "配角":
      return "bg-blue-500";
    case "antagonist":
    case "反派":
      return "bg-purple-500";
    case "minor":
    case "路人":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * 获取角色定位中文显示
 */
export function getRoleLabel(role: string): string {
  const labelMapping: Record<string, string> = {
    "protagonist": "主角",
    "antagonist": "反派",
    "supporting": "配角",
    "minor": "路人",
  };
  return labelMapping[role] || role;
}
