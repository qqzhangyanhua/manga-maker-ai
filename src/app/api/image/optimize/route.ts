import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { assertAndIncrementUsage } from "@/lib/usage";
import { generateImage } from "@/lib/unified-image-generation";
import { recordGenerationLog } from "@/lib/generation-log";
import { prisma } from "@/lib/db";

const payloadSchema = z.object({
  prompt: z.string().min(10, "请提供至少 10 个字描述希望优化的方向"),
  style: z.string().optional(),
  mode: z.enum(["enhance", "lighting", "color", "cleanup"]).default("enhance"),
  strength: z.number().min(10).max(100).default(60),
  imageUrl: z.string().min(1).optional(),
  projectId: z.string().uuid().optional(),
  versionId: z.string().optional(),
  width: z.number().min(512).max(2048).optional(),
  height: z.number().min(512).max(2048).optional(),
  canvasSchema: z.record(z.any()).optional(),
});

const buildOptimizePrompt = (payload: z.infer<typeof payloadSchema>) => {
  const segments = [
    payload.prompt.trim(),
    payload.style ? `目标风格：${payload.style}` : null,
    payload.mode ? `优化模式：${payload.mode}` : null,
    `优化强度：${payload.strength}%`,
    payload.imageUrl ? `请保持角色与构图参考原图：${payload.imageUrl}` : null,
  ];

  return segments.filter(Boolean).join("。");
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const authPayload = verifyAuthToken(token);
    if (!authPayload?.userId) {
      return NextResponse.json({ error: "无效的用户凭据" }, { status: 401 });
    }

    const json = await req.json();
    const payload = payloadSchema.parse(json);
    const { prompt, style, mode, strength, imageUrl, projectId, versionId, width, height, canvasSchema } = payload;

    // 每次优化计入图片配额
    await assertAndIncrementUsage({
      userId: authPayload.userId,
      action: "image_generation",
      providerType: "image_generation",
    });

    const generatedPrompt = buildOptimizePrompt(payload);
    const startedAt = Date.now();

    const { taskId, status } = await generateImage("page", generatedPrompt, authPayload.userId, {
      style,
      width,
      height,
        metadata: {
        mode,
        strength,
        sourceImage: imageUrl,
        basePrompt: prompt,
        versionId,
        projectId,
        action: "image_optimization",
        layoutSchema: canvasSchema ?? null,
      },
    });

    const version = await prisma.imagePageVersion.create({
      data: {
        user_id: authPayload.userId,
        project_id: projectId ?? null,
        label: `AI 优化-${style || "默认"}`,
        source_type: "optimize",
        status: "pending",
        image_url: imageUrl ?? null,
        task_id: taskId,
        metadata: {
          mode,
          strength,
          basePrompt: prompt,
          previousVersionId: versionId ?? null,
          layoutSchema: canvasSchema ?? undefined,
        },
        canvas_schema: canvasSchema ?? undefined,
      },
    });

    await recordGenerationLog({
      userId: authPayload.userId,
      action: "image_optimization",
      providerType: "image_generation",
      status: "pending",
      projectId: projectId ?? undefined,
      durationMs: Date.now() - startedAt,
      requestPayload: {
        prompt,
        style,
        mode,
        strength,
        imageUrl,
        versionId,
      },
      responsePayload: {
        taskId,
        initialStatus: status?.status,
      },
    });

    return NextResponse.json({
      success: true,
      taskId,
      status,
      version: {
        id: version.id,
        label: version.label,
        source_type: version.source_type,
        status: version.status,
        image_url: version.image_url,
        task_id: version.task_id,
        metadata: version.metadata,
        project_id: version.project_id,
        canvas_schema: version.canvas_schema,
        created_at: version.created_at,
        updated_at: version.updated_at,
      },
    });
  } catch (error: any) {
    console.error("图片优化接口调用失败:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors?.[0]?.message ?? "参数错误" }, { status: 400 });
    }

    if (error?.code === "QUOTA_EXCEEDED") {
      return NextResponse.json(
        {
          error: `已达到每日图片配额（${error.limit} 次），今日已使用 ${error.count} 次`,
          code: "QUOTA_EXCEEDED",
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: "图片优化失败，请稍后再试" }, { status: 500 });
  }
}
