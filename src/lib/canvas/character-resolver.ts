/**
 * Canvas Character Resolver
 *
 * 从 NovelProject.characters (Json) 中解析角色，
 * 并关联到 Character 表获取 reference_image
 * 
 * P1-2: 支持未绑定资产的角色 fallback 处理
 */

import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { pendingCharacterKey } from "./pending-characters";

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
  id: string; // Character 表 ID 或临时 ID
  name: string;
  description: string | null;
  referenceImage: string | null;
  isBound: boolean; // P1-2: 是否已绑定资产
}

/**
 * 用于 planShots 的角色格式
 */
export interface AvailableCharacter {
  id: string;
  name: string;
  description?: string; // P1-2: 添加描述字段用于 fallback
  reference_image?: string;
}

/**
 * 从 Timeline 获取关联的 NovelProject，并解析角色
 * 
 * P1-2: 支持未绑定资产的角色，使用名称+描述作为 fallback
 *
 * @param timelineId - CanvasTimeline ID
 * @param userId - 用户 ID（用于权限验证）
 * @returns 解析后的角色列表（包含已绑定和未绑定的角色）
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

    // P1-2: 分离已绑定和未绑定的角色
    const boundCharacterIds = novelCharacters
      .map((c) => c.assetCharacterId)
      .filter((id): id is string => !!id);

    const unboundCharacters = novelCharacters.filter((c) => !c.assetCharacterId);

    // 4. 查询已绑定的 Character 表获取详细信息
    const boundCharacters = boundCharacterIds.length > 0
      ? await prisma.character.findMany({
          where: {
            id: { in: boundCharacterIds },
            user_id: userId,
          },
          select: {
            id: true,
            name: true,
            description: true,
            reference_image: true,
            base_image_url: true,
          },
        })
      : [];

    // 5. 构建结果
    const resolvedCharacters: ResolvedCharacter[] = [];

    // 5.1 添加已绑定的角色
    for (const c of boundCharacters) {
      resolvedCharacters.push({
        id: c.id,
        name: c.name,
        description: c.description,
        referenceImage: c.reference_image || c.base_image_url || null,
        isBound: true,
      });
    }

    // P1-2: 5.2 添加未绑定的角色（使用临时 ID 和描述作为 fallback）
    for (const nc of unboundCharacters) {
      const tempId = pendingCharacterKey(nc);
      
      // 组合描述信息
      const descParts: string[] = [];
      if (nc.description) descParts.push(nc.description);
      if (nc.role) descParts.push(`角色定位: ${nc.role}`);
      if (nc.traits && nc.traits.length > 0) descParts.push(`特征: ${nc.traits.join(", ")}`);
      
      resolvedCharacters.push({
        id: tempId,
        name: nc.name,
        description: descParts.join("; ") || null,
        referenceImage: null, // 未绑定角色无参考图
        isBound: false,
      });
    }

    logInfo("P1-2: 角色查询完成（含未绑定角色）", {
      timelineId,
      novelProjectId: timeline.novel_project_id,
      totalCount: resolvedCharacters.length,
      boundCount: boundCharacters.length,
      unboundCount: unboundCharacters.length,
      characterNames: resolvedCharacters.map((c) => `${c.name}${c.isBound ? "" : "(未绑定)"}`),
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
 * 
 * P1-2: 添加描述字段，用于未绑定角色的 LLM 识别
 */
export function formatForPlanShots(
  characters: ResolvedCharacter[]
): AvailableCharacter[] {
  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || undefined, // P1-2: 添加描述用于 LLM 识别
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
