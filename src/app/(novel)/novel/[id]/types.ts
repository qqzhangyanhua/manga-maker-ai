/**
 * 小说项目页面类型定义和工具函数
 */

/**
 * 章节大纲（前端格式 - camelCase）
 */
export interface ChapterOutline {
  _tempId?: string; // 临时唯一ID，用于React key，不存储到数据库
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
 * 章节大纲（后端格式 - snake_case）
 */
export interface ChapterOutlineBackend {
  chapter_number: number;
  title: string;
  outline: string;
  key_events: string[];
  characters: string[];
  plot_lines: string[];
  is_key_chapter: boolean;
  content?: string;
  word_count?: number;
  status?: "draft" | "completed";
}

/**
 * 角色定义
 * 修复版本：role 支持任意字符串，不仅限于枚举值
 */
export interface Character {
  id: string;
  name: string;
  role: string; // 角色类型（可以是任意描述，如 "现代青年，穿越者"）
  description: string;
  traits?: string[]; // 可选：性格特征
  relationships?: Array<{
    characterId: string;
    characterName?: string;
    relation: string;
    description?: string;
  }>; // 可选：关系网络
  appearance?: string; // 可选：外貌描述
  background?: string; // 可选：背景故事
}

/**
 * 地点定义
 */
export interface Location {
  id?: string;
  name: string;
  description: string;
  type: "indoor" | "outdoor" | "urban" | "nature" | "fantasy" | "scifi" | "other";
  atmosphere?: string;
}

/**
 * 势力定义
 */
export interface Faction {
  id?: string;
  name: string;
  description: string;
  leader?: string;
  members?: string[];
  goals?: string;
}

/**
 * 规则定义
 */
export interface Rule {
  id?: string;
  title: string;
  content: string;
  category?: "magic" | "technology" | "social" | "natural" | "other";
}

/**
 * 时间线事件
 */
export interface TimelineEvent {
  id?: string;
  date: string;
  event: string;
  description?: string;
  importance?: "high" | "medium" | "low";
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
 * 小说项目
 */
export interface NovelProject {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  target_words: number | null;
  status: string;
  total_words: number;
  chapter_count: number;
  cover_image: string | null;
  world_setting: WorldSetting | null;
  characters: Character[] | null;
  outlines: ChapterOutline[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * 生成临时唯一ID（用于React key）
 */
function generateTempId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 转换后端 snake_case 格式的 outline 为前端 camelCase 格式
 */
export function normalizeOutline(outline: Partial<ChapterOutlineBackend & ChapterOutline>): ChapterOutline {
  return {
    _tempId: (outline as ChapterOutline)._tempId || generateTempId(),
    chapterNumber: outline.chapterNumber ?? outline.chapter_number ?? 0,
    title: outline.title ?? "",
    outline: outline.outline ?? "",
    keyEvents: outline.keyEvents ?? outline.key_events ?? [],
    characters: outline.characters ?? [],
    plotLines: outline.plotLines ?? outline.plot_lines ?? [],
    isKeyChapter: outline.isKeyChapter ?? outline.is_key_chapter ?? false,
    content: outline.content ?? "",
    wordCount: outline.wordCount ?? outline.word_count ?? 0,
    status: outline.status ?? "draft",
  };
}

/**
 * 转换前端 camelCase 格式的 outline 为后端 snake_case 格式
 */
export function denormalizeOutline(outline: ChapterOutline): ChapterOutlineBackend {
  // 移除临时ID字段(_tempId)，不存储到数据库
  const { _tempId: _, ...rest } = outline;

  return {
    chapter_number: rest.chapterNumber,
    title: rest.title,
    outline: rest.outline,
    key_events: rest.keyEvents,
    characters: rest.characters,
    plot_lines: rest.plotLines,
    is_key_chapter: rest.isKeyChapter,
    content: rest.content,
    word_count: rest.wordCount,
    status: rest.status,
  };
}

/**
 * 创建新章节
 */
export function createNewChapter(chapterNumber: number): ChapterOutline {
  return {
    _tempId: generateTempId(),
    chapterNumber,
    title: `第 ${chapterNumber} 章`,
    outline: "",
    keyEvents: [],
    characters: [],
    plotLines: [],
    isKeyChapter: false,
    content: "",
    wordCount: 0,
    status: "draft",
  };
}

/**
 * 验证角色数据
 * 修复版本：更宽松的验证，只要求必要字段
 */
export function isValidCharacter(obj: unknown): obj is Character {
  if (!obj || typeof obj !== "object") return false;
  const c = obj as Record<string, unknown>;

  // 必须有 name（名称是最基本的要求）
  if (typeof c.name !== "string" || c.name.trim() === "") return false;

  // description 可以为空字符串，但必须存在
  if (c.description !== undefined && typeof c.description !== "string") return false;

  // role 字段存在即可（不再严格限制枚举值）
  // 因为 AI 生成的角色可能有各种角色描述
  if (c.role !== undefined && typeof c.role !== "string") return false;

  return true;
}

/**
 * 验证世界观数据
 */
export function isValidWorldSetting(obj: unknown): obj is WorldSetting {
  if (!obj || typeof obj !== "object") return false;
  const w = obj as Record<string, unknown>;
  return (
    Array.isArray(w.locations) &&
    Array.isArray(w.factions) &&
    Array.isArray(w.rules) &&
    Array.isArray(w.timeline)
  );
}

/**
 * 初始化空世界观
 */
export function createEmptyWorldSetting(): WorldSetting {
  return {
    locations: [],
    factions: [],
    rules: [],
    timeline: [],
  };
}

/**
 * 初始化空角色数组
 * 修复版本：添加数据标准化逻辑
 */
export function normalizeCharacters(characters: unknown): Character[] {
  if (!Array.isArray(characters)) return [];

  return characters
    .filter(isValidCharacter)
    .map((c) => ({
      ...c,
      // 确保必填字段有默认值
      description: c.description || "",
      traits: c.traits || [],
      relationships: c.relationships || [],
    }));
}

/**
 * 初始化世界观数据
 */
export function normalizeWorldSetting(worldSetting: unknown): WorldSetting {
  if (isValidWorldSetting(worldSetting)) return worldSetting;
  return createEmptyWorldSetting();
}

/**
 * 镜头密度模式
 */
export type DensityMode = "sparse" | "standard" | "dense";

/**
 * 镜头数量预估结果
 */
export interface PanelEstimation {
  estimatedCount: number;      // 预估镜头数（核心数值）
  minCount: number;             // 最少镜头数（下界）
  maxCount: number;             // 最多镜头数（上界）
  wordCount: number;            // 章节字数统计
  baseDensity: number;          // 基础密度（字/镜）
  genre: string;                // 故事类型
  estimatedCredits: number;     // 预估消耗 credits
  densityMode: DensityMode;     // 当前密度模式
  warnings: string[];           // 警告信息（如章节过长/过短）
}
