import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expandStoryActStream, type StoryAct, type StoryCharacter, type ExpandedScene } from "@/lib/story-generator";
import { recordGenerationLog } from "@/lib/generation-log";

interface StreamEvent {
  type: "chunk" | "scenes" | "done" | "error";
  chunk?: string;
  scenes?: ExpandedScene[];
  message?: string;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const sendEvent = (controller: ReadableStreamDefaultController, data: StreamEvent) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = Date.now();
      let userId: string | null = null;

      try {
        // Verify authentication
        const cookieStore = await cookies();
        const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

        if (!token) {
          sendEvent(controller, {
            type: "error",
            message: "未登录",
          });
          controller.close();
          return;
        }

        const payload = verifyAuthToken(token);
        if (!payload?.userId) {
          sendEvent(controller, {
            type: "error",
            message: "无效的token",
          });
          controller.close();
          return;
        }
        userId = payload.userId;

        const body = await req.json();
        const {
          storyId,
          actIndex,
          detailLevel = "detailed",
        }: {
          storyId?: string;
          actIndex?: number;
          detailLevel?: "brief" | "detailed";
        } = body;

        if (!storyId) {
          sendEvent(controller, {
            type: "error",
            message: "缺少 storyId",
          });
          controller.close();
          return;
        }

        if (actIndex === undefined || actIndex === null) {
          sendEvent(controller, {
            type: "error",
            message: "缺少 actIndex",
          });
          controller.close();
          return;
        }

        // Get story from database
        const story = await prisma.story.findUnique({
          where: { id: storyId },
          include: {
            story_characters: {
              include: {
                character: true,
              },
            },
          },
        });

        if (!story) {
          sendEvent(controller, {
            type: "error",
            message: "故事不存在",
          });
          controller.close();
          return;
        }

        if (story.user_id !== userId) {
          sendEvent(controller, {
            type: "error",
            message: "无权访问此故事",
          });
          controller.close();
          return;
        }

        const outline = story.outline as { acts?: StoryAct[] };
        const characters: StoryCharacter[] = story.story_characters.map((sc) => ({
          name: sc.character.name,
          description: sc.character.description || '',
          role: sc.role as "protagonist" | "antagonist" | "supporting",
        }));

        if (!outline.acts || !outline.acts[actIndex]) {
          sendEvent(controller, {
            type: "error",
            message: "幕次不存在",
          });
          controller.close();
          return;
        }

        const act: StoryAct = outline.acts[actIndex];

        // Expand the act with streaming
        const expandedScenes = await expandStoryActStream(
          act,
          characters,
          (chunk: string) => {
            sendEvent(controller, {
              type: "chunk",
              chunk,
            });
          },
          detailLevel,
          userId
        );

        await recordGenerationLog({
          userId,
          action: "story_expansion",
          providerType: "story_generator",
          status: "success",
          durationMs: Date.now() - startedAt,
          requestPayload: { storyId, actIndex, detailLevel },
          responsePayload: { sceneCount: expandedScenes.length },
        });

        sendEvent(controller, {
          type: "scenes",
          scenes: expandedScenes,
        });

        sendEvent(controller, {
          type: "done",
          message: `成功扩展第${actIndex + 1}幕,共${expandedScenes.length}个场景`,
        });

        controller.close();
      } catch (error) {
        console.error("Story expansion error:", error);
        const message = error instanceof Error ? error.message : "未知错误";

        if (userId) {
          await recordGenerationLog({
            userId,
            action: "story_expansion",
            providerType: "story_generator",
            status: "failed",
            durationMs: Date.now() - startedAt,
            errorMessage: message,
          });
        }

        sendEvent(controller, {
          type: "error",
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
      "X-Accel-Buffering": "no",
    },
  });
}
