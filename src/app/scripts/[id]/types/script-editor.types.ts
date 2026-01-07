/**
 * 剧本编辑器相关类型定义
 */

/**
 * 故事角色接口
 */
export interface StoryCharacter {
  name: string;
  role: string;
  description: string;
  arc?: string;
  traits?: string[];
}

/**
 * 来源小说信息接口
 */
export interface SourceNovelInfo {
  id: string;
  title: string;
  created_at: Date;
}

/**
 * 漫画风格接口（从数据库返回）
 */
export interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  prompt_prefix?: string;
}

/**
 * 故事接口
 */
export interface Story {
  id: string;
  title: string;
  genre: string;
  premise: string;
  status: string;
  outline: Record<string, unknown>;
  characters: StoryCharacter[];
  comic_style_id?: string | null; // 选择的漫画风格ID
  style?: string | null; // 风格提示词（从 comic_style.prompt_prefix 或自定义）
  style_reference_image?: string | null; // 参考图URL（优先级最高）
  comic_style?: ComicStyle | null; // 关联的风格对象
  // 小说来源追踪
  source_type?: string | null; // "original" | "novel_adaptation"
  source_novel_id?: string | null; // 来源小说项目ID
  // 连载模式支持
  is_serialized?: boolean; // 是否为连载作品
  serial_status?: string | null; // ongoing/completed/hiatus - 连载状态
  created_at: string;
  updated_at: string;
  _syncing?: boolean; // 乐观更新同步标记
}

/**
 * 章节接口
 */
export interface Chapter {
  id: string;
  story_id: string;
  title: string;
  summary: string | null;
  chapter_order: number;
  // Phase 4: Enhanced chapter content
  content: string | null; // Detailed content (2000-5000 words)
  is_key_chapter: boolean; // Mark as key chapter
  key_chapter_reason: string | null; // Why this is a key chapter
  character_states?: ChapterCharacterState[]; // Character states at end of chapter
  // 连载模式支持
  publish_status?: string; // draft/published/archived - 章节发布状态
  published_at?: string | null; // 发布时间
  created_at: string;
  updated_at: string;
  _syncing?: boolean; // 乐观更新同步标记
}

/**
 * 章节角色状态
 */
export interface ChapterCharacterState {
  id: string;
  chapter_id: string;
  character_id: string;
  location: string | null;
  physical_condition: string | null;
  mental_state: string | null;
  key_items: string[];
  relationship_changes: Record<string, string> | null;
  character: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * 章节表单数据（用于创建/编辑）
 */
export interface ChapterFormData {
  title: string;
  summary?: string;
}

/**
 * 带分镜的章节（用于前端显示）
 */
export interface ChapterWithPanels extends Chapter {
  panels: Panel[];
  panelCount?: number;
}

/**
 * 分镜接口
 */
export interface Panel {
  id: string;
  project_id: string;
  panel_order: number;
  description: string;
  panel_type: string;
  importance: string;
  camera_angle?: string;
  shot_size?: string;
  dialogue?: string;
  character_name?: string; // Deprecated: use character_id instead
  emotion?: string;
  visual_prompt: string;
  prompt_used?: string;
  generated_image?: string;
  image_url?: string; // 兼容字段
  script_segment_id?: string;
  script_start?: number;
  script_end?: number;
  // Phase 2: Asset binding fields
  character_id?: string; // FK to Character
  expression_type?: string; // Expression type (neutral, happy, sad, etc.)
  outfit_id?: string; // FK to CharacterOutfit
  scene_id?: string; // FK to Scene
  // Chapter grouping (optional, for story-based projects)
  chapter_id?: string; // FK to Chapter
  chapter?: {
    id: string;
    title: string;
    chapter_order: number;
  }; // Chapter relation (populated when included)
  // Phase 3: Layout grouping (2镜/4镜/6镜)
  layout_hint?: string | null; // "group_start_2" | "group_start_4" | "group_start_6" | "group_member" | null
  // Gallery sharing fields
  is_shared?: boolean; // 是否分享到画廊
  shared_at?: string | null; // 分享时间
  view_count?: number; // 浏览次数
  show_prompt?: boolean; // 是否公开 prompt
  // Timestamps
  created_at?: string;
  updated_at?: string;
  // UI-only fields
  _isGenerating?: boolean; // 临时标记：是否为正在生成中的分镜（未保存到数据库）
  _syncing?: boolean; // 乐观更新同步标记
}

/**
 * 分镜表单数据（用于创建/编辑）
 */
export interface PanelFormData extends Omit<Panel, 'id' | 'project_id' | 'panel_order'> {
  // 继承 Panel 但排除 id, project_id, panel_order
}

/**
 * 图片生成任务状态
 */
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 图片生成任务接口
 */
export interface GenerationTask {
  panelId: string;
  taskId: string;
  status: GenerationStatus;
  progress: number;
  imageUrl?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * 任务状态查询响应
 */
export interface TaskStatusResponse {
  id: string;
  status: GenerationStatus;
  progress: number;
  imageUrl?: string;
  error?: string;
}

/**
 * 故事表单数据
 */
export interface StoryFormData {
  title: string;
  premise: string;
  comic_style_id?: string | null;
  style_reference_image?: string | null;
}

/**
 * 分镜高级操作类型
 */
export type PanelOperationType = 'insert' | 'split' | 'merge' | 'delete' | 'reorder';

/**
 * 分镜插入参数
 */
export interface PanelInsertParams {
  project_id: string;
  insert_after_order: number;
  description: string;
  use_llm?: boolean;
}

/**
 * 分镜分割参数
 */
export interface PanelSplitParams {
  panel_id: string;
  split_hint?: string;
}

/**
 * 分镜合并参数
 */
export interface PanelMergeParams {
  panel_ids: [string, string];
  project_id: string;
}

/**
 * 分镜重排序参数
 */
export interface PanelReorderParams {
  panel_id: string;
  new_order: number;
  project_id: string;
}

/**
 * 图片生成参数
 */
export interface ImageGenerationParams {
  panel_id?: string;
  project_id?: string;
  prompt: string;
  style?: string;
  wait?: boolean;
}

/**
 * 批量图片生成响应
 */
export interface BatchGenerationResponse {
  success: boolean;
  task_ids: string[];
  message: string;
}
