import type { Prisma, PrismaClient } from "@prisma/client";

import { ApiError } from "@/lib/api-error";

import type { CastMemberInput } from "./plan";

type Tx = Prisma.TransactionClient;
type Db = PrismaClient | Tx;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAST_SELECT = {
  panel_id: true,
  project_character_id: true,
  outfit_id: true,
  expression_type: true,
  sort_order: true,
  pending_character_key: true,
  pending_character_name: true,
} satisfies Prisma.PanelCharacterSelect;

export type PanelCastRow = Prisma.PanelCharacterGetPayload<{ select: typeof CAST_SELECT }>;

interface NormalizedCast {
  projectCharacterId: string;
  outfitId: string | null;
  expression: string | null;
}

/** 校验在场角色。通过后返回要写入的行，不改库。 */
export async function normalizePanelCast(
  db: Db,
  projectId: string,
  cast: readonly CastMemberInput[],
): Promise<NormalizedCast[]> {
  const seen = new Set<string>();
  const normalized = cast.map((row) => {
    const projectCharacterId = row.projectCharacterId.trim();
    if (!UUID_RE.test(projectCharacterId)) {
      throw new ApiError(400, "PROJECT_CHARACTER_REQUIRED", "出场角色必须是项目角色");
    }
    if (seen.has(projectCharacterId)) {
      throw new ApiError(400, "DUPLICATE_PROJECT_CHARACTER", "同一格不能重复同一个项目角色");
    }
    seen.add(projectCharacterId);
    return {
      projectCharacterId,
      outfitId: row.outfitId?.trim() || null,
      expression: row.expression?.trim() || null,
    };
  });
  if (normalized.length === 0) return [];

  const found = await db.projectCharacter.findMany({
    where: { id: { in: normalized.map((row) => row.projectCharacterId) }, project_id: projectId },
    select: { id: true, character: { select: { outfits: { select: { id: true } } } } },
  });
  const byId = new Map(found.map((row) => [row.id, row]));
  return normalized.map((row) => {
    const projectCharacter = byId.get(row.projectCharacterId);
    if (!projectCharacter) {
      throw new ApiError(400, "PROJECT_CHARACTER_MISMATCH", "项目角色不属于这个项目");
    }
    if (row.outfitId && !projectCharacter.character.outfits.some((outfit) => outfit.id === row.outfitId)) {
      throw new ApiError(400, "OUTFIT_MISMATCH", "服装不属于该项目角色");
    }
    return row;
  });
}

export async function readCast(tx: Tx, panelId: string): Promise<PanelCastRow[]> {
  return tx.panelCharacter.findMany({
    where: { panel_id: panelId },
    orderBy: { sort_order: "asc" },
    select: CAST_SELECT,
  });
}

export async function readCastForPanels(tx: Tx, panelIds: readonly string[]): Promise<PanelCastRow[]> {
  if (panelIds.length === 0) return [];
  return tx.panelCharacter.findMany({
    where: { panel_id: { in: [...panelIds] } },
    orderBy: [{ panel_id: "asc" }, { sort_order: "asc" }],
    select: CAST_SELECT,
  });
}

export async function writeCastRows(tx: Tx, panelId: string, rows: readonly PanelCastRow[]): Promise<void> {
  if (rows.length === 0) return;
  await tx.panelCharacter.createMany({
    data: rows.map((row, sortOrder) => ({
      panel_id: panelId,
      project_character_id: row.project_character_id,
      outfit_id: row.outfit_id,
      expression_type: row.expression_type,
      sort_order: sortOrder,
      pending_character_key: row.pending_character_key,
      pending_character_name: row.pending_character_name,
    })),
  });
}
