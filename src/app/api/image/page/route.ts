import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import type { ImagePageVersion } from "@prisma/client";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { Prisma, prisma } from "@/lib/db";

const sourceTypeEnum = z.enum(["original", "optimize", "layout", "upload"]);
const statusEnum = z.enum(["pending", "completed", "failed"]);

const createSchema = z.object({
  label: z.string().min(1, "label 不能为空"),
  sourceType: sourceTypeEnum,
  imageUrl: z.string().optional(),
  status: statusEnum.default("completed"),
  projectId: z.string().uuid().optional(),
  taskId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  canvasSchema: z.record(z.unknown()).optional(),
});

const serializeVersion = (version: ImagePageVersion, includeSchema: boolean) => ({
  id: version.id,
  label: version.label,
  source_type: version.source_type,
  status: version.status,
  image_url: version.image_url,
  task_id: version.task_id,
  project_id: version.project_id,
  metadata: version.metadata,
  canvas_schema: includeSchema ? version.canvas_schema : undefined,
  created_at: version.created_at,
  updated_at: version.updated_at,
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

export async function GET(req: Request) {
  try {
    const auth = await authenticate();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const taskId = searchParams.get("task_id");
    const includeSchema = searchParams.get("include_schema") === "true";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSizeParam = parseInt(searchParams.get("page_size") || "20", 10);
    const pageSize = Math.min(Math.max(pageSizeParam, 1), 200);

    const whereClause: Prisma.ImagePageVersionWhereInput = {
      user_id: auth.userId,
      ...(projectId ? { project_id: projectId } : {}),
      ...(taskId ? { task_id: taskId } : {}),
    };

    const [versions, total] = await Promise.all([
      prisma.imagePageVersion.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.imagePageVersion.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      versions: versions.map((version) => serializeVersion(version, includeSchema)),
      page,
      pageSize,
      total,
    });
  } catch (error) {
    console.error("获取画面版本失败:", error);
    return NextResponse.json({ error: "获取版本列表失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticate();
    if ("error" in auth) return auth.error;

    const json = await req.json();
    const payload = createSchema.parse(json);

    const version = await prisma.imagePageVersion.create({
      data: {
        user_id: auth.userId,
        project_id: payload.projectId ?? null,
        label: payload.label,
        source_type: payload.sourceType,
        status: payload.status,
        image_url: payload.imageUrl ?? null,
        task_id: payload.taskId ?? null,
        metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonValue) : undefined,
        canvas_schema: payload.canvasSchema ? (payload.canvasSchema as Prisma.InputJsonValue) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      version: serializeVersion(version, true),
    });
  } catch (error) {
    console.error("创建画面版本失败:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors?.[0]?.message ?? "参数错误" }, { status: 400 });
    }
    return NextResponse.json({ error: "创建版本失败" }, { status: 500 });
  }
}
