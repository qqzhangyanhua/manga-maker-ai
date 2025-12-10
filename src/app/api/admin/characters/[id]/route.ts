import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ensureDb, prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

const trainingStatuses = ["pending", "training", "ready", "failed"] as const;

const characterUpdateSchema = z
  .object({
    user_id: z.string().uuid({ message: "用户ID格式不正确" }).optional(),
    name: z.string().min(1, "角色名称必填").max(100, "名称过长").optional(),
    description: z.string().max(2000).optional().nullable(),
    base_prompt: z.string().max(4000).optional().nullable(),
    tags: z.array(z.string().trim().min(1)).optional(),
    base_image_url: z.string().url("base_image_url 需要是 URL").optional().nullable(),
    lora_model_url: z.string().max(2000).optional().nullable(),
    lora_trigger_word: z.string().max(200).optional().nullable(),
    training_status: z.enum(trainingStatuses).optional(),
    training_progress: z.number().int().min(0).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "没有可更新的字段");

const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  const status = (error as any)?.status ?? 500;
  return NextResponse.json({ success: false, message }, { status });
};

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const characterId = params.id;
    if (!characterId) {
      return NextResponse.json({ success: false, message: "无效的角色ID" }, { status: 400 });
    }

    await ensureDb();
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return NextResponse.json({ success: false, message: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { character } });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const characterId = params.id;
    const body = await request.json();
    const parsed = characterUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    await ensureDb();
    const payload = parsed.data;
    const data: Prisma.CharacterUpdateInput = {
      updated_at: new Date(),
    };

    if (payload.user_id !== undefined) data.user_id = payload.user_id;
    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.description !== undefined) data.description = payload.description?.trim() || null;
    if (payload.base_prompt !== undefined) data.base_prompt = payload.base_prompt?.trim() || "";
    if (payload.tags !== undefined) data.tags = payload.tags;
    if (payload.base_image_url !== undefined) data.base_image_url = payload.base_image_url || null;
    if (payload.lora_model_url !== undefined) data.lora_model_url = payload.lora_model_url?.trim() || null;
    if (payload.lora_trigger_word !== undefined)
      data.lora_trigger_word = payload.lora_trigger_word?.trim() || null;
    if (payload.training_status !== undefined) data.training_status = payload.training_status;
    if (payload.training_progress !== undefined) data.training_progress = payload.training_progress;

    const character = await prisma.character.update({
      where: { id: characterId },
      data,
    });

    return NextResponse.json({ success: true, data: { character } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ success: false, message: "角色不存在" }, { status: 404 });
      }
      if (error.code === "P2003") {
        return NextResponse.json({ success: false, message: "用户不存在，请检查 user_id" }, { status: 400 });
      }
    }
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const characterId = params.id;
    if (!characterId) {
      return NextResponse.json({ success: false, message: "无效的角色ID" }, { status: 400 });
    }

    await ensureDb();
    await prisma.character.delete({ where: { id: characterId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ success: false, message: "角色不存在" }, { status: 404 });
    }
    return handleError(error);
  }
}
