import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expandStoryAct, type StoryAct, type StoryCharacter } from "@/lib/story-generator";
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
            storyId,
            actIndex,
            detailLevel = "detailed",
        }: {
            storyId?: string;
            actIndex?: number;
            detailLevel?: "brief" | "detailed";
        } = body;

        if (!storyId) {
            return NextResponse.json({ error: "缺少 storyId" }, { status: 400 });
        }

        if (actIndex === undefined || actIndex === null) {
            return NextResponse.json({ error: "缺少 actIndex" }, { status: 400 });
        }

        // Get story from database
        const story = await prisma.story.findUnique({
            where: { id: storyId },
        });

        if (!story) {
            return NextResponse.json({ error: "故事不存在" }, { status: 404 });
        }

        if (story.user_id !== userId) {
            return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
        }

        const outline = story.outline as any;
        const characters = story.characters as any;

        if (!outline.acts || !outline.acts[actIndex]) {
            return NextResponse.json({ error: "幕次不存在" }, { status: 400 });
        }

        const act: StoryAct = outline.acts[actIndex];

        // Expand the act
        const expandedScenes = await expandStoryAct(
            act,
            characters as StoryCharacter[],
            detailLevel
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

        return NextResponse.json({
            success: true,
            expandedScenes,
            message: `成功扩展第${actIndex + 1}幕,共${expandedScenes.length}个场景`,
        });
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

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
