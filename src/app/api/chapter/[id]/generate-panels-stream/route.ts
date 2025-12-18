import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePanelsFromChapterStream } from "@/lib/panel-generator";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { parseIncrementalPanels, type ParsedPanel } from "@/lib/incremental-json-parser";

interface ProgressEvent {
  stage: "validating" | "generating" | "saving" | "done" | "error";
  current: number;
  total: number;
  message: string;
  llmChunk?: string; // LLM 实时生成的文本片段
  newPanel?: ParsedPanel; // 新解析出的完整 panel 对象
}

/**
 * POST /api/chapter/[id]/generate-panels-stream
 * AI为章节生成分镜脚本（流式SSE版本）
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const encoder = new TextEncoder();

  // 辅助函数：发送 SSE 事件
  const sendEvent = (controller: ReadableStreamDefaultController, data: ProgressEvent) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = Date.now();
      let userId: string | null = null;
      let chapterId: string | null = null;
      let projectId: string | null = null;

      try {
        // 阶段 1: 验证权限
        sendEvent(controller, {
          stage: "validating",
          current: 1,
          total: 4,
          message: "正在验证权限...",
        });

        const cookieStore = await cookies();
        const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

        if (!token) {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "未登录",
          });
          controller.close();
          return;
        }

        const payload = verifyAuthToken(token);
        if (!payload?.userId) {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "无效的token",
          });
          controller.close();
          return;
        }
        userId = payload.userId;

        const { id } = await context.params;
        chapterId = id;

        const body = await request.json();
        const { project_id, panel_count, overwrite = false } = body;
        projectId = project_id;

        if (!project_id || typeof project_id !== "string") {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "缺少必需的 project_id 参数",
          });
          controller.close();
          return;
        }

        // 获取章节及其关联的故事
        const chapter = await prisma.chapter.findUnique({
          where: { id: chapterId },
          include: {
            story: {
              select: {
                user_id: true,
                title: true,
                genre: true,
              },
            },
          },
        });

        if (!chapter) {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "章节不存在",
          });
          controller.close();
          return;
        }

        // 验证所有权
        if (chapter.story.user_id !== userId) {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "无权访问此章节",
          });
          controller.close();
          return;
        }

        // 验证项目所有权
        const project = await prisma.project.findUnique({
          where: { id: project_id },
          select: { user_id: true, story_id: true },
        });

        if (!project) {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "项目不存在",
          });
          controller.close();
          return;
        }

        if (project.user_id !== userId) {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "无权访问此项目",
          });
          controller.close();
          return;
        }

        // 验证项目是否关联到同一个故事
        if (project.story_id !== chapter.story_id) {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "项目和章节不属于同一个故事",
          });
          controller.close();
          return;
        }

        // 检查章节是否有梗概
        if (!chapter.summary) {
          sendEvent(controller, {
            stage: "error",
            current: 0,
            total: 0,
            message: "章节缺少梗概，无法生成分镜",
          });
          controller.close();
          return;
        }

        // 阶段 2: 检查配额
        sendEvent(controller, {
          stage: "validating",
          current: 2,
          total: 4,
          message: "正在检查使用配额...",
        });

        try {
          await assertAndIncrementUsage({
            userId,
            action: "panel_generation",
            providerType: "script_analyzer",
          });
        } catch (quotaError: unknown) {
          const error = quotaError as {
            code?: string;
            message?: string;
            limit?: number;
            count?: number;
          };
          if (error?.code === "QUOTA_EXCEEDED") {
            sendEvent(controller, {
              stage: "error",
              current: 0,
              total: 0,
              message: error.message || "配额已用完",
            });
            controller.close();
            return;
          }
          throw quotaError;
        }

        // 阶段 3: 生成分镜脚本（使用流式调用+增量解析）
        sendEvent(controller, {
          stage: "generating",
          current: 3,
          total: 4,
          message: `AI 正在为《${chapter.title}》生成分镜脚本...`,
        });

        let accumulatedContent = "";
        let lastParsedIndex = 0;
        let parsedPanelCount = 0;

        const generatedPanels = await generatePanelsFromChapterStream(
          {
            chapterTitle: chapter.title,
            chapterSummary: chapter.summary,
            storyTitle: chapter.story.title,
            genre: chapter.story.genre,
            panelCount: panel_count,
          },
          (chunk) => {
            // 累积内容
            accumulatedContent += chunk;

            // 尝试增量解析
            const parseResult = parseIncrementalPanels(
              accumulatedContent,
              lastParsedIndex
            );

            // 如果有新解析出的 panel，推送给前端
            if (parseResult.panels.length > 0) {
              for (const panel of parseResult.panels) {
                parsedPanelCount++;

                sendEvent(controller, {
                  stage: "generating",
                  current: 3,
                  total: 4,
                  message: `已生成 ${parsedPanelCount} 个分镜...`,
                  newPanel: panel,
                });
              }

              // 更新解析位置
              lastParsedIndex = parseResult.lastIndex;
            }

            // 推送文本片段（用于 LLM 预览）
            sendEvent(controller, {
              stage: "generating",
              current: 3,
              total: 4,
              message: `AI 正在生成中...`,
              llmChunk: chunk,
            });
          },
          userId
        );

        // 阶段 4: 保存到数据库
        sendEvent(controller, {
          stage: "saving",
          current: 4,
          total: 4,
          message: `正在保存 ${generatedPanels.length} 个分镜到数据库...`,
        });

        // 如果需要覆盖，先删除旧分镜
        if (overwrite) {
          await prisma.panel.deleteMany({
            where: {
              project_id,
              chapter_id: chapterId,
            },
          });
        }

        // 扩写模式：获取当前章节已有分镜的最大 panel_order
        let panelOrderOffset = 0;
        if (!overwrite) {
          const existingPanels = await prisma.panel.findMany({
            where: {
              project_id,
              chapter_id: chapterId,
            },
            select: { panel_order: true },
            orderBy: { panel_order: "desc" },
            take: 1,
          });

          if (existingPanels.length > 0) {
            panelOrderOffset = existingPanels[0].panel_order;
          }
        }

        // 批量创建分镜
        const panels = await prisma.$transaction(
          generatedPanels.map((panel) =>
            prisma.panel.create({
              data: {
                project_id,
                chapter_id: chapterId,
                panel_order: panel.panel_order + panelOrderOffset,
                description: panel.description,
                visual_prompt: panel.visual_prompt,
                dialogue: panel.dialogue || null,
                panel_type: panel.panel_type,
                importance: panel.importance,
                camera_angle: panel.camera_angle || null,
                shot_size: panel.shot_size || null,
                camera_movement: panel.camera_movement || null,
                movement_speed: panel.movement_speed || null,
                movement_direction: panel.movement_direction || null,
              },
            })
          )
        );

        // 记录生成日志
        await recordGenerationLog({
          userId,
          projectId: project_id,
          action: "panel_generation",
          providerType: "script_analyzer",
          status: "success",
          durationMs: Date.now() - startedAt,
          requestPayload: {
            chapter_id: chapterId,
            project_id,
            panel_count,
            overwrite,
          },
          responsePayload: {
            panels_generated: panels.length,
            panel_ids: panels.map((p) => p.id),
          },
        });

        // 完成
        sendEvent(controller, {
          stage: "done",
          current: 4,
          total: 4,
          message: `成功生成 ${panels.length} 个分镜！`,
        });

        controller.close();
      } catch (error) {
        console.error("流式分镜生成失败:", error);
        const message = error instanceof Error ? error.message : "未知错误";

        if (userId) {
          await recordGenerationLog({
            userId,
            projectId: projectId || undefined,
            action: "panel_generation",
            providerType: "script_analyzer",
            status: "failed",
            durationMs: Date.now() - startedAt,
            errorMessage: message,
          });
        }

        sendEvent(controller, {
          stage: "error",
          current: 0,
          total: 0,
          message,
        });

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 禁用 nginx 缓冲
    },
  });
}
