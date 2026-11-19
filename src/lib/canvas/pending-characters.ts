import type { PrismaClient } from "@prisma/client";
import { ensureProjectCharacters } from "@/lib/project";
import { PENDING_CHARACTER_PREFIX } from "./shot-mapping";

/** 小说人物还没加入角色库时，画布镜头里用的临时 ID */
export function pendingCharacterKey(novelCharacter: { id?: string | null; name: string }): string {
  return `${PENDING_CHARACTER_PREFIX}${novelCharacter.id || novelCharacter.name.toLowerCase().replace(/\s+/g, "-")}`;
}

/**
 * 小说人物加入角色库后，把项目分镜上对应的待绑定角色换成这个角色（同时加入项目角色）。
 * 按临时 ID 匹配，传了名称时同名的待绑定角色也算。分镜上已有这个角色的，删掉待绑定条目。
 * 返回处理的待绑定条目数。
 */
export async function promotePendingCharacters(
  db: PrismaClient,
  params: { projectId: string; userId: string; characterId: string; pendingKeys: string[]; name?: string | null }
): Promise<number> {
  const keys = Array.from(new Set(params.pendingKeys.filter((k) => k.length > 0)));
  const name = params.name?.trim();
  if (keys.length === 0 && !name) return 0;

  return db.$transaction(async (tx) => {
    const pending = await tx.panelCharacter.findMany({
      where: {
        project_character_id: null,
        panel: { project_id: params.projectId },
        OR: [
          ...(keys.length > 0 ? [{ pending_character_key: { in: keys } }] : []),
          ...(name ? [{ pending_character_name: name }] : []),
        ],
      },
      select: { id: true, panel_id: true },
      orderBy: [{ panel_id: "asc" }, { sort_order: "asc" }],
    });
    if (pending.length === 0) return 0;

    await ensureProjectCharacters(tx, {
      projectId: params.projectId,
      userId: params.userId,
      characterIds: [params.characterId],
    });
    const projectCharacter = await tx.projectCharacter.findUniqueOrThrow({
      where: { project_id_character_id: { project_id: params.projectId, character_id: params.characterId } },
      select: { id: true },
    });

    const bound = new Set(
      (
        await tx.panelCharacter.findMany({
          where: {
            panel_id: { in: Array.from(new Set(pending.map((p) => p.panel_id))) },
            project_character_id: projectCharacter.id,
          },
          select: { panel_id: true },
        })
      ).map((row) => row.panel_id)
    );

    for (const row of pending) {
      if (bound.has(row.panel_id)) {
        await tx.panelCharacter.delete({ where: { id: row.id } });
        continue;
      }
      await tx.panelCharacter.update({
        where: { id: row.id },
        data: { project_character_id: projectCharacter.id, pending_character_key: null, pending_character_name: null },
      });
      bound.add(row.panel_id);
    }

    // 主角色兼容字段：分镜原来没有已入库角色的，现在第一个就是它
    for (const panelId of Array.from(bound)) {
      const first = await tx.panelCharacter.findFirst({
        where: { panel_id: panelId, project_character_id: { not: null } },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        include: { project_character: { select: { character_id: true } } },
      });
      await tx.panel.update({
        where: { id: panelId },
        data: {
          character_id: first?.project_character?.character_id ?? null,
          outfit_id: first?.outfit_id ?? null,
          expression_type: first?.expression_type ?? null,
        },
      });
    }
    return pending.length;
  });
}

/** 同上，作用于这部小说改编的全部项目（当前用户的） */
export async function promotePendingCharactersForNovel(
  db: PrismaClient,
  params: { novelProjectId: string; userId: string; characterId: string; pendingKeys: string[]; name?: string | null }
): Promise<number> {
  const timelines = await db.canvasTimeline.findMany({
    where: { novel_project_id: params.novelProjectId, user_id: params.userId, project_id: { not: null } },
    select: { project_id: true },
  });
  const projectIds = Array.from(
    new Set(timelines.map((t) => t.project_id).filter((id): id is string => id !== null))
  );
  let total = 0;
  for (const projectId of projectIds) {
    total += await promotePendingCharacters(db, { ...params, projectId });
  }
  return total;
}
