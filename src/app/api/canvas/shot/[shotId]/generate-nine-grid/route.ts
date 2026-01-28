/**
 * 单分镜九宫格候选图生成 API
 * POST /api/canvas/shot/[shotId]/generate-nine-grid
 * 
 * 为单个分镜生成 9 张不同 seed 的候选图片
 * 使用 SSE 流式返回生成进度和结果
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { uploadToMinIO } from "@/lib/minio";
import { Prisma } from "@prisma/client";

/**
 * 将 base64 图片上传到 MinIO
 */
async function uploadBase64Image(base64Data: string, fileName: string): Promise<string> {
  // 移除 base64 前缀（如果有）
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Content, "base64");
  return uploadToMinIO(buffer, fileName, "image/png");
}

interface RouteParams {
  params: Promise<{ shotId: string }>;
}

// 请求参数类型
interface GenerateNineGridRequest {
  prompt_composition_id?: string; // 可选，如果没有则使用 shot 的 prompt
  generate_count?: number; // 生成数量，1-9，默认 9
  generation_params?: {
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
  };
}

// 默认生成参数
const DEFAULT_PARAMS = {
  width: 1024,
  height: 768,
  steps: 30,
  cfg_scale: 7.5,
};

/**
 * POST - 开始生成九宫格候选图（串行生成，SSE 流式返回）
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
    const body = (await req.json()) as GenerateNineGridRequest;
    const { prompt_composition_id, generate_count = 9, generation_params } = body;

    // 验证生成数量范围
    const validCount = Math.max(1, Math.min(9, generate_count));

    // 合并生成参数
    const finalParams = { ...DEFAULT_PARAMS, ...generation_params };

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

    // 获取 Prompt
    let finalPrompt = "";
    let finalNegativePrompt = "";

    if (prompt_composition_id) {
      // 使用指定的 Prompt 合成记录
      const composition = await prisma.shotPromptComposition.findUnique({
        where: { id: prompt_composition_id },
      });
      if (composition) {
        finalPrompt = composition.final_prompt;
        finalNegativePrompt = composition.final_negative_prompt;
      }
    } else if (shotDesign.prompt_composition) {
      // 使用已关联的 Prompt 合成记录
      finalPrompt = shotDesign.prompt_composition.final_prompt;
      finalNegativePrompt = shotDesign.prompt_composition.final_negative_prompt;
    } else if (shotDesign.prompt) {
      // 回退到分镜自身的 prompt
      finalPrompt = shotDesign.prompt;
      finalNegativePrompt = shotDesign.negative_prompt || "";
    }

    if (!finalPrompt) {
      return NextResponse.json(
        { error: "该分镜没有可用的 Prompt，请先合成 Prompt" },
        { status: 400 }
      );
    }

    // 更新分镜状态为 generating
    await prisma.shotDesign.update({
      where: { id: shotId },
      data: { nine_grid_status: "generating" },
    });

    // 生成基础 seed（使用时间戳 + 随机数）
    const baseSeed = Math.floor(Date.now() / 1000) % 1000000000;

    // 创建九宫格生成记录
    const nineGridGeneration = await prisma.nineGridGeneration.create({
      data: {
        shot_design_id: shotId,
        prompt_composition_id: shotDesign.prompt_composition_id || prompt_composition_id || shotId,
        user_id: payload.userId,
        generation_params: finalParams as unknown as Prisma.InputJsonValue,
        images: [],
        status: "generating",
      },
    });

    // 更新分镜关联
    await prisma.shotDesign.update({
      where: { id: shotId },
      data: { nine_grid_generation_id: nineGridGeneration.id },
    });

    // 使用 SSE 流式返回
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        const generatedImages: {
          grid_position: number;
          image_url: string;
          seed: number;
          generation_metadata: object;
        }[] = [];

        try {
          // 串行生成指定数量的图片
          for (let i = 1; i <= validCount; i++) {
            const seed = baseSeed + i;

            // 发送进度事件
            sendEvent("progress", {
              current: i,
              total: validCount,
              status: "generating",
            });

            try {
              // 直接调用图片生成 API（支持 seed 参数）
              const result = await callImageGenerationByType({
                providerType: "image_generation",
                prompt: finalPrompt,
                negative_prompt: finalNegativePrompt,
                width: finalParams.width,
                height: finalParams.height,
                steps: finalParams.steps,
                cfg_scale: finalParams.cfg_scale,
                seed,
                options: { userId: payload.userId },
              });

              if (result.success && result.images.length > 0) {
                // 上传图片到 MinIO
                const imageBase64 = result.images[0];
                const fileName = `nine-grid/${nineGridGeneration.id}/candidate-${i}-${Date.now()}.png`;
                const imageUrl = await uploadBase64Image(imageBase64, fileName);

                const imageData = {
                  grid_position: i,
                  image_url: imageUrl,
                  seed,
                  generation_metadata: {
                    width: finalParams.width,
                    height: finalParams.height,
                    steps: finalParams.steps,
                    cfg_scale: finalParams.cfg_scale,
                  },
                };

                generatedImages.push(imageData);

                // 发送图片事件
                sendEvent("image", {
                  grid_position: i,
                  image_url: imageUrl,
                  seed,
                });
              } else {
                throw new Error(result.error || "生成失败");
              }
            } catch (imgError) {
              // 单张图片生成失败，继续生成下一张
              console.error(`[NineGrid] Image ${i} failed:`, imgError);
              sendEvent("image_error", {
                grid_position: i,
                error: imgError instanceof Error ? imgError.message : "生成失败",
              });
            }
          }

          // 更新数据库记录
          await prisma.nineGridGeneration.update({
            where: { id: nineGridGeneration.id },
            data: {
              images: generatedImages as unknown as Prisma.InputJsonValue,
              status: generatedImages.length > 0 ? "completed" : "error",
              completed_at: new Date(),
              error_message: generatedImages.length === 0 ? "所有图片生成失败" : null,
            },
          });

          // 更新分镜状态
          await prisma.shotDesign.update({
            where: { id: shotId },
            data: {
              nine_grid_status: generatedImages.length > 0 ? "completed" : "error",
            },
          });

          // 发送完成事件
          sendEvent("completed", {
            nine_grid_generation_id: nineGridGeneration.id,
            images: generatedImages.map((img) => ({
              grid_position: img.grid_position,
              image_url: img.image_url,
              seed: img.seed,
            })),
            total_generated: generatedImages.length,
          });
        } catch (error) {
          console.error("[NineGrid] Generation error:", error);

          // 更新状态为错误
          await prisma.nineGridGeneration.update({
            where: { id: nineGridGeneration.id },
            data: {
              status: "error",
              error_message: error instanceof Error ? error.message : "未知错误",
            },
          });

          await prisma.shotDesign.update({
            where: { id: shotId },
            data: { nine_grid_status: "error" },
          });

          sendEvent("error", {
            message: error instanceof Error ? error.message : "生成失败",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[NineGrid] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取分镜的九宫格生成记录
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
    // 获取分镜的最新九宫格生成记录
    const nineGridGeneration = await prisma.nineGridGeneration.findFirst({
      where: {
        shot_design_id: shotId,
        user_id: payload.userId,
      },
      orderBy: { created_at: "desc" },
    });

    if (!nineGridGeneration) {
      return NextResponse.json({
        success: true,
        generation: null,
        message: "尚未生成九宫格",
      });
    }

    return NextResponse.json({
      success: true,
      generation: {
        ...nineGridGeneration,
        created_at: nineGridGeneration.created_at.toISOString(),
        completed_at: nineGridGeneration.completed_at?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[NineGrid] Get error:", error);
    return NextResponse.json(
      { error: "获取九宫格生成记录失败" },
      { status: 500 }
    );
  }
}
