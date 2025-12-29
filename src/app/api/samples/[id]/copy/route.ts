import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface CopyResponse {
  success: boolean;
  storyId?: string;
  projectId?: string;
  error?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/samples/[id]/copy
 * 复制示例项目到用户账号
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<CopyResponse>> {
  try {
    // 验证登录
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "请先登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "无效的登录状态" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 获取示例项目
    const sampleStory = await prisma.story.findFirst({
      where: {
        id,
        is_sample: true,
      },
      include: {
        projects: {
          include: {
            panels: {
              orderBy: {
                panel_order: "asc",
              },
            },
          },
        },
      },
    });

    if (!sampleStory) {
      return NextResponse.json(
        { success: false, error: "示例项目不存在" },
        { status: 404 }
      );
    }

    const sampleProject = sampleStory.projects[0];
    if (!sampleProject) {
      return NextResponse.json(
        { success: false, error: "示例项目数据不完整" },
        { status: 404 }
      );
    }

    // 使用事务复制故事、项目和分镜
    const result = await prisma.$transaction(async (tx) => {
      // 1. 复制故事
      const newStory = await tx.story.create({
        data: {
          user_id: payload.userId,
          title: `${sampleStory.title} (副本)`,
          premise: sampleStory.premise,
          genre: sampleStory.genre,
          outline: sampleStory.outline as any,
          status: "draft",
          is_sample: false,
          sample_category: null,
        },
      });

      // 2. 复制项目
      const newProject = await tx.project.create({
        data: {
          user_id: payload.userId,
          story_id: newStory.id,
          title: `${sampleProject.title} (副本)`,
          description: sampleProject.description,
          style: sampleProject.style,
          status: "draft",
        },
      });

      // 3. 复制分镜
      const panelPromises = sampleProject.panels.map((panel) =>
        tx.panel.create({
          data: {
            project_id: newProject.id,
            panel_order: panel.panel_order,
            panel_type: panel.panel_type,
            importance: panel.importance,
            description: panel.description,
            dialogue: panel.dialogue,
            camera_angle: panel.camera_angle,
            shot_size: panel.shot_size,
            generated_image: panel.generated_image,
            prompt_used: panel.prompt_used,
          },
        })
      );

      await Promise.all(panelPromises);

      return { storyId: newStory.id, projectId: newProject.id };
    });

    return NextResponse.json({
      success: true,
      storyId: result.storyId,
      projectId: result.projectId,
    });
  } catch (error) {
    console.error("复制示例项目失败:", error);
    return NextResponse.json(
      { success: false, error: "复制失败，请稍后重试" },
      { status: 500 }
    );
  }
}
