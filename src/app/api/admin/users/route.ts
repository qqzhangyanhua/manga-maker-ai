import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { hashText } from "@/lib/auth";
import { getErrorStatus } from "@/lib/api-helpers";

export const runtime = "nodejs";

const userCreateSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位").max(64, "密码过长"),
  name: z.string().min(1).max(64).optional(),
  role: z.enum(["user", "admin"]).default("user"),
  status: z.enum(["active", "banned"]).default("active"),
  verified: z.boolean().default(true),
});

const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  const status = error instanceof Error ? getErrorStatus(error) : 500;
  return NextResponse.json({ success: false, message }, { status });
};

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        verified: true,
        credits: true,
        total_credits_used: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { id: "desc" },
    });
    return NextResponse.json({ success: true, data: { users } });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const passwordHash = await hashText(payload.password);
    const now = new Date();

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        password_hash: passwordHash,
        name: payload.name ?? null,
        role: payload.role,
        status: payload.status,
        verified: payload.verified,
        // email_verified_at field removed from schema
        created_at: now,
        updated_at: now,
      },
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
    return handleError(error);
  }
}
