import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { createWorkflow, type WorkflowConfig } from "@/lib/workflow-engine";
import { QuotaExceededError, assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

/**
 * POST /api/workflow/auto-generate
 * One-click generation of complete comic from premise
 */
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
            storyLength = "medium",
            templateId,
            panelCount,
            style,
            generateImages = true,
            exportFormat,
        }: WorkflowConfig & { generateImages?: boolean } = body;

        if (!premise) {
            return NextResponse.json(
                { error: "缺少创意前提 premise" },
                { status: 400 }
            );
        }

        // Check quota (estimate: story + storyboard + images)
        const estimatedUsage = 1 + 1 + (generateImages ? (panelCount || 6) : 0);

        try {
            await assertAndIncrementUsage({
                userId,
                action: "workflow_generation",
                providerType: "workflow",
                amount: estimatedUsage,
            });
        } catch (quotaError) {
            if (quotaError instanceof QuotaExceededError) {
                return NextResponse.json(
                    {
                        error: quotaError.message,
                        code: quotaError.code,
                        limit: quotaError.limit,
                        used: quotaError.count,
                    },
                    { status: 429 }
                );
            }
            throw quotaError;
        }

        // Create and start workflow
        const config: WorkflowConfig = {
            premise,
            genre,
            characterCount,
            storyLength,
            templateId,
            panelCount,
            style,
            generateImages,
            exportFormat,
        };

        const { workflowId, result } = await createWorkflow(userId, config);

        await recordGenerationLog({
            userId,
            action: "workflow_generation",
            providerType: "workflow",
            status: result ? "success" : "pending",
            durationMs: Date.now() - startedAt,
            requestPayload: config,
            responsePayload: { workflow_id: workflowId, ...result },
        });

        return NextResponse.json({
            success: true,
            workflow_id: workflowId,
            result,
            message: result
                ? "漫画生成完成"
                : "工作流已启动,请使用workflow_id查询进度",
        });
    } catch (error) {
        console.error("Auto-generate workflow error:", error);
        const message = error instanceof Error ? error.message : "未知错误";

        if (userId) {
            await recordGenerationLog({
                userId,
                action: "workflow_generation",
                providerType: "workflow",
                status: "failed",
                durationMs: Date.now() - startedAt,
                errorMessage: message,
            });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
