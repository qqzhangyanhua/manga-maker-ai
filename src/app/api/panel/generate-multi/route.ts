/**
 * 多镜生成 API - 一次性生成包含多个分镜的多格图片
 */

import { NextRequest, NextResponse } from "next/server";
import { withCreditFreeze } from "@/lib/api-helpers";
import { estimateImageCost } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { recordGenerationLog } from "@/lib/generation-log";
import { buildMultiPanelPrompt, getImageDimensions } from "./prompt";

interface RequestBody {
  panel_ids: string[];
  reference_image_urls?: string[];
  style?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  const { panel_ids, reference_image_urls = [], style } = body;

  if (!panel_ids || !Array.isArray(panel_ids) || panel_ids.length < 2 || panel_ids.length > 6) {
    return NextResponse.json(
      { error: "panel_ids 必须是包含 2-6 个元素的数组" },
      { status: 400 }
    );
  }

  return withCreditFreeze(
    async ({ userId, freezeId }) => {
      const startedAt = Date.now();

      try {
        // 查询分镜数据（包含章节信息）
        const panels = await prisma.panel.findMany({
          where: {
            id: { in: panel_ids },
          },
          orderBy: {
            panel_order: "asc",
          },
          include: {
            project: true,
            chapter: {
              select: {
                id: true,
                title: true,
                chapter_order: true,
              },
            },
          },
        });

        if (panels.length !== panel_ids.length) {
          throw new Error("部分分镜不存在");
        }

        // 验证分镜所属项目是否属于同一个项目
        const projectIds = [...new Set(panels.map((p) => p.project_id))];
        if (projectIds.length !== 1) {
          throw new Error("选中的分镜必须属于同一个项目");
        }

        const project = panels[0].project;
        if (project.user_id !== userId) {
          throw new Error("无权操作此项目");
        }

        // 获取图片尺寸
        const dimensions = getImageDimensions(panels.length);

        // 构建多格提示词（返回正向和负向提示词）
        const { positive: multiPrompt, negative: negativePrompt } = buildMultiPanelPrompt(panels, {
          style,
          referenceImageCount: reference_image_urls.length,
        });

        console.log(`[MultiPanelGenerate] 生成 ${panels.length} 格图片:`, {
          dimensions: `${dimensions.width}x${dimensions.height}`,
          positive: multiPrompt.substring(0, 150) + "...",
          negative: negativePrompt,
          referenceImageCount: reference_image_urls.length,
        });

        // 调用图像生成 API
        const { callImageGenerationByType } = await import("@/lib/image-generation");

        const result = await callImageGenerationByType({
          providerType: "image_generation",
          prompt: multiPrompt,
          negative_prompt: negativePrompt,
          width: dimensions.width,
          height: dimensions.height,
          referenceImageUrls: reference_image_urls,
          options: { userId },
        });

        console.log(`[MultiPanelGenerate] 图片生成结果:`, {
          success: result.success,
          images: result.images?.length
        });

        if (!result.success || !result.images || result.images.length === 0) {
          throw new Error(result.error || "图片生成失败");
        }

        // 上传到 MinIO
        const { base64ToBuffer } = await import("@/lib/image-generation");
        const { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } = await import("@/lib/minio");

        await ensureBucketExists();

        // 转换 base64 为 Buffer
        const imageBuffer = base64ToBuffer(result.images[0]);

        // 生成对象名
        const timestamp = Date.now();
        const objectName = `generated/${userId}/multi-panel/${timestamp}_${panels.length}panels.png`;

        console.log(`[MultiPanelGenerate] 上传图片到 MinIO: ${objectName}`);

        // 上传到 MinIO
        await minioClient.putObject(
          MINIO_BUCKET,
          objectName,
          imageBuffer,
          imageBuffer.length,
          {
            "Content-Type": "image/png",
          }
        );

        const imageUrl = getPublicUrl(objectName);
        console.log(`[MultiPanelGenerate] 图片上传成功: ${imageUrl}`);

        // 获取章节信息（从第一个分镜）
        const chapterId = panels[0].chapter_id || null;
        const chapterInfo = panels[0].chapter;

        console.log(`[MultiPanelGenerate] 章节信息:`, {
          chapterId,
          chapterTitle: chapterInfo?.title,
          chapterOrder: chapterInfo?.chapter_order,
        });

        // 保存到 GeneratedImage 表
        await prisma.generatedImage.create({
          data: {
            user_id: userId,
            image_url: imageUrl,
            prompt: multiPrompt,
            source_type: "panel",
            source_id: project.id,
            style: `multi-panel-${panels.length}`,
            // @ts-ignore: Prisma client type update might be delayed
            chapter_id: chapterId,
            panel_ids: panel_ids,
          },
        });

        console.log(`[MultiPanelGenerate] 已保存图片记录，包含章节 ID: ${chapterId}`);

        // 记录生成日志
        await recordGenerationLog({
          userId,
          action: "multi_panel_generation",
          providerType: "image_generation",
          status: "success",
          durationMs: Date.now() - startedAt,
          requestPayload: {
            panel_ids,
            layout: `${panels.length}格（AI自动布局）`,
            prompt: multiPrompt,
            reference_image_count: reference_image_urls.length,
          },
          responsePayload: {
            imageUrl,
            panelCount: panels.length,
          },
        });

        return {
          image_url: imageUrl,
          layout: `${panels.length}格（AI自动布局）`,
          panel_count: panels.length,
        };
      } catch (genError) {
        console.error("[MultiPanelGenerate] 生成失败:", genError);

        // 记录失败日志
        await recordGenerationLog({
          userId,
          action: "multi_panel_generation",
          providerType: "image_generation",
          status: "failed",
          durationMs: Date.now() - startedAt,
          requestPayload: {
            panel_ids,
            layout: `${panel_ids.length}格（AI自动布局）`,
            reference_image_count: reference_image_urls.length,
          },
          responsePayload: {
            error: genError instanceof Error ? genError.message : "未知错误",
          },
        });

        throw genError;
      }
    },
    {
      estimateCost: () => estimateImageCost('standard'),
      taskId: `multi-${panel_ids.join('-').substring(0, 50)}`,
      description: `多格生成 (${panel_ids.length}格)`,
    }
  );
}
