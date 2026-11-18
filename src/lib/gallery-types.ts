/**
 * Gallery types - 画廊相关类型定义
 */

// 画廊排序方式
export type GallerySortType = "latest" | "popular" | "views";

// 画廊筛选参数
export interface GalleryFilterParams {
  page?: number;
  limit?: number;
  style_id?: string; // Comic style filter
  sort?: GallerySortType;
}

// 画廊作品项（列表展示）
export interface GalleryItem {
  id: string;
  project_id: string;
  panel_order: number;
  description: string;
  dialogue: string | null;
  generated_image: string | null;
  view_count: number;
  shared_at: Date | null;
  show_prompt: boolean;

  // 关联信息
  project: {
    id: string;
    title: string;
    style: string | null;
    user_id: string;
  };

  // 用户信息（脱敏）
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };

  // 风格信息
  comic_style: {
    id: string;
    name_zh: string;
    name_en: string;
    style_key: string;
  } | null;
}

// 画廊作品详情
export interface GalleryDetail extends GalleryItem {
  prompt_used: string | null;
  visual_prompt: string | null;
  panel_type: string;
  importance: string;
  camera_angle: string | null;
  shot_size: string | null;

  // 角色信息
  character: {
    id: string;
    name: string;
    base_image_url: string | null;
  } | null;

  // 表情类型
  expression_type: string | null;

  // 所属故事，剧本编辑页以故事 ID 寻址；为空时项目只能在分镜编辑器中打开
  story_id: string | null;

  // 服装信息
  outfit: {
    id: string;
    outfit_name: string;
    outfit_type: string;
  } | null;

  // 场景信息
  scene: {
    id: string;
    name: string;
    scene_type: string;
    image_url: string | null;
  } | null;
}

// 画廊列表响应
export interface GalleryListResponse {
  items: GalleryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 分享操作请求
export interface SharePanelRequest {
  show_prompt: boolean;
}

// 用户分享列表项
export interface UserSharedItem {
  id: string;
  generated_image: string | null;
  description: string;
  view_count: number;
  shared_at: Date | null;
  show_prompt: boolean;
  project: {
    id: string;
    title: string;
  };
}
