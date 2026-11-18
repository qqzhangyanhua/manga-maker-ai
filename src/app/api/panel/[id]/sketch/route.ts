import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { callImageGenerationByType, base64ToBuffer } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { findBestReferenceImage } from "@/lib/character-reference";

/**
 * POST /api/panel/[id]/sketch - 为分镜生成草图预览
 * 草图特点：
 * - 黑白线稿风格
 * - 较小尺寸 (512x512) 以提高生成速度
 * - 支持锁脸角色参考图，保持角色一致性
 * - 存储到 sketch_image_url 字段
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let usageSnapshot: { count: number; limit: number } | null = null;

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

    // 解析请求体，获取可选的 character_id
    let requestCharacterId: string | undefined;
    try {
      const body = await req.json();
      requestCharacterId = body.character_id;
    } catch {
      // 没有请求体或解析失败，继续使用默认值
    }

    // 获取分镜并验证权限，包含角色关联信息
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
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
          },
        },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 请求体指定的角色必须来自当前用户的角色库，在扣配额之前校验
    const requestedCharacter =
      requestCharacterId && requestCharacterId !== panel.character_id
        ? await prisma.character.findFirst({
            where: { id: requestCharacterId, user_id: payload.userId },
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
            },
          })
        : null;

    if (requestCharacterId && requestCharacterId !== panel.character_id && !requestedCharacter) {
      return NextResponse.json(
        { error: "角色不存在或不属于当前用户", code: "INVALID_CHARACTER" },
        { status: 400 }
      );
    }

    // 检查是否有描述可用于生成草图
    const description = panel.visual_prompt || panel.description;
    if (!description) {
      return NextResponse.json(
        { error: "分镜缺少描述，无法生成草图" },
        { status: 400 }
      );
    }

    // 检查配额
    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "sketch_generation",
        providerType: "image_generation",
        amount: 1,
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

    // 处理角色参考图
    // 优先级：请求体中的 character_id > Panel 关联的 character_id
    const referenceImages: string[] = [];
    let characterName: string | undefined;

    // 确定使用哪个角色ID
    const effectiveCharacterId = requestCharacterId || panel.character_id;

    if (effectiveCharacterId) {
      // 如果请求体传了 character_id，使用上面已校验过的角色
      if (requestCharacterId && requestCharacterId !== panel.character_id) {
        if (requestedCharacter) {
          const refImage = findBestReferenceImage({
            id: requestedCharacter.id,
            name: requestedCharacter.name,
            reference_image: requestedCharacter.reference_image,
            base_image_url: requestedCharacter.base_image_url,
            expressions: requestedCharacter.expressions,
            views: requestedCharacter.views,
          });
          if (refImage) {
            referenceImages.push(refImage);
            characterName = requestedCharacter.name;
          }
        }
      } else if (panel.character) {
        // 使用 Panel 关联的角色
        const refImage = findBestReferenceImage({
          id: panel.character.id,
          name: panel.character.name,
          reference_image: panel.character.reference_image,
          base_image_url: panel.character.base_image_url,
          expressions: panel.character.expressions,
          views: panel.character.views,
        });
        if (refImage) {
          referenceImages.push(refImage);
          characterName = panel.character.name;
        }
      }
    }

    // 构建草图提示词
    const sketchPrompt = buildSketchPrompt(
      description,
      panel.camera_angle,
      panel.shot_size,
      characterName
    );

    console.log(`\n========== 草图生成 ==========`);
    console.log(`Panel ID: ${panelId}`);
    console.log(`原始描述: ${description.substring(0, 100)}...`);
    console.log(`锁脸角色: ${characterName || '无'}`);
    console.log(`参考图数量: ${referenceImages.length}`);
    if (referenceImages.length > 0) {
      referenceImages.forEach((url, i) => console.log(`  参考图 ${i + 1}: ${url.substring(0, 80)}...`));
    }
    console.log(`草图提示词: ${sketchPrompt.substring(0, 150)}...`);
    console.log(`==============================\n`);

    // 调用图片生成
    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: sketchPrompt,
      negative_prompt: "color, colorful, colored, realistic photo, photograph, 3d render, detailed shading, complex background",
      width: 512,
      height: 512,
      steps: 15, // 较少步数，快速生成
      cfg_scale: 6, // 较低的CFG，更自由的风格
      referenceImageUrls: referenceImages.length > 0 ? referenceImages : undefined,
    });

    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || "草图生成失败");
    }

    // 上传到 MinIO
    await ensureBucketExists();

    const imageBuffer = base64ToBuffer(result.images[0]);
    const timestamp = Date.now();
    const objectName = `sketches/${userId}/panel/${timestamp}_${panelId}.png`;

    console.log(`上传草图到 MinIO: ${objectName}`);

    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      imageBuffer,
      imageBuffer.length,
      { "Content-Type": "image/png" }
    );

    const sketchUrl = getPublicUrl(objectName);

    // 更新分镜的草图URL
    await prisma.panel.update({
      where: { id: panelId },
      data: {
        sketch_image_url: sketchUrl,
      },
    });

    console.log(`草图生成成功: ${sketchUrl}`);

    // 记录生成日志
    await recordGenerationLog({
      userId,
      action: "sketch_generation",
      providerType: "image_generation",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: {
        panel_id: panelId,
        description,
        character_id: effectiveCharacterId,
        reference_images_count: referenceImages.length,
      },
      responsePayload: { sketch_url: sketchUrl },
    });

    return NextResponse.json({
      success: true,
      sketch_url: sketchUrl,
      usage: usageSnapshot,
      message: "草图生成成功",
    });
  } catch (error) {
    console.error("Sketch generation error:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "sketch_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 构建草图提示词
 * 将分镜描述转换为适合生成黑白草图的提示词
 * 如果有锁脸角色，添加角色一致性指令
 */
