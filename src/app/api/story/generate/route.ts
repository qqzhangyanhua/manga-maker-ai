import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateStoryOutline } from "@/lib/story-generator";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

export async function POST(req: Request) {
    const startedAt = Date.now();
    let userId: string | null = null;

    try {
        // Verify authentication
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
            return NextResponse.json(
                { error: "缺少创意前提 premise" },
                { status: 400 }
            );
        }

        // Check quota
        try {
            await assertAndIncrementUsage({
                userId,
                action: "story_generation",
                providerType: "story_generator",
            });
        } catch (quotaError: any) {
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
            throw quotaError;
        }

        // Generate story outline
        const outline = await generateStoryOutline({
            premise,
            genre: genre as any,
            characterCount,
            length,
            templateId,
        });

        // Save to database if requested
        if (saveToDb) {
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

            return NextResponse.json({
                success: true,
                story,
                message: `成功生成故事: ${outline.title}`,
            });
        }

        await recordGenerationLog({
            userId,
            action: "story_generation",
            providerType: "story_generator",
            status: "success",
            durationMs: Date.now() - startedAt,
            requestPayload: { premise, genre, characterCount, length, templateId },
            responsePayload: { title: outline.title },
        });

        // Return outline without saving
        return NextResponse.json({
            success: true,
            outline,
            message: `成功生成故事: ${outline.title}`,
        });
    } catch (error) {
        console.error("Story generation error:", error);
        const message = error instanceof Error ? error.message : "未知错误";

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

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
