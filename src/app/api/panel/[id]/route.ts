import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

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
      throw new Error("分镜不存在");
    }

    if (panel.project.user_id !== userId) {
      const error = new Error("无权限访问此分镜") as any;
      error.status = 403;
      throw error;
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
      const error = new Error("无权限修改此分镜") as any;
      error.status = 403;
      throw error;
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
            name: { contains: character_name, mode: "insensitive" },
          },
        });
        resolvedCharacterId = character?.id ?? null;
      } else {
        resolvedCharacterId = null;
      }
    }

    // 更新 panel
    const updatedPanel = await prisma.panel.update({
      where: { id: panelId },
      data: {
        ...(visual_prompt !== undefined && { visual_prompt }),
        ...(dialogue !== undefined && { dialogue }),
        ...(camera_angle !== undefined && { camera_angle }),
        ...(shot_size !== undefined && { shot_size }),
        ...(description !== undefined && { description }),
        ...(panel_type !== undefined && { panel_type }),
        ...(importance !== undefined && { importance }),
        // Do NOT write to character_name anymore
        ...(emotion !== undefined && { emotion }),
        ...(prompt_used !== undefined && { prompt_used }),
        ...(generated_image !== undefined && { generated_image }),
        // Phase 2: Asset binding fields
        ...(resolvedCharacterId !== undefined && { character_id: resolvedCharacterId }),
        ...(expression_type !== undefined && { expression_type }),
        ...(outfit_id !== undefined && { outfit_id }),
        ...(scene_id !== undefined && { scene_id }),
      },
      include: {
        character: {
          select: { id: true, name: true },
        },
        outfit: {
          select: { id: true, outfit_name: true },
        },
        scene: {
          select: { id: true, name: true },
        },
      },
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
      const error = new Error("无权限删除此分镜") as any;
      error.status = 403;
      throw error;
    }

    // 删除 panel
    await prisma.panel.delete({
      where: { id: panelId },
    });

    // 重新排序后续 panels
    await prisma.$executeRaw`
      UPDATE panels
      SET panel_order = panel_order - 1
      WHERE project_id = ${existingPanel.project_id}::uuid
      AND panel_order > ${existingPanel.panel_order}
    `;

    return {
      message: "分镜已删除",
    };
  });
}
