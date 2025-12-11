import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma, ensureDb } from "@/lib/db";

const sourceTypeEnum = z.enum(["original", "optimize", "layout", "upload"]);
const statusEnum = z.enum(["pending", "completed", "failed"]);

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  sourceType: sourceTypeEnum.optional(),
  status: statusEnum.optional(),
  imageUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  taskId: z.string().optional(),
  canvasSchema: z.record(z.any()).optional(),
});

const authenticate = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  }
  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return { error: NextResponse.json({ error: "无效的用户凭据" }, { status: 401 }) };
  }
  return { userId: payload.userId };
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticate();
    if ("error" in auth) return auth.error;

    const json = await req.json();
    const payload = updateSchema.parse(json);

    await ensureDb();
    const existing = await prisma.imagePageVersion.findFirst({
      where: {
        id: params.id,
        user_id: auth.userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "版本不存在" }, { status: 404 });
    }

    const updated = await prisma.imagePageVersion.update({
      where: { id: existing.id },
      data: {
        ...(payload.label ? { label: payload.label } : {}),
        ...(payload.sourceType ? { source_type: payload.sourceType } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.imageUrl !== undefined ? { image_url: payload.imageUrl } : {}),
        ...(payload.metadata ? { metadata: payload.metadata } : {}),
        ...(payload.taskId !== undefined ? { task_id: payload.taskId } : {}),
        ...(payload.canvasSchema !== undefined ? { canvas_schema: payload.canvasSchema } : {}),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      version: {
        id: updated.id,
        label: updated.label,
        source_type: updated.source_type,
        status: updated.status,
        image_url: updated.image_url,
        task_id: updated.task_id,
        project_id: updated.project_id,
        metadata: updated.metadata,
        canvas_schema: updated.canvas_schema,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (error: any) {
    console.error("更新画面版本失败:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors?.[0]?.message ?? "参数错误" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新版本失败" }, { status: 500 });
  }
}
