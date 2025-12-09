import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOutfitAsync } from "@/lib/outfit-generation";
import { waitForTaskCompletion } from "@/lib/unified-image-generation";
import { recordGenerationLog } from "@/lib/generation-log";

/**
 * POST /api/character/outfits/[id]/generate
 * Generate image for an existing outfit
 */
export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const startedAt = Date.now();
    let userId: string | null = null;

    try {
        const { id: outfitId } = params;

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
        const { wait = false } = body;

        // Get outfit and verify ownership
        const outfit = await prisma.characterOutfit.findUnique({
            where: { id: outfitId },
            include: {
                character: true,
            },
        });

        if (!outfit) {
            return NextResponse.json({ error: "服装不存在" }, { status: 404 });
        }

        if (outfit.character.user_id !== userId) {
            return NextResponse.json({ error: "无权限" }, { status: 403 });
        }

        // Generate outfit image
        const characterDesc = outfit.character.description || outfit.character.name;
        const { taskId, imageUrl } = await generateOutfitAsync(
            characterDesc,
            outfit.outfit_type as any,
            userId,
            outfit.prompt_modifier || undefined,
            wait
        );

        // If wait=true and we have imageUrl, update the outfit
        if (imageUrl) {
            await prisma.characterOutfit.update({
                where: { id: outfitId },
                data: { image_url: imageUrl },
            });
        }

        await recordGenerationLog({
            userId,
            action: "outfit_generation",
            providerType: "image_generation",
            status: imageUrl ? "success" : "pending",
            durationMs: Date.now() - startedAt,
            requestPayload: { outfit_id: outfitId },
            responsePayload: { task_id: taskId },
        });

        return NextResponse.json({
            success: true,
            task_id: taskId,
            image_url: imageUrl,
            message: wait ? "服装图片生成完成" : "服装图片生成任务已提交",
        });
    } catch (error) {
        console.error("Generate outfit error:", error);
        const message = error instanceof Error ? error.message : "未知错误";

        if (userId) {
            await recordGenerationLog({
                userId,
                action: "outfit_generation",
                providerType: "image_generation",
                status: "failed",
                durationMs: Date.now() - startedAt,
                errorMessage: message,
            });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
