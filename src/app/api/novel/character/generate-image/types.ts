/**
 * 角色图片生成 API 类型定义
 */

/**
 * 请求参数
 */
export interface GenerateCharacterImageRequest {
  novelProjectId: string;
  characterId: string;
  characterName: string;
  characterDescription: string;
  prompt: string;
  comicStyleId?: string;
}

/**
 * 响应结果
 */
export interface GenerateCharacterImageResponse {
  success: boolean;
  assetCharacterId: string;
  imageUrl: string;
  isNew: boolean;
  message: string;
  updatedCharacter: {
    id: string;
    name: string;
    role: string;
    description: string;
    generatedImageUrl: string;
    assetCharacterId: string;
    lastGeneratedAt: string;
  };
}
