import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

const trainingStatuses = ["pending", "training", "ready", "failed"] as const;

const characterCreateSchema = z.object({
  user_id: z.string().uuid({ message: "用户ID格式不正确" }),
  name: z.string().min(1, "角色名称必填").max(100, "名称过长"),
  description: z.string().max(2000).optional().nullable(),
  base_prompt: z.string().max(4000).optional().nullable(),
  tags: z.array(z.string().trim().min(1)).optional(),
  base_image_url: z.string().url("base_image_url 需要是 URL").optional(),
  lora_model_url: z.string().max(2000).optional().nullable(),
  lora_trigger_word: z.string().max(200).optional().nullable(),
  training_status: z.enum(trainingStatuses).optional(),
  training_progress: z.number().int().min(0).max(100).optional(),
});

const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  const status = (error as any)?.status ?? 500;
  return NextResponse.json({ success: false, message }, { status });
};

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim();
    const userId = searchParams.get("userId")?.trim();
    const status = searchParams.get("status")?.trim();
    const pageSize = Math.min(Number(searchParams.get("limit") ?? 20) || 20, 200);
    const page = Math.max(Number(searchParams.get("page") ?? 1) || 1, 1);
    const offset = (page - 1) * pageSize;

    const where: Prisma.CharacterWhereInput = {};
    if (userId) where.user_id = userId;
    if (status && trainingStatuses.includes(status as any)) where.training_status = status;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        { base_prompt: { contains: keyword, mode: "insensitive" } },
      ];
    }


    const [total, characters] = await prisma.$transaction([
      prisma.character.count({ where }),
      prisma.character.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: offset,
        take: pageSize,
      }),
    ]);

    const userIds = Array.from(new Set(characters.map((c) => c.user_id)));
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          })
        : [];
    const userMap = users.reduce<Record<string, { email: string; name: string | null }>>((acc, user) => {
      acc[user.id] = { email: user.email, name: user.name || null };
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        characters,
        total,
        userMap,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
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
    const parsed = characterCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const now = new Date();

    const character = await prisma.character.create({
      data: {
        user_id: payload.user_id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        base_prompt: payload.base_prompt?.trim() || "",
        tags: payload.tags ?? [],
        base_image_url: payload.base_image_url || null,
        lora_model_url: payload.lora_model_url?.trim() || null,
        lora_trigger_word: payload.lora_trigger_word?.trim() || null,
        training_status: payload.training_status || "pending",
        training_progress: payload.training_progress ?? 0,
        created_at: now,
        updated_at: now,
      },
    });

    await prisma.characterOutfit.create({
      data: {
        character_id: character.id,
        outfit_name: "默认装",
        outfit_type: "default",
        is_default: true,
      },
    });

    return NextResponse.json({ success: true, data: { character } }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { success: false, message: "用户不存在，请确认 user_id" },
        { status: 400 },
      );
    }
    return handleError(error);
  }
}
