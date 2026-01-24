/**
 * 九宫格图片生成功能 - 类型定义
 */

/**
 * 镜头设计基础信息
 */
export interface ShotDesignBasic {
  id: string;
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  prompt: string;
  generated_image_url?: string | null;
  generation_status?: string;
}

/**
 * 九宫格生成请求体
 */
export interface NineGridGenerateRequest {
  shotIds: string[];
  comicStyleId?: string;
  plotSummary: string;
  // [新增] 角色参考图
  characterReferences?: {
    characterId: string;
    referenceImageUrls: string[];
  }[];
}

/**
 * 九宫格生成响应体
 */
export interface NineGridGenerateResponse {
  success: boolean;
  taskId: string;
  status: 'pending' | 'generating';
  message?: string;
}

/**
 * 九宫格对话框 Props
 */
export interface GenerateNineGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedShots: ShotDesignBasic[];
  timelineId: string | null;
  chapterId: string | null;
  chapterSummary?: string;
  onConfirm: (payload: NineGridGenerateRequest) => void;
  isSubmitting?: boolean;
}

/**
 * 九宫格选择模式状态
 */
export interface NineGridSelectionState {
  isSelectMode: boolean;
  selectedShotIds: Set<string>;
}

/**
 * 参考图片来源类型
 */
export type ReferenceImageSource = 
  | "character_avatar"  // 角色头像
  | "shot_image"        // 镜头图片
  | "scene"             // 场景库
  | "final";            // 最终分镜

/**
 * 参考图片元数据
 */
export interface ReferenceImage {
  id: string;
  url: string;
  source: ReferenceImageSource;
  sourceId?: string;           // 来源记录的ID
  thumbnail?: string;          // 缩略图URL
  metadata?: {
    chapterNumber?: number;    // 如果是镜头图片,来自第几章
    shotOrder?: number;        // 镜头序号
    sceneName?: string;        // 场景名称
    description?: string;      // 描述
  };
}

/**
 * 角色参考图配置
 */
export interface CharacterReference {
  id: string;
  name: string;
  role?: string;               // 角色定位（主角/配角/反派等）
  avatar_url?: string;         // 默认头像
  selectedReferenceImages: ReferenceImage[];  // 用户选择的参考图
}

/**
 * 项目参考图响应
 */
export interface ProjectReferenceImagesResponse {
  shots: {
    id: string;
    url: string;
    chapterNumber: number;
    shotOrder: number;
    description?: string;
  }[];
  scenes: {
    id: string;
    url: string;
    name: string;
  }[];
  finals: {
    id: string;
    url: string;
    chapterNumber?: number;
    description?: string;
  }[];
}

/**
 * 章节角色响应
 */
export interface ChapterCharactersResponse {
  characters: {
    id: string;
    name: string;
    role?: string;
    avatar_url?: string;
    reference_image_url?: string;
  }[];
}
