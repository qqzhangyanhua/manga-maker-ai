/**
 * 世界观记忆库 - 前端类型定义
 */

/**
 * 条目类型
 */
export type EntryType = "location" | "character" | "event" | "item" | "rule" | "foreshadowing";

/**
 * 伏笔状态
 */
export type ForeshadowStatus = "planted" | "brewing" | "revealed";

/**
 * 关系类型分类
 */
export type RelationCategory = "location" | "character" | "event" | "foreshadow";

/**
 * 关系响应
 */
export interface WorldRelation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  description: string | null;
  chapter_context: number | null;
  created_at: string;
  source_name: string | null;
  source_type: string | null;
  target_name: string | null;
  target_type: string | null;
}

/**
 * 世界观条目
 */
export interface WorldEntry {
  id: string;
  project_id: string;
  type: EntryType;
  name: string;
  description: string | null;
  properties: Record<string, string>;
  custom_fields: Record<string, string>;
  tags: string[];
  foreshadow_status: ForeshadowStatus | null;
  planted_chapter: number | null;
  planned_reveal_chapter: number | null;
  actual_reveal_chapter: number | null;
  hint_text: string | null;
  relations: WorldRelation[];
  referenced_by: WorldRelation[];
  created_at: string;
  updated_at: string;
}

/**
 * 条目简要信息
 */
export interface WorldEntryBrief {
  id: string;
  type: EntryType;
  name: string;
  description: string | null;
  foreshadow_status: ForeshadowStatus | null;
}

/**
 * 创建条目请求
 */
export interface CreateEntryRequest {
  type: EntryType;
  name: string;
  description?: string;
  properties?: Record<string, string>;
  custom_fields?: Record<string, string>;
  tags?: string[];
  planted_chapter?: number;
  planned_reveal_chapter?: number;
  hint_text?: string;
}

/**
 * 更新条目请求
 */
export interface UpdateEntryRequest {
  name?: string;
  description?: string;
  properties?: Record<string, string>;
  custom_fields?: Record<string, string>;
  tags?: string[];
  foreshadow_status?: ForeshadowStatus;
  planted_chapter?: number;
  planned_reveal_chapter?: number;
  actual_reveal_chapter?: number;
  hint_text?: string;
}

/**
 * 条目列表响应
 */
export interface EntryListResponse {
  entries: WorldEntry[];
  total: number;
  by_type: Record<string, number>;
}

/**
 * 创建关系请求
 */
export interface CreateRelationRequest {
  source_id: string;
  target_id: string;
  relation_type: string;
  description?: string;
  chapter_context?: number;
}

/**
 * 关系类型信息
 */
export interface RelationTypeInfo {
  value: string;
  label: string;
  category: RelationCategory;
}

/**
 * 关系类型列表响应
 */
export interface RelationTypesResponse {
  types: RelationTypeInfo[];
}

/**
 * 条目类型属性定义
 */
export interface PropertySchema {
  label: string;
  type: string;
}

/**
 * 条目类型定义
 */
export interface EntryTypeSchema {
  label: string;
  icon: string;
  required: string[];
  properties: Record<string, PropertySchema>;
}

/**
 * 条目类型列表响应
 */
export interface EntryTypesResponse {
  types: Record<string, EntryTypeSchema>;
}

/**
 * 伏笔统计
 */
export interface ForeshadowingStats {
  planted: number;
  brewing: number;
  revealed: number;
  total: number;
}

/**
 * 伏笔列表响应
 */
export interface ForeshadowingListResponse {
  stats: ForeshadowingStats;
  planted: WorldEntry[];
  brewing: WorldEntry[];
  revealed: WorldEntry[];
}

/**
 * 更新伏笔状态请求
 */
export interface UpdateForeshadowStatusRequest {
  status: ForeshadowStatus;
  actual_reveal_chapter?: number;
}

/**
 * 待揭示伏笔响应
 */
export interface PendingForeshadowingResponse {
  foreshadowing: WorldEntry[];
  overdue: WorldEntry[];
}

/**
 * 条目类型显示配置
 */
