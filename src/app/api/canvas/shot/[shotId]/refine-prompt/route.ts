/**
 * Prompt 微调与重新生成 API
 * POST /api/canvas/shot/[shotId]/refine-prompt
 * 
 * 用户微调 Prompt 后重新生成单张图片
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { uploadToMinIO } from "@/lib/minio";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ shotId: string }>;
}

// 请求参数 Schema
const RefinePromptRequestSchema = z.object({
  refined_prompt: z.string().min(1, "Prompt 不能为空"),
  negative_prompt: z.string().optional(),
  generation_params: z
    .object({
      width: z.number().int().min(256).max(2048).optional(),
      height: z.number().int().min(256).max(2048).optional(),
      steps: z.number().int().min(1).max(100).optional(),
      cfg_scale: z.number().min(1).max(30).optional(),
      seed: z.number().int().optional(),
    })
    .optional(),
});

// 默认生成参数
const DEFAULT_PARAMS = {
  width: 1024,
  height: 768,
  steps: 30,
  cfg_scale: 7.5,
};

/**
 * 将 base64 图片上传到 MinIO
 */
async function uploadBase64Image(base64Data: string, fileName: string): Promise<string> {
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Content, "base64");
  return uploadToMinIO(buffer, fileName, "image/png");
}

/**
 * POST - 微调 Prompt 并重新生成单张图片
 */
export async function POST(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { shotId } = await params;

  try {
    const body = await req.json();

    // 验证请求参数
    const validation = RefinePromptRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "请求参数验证失败",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { refined_prompt, negative_prompt, generation_params } = validation.data;

    // 获取分镜设计信息
    const shotDesign = await prisma.shotDesign.findUnique({
      where: { id: shotId },
      include: {
        prompt_composition: true,
        script_segment: {
          include: {
            timeline_chapter: {
              include: {
                timeline: true,
              },
            },
          },
        },
      },
    });

    if (!shotDesign) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    // 验证权限
    const timeline = shotDesign.script_segment?.timeline_chapter?.timeline;
    if (!timeline || timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限访问该分镜" }, { status: 403 });
    }

    // 合并生成参数
    const finalParams = { ...DEFAULT_PARAMS, ...generation_params };
    
    // 使用提供的 seed 或生成新 seed
    const seed = generation_params?.seed || Math.floor(Date.now() / 1000) % 1000000000;

    // 获取 negative prompt
    const finalNegativePrompt =
      negative_prompt ||
      shotDesign.prompt_composition?.final_negative_prompt ||
      shotDesign.negative_prompt ||
      "";

    console.log("[RefinePrompt] 开始生成微调图片:", {
      shotId,
      promptLength: refined_prompt.length,
      params: finalParams,
      seed,
    });

    // 调用图片生成 API
    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: refined_prompt,
      negative_prompt: finalNegativePrompt,
      width: finalParams.width,
      height: finalParams.height,
      steps: finalParams.steps,
      cfg_scale: finalParams.cfg_scale,
      seed,
      options: { userId: payload.userId },
    });

    if (!result.success || result.images.length === 0) {
      console.error("[RefinePrompt] 图片生成失败:", result.error);
      return NextResponse.json(
        { error: result.error || "图片生成失败" },
        { status: 500 }
      );
    }

    // 上传图片到 MinIO
    const imageBase64 = result.images[0];
    const fileName = `refined/${shotId}/refined-${Date.now()}.png`;
    const refinedImageUrl = await uploadBase64Image(imageBase64, fileName);

    console.log("[RefinePrompt] 微调图片生成成功:", {
      shotId,
      imageUrl: refinedImageUrl,
      seed,
    });

    // 创建微调记录（可选：保存为新的 ShotPromptComposition）
    // 注意：由于 shot_design_id 是 unique，如果已存在记录则需要 upsert
    const refinedComposition = await prisma.shotPromptComposition.upsert({
      where: { shot_design_id: shotId },
      update: {
        final_prompt: refined_prompt,
        final_negative_prompt: finalNegativePrompt,
        updated_at: new Date(),
      },
      create: {
        shot_design_id: shotId,
        user_id: payload.userId,
        final_prompt: refined_prompt,
        final_negative_prompt: finalNegativePrompt,
        character_prompts: shotDesign.prompt_composition?.character_prompts || [],
        scene_prompt: shotDesign.prompt_composition?.scene_prompt || "",
        action_prompt: shotDesign.prompt_composition?.action_prompt || "",
        atmosphere_prompt: shotDesign.prompt_composition?.atmosphere_prompt || "",
        camera_prompt: shotDesign.prompt_composition?.camera_prompt || "",
      },
    });

    return NextResponse.json({
      success: true,
      refined_image_url: refinedImageUrl,
      seed,
      refined_composition_id: refinedComposition.id,
      message: "微调图片生成成功",
    });
  } catch (error) {
    console.error("[RefinePrompt] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取分镜的原始 Prompt 信息（用于微调）
 */
export async function GET(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { shotId } = await params;

  try {
    // 获取分镜的 Prompt 信息
    const shotDesign = await prisma.shotDesign.findUnique({
      where: { id: shotId },
      include: {
        prompt_composition: true,
        nine_grid: true,
        script_segment: {
          include: {
            timeline_chapter: {
              include: {
                timeline: true,
              },
            },
          },
        },
      },
    });

    if (!shotDesign) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    // 验证权限
    const timeline = shotDesign.script_segment?.timeline_chapter?.timeline;
    if (!timeline || timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限访问该分镜" }, { status: 403 });
    }

    // 获取当前使用的 Prompt
    const currentPrompt =
      shotDesign.prompt_composition?.final_prompt ||
      shotDesign.prompt ||
      "";

    const negativePrompt =
      shotDesign.prompt_composition?.final_negative_prompt ||
      shotDesign.negative_prompt ||
      "";

    // 获取九宫格中选中的图片信息
    let selectedImage = null;
    if (shotDesign.nine_grid) {
      const nineGrid = shotDesign.nine_grid;
      if (nineGrid.selected_grid_position && nineGrid.images) {
        const images = nineGrid.images as Array<{
          grid_position: number;
          image_url: string;
          seed: number;
        }>;
        selectedImage = images.find(
          (img) => img.grid_position === nineGrid.selected_grid_position
        );
      }
    }

    return NextResponse.json({
      success: true,
      prompt_info: {
        current_prompt: currentPrompt,
        negative_prompt: negativePrompt,
        shot_description: shotDesign.shot_description,
        current_image_url: shotDesign.generated_image_url,
        selected_nine_grid_image: selectedImage,
        composition_id: shotDesign.prompt_composition?.id,
      },
    });
  } catch (error) {
    console.error("[RefinePrompt] Get error:", error);
    return NextResponse.json(
      { error: "获取 Prompt 信息失败" },
      { status: 500 }
    );
  }
}
