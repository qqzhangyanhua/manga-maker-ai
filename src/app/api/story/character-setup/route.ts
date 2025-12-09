import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { generateCharacterSetup } from "@/lib/story-generator";
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
            characterDescription,
            storyContext,
        }: {
            characterDescription?: string;
            storyContext?: string;
        } = body;

        if (!characterDescription) {
            return NextResponse.json(
                { error: "缺少角色描述 characterDescription" },
                { status: 400 }
            );
        }

        // Generate character setup
        const character = await generateCharacterSetup(
            characterDescription,
            storyContext
        );

        await recordGenerationLog({
            userId,
            action: "character_setup_generation",
            providerType: "story_generator",
            status: "success",
            durationMs: Date.now() - startedAt,
            requestPayload: { characterDescription, storyContext },
            responsePayload: { characterName: character.name },
        });

        return NextResponse.json({
            success: true,
            character,
            message: `成功生成角色设定: ${character.name}`,
        });
    } catch (error) {
        console.error("Character setup generation error:", error);
        const message = error instanceof Error ? error.message : "未知错误";

        if (userId) {
            await recordGenerationLog({
                userId,
                action: "character_setup_generation",
                providerType: "story_generator",
                status: "failed",
                durationMs: Date.now() - startedAt,
                errorMessage: message,
            });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
