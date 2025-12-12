import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateImage } from "@/lib/unified-image-generation";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

/**
 * POST /api/panel/[id]/variants
 * Generate variants for a panel with different parameters
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }
    userId = payload.userId;

    const { id: panelId } = await params;
    const body = await req.json();
    const { variant_count = 3, variant_type = "style" } = body;

    // Validate variant_count
    if (variant_count < 1 || variant_count > 5) {
      return NextResponse.json(
        { error: "variant_count 必须在 1-5 之间" },
        { status: 400 }
      );
    }

    // Get panel with assets
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        project: true,
        character: {
          include: {
            outfits: true,
            expressions: true,
          },
        },
        outfit: true,
        scene: true,
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // Check usage quota
    try {
      await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        amount: variant_count,
      });
    } catch (quotaError: unknown) {
      const error = quotaError as { code?: string; message?: string; limit?: number; count?: number };
      if (error?.code === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            error: error.message,
            code: "QUOTA_EXCEEDED",
            limit: error.limit,
            used: error.count,
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    // Build base prompt from panel
    let basePrompt = panel.description || panel.visual_prompt;

    // Add character information
    if (panel.character) {
      const charDesc = panel.character.base_prompt || panel.character.character_name;
      basePrompt += \`, character: \${charDesc}\`;

      if (panel.expression_type) {
        basePrompt += \`, expression: \${panel.expression_type}\`;
      }

      if (panel.outfit) {
        basePrompt += \`, wearing: \${panel.outfit.outfit_name}\`;
      }
    }

    // Add scene information
    if (panel.scene) {
      basePrompt += \`, background: \${panel.scene.scene_name}\`;
    }

    // Generate variants based on type
    const taskIds: string[] = [];
    const stylePrompt = panel.project.style || "manga style";

    for (let i = 0; i < variant_count; i++) {
      let variantPrompt = basePrompt;

      // Add variation based on type
      if (variant_type === "style") {
        const styleVariations = [
          "detailed linework",
          "soft shading",
          "dramatic lighting",
          "dynamic composition",
          "cinematic angle",
        ];
        variantPrompt += \`, \${styleVariations[i % styleVariations.length]}\`;
      } else if (variant_type === "angle") {
        const angleVariations = [
          "eye level view",
          "high angle view",
          "low angle view",
          "dutch angle",
          "bird's eye view",
        ];
        variantPrompt += \`, \${angleVariations[i % angleVariations.length]}\`;
      } else if (variant_type === "composition") {
        const compositionVariations = [
          "rule of thirds",
          "centered composition",
          "diagonal composition",
          "symmetrical composition",
          "asymmetrical composition",
        ];
        variantPrompt += \`, \${compositionVariations[i % compositionVariations.length]}\`;
      }

      const fullPrompt = \`\${variantPrompt}, \${stylePrompt}, high quality, detailed\`;

      const { taskId } = await generateImage(
        "panel",
        fullPrompt,
        userId,
        {
          style: stylePrompt,
          width: 1024,
          height: 768,
          metadata: {
            panel_id: panelId,
            project_id: panel.project_id,
            variant_type,
            variant_index: i,
          },
          referenceImages: [
            panel.character?.reference_image,
            panel.outfit?.image_url,
            panel.scene?.image_url,
          ].filter(Boolean) as string[],
        }
      );

      taskIds.push(taskId);
    }

    await recordGenerationLog({
      userId,
      action: "panel_variant_generation",
      providerType: "image_generation",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: { panel_id: panelId, variant_count, variant_type },
      responsePayload: { task_ids: taskIds },
    });

    return NextResponse.json({
      success: true,
      task_ids: taskIds,
      variant_count: taskIds.length,
      message: \`已提交 \${taskIds.length} 个变体生成任务\`,
    });
  } catch (error) {
    console.error("Generate panel variants error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    if (userId) {
      await recordGenerationLog({
        userId,
        action: "panel_variant_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
