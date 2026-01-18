import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { getErrorStatus } from "@/lib/api-helpers";

export const runtime = "nodejs";

const providerSchema = z.object({
  provider_type: z.string().min(1, "provider_type 不能为空"),
  provider_name: z.string().min(1, "provider_name 不能为空").default("openai"),
  model: z.string().min(1, "model 不能为空"),
  base_url: z.string().min(1, "base_url 不能为空"),
  api_key: z.string().default(""),
  priority: z.number().int().positive().default(1),
  enabled: z.boolean().default(true),
  desc: z.string().nullable().optional(),
  credits_cost: z.number().int().min(0, "算力消耗不能为负数").default(0),
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

    const providers = await prisma.llmProvider.findMany({
      orderBy: [{ enabled: "desc" }, { priority: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({ success: true, data: { providers } });
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
    const parsed = providerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const now = new Date();
    const provider = await prisma.llmProvider.create({
      data: {
        provider_type: payload.provider_type,
        provider_name: payload.provider_name,
        model: payload.model,
        base_url: payload.base_url,
        api_key: payload.api_key,
        priority: payload.priority,
        enabled: payload.enabled,
        desc: payload.desc,
        credits_cost: payload.credits_cost,
        created_at: now,
        updated_at: now,
      },
    });

    return NextResponse.json({ success: true, data: { provider } });
  } catch (error) {
    return handleError(error);
  }
}
