import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError, withAuth } from "@/lib/api-helpers";
import { ensureProjectCharacters } from "@/lib/project";
import { panels } from "@/lib/project/chapter-panels";
import type { CastMemberInput, LeadAppearance } from "@/lib/project/chapter-panels";

const panelInclude = {
  character: {
    select: { id: true, name: true },
  },
  outfit: {
    select: { id: true, outfit_name: true },
  },
  scene: {
    select: { id: true, name: true },
  },
} satisfies Prisma.PanelInclude;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const panelId = params.id;

    // 获取 panel
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { project: true },
    });

    if (!panel) {
      throw new ApiError(404, "NOT_FOUND", "分镜不存在");
    }

    if (panel.project.user_id !== userId) {
      throw new ApiError(403, "FORBIDDEN", "无权限访问此分镜");
    }

    return panel;
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const panelId = params.id;

    // 检查 panel 是否存在且属于当前用户
    const existingPanel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { project: true },
    });

    if (!existingPanel) {
      throw new Error("分镜不存在");
    }

    if (existingPanel.project.user_id !== userId) {
      throw new ApiError(403, "FORBIDDEN", "无权限修改此分镜");
    }

    const body = await req.json();
    const {
      visual_prompt,
      dialogue,
      camera_angle,
      shot_size,
      description,
      panel_type,
      importance,
      character_name, // DEPRECATED: Use character_id instead
      emotion,
      prompt_used,
      generated_image,
      // Phase 2: Asset binding fields
      character_id, // PREFERRED
      expression_type,
      outfit_id,
      scene_id,
    } = body;

    // Handle character_id (backward compatibility for character_name)
    let resolvedCharacterId = character_id;
    if (character_id === undefined && character_name !== undefined) {
      // Only lookup if character_id not provided but character_name is
      if (character_name) {
        const character = await prisma.character.findFirst({
          where: {
            user_id: userId,
            name: { equals: character_name, mode: "insensitive" },
          },
          orderBy: { created_at: 'asc' }, // Deterministic ordering if duplicates exist
        });

        if (character) {
          console.log(`[COMPAT] Resolved character_name "${character_name}" → ${character.id} (user: ${userId})`);
          resolvedCharacterId = character.id;
        } else {
          console.warn(`[COMPAT] Failed to resolve character_name: "${character_name}" (user: ${userId})`);
          resolvedCharacterId = null;
        }
      } else {
        resolvedCharacterId = null;
      }
    }

    const projectId = existingPanel.project_id;
    const appearance = leadAppearance(outfit_id, expression_type);
    // 主角色列由在场角色触发器派生。服装和表情跟主角色同一笔写入，并校验服装归属。
    if (typeof resolvedCharacterId === "string" && resolvedCharacterId.length > 0) {
      await ensureProjectCharacters(prisma, {
        projectId,
        userId,
        characterIds: [resolvedCharacterId],
      });
      const projectCharacter = await prisma.projectCharacter.findUnique({
        where: {
          project_id_character_id: {
            project_id: projectId,
            character_id: resolvedCharacterId,
          },
        },
        select: { id: true },
      });
      if (!projectCharacter) {
        throw new ApiError(400, "INVALID_CHARACTER", "角色不存在或不属于当前用户");
      }
      await panels(projectId).setLead([panelId], projectCharacter.id, appearance);
    } else if (resolvedCharacterId === null) {
      await clearLead(projectId, panelId);
    } else if (appearance) {
      const lead = await prisma.panelCharacter.findFirst({
        where: {
          panel_id: panelId,
          project_character_id: { not: null },
        },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }, { id: "asc" }],
        select: { project_character_id: true },
      });
      if (lead?.project_character_id) {
        await panels(projectId).setLead([panelId], lead.project_character_id, appearance);
      }
    }

    const data = {
      ...(visual_prompt !== undefined && { visual_prompt }),
      ...(dialogue !== undefined && { dialogue }),
      ...(camera_angle !== undefined && { camera_angle }),
      ...(shot_size !== undefined && { shot_size }),
      ...(description !== undefined && { description }),
      ...(panel_type !== undefined && { panel_type }),
      ...(importance !== undefined && { importance }),
      ...(emotion !== undefined && { emotion }),
      ...(prompt_used !== undefined && { prompt_used }),
      ...(generated_image !== undefined && { generated_image }),
      ...(scene_id !== undefined && { scene_id }),
    };

    if (Object.keys(data).length > 0) {
      await prisma.panel.update({
        where: { id: panelId },
        data,
      });
    }

    const updatedPanel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: panelInclude,
    });

    return {
      panel: updatedPanel,
      message: "分镜已更新",
    };
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const panelId = params.id;

    // 检查 panel 是否存在且属于当前用户
    const existingPanel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { project: true },
    });

    if (!existingPanel) {
      throw new Error("分镜不存在");
    }

    if (existingPanel.project.user_id !== userId) {
      throw new ApiError(403, "FORBIDDEN", "无权限删除此分镜");
    }

    const discarded = await panels(existingPanel.project_id).remove([panelId]);

    return {
      message: "分镜已删除",
      discarded,
    };
  });
}

// 去掉第一位在场角色。顺序与 panels_reject_inconsistent_lead 相同。未绑定的 pending 行不保留。
async function clearLead(projectId: string, panelId: string): Promise<void> {
  const rows = await prisma.panelCharacter.findMany({
    where: {
      panel_id: panelId,
      project_character_id: { not: null },
    },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }, { id: "asc" }],
    select: {
      project_character_id: true,
      outfit_id: true,
      expression_type: true,
    },
  });
  const rest: CastMemberInput[] = [];
  for (const row of rows.slice(1)) {
    if (!row.project_character_id) continue;
    rest.push({
      projectCharacterId: row.project_character_id,
      outfitId: row.outfit_id,
      expression: row.expression_type,
    });
  }
  await panels(projectId).setCast(panelId, rest);
}

function leadAppearance(outfitId: unknown, expressionType: unknown): LeadAppearance | undefined {
  const appearance: LeadAppearance = {};
  if (outfitId !== undefined) {
    appearance.outfitId = typeof outfitId === "string" ? outfitId : null;
  }
  if (expressionType !== undefined) {
    appearance.expression = typeof expressionType === "string" ? expressionType : null;
  }
  return outfitId !== undefined || expressionType !== undefined ? appearance : undefined;
}