function buildSketchPrompt(
  description: string,
  cameraAngle: string | null,
  shotSize: string | null,
  characterName?: string
): string {
  // 草图风格基础词
  const sketchStyle = [
    "pencil sketch",
    "rough draft",
    "line art",
    "black and white",
    "manga storyboard sketch",
    "simple linework",
    "sketch style",
    "monochrome",
  ].join(", ");

  // 镜头角度映射
  const angleMap: Record<string, string> = {
    "俯视": "top-down view, bird's eye view",
    "仰视": "low angle shot, looking up",
    "平视": "eye level shot",
    "荷兰角": "dutch angle, tilted frame",
  };

  // 景别映射
  const sizeMap: Record<string, string> = {
    "特写": "extreme close-up, face detail",
    "近景": "close-up shot",
    "中景": "medium shot, waist up",
    "全景": "full shot, full body",
    "远景": "wide shot, establishing shot",
  };

  // 构建提示词
  const parts: string[] = [];

  // 如果有锁脸角色，添加角色一致性指令
  if (characterName) {
    parts.push(
      `IMPORTANT: Draw the EXACT SAME character as shown in the reference image.`,
      `Keep the character's face, features, and style consistent.`,
      `Character: ${characterName}.`
    );
  }

  // 添加草图风格
  parts.push(sketchStyle);

  // 添加镜头信息
  if (cameraAngle && angleMap[cameraAngle]) {
    parts.push(angleMap[cameraAngle]);
  }
  if (shotSize && sizeMap[shotSize]) {
    parts.push(sizeMap[shotSize]);
  }

  // 添加简化的描述
  parts.push(description);

  // 添加质量词
  parts.push("clean lines, professional storyboard");

  return parts.join(", ");
}

/**
 * DELETE /api/panel/[id]/sketch - 删除分镜的草图
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: panelId } = await params;

    // 获取分镜并验证权限
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        project: true,
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 清除草图URL
    await prisma.panel.update({
      where: { id: panelId },
      data: {
        sketch_image_url: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "草图已删除",
    });
  } catch (error) {
    console.error("Delete sketch error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
