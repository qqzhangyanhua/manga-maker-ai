import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ensureDb, prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { hashText } from "@/lib/auth";

export const runtime = "nodejs";

const userUpdateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "banned"]).optional(),
  verified: z.boolean().optional(),
  password: z.string().min(8).max(64).optional(),
});

const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  const status = (error as any)?.status ?? 500;
  return NextResponse.json({ success: false, message }, { status });
};

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ success: false, message: "无效的 id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: false, message: "没有可更新的字段" }, { status: 400 });
    }

    await ensureDb();

    const data: Prisma.UserUpdateInput = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
    }
    if (payload.role !== undefined) {
      data.role = payload.role;
    }
    if (payload.status !== undefined) {
      data.status = payload.status;
    }
    if (payload.verified !== undefined) {
      data.verified = payload.verified;
      data.email_verified_at = payload.verified ? new Date() : null;
    }
    if (payload.password !== undefined) {
      data.password_hash = await hashText(payload.password);
    }

    data.updated_at = new Date();

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        verified: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({ success: true, data: { user } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ success: false, message: "用户不存在" }, { status: 404 });
    }
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(request);
    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ success: false, message: "无效的 id" }, { status: 400 });
    }

    await ensureDb();
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ success: false, message: "用户不存在" }, { status: 404 });
    }
    return handleError(error);
  }
}
