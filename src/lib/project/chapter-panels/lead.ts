import type { Prisma } from "@prisma/client";

import { normalizePanelCast, readCast, type PanelCastRow, writeCastRows } from "./cast";
import { assertUniqueIds, loadPanels, lockChapters } from "./session";

type Tx = Prisma.TransactionClient;

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
): Promise<void> {
  if (ids.length === 0) return;
  assertUniqueIds(ids, "要换主角色的分镜重复了");
  const [lead] = await normalizePanelCast(tx, projectId, [{ projectCharacterId }]);
  if (!lead) return;
  const panels = await loadPanels(tx, projectId, ids);
  await lockChapters(tx, panels.map((panel) => panel.chapter_id));

  for (const panelId of ids) {
    const rows = await readCast(tx, panelId);
    const next = moveLead(rows, panelId, lead.projectCharacterId);
    await tx.panelCharacter.deleteMany({ where: { panel_id: panelId } });
    await writeCastRows(tx, panelId, next);
  }
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
