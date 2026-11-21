import type { Prisma } from "@prisma/client";

import { normalizePanelCast, readCast, type PanelCastRow, writeCastRows } from "./cast";
import type { CastMemberInput } from "./plan";
import { assertUniqueIds, loadPanels, lockChapters } from "./session";

type Tx = Prisma.TransactionClient;

/** 只改主角色这一行的服装或表情。没传的字段保持原值。 */
export interface LeadAppearance {
  outfitId?: string | null;
  expression?: string | null;
}

/**
 * 把项目角色放到在场角色的第一位；原来没有就补上一行。
 * 不写分镜上的主角色列，那些列由数据库触发器跟着第一行走。
 * 其余在场角色（含尚未绑定的行）保持相对顺序。
 */
export async function setLeadInTransaction(
  tx: Tx,
  projectId: string,
  ids: readonly string[],
  projectCharacterId: string,
  appearance?: LeadAppearance,
): Promise<void> {
  if (ids.length === 0) return;
  assertUniqueIds(ids, "要换主角色的分镜重复了");
  // 服装不属于该角色时在改顺序之前拒绝，避免主角色已经换了、服装却写不进去。
  const [lead] = await normalizePanelCast(tx, projectId, [castInputForLead(projectCharacterId, appearance)]);
  if (!lead) return;
  const panels = await loadPanels(tx, projectId, ids);
  await lockChapters(tx, panels.map((panel) => panel.chapter_id));

  for (const panelId of ids) {
    const rows = await readCast(tx, panelId);
    const next = applyLeadAppearance(moveLead(rows, panelId, lead.projectCharacterId), lead, appearance);
    await tx.panelCharacter.deleteMany({ where: { panel_id: panelId } });
    await writeCastRows(tx, panelId, next);
  }
}

function castInputForLead(projectCharacterId: string, appearance?: LeadAppearance): CastMemberInput {
  const input: CastMemberInput = { projectCharacterId };
  if (!appearance) return input;
  if (appearance.outfitId !== undefined) {
    input.outfitId = typeof appearance.outfitId === "string" ? appearance.outfitId : null;
  }
  if (appearance.expression !== undefined) {
    input.expression = typeof appearance.expression === "string" ? appearance.expression : null;
  }
  return input;
}

function applyLeadAppearance(
  rows: readonly PanelCastRow[],
  lead: { projectCharacterId: string; outfitId: string | null; expression: string | null },
  appearance?: LeadAppearance,
): PanelCastRow[] {
  if (!appearance) return [...rows];
  const [head, ...rest] = rows;
  if (!head || head.project_character_id !== lead.projectCharacterId) return [...rows];
  return [{
    ...head,
    outfit_id: appearance.outfitId !== undefined ? lead.outfitId : head.outfit_id,
    expression_type: appearance.expression !== undefined ? lead.expression : head.expression_type,
  }, ...rest];
}

function moveLead(rows: readonly PanelCastRow[], panelId: string, projectCharacterId: string): PanelCastRow[] {
  const index = rows.findIndex((row) => row.project_character_id === projectCharacterId);
  if (index < 0) {
    return [{
      panel_id: panelId,
      project_character_id: projectCharacterId,
      outfit_id: null,
      expression_type: null,
      sort_order: 0,
      pending_character_key: null,
      pending_character_name: null,
    }, ...rows];
  }
  const current = rows[index];
  if (!current) return [...rows];
  return [current, ...rows.filter((_row, rowIndex) => rowIndex !== index)];
}
