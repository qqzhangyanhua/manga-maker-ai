/**
 * Shot Design Generate Image API
 * POST /api/canvas/shot-design/[id]/generate-image - 生成单镜头图片
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateImage, getImageGenerationQueue } from "@/lib/unified-image-generation";
import type { TaskStatus } from "@/lib/unified-image-generation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CharacterInput {
  name: string;
  role: string;
  description: string;
  reference_image_url?: string;
}

interface GenerateImageRequestBody {
  characters: CharacterInput[];
  comic_style_id?: string;
}

function normalizeCharacters(input: unknown): CharacterInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        name: typeof record.name === "string" ? record.name.trim() : "",
        role: typeof record.role === "string" ? record.role.trim() : "supporting",
        description:
          typeof record.description === "string" ? record.description.trim() : "",
        reference_image_url:
          typeof record.reference_image_url === "string"
            ? record.reference_image_url
            : undefined,
      };
    })
    .filter((item) => item.name.length > 0);
}

export async function POST(req: Request, { params }: RouteParams) {
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

  let body: Partial<GenerateImageRequestBody> = {};
  try {
    body = (await req.json()) as Partial<GenerateImageRequestBody>;
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const characters = normalizeCharacters(body.characters);
  const comicStyleId =
    typeof body.comic_style_id === "string" ? body.comic_style_id : undefined;

  try {
    const shot = await prisma.shotDesign.findUnique({
      where: { id },
      select: {
        id: true,
        prompt: true,
        camera_angle: true,
        shot_size: true,
        script_segment: {
          select: {
            id: true,
            timeline_chapter_id: true,
            timeline_chapter: {
              select: {
                timeline: { select: { user_id: true } },
              },
            },
          },
        },
      },
    });

    if (!shot) {
      return NextResponse.json({ error: "镜头设计不存在" }, { status: 404 });
    }

    if (shot.script_segment.timeline_chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    let stylePromptPrefix = "";
    if (comicStyleId) {
      const style = await prisma.comicStyle.findFirst({
        where: { id: comicStyleId, enabled: true },
        select: { prompt_prefix: true },
      });

      if (!style) {
        return NextResponse.json({ error: "风格不存在或不可用" }, { status: 404 });
      }

      stylePromptPrefix = style.prompt_prefix || "";
    }

    const characterDescriptions = characters
      .map((char) => char.description)
      .filter((desc) => desc.length > 0)
      .join(", ");

    const shotParams = [shot.camera_angle, shot.shot_size]
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join(", ");

    const promptParts = [
      stylePromptPrefix,
      shot.prompt,
      characterDescriptions,
      shotParams,
    ]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const finalPrompt = promptParts.join(", ");

    if (!finalPrompt) {
      return NextResponse.json({ error: "生成提示词为空" }, { status: 400 });
    }

    const referenceImages = characters
      .map((char) => char.reference_image_url)
      .filter((url): url is string => typeof url === "string" && url.length > 0);

    const { taskId } = await generateImage("panel", finalPrompt, payload.userId, {
      width: 1024,
      height: 768,
      metadata: {
        shot_design_id: shot.id,
        script_segment_id: shot.script_segment.id,
        chapter_id: shot.script_segment.timeline_chapter_id,
        type: "canvas_shot",
      },
      ...(referenceImages.length > 0 ? { referenceImages } : {}),
    });

    // Register completion callback to update database and send SSE
    const queue = getImageGenerationQueue();
    queue.onTaskComplete(taskId, async (result: TaskStatus) => {
      console.log(`[Shot Image Callback] Task ${taskId} completed with status:`, result.status);

      try {
        if (result.status === "completed" && result.imageUrl) {
          console.log(`[Shot Image Callback] Updating shot ${id} with imageUrl:`, result.imageUrl.substring(0, 50) + '...');

          // Update database with generated image URL
          await prisma.shotDesign.update({
            where: { id },
            data: {
              generated_image_url: result.imageUrl,
              generation_status: "completed",
            },
          });

          console.log(`[Shot Image Callback] ✅ Task ${taskId} completed, database updated successfully`);
        } else if (result.status === "failed") {
          console.error(`[Shot Image Callback] ❌ Task ${taskId} failed:`, result.error);

          // Update status to error
          await prisma.shotDesign.update({
            where: { id },
            data: {
              generation_status: "error",
            },
          });

          console.log(`[Shot Image Callback] Error status updated for shot ${id}`);
        } else {
          console.warn(`[Shot Image Callback] ⚠️ Unexpected task status:`, {
            taskId,
            status: result.status,
            hasImageUrl: !!result.imageUrl,
          });
        }
      } catch (error) {
        console.error(`[Shot Image Callback] 💥 Callback error for task ${taskId}:`, error);
        console.error(`[Shot Image Callback] Error details:`, {
          shotId: id,
          taskId,
          resultStatus: result.status,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    const updated = await prisma.shotDesign.update({
      where: { id },
      data: { generation_status: "generating" },
      select: { id: true, generation_status: true },
    });

    return NextResponse.json({
      success: true,
      taskId,
      shot: updated,
    });
  } catch (error) {
    console.error("[POST /api/canvas/shot-design/[id]/generate-image]", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
