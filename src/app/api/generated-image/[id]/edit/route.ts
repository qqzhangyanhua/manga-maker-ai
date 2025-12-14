import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { uploadBase64Image } from "@/lib/upload-helpers";

const editPayloadSchema = z.object({
  editType: z.enum(["regenerate", "variant", "style_transfer"]),
  prompt: z.string().optional(),
  style: z.string().optional(),
  variantCount: z.number().min(1).max(5).optional(),
  variantType: z.enum(["style", "angle", "composition"]).optional(),
  targetStyle: z.string().optional(),
  strength: z.number().min(10).max(100).optional(),
  providerType: z.string().optional(),
});

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

    const authPayload = verifyAuthToken(token);
    if (!authPayload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }
    userId = authPayload.userId;

    const { id: imageId } = await params;
    const body = await req.json();
    const payload = editPayloadSchema.parse(body);

    // Get original image
    const originalImage = await prisma.generatedImage.findUnique({
      where: { id: imageId },
    });

    if (!originalImage) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    if (originalImage.user_id !== userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { editType, prompt, style, variantCount, variantType, targetStyle, strength, providerType } = payload;

    // Handle different edit types
    switch (editType) {
      case "regenerate": {
        // Regenerate with modified prompt
        const newPrompt = prompt || originalImage.prompt;
        const newStyle = style || originalImage.style || "manga style";

        await assertAndIncrementUsage({
          userId,
          action: "image_edit",
          providerType: providerType || "image_edit",
        });

        const fullPrompt = `${newPrompt}, ${newStyle}, high quality, detailed`;

        // Call image generation directly
        const result = await callImageGenerationByType({
          providerType: providerType || "image_edit",
          prompt: fullPrompt,
          width: 1024,
          height: 768,
          referenceImageUrls: [originalImage.image_url],
        });

        if (!result.success || !result.images || result.images.length === 0) {
          throw new Error(result.error || "图片生成失败");
        }

        // Upload to MinIO
        const imageUrl = await uploadBase64Image(
          result.images[0],
          `edited-${imageId}-${Date.now()}.png`
        );

        // Save to database
        await prisma.generatedImage.create({
          data: {
            user_id: userId,
            image_url: imageUrl,
            prompt: newPrompt,
            style: newStyle,
            source_type: "edit",
            source_id: imageId,
            generation_params: {
              original_image_id: imageId,
              edit_type: "regenerate",
              provider_type: providerType || "image_edit",
            },
          },
        });

        await recordGenerationLog({
          userId,
          action: "image_regeneration",
          providerType: providerType || "image_edit",
          status: "success",
          durationMs: Date.now() - startedAt,
          requestPayload: { image_id: imageId, prompt: newPrompt, style: newStyle },
          responsePayload: { image_url: imageUrl },
        });

        return NextResponse.json({
          success: true,
          imageUrl,
          message: "图片重新生成完成",
        });
      }

      case "variant": {
        // Generate variants
        const count = variantCount || 3;
        const type = variantType || "style";

        await assertAndIncrementUsage({
          userId,
          action: "image_edit",
          providerType: providerType || "image_edit",
          amount: count,
        });

        const basePrompt = prompt || originalImage.prompt;
        const baseStyle = style || originalImage.style || "manga style";

        const imageUrls: string[] = [];

        for (let i = 0; i < count; i++) {
          let variantPrompt = basePrompt;

          if (type === "style") {
            const styleVariations = [
              "detailed linework",
              "soft shading",
              "dramatic lighting",
              "dynamic composition",
              "cinematic angle",
            ];
            variantPrompt += `, ${styleVariations[i % styleVariations.length]}`;
          } else if (type === "angle") {
            const angleVariations = [
              "eye level view",
              "high angle view",
              "low angle view",
              "dutch angle",
              "bird's eye view",
            ];
            variantPrompt += `, ${angleVariations[i % angleVariations.length]}`;
          } else if (type === "composition") {
            const compositionVariations = [
              "rule of thirds",
              "centered composition",
              "diagonal composition",
              "symmetrical composition",
              "asymmetrical composition",
            ];
            variantPrompt += `, ${compositionVariations[i % compositionVariations.length]}`;
          }

          const fullPrompt = `${variantPrompt}, ${baseStyle}, high quality, detailed`;

          try {
            const result = await callImageGenerationByType({
              providerType: providerType || "image_edit",
              prompt: fullPrompt,
              width: 1024,
              height: 768,
              referenceImageUrls: [originalImage.image_url],
            });

            if (result.success && result.images && result.images.length > 0) {
              const imageUrl = await uploadBase64Image(
                result.images[0],
                `variant-${imageId}-${i}-${Date.now()}.png`
              );

              await prisma.generatedImage.create({
                data: {
                  user_id: userId,
                  image_url: imageUrl,
                  prompt: variantPrompt,
                  style: baseStyle,
                  source_type: "edit",
                  source_id: imageId,
                  generation_params: {
                    original_image_id: imageId,
                    edit_type: "variant",
                    variant_type: type,
                    variant_index: i,
                    provider_type: providerType || "image_edit",
                  },
                },
              });

              imageUrls.push(imageUrl);
            }
          } catch (error) {
            console.error(`Variant ${i} generation failed:`, error);
          }
        }

        await recordGenerationLog({
          userId,
          action: "image_variant_generation",
          providerType: providerType || "image_edit",
          status: imageUrls.length > 0 ? "success" : "failed",
          durationMs: Date.now() - startedAt,
          requestPayload: { image_id: imageId, variant_count: count, variant_type: type },
          responsePayload: { image_urls: imageUrls },
        });

        return NextResponse.json({
          success: true,
          imageUrls,
          variantCount: imageUrls.length,
          message: `成功生成 ${imageUrls.length} 个变体`,
        });
      }

      case "style_transfer": {
        // Style transfer
        if (!targetStyle) {
          return NextResponse.json({ error: "缺少目标风格" }, { status: 400 });
        }

        await assertAndIncrementUsage({
          userId,
          action: "image_edit",
          providerType: providerType || "image_edit",
        });

        const transferPrompt = `${originalImage.prompt}, ${targetStyle} style`;
        const transferStrength = strength || 60;

        const result = await callImageGenerationByType({
          providerType: providerType || "image_edit",
          prompt: transferPrompt,
          width: 1024,
          height: 768,
          referenceImageUrls: [originalImage.image_url],
        });

        if (!result.success || !result.images || result.images.length === 0) {
          throw new Error(result.error || "风格迁移失败");
        }

        const imageUrl = await uploadBase64Image(
          result.images[0],
          `style-${imageId}-${Date.now()}.png`
        );

        await prisma.generatedImage.create({
          data: {
            user_id: userId,
            image_url: imageUrl,
            prompt: originalImage.prompt,
            style: targetStyle,
            source_type: "edit",
            source_id: imageId,
            generation_params: {
              original_image_id: imageId,
              edit_type: "style_transfer",
              target_style: targetStyle,
              strength: transferStrength,
              provider_type: providerType || "image_edit",
            },
          },
        });

        await recordGenerationLog({
          userId,
          action: "image_style_transfer",
          providerType: providerType || "image_edit",
          status: "success",
          durationMs: Date.now() - startedAt,
          requestPayload: { image_id: imageId, target_style: targetStyle, strength: transferStrength },
          responsePayload: { image_url: imageUrl },
        });

        return NextResponse.json({
          success: true,
          imageUrl,
          message: "风格迁移完成",
        });
      }

      default:
        return NextResponse.json({ error: "不支持的编辑类型" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Image edit error:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "image_edit",
        providerType: "image_edit",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors?.[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const quotaError = error as { code?: string; message?: string; limit?: number; count?: number };
    if (quotaError?.code === "QUOTA_EXCEEDED") {
      return NextResponse.json(
        {
          error: quotaError.message,
          code: "QUOTA_EXCEEDED",
          limit: quotaError.limit,
          used: quotaError.count,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
