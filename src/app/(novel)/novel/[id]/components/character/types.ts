/**
 * 角色管理模块类型定义
 */

/**
 * 角色关系
 */
export interface CharacterRelationship {
  characterId: string;
  characterName: string;
  type: string; // 朋友、敌人、恋人、师徒等
  description: string;
}

/**
 * 角色
 */
export interface Character {
  id: string;
  name: string;
  role: string; // 主角、配角、反派等
  description: string;
  traits: string[]; // 性格特征
  appearance: string; // 外貌描述
  background: string; // 背景故事
  relationships: CharacterRelationship[];
}

/**
 * 章节大纲（用于 AI 分析）
 */
export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents: string[];
  characters: string[];
  plotLines: string[];
  isKeyChapter: boolean;
  content?: string;
  wordCount?: number;
  status?: "draft" | "completed";
}

/**
 * 角色定位选项
 */
export const CHARACTER_ROLES = [
  { value: "主角", label: "主角" },
  { value: "配角", label: "配角" },
  { value: "反派", label: "反派" },
  { value: "路人", label: "路人" },
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
export function ensureCharacterFields(character: Partial<Character>): Character {
  return {
    id: character.id ?? Date.now().toString(),
    name: character.name ?? "",
    role: character.role ?? "配角",
    description: character.description ?? "",
    traits: Array.isArray(character.traits) ? character.traits : [],
    appearance: character.appearance ?? "",
    background: character.background ?? "",
    relationships: Array.isArray(character.relationships) ? character.relationships : [],
  };
}

/**
 * 创建新角色
 */
export function createNewCharacter(): Character {
  return {
    id: Date.now().toString(),
    name: "",
    role: "配角",
    description: "",
    traits: [],
    appearance: "",
    background: "",
    relationships: [],
  };
}

/**
 * 获取角色定位颜色
 */
export function getRoleColor(role: string): string {
  switch (role) {
    case "主角":
      return "bg-red-500";
    case "配角":
      return "bg-blue-500";
    case "反派":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
}
