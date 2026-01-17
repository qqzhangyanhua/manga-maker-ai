/**
 * 角色升级 API 类型定义
 * 将小说角色(NovelCharacter)升级为完整的Character记录
 */

/**
 * 角色来源类型
 */
export type CharacterSourceType = "manual" | "novel" | "story_ai" | "imported";

/**
 * 小说角色来源引用
 */
export interface NovelSourceReference {
  novelProjectId: string;
  timelineId: string;
  chapterId: string;
  tempId: string;
  originalName: string;
}

/**
 * 小说角色输入（来自 NovelProject.characters JSONB）
 */
export interface NovelCharacterInput {
  name: string;
  role: string;           // "protagonist" | "antagonist" | "supporting" | "minor"
  description: string;
  tempId: string;
  traits?: string[];
  relationships?: Record<string, string>;
}

/**
 * 升级请求参数
 */
export interface UpgradeNovelCharacterRequest {
  novelCharacter: NovelCharacterInput;
  generateImage?: boolean;  // 是否立即生成基础图片，默认 false
  comicStyleId?: string;    // 可选的漫画风格ID
}

/**
 * 升级后的角色信息
 */
export interface UpgradedCharacter {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  source_type: CharacterSourceType;
  source_reference: NovelSourceReference;
}

/**
 * 升级响应
 */
export interface UpgradeNovelCharacterResponse {
  success: true;
  character: UpgradedCharacter;
  isNew: boolean;           // 是否新创建（false表示关联已有角色）
  imageGenerated?: boolean; // 是否生成了图片
  message: string;
}

/**
 * 错误响应
 */
export interface UpgradeErrorResponse {
  error: string;
}