export const ENTRY_TYPE_CONFIG: Record<EntryType, {
  label: string;
  icon: string;
  color: string;
  properties: Record<string, { label: string; type: string }>;
}> = {
  location: {
    label: "地点",
    icon: "map-pin",
    color: "bg-blue-100 text-blue-800",
    properties: {
      region: { label: "所属区域", type: "string" },
      terrain: { label: "地形特征", type: "string" },
      population: { label: "人口规模", type: "string" },
      significance: { label: "剧情重要性", type: "string" },
    },
  },
  character: {
    label: "人物",
    icon: "user",
    color: "bg-green-100 text-green-800",
    properties: {
      role: { label: "角色定位", type: "string" },
      affiliation: { label: "所属势力", type: "string" },
      ability: { label: "能力特长", type: "string" },
      personality: { label: "性格特点", type: "string" },
    },
  },
  event: {
    label: "事件",
    icon: "calendar",
    color: "bg-yellow-100 text-yellow-800",
    properties: {
      time_period: { label: "发生时间", type: "string" },
      scale: { label: "规模", type: "string" },
      outcome: { label: "结果影响", type: "string" },
    },
  },
  item: {
    label: "物品",
    icon: "package",
    color: "bg-purple-100 text-purple-800",
    properties: {
      rarity: { label: "稀有度", type: "string" },
      power: { label: "能力效果", type: "string" },
      origin: { label: "来源背景", type: "string" },
    },
  },
  rule: {
    label: "规则",
    icon: "book-open",
    color: "bg-gray-100 text-gray-800",
    properties: {
      category: { label: "规则类别", type: "string" },
      scope: { label: "适用范围", type: "string" },
      exceptions: { label: "例外情况", type: "string" },
    },
  },
  foreshadowing: {
    label: "伏笔",
    icon: "eye",
    color: "bg-orange-100 text-orange-800",
    properties: {
      importance: { label: "重要程度", type: "string" },
      reveal_hint: { label: "揭示时机建议", type: "string" },
    },
  },
};

/**
 * 伏笔状态显示配置
 */
export const FORESHADOW_STATUS_CONFIG: Record<ForeshadowStatus, { label: string; color: string }> = {
  planted: { label: "已埋设", color: "bg-yellow-100 text-yellow-800" },
  brewing: { label: "酝酿中", color: "bg-blue-100 text-blue-800" },
  revealed: { label: "已揭示", color: "bg-green-100 text-green-800" },
};

/**
 * 关系类型分组
 */
export const RELATION_TYPE_GROUPS: Record<RelationCategory, { label: string; types: string[] }> = {
  location: {
    label: "地点相关",
    types: ["发生地点", "出生地", "居住地", "势力范围"],
  },
  character: {
    label: "人物相关",
    types: ["参与者", "创造者", "拥有者", "师徒关系", "敌对关系", "同盟关系", "家族关系"],
  },
  event: {
    label: "事件相关",
    types: ["触发事件", "导致结果", "前置事件", "后续事件"],
  },
  foreshadow: {
    label: "伏笔相关",
    types: ["关联伏笔", "伏笔线索", "伏笔揭示"],
  },
};

/**
 * AI 提取的条目
 */
export interface ExtractedEntry {
  type: EntryType;
  name: string;
  description: string;
  properties: Record<string, string>;
  confidence: number;
  source_text: string;
  planted_chapter?: number;
  planned_reveal_chapter?: number;
  hint_text?: string;
}

/**
 * 提取请求
 */
export interface ExtractionRequest {
  project_id: string;
  chapter_ids: number[];
  entry_types: EntryType[];
  min_confidence?: number;
}

/**
 * 提取进度事件
 */
export interface ExtractionProgressEvent {
  phase: "preparing" | "analyzing" | "extracting" | "deduplicating";
  chapter_id?: number;
  chapter_title?: string;
  progress: number;
  message?: string;
}

/**
 * 提取条目事件
 */
export interface ExtractionEntryEvent {
  entry: ExtractedEntry;
  chapter_id: number;
  is_duplicate: boolean;
  similar_entry_name?: string;
}

/**
 * 提取完成事件
 */
export interface ExtractionCompleteEvent {
  total_extracted: number;
  by_type: Record<string, number>;
  duplicates_found: number;
}

/**
 * 批量保存请求
 */
export interface BatchSaveRequest {
  project_id: string;
  entries: ExtractedEntry[];
}

/**
 * 批量保存响应
 */
export interface BatchSaveResponse {
  saved_count: number;
  failed_count: number;
  saved_ids: string[];
  errors: string[];
}

/**
 * 伏笔生成请求
 */
export interface GenerateForeshadowingRequest {
  chapter_id?: number;
  context_hint?: string;
  count?: number;
}

/**
 * 伏笔建议
 */
export interface ForeshadowingSuggestion {
  name: string;
  description: string;
  hint_text: string;
  planted_chapter: number;
  planned_reveal_chapter: number;
  properties: Record<string, string>;
  reasoning: string;
}

/**
 * 伏笔生成响应
 */
export interface GenerateForeshadowingResponse {
  suggestions: ForeshadowingSuggestion[];
}
