import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

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
  console.error("LLM Provider API Error:", error);
  const message = error instanceof Error ? error.message : "未知错误";
  const status = (error as any)?.status ?? 500;
  return NextResponse.json({ success: false, message, error: String(error) }, { status });
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const providerId = Number(params.id);
    if (Number.isNaN(providerId)) {
      return NextResponse.json({ success: false, message: "无效的 id" }, { status: 400 });
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

    // 处理 desc 字段：空字符串转为 null
    const descValue = payload.desc === "" || payload.desc === undefined ? null : payload.desc;

    const provider = await prisma.llmProvider.update({
      where: { id: providerId },
      data: {
        provider_type: payload.provider_type,
        provider_name: payload.provider_name,
        model: payload.model,
        base_url: payload.base_url,
        api_key: payload.api_key,
        priority: payload.priority,
        enabled: payload.enabled,
        desc: descValue,
        credits_cost: payload.credits_cost,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: { provider } });
  } catch (error) {
    console.error("PUT /api/llm-providers/[id] error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ success: false, message: "记录不存在" }, { status: 404 });
      }
      // 处理其他 Prisma 错误
      console.error("Prisma error code:", error.code, "message:", error.message);
      return NextResponse.json(
        { success: false, message: `数据库错误: ${error.message}`, code: error.code },
        { status: 500 },
      );
    }
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const providerId = Number(params.id);
    if (Number.isNaN(providerId)) {
      return NextResponse.json({ success: false, message: "无效的 id" }, { status: 400 });
    }

    await prisma.llmProvider.delete({ where: { id: providerId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ success: false, message: "记录不存在" }, { status: 404 });
    }
    return handleError(error);
  }
}
