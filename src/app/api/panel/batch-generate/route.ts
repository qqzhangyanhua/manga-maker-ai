/**
 * 批量生成选中分镜的图片
 * POST /api/panel/batch-generate
 *
 * 请求体:
 * {
 *   panel_ids: string[]  // 要生成的分镜ID列表
 *   style?: string       // 可选的风格覆盖
 * }
 *
 * 返回:
 * {
 *   success: boolean
 *   results: { panel_id: string, success: boolean, image_url?: string, error?: string }[]
 *   total: number
 *   succeeded: number
 *   failed: number
 * }
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { findBestReferenceImage } from "@/lib/character-reference";
import { callImageGenerationByType, base64ToBuffer } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { runWithConcurrencyLimit } from "@/lib/concurrency-control";

interface GenerateResult {
  panel_id: string;
  success: boolean;
  image_url?: string;
  error?: string;
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const { panel_ids, style } = body;

    if (!panel_ids || !Array.isArray(panel_ids) || panel_ids.length === 0) {
      return NextResponse.json(
        { error: "缺少 panel_ids 或格式错误" },
        { status: 400 }
      );
    }

    // 限制单次批量生成数量
    const MAX_BATCH_SIZE = 20;
    if (panel_ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `单次最多生成 ${MAX_BATCH_SIZE} 个分镜` },
        { status: 400 }
      );
    }

    // 获取所有分镜并验证权限
    const panels = await prisma.panel.findMany({
      where: { id: { in: panel_ids } },
      include: {
        project: true,
        character: {
          include: {
            expressions: {
              select: {
                expression_type: true,
                image_url: true,
              },
            },
            views: {
              select: {
                view_type: true,
                image_url: true,
              },
            },
            outfits: true,
          },
        },
        outfit: true,
        scene: true,
      },
    });

    // 验证所有分镜属于当前用户
    const unauthorizedPanels = panels.filter(
      (p) => p.project.user_id !== userId
    );
    if (unauthorizedPanels.length > 0) {
      return NextResponse.json({ error: "存在无权限的分镜" }, { status: 403 });
    }

    // 过滤出有 prompt_used 的分镜
    const panelsWithPrompt = panels.filter((p) => p.prompt_used);
    if (panelsWithPrompt.length === 0) {
      return NextResponse.json(
        { error: "选中的分镜都没有提示词，请先生成提示词" },
        { status: 400 }
      );
    }

    // 检查配额
    try {
      await assertAndIncrementUsage({
        userId,
        action: "image_generation",
        providerType: "image_generation",
        amount: panelsWithPrompt.length,
      });
    } catch (quotaError: unknown) {
      const err = quotaError as { code?: string; message?: string; limit?: number; count?: number };
      if (err?.code === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            error: err.message,
            code: "QUOTA_EXCEEDED",
            limit: err.limit,
            used: err.count,
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    // 确保 MinIO bucket 存在
    await ensureBucketExists();

    // 使用并发控制生成图片（最多3个并发）
    const results = await runWithConcurrencyLimit(
      panelsWithPrompt,
      async (panel): Promise<GenerateResult> => {
        try {
          // 构建增强提示词
          let enhancedPrompt = panel.prompt_used || "";

          // 添加角色信息
          if (panel.character) {
            const charDesc = panel.character.base_prompt || panel.character.name;
            enhancedPrompt += `, character: ${charDesc}`;

            if (panel.expression_type) {
              enhancedPrompt += `, expression: ${panel.expression_type}`;
            }

            if (panel.outfit) {
              enhancedPrompt += `, wearing: ${panel.outfit.outfit_name}`;
            }
          }

          // 添加场景信息
          if (panel.scene) {
            enhancedPrompt += `, background: ${panel.scene.name} (${panel.scene.scene_type})`;
          }

          // 收集参考图
          const referenceImages: string[] = [];

          if (panel.character) {
            const characterRef = findBestReferenceImage({
              id: panel.character.id,
              name: panel.character.name,
              reference_image: panel.character.reference_image,
              base_image_url: panel.character.base_image_url,
              expressions: panel.character.expressions,
              views: panel.character.views,
            });

            if (characterRef) {
              referenceImages.push(characterRef);
            }
          }

          if (panel.outfit?.image_url) {
            referenceImages.push(panel.outfit.image_url);
          }

          if (panel.scene?.image_url) {
            referenceImages.push(panel.scene.image_url);
          }

          // 构建完整提示词
          const stylePrompt = style || panel.project.style || "manga style";
          const fullPrompt = `${enhancedPrompt}, ${stylePrompt}, high quality, detailed`;

          console.log(`🚀 批量生成 - 分镜 ${panel.id}: ${fullPrompt.substring(0, 80)}...`);

          // 调用图片生成
          const result = await callImageGenerationByType({
            providerType: "image_generation",
            prompt: fullPrompt,
            width: 1024,
            height: 768,
            referenceImageUrls: referenceImages,
          });

          if (!result.success || !result.images || result.images.length === 0) {
            throw new Error(result.error || "图片生成失败");
          }

          // 上传到 MinIO
          const imageBuffer = base64ToBuffer(result.images[0]);
          const timestamp = Date.now();
          const objectName = `generated/${userId}/panel/${timestamp}_${panel.id}.png`;

          await minioClient.putObject(
            MINIO_BUCKET,
            objectName,
            imageBuffer,
            imageBuffer.length,
            { "Content-Type": "image/png" }
          );

          const imageUrl = getPublicUrl(objectName);

          // 更新分镜
          await prisma.panel.update({
            where: { id: panel.id },
            data: {
              generated_image: imageUrl,
            },
          });

          console.log(`✅ 分镜 ${panel.id} 生成成功`);

          return {
            panel_id: panel.id,
            success: true,
            image_url: imageUrl,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "未知错误";
          console.error(`❌ 分镜 ${panel.id} 生成失败:`, message);

          return {
            panel_id: panel.id,
            success: false,
            error: message,
          };
        }
      },
      {
        limit: 3, // 最多3个并发
      }
    );

    // 统计结果
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // 记录日志
    await recordGenerationLog({
      userId,
      action: "batch_image_generation",
      providerType: "image_generation",
      status: failed === results.length ? "failed" : "success",
      durationMs: Date.now() - startedAt,
      requestPayload: { panel_ids, style, total: panelsWithPrompt.length },
      responsePayload: JSON.parse(JSON.stringify({ succeeded, failed, results })),
    });

    return NextResponse.json({
      success: true,
      results,
      total: panelsWithPrompt.length,
      succeeded,
      failed,
      skipped: panel_ids.length - panelsWithPrompt.length,
      message: `生成完成: ${succeeded} 成功, ${failed} 失败, ${panel_ids.length - panelsWithPrompt.length} 跳过(无提示词)`,
    });
  } catch (error) {
    console.error("Batch generate error:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "batch_image_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
