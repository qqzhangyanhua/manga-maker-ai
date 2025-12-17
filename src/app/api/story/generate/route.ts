import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateStoryOutlineStream } from "@/lib/story-generator";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { logInfo, logError } from "@/lib/api-logger";

interface StreamEvent {
    type: "validating" | "generating" | "saving" | "done" | "error" | "chunk";
    message: string;
    chunk?: string;
    outline?: any;
    story?: any;
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
                logInfo("Story generation request received", { endpoint: "/api/story/generate", method: "POST" });

                // Verify authentication
                sendEvent(controller, {
                    type: "validating",
                    message: "正在验证权限...",
                });

                const cookieStore = await cookies();
                const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

                if (!token) {
                    logInfo("Authentication failed: no token", { endpoint: "/api/story/generate" });
                    sendEvent(controller, {
                        type: "error",
                        message: "未登录",
                    });
                    controller.close();
                    return;
                }

                const payload = verifyAuthToken(token);
                if (!payload?.userId) {
                    logInfo("Authentication failed: invalid token", { endpoint: "/api/story/generate" });
                    sendEvent(controller, {
                        type: "error",
                        message: "无效的token",
                    });
                    controller.close();
                    return;
                }
                userId = payload.userId;
                logInfo("User authenticated", { endpoint: "/api/story/generate", userId });

                const body = await req.json();
                const {
                    premise,
                    genre,
                    characterCount,
                    length,
                    templateId,
                    saveToDb = true,
                }: {
                    premise?: string;
                    genre?: string;
                    characterCount?: number;
                    length?: "short" | "medium" | "long";
                    templateId?: string;
                    saveToDb?: boolean;
                } = body;

                if (!premise || typeof premise !== "string") {
                    logInfo("Validation failed: missing premise", { endpoint: "/api/story/generate", userId });
                    sendEvent(controller, {
                        type: "error",
                        message: "缺少创意前提 premise",
                    });
                    controller.close();
                    return;
                }

                logInfo("Request validated", { endpoint: "/api/story/generate", userId, genre, length });

                // Check quota
                sendEvent(controller, {
                    type: "validating",
                    message: "正在检查使用配额...",
                });

                try {
                    await assertAndIncrementUsage({
                        userId,
                        action: "story_generation",
                        providerType: "story_generator",
                    });
                    logInfo("Quota check passed", { endpoint: "/api/story/generate", userId });
                } catch (quotaError: any) {
                    if (quotaError?.code === "QUOTA_EXCEEDED") {
                        logInfo("Quota exceeded", {
                            endpoint: "/api/story/generate",
                            userId,
                            limit: quotaError.limit,
                            used: quotaError.count
                        });
                        sendEvent(controller, {
                            type: "error",
                            message: quotaError.message || "配额已用完",
                        });
                        controller.close();
                        return;
                    }
                    throw quotaError;
                }

                // Generate story outline with streaming
                sendEvent(controller, {
                    type: "generating",
                    message: "AI 正在创作故事大纲...",
                });

                logInfo("Starting story generation", { endpoint: "/api/story/generate", userId, templateId });

                let accumulatedChunks = "";
                const outline = await generateStoryOutlineStream(
                    {
                        premise,
                        genre: genre as any,
                        characterCount,
                        length,
                        templateId,
                    },
                    (chunk) => {
                        accumulatedChunks += chunk;
                        sendEvent(controller, {
                            type: "chunk",
                            message: "AI 正在生成中...",
                            chunk,
                        });
                    },
                    userId
                );

                logInfo("Story generation completed", {
                    endpoint: "/api/story/generate",
                    userId,
                    title: outline.title,
                    durationMs: Date.now() - startedAt
                });

                // Save to database if requested
                if (saveToDb) {
                    sendEvent(controller, {
                        type: "saving",
                        message: "正在保存到数据库...",
                    });

                    logInfo("Saving story to database", { endpoint: "/api/story/generate", userId });
                    const story = await prisma.story.create({
                        data: {
                            user_id: userId,
                            title: outline.title,
                            premise,
                            genre: outline.genre,
                            outline: outline as any,
                            characters: outline.characters as any,
                            template_id: templateId || null,
                            status: "draft",
                        },
                    });

                    await recordGenerationLog({
                        userId,
                        action: "story_generation",
                        providerType: "story_generator",
                        status: "success",
                        durationMs: Date.now() - startedAt,
                        requestPayload: { premise, genre, characterCount, length, templateId },
                        responsePayload: { story_id: story.id, title: outline.title },
                    });

                    logInfo("Story saved successfully", {
                        endpoint: "/api/story/generate",
                        userId,
                        storyId: story.id,
                        totalDurationMs: Date.now() - startedAt
                    });

                    sendEvent(controller, {
                        type: "done",
                        message: `成功生成故事: ${outline.title}`,
                        story,
                    });
                } else {
                    await recordGenerationLog({
                        userId,
                        action: "story_generation",
                        providerType: "story_generator",
                        status: "success",
                        durationMs: Date.now() - startedAt,
                        requestPayload: { premise, genre, characterCount, length, templateId },
                        responsePayload: { title: outline.title },
                    });

                    sendEvent(controller, {
                        type: "done",
                        message: `成功生成故事: ${outline.title}`,
                        outline,
                    });
                }

                controller.close();
            } catch (error) {
                const message = error instanceof Error ? error.message : "未知错误";
                logError("Story generation failed", error, {
                    endpoint: "/api/story/generate",
                    userId: userId || "unknown",
                    durationMs: Date.now() - startedAt
                });

                if (userId) {
                    await recordGenerationLog({
                        userId,
                        action: "story_generation",
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
