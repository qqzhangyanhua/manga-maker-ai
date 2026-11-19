/**
 * 画布镜头编辑 API
 * PATCH /api/canvas/shot-design/[id] - 更新画布镜头（id 为项目分镜 ID）
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCanvasShotForUser, updateCanvasShot } from "@/lib/canvas";
import type { CanvasShotPatch } from "@/lib/canvas";
import { canvasErrorResponse } from "@/lib/canvas/route-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 空字符串视为不修改（与原接口一致）
const nonEmpty = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));
const stringList = z.array(z.string()).optional();

const ShotPatchSchema = z.object({
  camera_angle: nonEmpty,
  shot_size: nonEmpty,
  panel_type: nonEmpty,
  shot_description: nonEmpty,
  composition_hint: nonEmpty,
  location_key: z.string().optional(),
  prompt: nonEmpty,
  negative_prompt: z.string().nullable().optional(),
  scene_id: z.string().nullable().optional(),
  character_ids: stringList,
  expression_types: stringList,
  outfit_ids: stringList,
  character_prompt_template_ids: stringList,
  character_prompt_status: nonEmpty,
  final_prompt_status: nonEmpty,
  nine_grid_status: nonEmpty,
  selection_status: nonEmpty,
});

export async function PATCH(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body: unknown = await req.json();
    const parsed = ShotPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求参数验证失败", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const context = await getCanvasShotForUser(prisma, id, payload.userId);
    const patch: CanvasShotPatch = parsed.data;
    await updateCanvasShot(prisma, context, payload.userId, patch);
    const { shot } = await getCanvasShotForUser(prisma, id, payload.userId);

    return NextResponse.json({ success: true, shot });
  } catch (error) {
    return canvasErrorResponse(error, "更新失败");
  }
}
