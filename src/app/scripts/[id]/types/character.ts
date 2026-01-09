/**
 * 角色相关类型定义
 */

/**
 * 角色基础信息
 * 从 Prisma Character 模型中提取核心字段
 */
export interface CharacterInfo {
  id: string;
  name: string;
  description: string | null;
  reference_image: string | null;
  style_prompt: string | null;
  base_prompt?: string | null;
}

/**
 * 选中的角色信息（包含角色数据和角色类型）
 */
export interface SelectedCharacter {
  character: CharacterInfo;
  role: string;
}
