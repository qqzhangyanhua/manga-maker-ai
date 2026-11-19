import type { Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "@/lib/api-helpers";

import { isUuid } from "./shot-mapping";
import type { PanelCastWrite } from "./types";

type CastDb = PrismaClient | Prisma.TransactionClient;

export interface PreparedPanelCast {
  leadCharacterId: string | null;
  leadOutfitId: string | null;
  leadExpression: string | null;
  rows: Array<{
    project_character_id: string;
    outfit_id: string | null;
    expression_type: string | null;
    sort_order: number;
    pending_character_key: null;
    pending_character_name: null;
  }>;
}

/**
 * 校验画布提交的出场角色，并算出要写入的行和主角色。
 * 对不上时抛出，不改库。
 */
export async function preparePanelCast(
  db: CastDb,
  projectId: string,
  characters: PanelCastWrite[]
): Promise<PreparedPanelCast> {
  const seen = new Set<string>();
  for (const row of characters) {
    const id = row.project_character_id.trim();
    if (!isUuid(id)) {
      throw new ApiError("出场角色必须是项目角色", 400, "PROJECT_CHARACTER_REQUIRED");
    }
    if (seen.has(id)) {
      throw new ApiError("同一格不能重复同一个项目角色", 400, "DUPLICATE_PROJECT_CHARACTER");
    }
    seen.add(id);
  }

  const ids = characters.map((row) => row.project_character_id.trim());
  const found = ids.length
    ? await db.projectCharacter.findMany({
        where: { id: { in: ids }, project_id: projectId },
        select: {
          id: true,
          character_id: true,
          character: { select: { outfits: { select: { id: true } } } },
        },
      })
    : [];
  if (found.length !== ids.length) {
    throw new ApiError("项目角色不属于这个项目", 400, "PROJECT_CHARACTER_MISMATCH");
  }

  const byId = new Map(found.map((row) => [row.id, row]));
  const rows = characters.map((row, index) => {
    const id = row.project_character_id.trim();
    const projectCharacter = byId.get(id);
    if (!projectCharacter) {
      throw new ApiError("项目角色不属于这个项目", 400, "PROJECT_CHARACTER_MISMATCH");
    }
    const outfitId = row.outfit_id?.trim() || null;
    if (outfitId && !projectCharacter.character.outfits.some((outfit) => outfit.id === outfitId)) {
      throw new ApiError("服装不属于该项目角色", 400, "OUTFIT_MISMATCH");
    }
    return {
      project_character_id: id,
      outfit_id: outfitId,
      expression_type: row.expression?.trim() || null,
      sort_order: index,
      pending_character_key: null,
      pending_character_name: null,
    };
  });

  const first = rows[0];
  const firstCharacter = first ? byId.get(first.project_character_id) : undefined;
  return {
    leadCharacterId: firstCharacter?.character_id ?? null,
    leadOutfitId: first?.outfit_id ?? null,
    leadExpression: first?.expression_type ?? null,
    rows,
  };
}
