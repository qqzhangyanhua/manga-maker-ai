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
import { getCanvasShotForUser, updateShotPipeline } from "@/lib/canvas";
import { canvasErrorResponse } from "@/lib/canvas/route-error";

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

    // 获取分镜信息并验证权限
    const { panel, shot } = await getCanvasShotForUser(prisma, shotId, payload.userId);
    const panelId = panel.id;

    // 获取 Prompt：指定的合成记录（须属于该分镜）> 分镜的合成记录 > 分镜自身的 prompt
    let composition = prompt_composition_id
      ? await prisma.shotPromptComposition.findFirst({ where: { id: prompt_composition_id, panel_id: panelId } })
      : null;
    if (!composition) {
      composition = await prisma.shotPromptComposition.findUnique({ where: { panel_id: panelId } });
    }

    const finalPrompt = composition?.final_prompt || shot.prompt;
    const finalNegativePrompt = composition?.final_prompt
      ? composition.final_negative_prompt
      : shot.negative_prompt || "";

    if (!finalPrompt) {
      return NextResponse.json(
        { error: "该分镜没有可用的 Prompt，请先合成 Prompt" },
        { status: 400 }
      );
    }

    // 九宫格记录必须关联合成记录：还没合成过的，用分镜自身的 prompt 建一条
    if (!composition) {
      composition = await prisma.shotPromptComposition.create({
        data: {
          panel_id: panelId,
          user_id: payload.userId,
          scene_prompt: "",
          action_prompt: "",
          atmosphere_prompt: "",
          camera_prompt: "",
          final_prompt: finalPrompt,
          final_negative_prompt: finalNegativePrompt,
        },
      });
    }

    // 生成基础 seed（使用时间戳 + 随机数）
    const baseSeed = Math.floor(Date.now() / 1000) % 1000000000;

    // 创建九宫格生成记录
    const nineGridGeneration = await prisma.nineGridGeneration.create({
      data: {
        panel_id: panelId,
        prompt_composition_id: composition.id,
        user_id: payload.userId,
        generation_params: finalParams as unknown as Prisma.InputJsonValue,
        images: [],
        status: "generating",
      },
    });

    // 更新分镜状态与关联
    await updateShotPipeline(prisma, panelId, {
      nine_grid_status: "generating",
      nine_grid_generation_id: nineGridGeneration.id,
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
          await updateShotPipeline(prisma, panelId, {
            nine_grid_status: generatedImages.length > 0 ? "completed" : "error",
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

          await updateShotPipeline(prisma, panelId, { nine_grid_status: "error" });

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
    return canvasErrorResponse(error, "生成失败");
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
    const { panel } = await getCanvasShotForUser(prisma, shotId, payload.userId);
    const nineGridGeneration = await prisma.nineGridGeneration.findFirst({
      where: { panel_id: panel.id },
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
    return canvasErrorResponse(error, "获取九宫格生成记录失败");
  }
}
