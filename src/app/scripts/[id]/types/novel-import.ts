/**
 * 小说角色导入系统类型定义
 * 用于从小说项目导入角色到剧本
 */

import type { CharacterRole } from "@/components/character/RoleSelector";

/**
 * 小说角色（从 NovelProject.characters JSONB 解析）
 */
export interface NovelCharacter {
  name: string;
  role: string; // protagonist/antagonist/supporting/minor
  description: string;
  traits?: string[]; // 性格特征
  relationships?: Record<string, string>; // 与其他角色的关系

  // 前端使用的临时字段
  tempId?: string; // 临时ID，用于前端选择
}

/**
 * 小说角色导入请求
 */
export interface ImportNovelCharactersRequest {
  novel_id: string;
  characters: NovelCharacter[]; // 要导入的角色列表（带名称去重）
}

/**
 * 导入结果 - 单个角色
 */
export interface ImportedCharacterResult {
  novel_character_name: string;
  character_id: string; // 创建的 Character ID
  character_name: string;
  role: CharacterRole;
  status: "created" | "skipped";
  reason?: string; // 跳过原因
}

/**
 * 小说角色导入响应
 */
export interface ImportNovelCharactersResponse {
  imported: ImportedCharacterResult[];
  skipped: ImportedCharacterResult[];
  failed: Array<{
    novel_character_name: string;
    reason: string;
  }>;
  summary: {
    total: number;
    imported_count: number;
    skipped_count: number;
    failed_count: number;
  };
}

/**
 * 获取小说角色列表响应
 */
export interface GetNovelCharactersResponse {
  novel_id: string;
  novel_title: string;
  characters: NovelCharacter[];
}
