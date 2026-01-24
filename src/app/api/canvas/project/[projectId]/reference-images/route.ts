import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { projectId } = params;
    const { searchParams } = new URL(req.url);
    const types = searchParams.get("types")?.split(",") || ["shot", "scene", "final"];
    const characterId = searchParams.get("characterId");

    // 2. 查询项目信息
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 3. 权限检查
    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 4. 查询各类参考图
    const result: {
      shots: unknown[];
      scenes: unknown[];
      finals: unknown[];
    } = {
      shots: [],
      scenes: [],
      finals: [],
    };

    // 查询镜头图片
    if (types.includes("shot")) {
      // 通过 CanvasTimeline 查询 ShotDesign
      // NovelProject → CanvasTimeline → TimelineChapter → ScriptSegment → ShotDesign
      const timeline = await prisma.canvasTimeline.findFirst({
        where: {
          novel_project_id: projectId,
        },
        select: { id: true },
      });

      const timelineChapters = timeline ? await prisma.timelineChapter.findMany({
        where: {
          timeline_id: timeline.id,
        },
        select: { id: true },
      }) : [];

      if (timelineChapters.length > 0) {
        const timelineChapterIds = timelineChapters.map(tc => tc.id);
        
        const shots = await prisma.shotDesign.findMany({
          where: {
            script_segment: {
              timeline_chapter_id: {
                in: timelineChapterIds,
              },
            },
            generated_image_url: {
              not: null,
            },
          },
          select: {
            id: true,
            generated_image_url: true,
            shot_order: true,
            shot_description: true,
            script_segment: {
              select: {
                timeline_chapter: {
                  select: {
                    chapter_number: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { shot_order: "asc" },
          ],
          take: 100, // 限制返回数量
        });

        result.shots = shots.map((shot) => ({
          id: shot.id,
          url: shot.generated_image_url,
          chapterNumber: shot.script_segment.timeline_chapter.chapter_number,
          shotOrder: shot.shot_order,
          description: shot.shot_description || undefined,
        }));
      }
    }

    // 查询场景图片
    if (types.includes("scene")) {
      const scenes = await prisma.scene.findMany({
        where: {
          user_id: payload.userId,
          source_novel_id: projectId,
          image_url: {
            not: null,
          },
        },
        select: {
          id: true,
          name: true,
          image_url: true,
        },
        orderBy: {
          created_at: "asc",
        },
        take: 50, // 限制返回数量
      });

      result.scenes = scenes.map((scene) => ({
        id: scene.id,
        url: scene.image_url!,
        name: scene.name,
      }));
    }

    // TODO: 查询 Final 图片（需要确认 Final 节点的数据结构）
    // if (types.includes("final")) {
    //   result.finals = [];
    // }

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取项目参考图失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
