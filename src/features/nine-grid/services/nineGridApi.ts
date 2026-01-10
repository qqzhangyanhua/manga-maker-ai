/**
 * 九宫格功能 API 服务层
 * 统一管理所有 API 调用
 */

import type { Panel, ComicStyle, CharacterAsset, GenerateNineGridParams, NineGridResult } from '../types';

/**
 * 获取章节的分镜列表
 */
export async function getChapterPanels(chapterId: string): Promise<Panel[]> {
  const response = await fetch(`/api/chapter/${chapterId}/panels`);
  
  if (!response.ok) {
    throw new Error('加载章节分镜失败');
  }
  
  const data = await response.json();
  return data.panels || [];
}

/**
 * 获取启用的漫画风格列表
 */
export async function getComicStyles(): Promise<ComicStyle[]> {
  const response = await fetch('/api/comic-styles?enabled=true');
  
  if (!response.ok) {
    throw new Error('加载漫画风格失败');
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * 获取角色素材列表（只返回有图片的）
 */
export async function getCharacterAssets(): Promise<CharacterAsset[]> {
  const response = await fetch('/api/character');
  
  if (!response.ok) {
    throw new Error('加载角色素材失败');
  }
  
  const data = await response.json();
  const characters = data.characters || [];
  
  // 只返回有 base_image_url 的角色
  return characters.filter(
    (char: CharacterAsset) => char.base_image_url
  );
}

/**
 * 生成九宫格图片
 */
export async function generateNineGrid(
  params: GenerateNineGridParams
): Promise<NineGridResult> {
  const response = await fetch(
    `/api/chapter/${params.chapterId}/generate-nine-grid-image`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: params.projectId,
        panel_ids: params.panelIds,
        comic_style_id: params.comicStyleId,
        style_prompt: params.stylePrompt,
        reference_image: params.referenceImage,
      }),
    }
  );
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || '生成九宫格失败');
  }
  
  return result;
}

/**
 * 统一的错误处理
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return '未知错误';
}
