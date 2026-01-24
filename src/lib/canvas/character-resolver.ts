/**
 * Canvas Character Resolver
 *
 * 从 NovelProject.characters (Json) 中解析角色，
 * 并关联到 Character 表获取 reference_image
 */

import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

/**
 * NovelProject.characters JSON 中的角色结构
 */
interface NovelProjectCharacter {
  id: string; // 临时 ID (小说角色)
  name: string;
  role?: string;
  description?: string;
  traits?: string[];
  assetCharacterId?: string; // 关联的 Character 表 ID
}

/**
 * 解析后的角色（带参考图）
 */
export interface ResolvedCharacter {
  id: string; // Character 表 ID
  name: string;
  description: string | null;
  referenceImage: string | null;
}

/**
 * 用于 planShots 的角色格式
 */
export interface AvailableCharacter {
  id: string;
  name: string;
  reference_image?: string;
}

/**
 * 从 Timeline 获取关联的 NovelProject，并解析角色
 *
 * @param timelineId - CanvasTimeline ID
 * @param userId - 用户 ID（用于权限验证）
 * @returns 解析后的角色列表
 */
export async function resolveCharactersForTimeline(
  timelineId: string,
  userId: string
): Promise<ResolvedCharacter[]> {
  try {
    // 1. 获取 Timeline 关联的 NovelProject
    const timeline = await prisma.canvasTimeline.findUnique({
      where: { id: timelineId },
      select: {
        novel_project_id: true,
        user_id: true,
      },
    });

    if (!timeline) {
      logError("Timeline 不存在", new Error("Timeline not found"), { timelineId });
      return [];
    }

    if (timeline.user_id !== userId) {
      logError("无权访问 Timeline", new Error("Unauthorized"), { timelineId, userId });
      return [];
    }

    if (!timeline.novel_project_id) {
      logInfo("Timeline 未关联 NovelProject", { timelineId });
      return [];
    }

    // 2. 获取 NovelProject 的 characters JSON
    const novelProject = await prisma.novelProject.findUnique({
      where: { id: timeline.novel_project_id },
      select: {
        characters: true,
      },
    });

    if (!novelProject || !novelProject.characters) {
      logInfo("NovelProject 无角色数据", {
        timelineId,
        novelProjectId: timeline.novel_project_id,
      });
      return [];
    }

    // 3. 解析 characters JSON
    const novelCharacters = novelProject.characters as unknown as NovelProjectCharacter[];
    if (!Array.isArray(novelCharacters) || novelCharacters.length === 0) {
      logInfo("NovelProject 角色列表为空", {
        timelineId,
        novelProjectId: timeline.novel_project_id,
      });
      return [];
    }

    // 4. 提取已绑定的 assetCharacterId
    const assetCharacterIds = novelCharacters
      .map((c) => c.assetCharacterId)
      .filter((id): id is string => !!id);

    if (assetCharacterIds.length === 0) {
      logInfo("NovelProject 角色未绑定资产", {
        timelineId,
        novelProjectId: timeline.novel_project_id,
        novelCharacterCount: novelCharacters.length,
      });
      return [];
    }

    // 5. 查询 Character 表获取详细信息
    const characters = await prisma.character.findMany({
      where: {
        id: { in: assetCharacterIds },
        user_id: userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        reference_image: true,
        base_image_url: true, // fallback
      },
    });

    // 6. 构建结果，优先使用 reference_image，fallback 到 base_image_url
    const resolvedCharacters: ResolvedCharacter[] = characters.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      referenceImage: c.reference_image || c.base_image_url || null,
    }));

    logInfo("角色查询完成", {
      timelineId,
      novelProjectId: timeline.novel_project_id,
      characterCount: resolvedCharacters.length,
      characterNames: resolvedCharacters.map((c) => c.name),
      withReferenceImage: resolvedCharacters.filter((c) => c.referenceImage).length,
    });

    return resolvedCharacters;
  } catch (error) {
    logError("解析角色失败", error, { timelineId, userId });
    return [];
  }
}

/**
 * 格式化为 planShots 需要的 available_characters 格式
 */
export function formatForPlanShots(
  characters: ResolvedCharacter[]
): AvailableCharacter[] {
  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    reference_image: c.referenceImage || undefined,
  }));
}

/**
 * 构建角色 ID → 参考图 URL 映射
 */
export function buildCharacterReferenceMap(
  characters: ResolvedCharacter[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of characters) {
    if (c.referenceImage) {
      map.set(c.id, c.referenceImage);
    }
  }
  return map;
}

/**
 * 构建角色 ID → 名称映射
 */
export function buildCharacterNameMap(
  characters: ResolvedCharacter[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of characters) {
    map.set(c.id, c.name);
  }
  return map;
}
