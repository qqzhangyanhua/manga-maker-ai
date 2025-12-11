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
  updated_at: string;
  _syncing?: boolean; // 乐观更新同步标记
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
  character_name?: string;
  emotion?: string;
  visual_prompt: string;
  prompt_used?: string;
  generated_image?: string;
  image_url?: string; // 兼容字段
  script_segment_id?: string;
  script_start?: number;
  script_end?: number;
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
