import type { Prisma } from "@prisma/client";

import { loadPanels, lockChapters } from "./session";

type Tx = Prisma.TransactionClient;

export interface PendingBindRow {
  id: string;
  panelId: string;
}

/**
 * 把待绑定行改成这个项目角色。这一格已经有该角色时删掉待绑定行。
 * 不写主角色列，那些列由数据库触发器跟着第一位在场角色走。
 */
export async function bindPendingCharacters(
  tx: Tx,
  projectId: string,
  projectCharacterId: string,
  rows: readonly PendingBindRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const panelIds = Array.from(new Set(rows.map((row) => row.panelId)));
  const panels = await loadPanels(tx, projectId, panelIds);
  await lockChapters(tx, panels.map((panel) => panel.chapter_id));

  const alreadyBound = new Set(
    (
      await tx.panelCharacter.findMany({
        where: { panel_id: { in: panelIds }, project_character_id: projectCharacterId },
        select: { panel_id: true },
      })
    ).map((row) => row.panel_id),
  );

  for (const row of rows) {
    if (alreadyBound.has(row.panelId)) {
      await tx.panelCharacter.delete({ where: { id: row.id } });
      continue;
    }
    await tx.panelCharacter.update({
      where: { id: row.id },
      data: {
        project_character_id: projectCharacterId,
        pending_character_key: null,
        pending_character_name: null,
      },
    });
    alreadyBound.add(row.panelId);
  }
}
