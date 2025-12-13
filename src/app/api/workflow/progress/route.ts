import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface WorkflowProgressResponse {
  currentStep: 1 | 2 | 3 | 4;
  steps: {
    story: {
      completed: boolean;
      storyId?: string;
      storyTitle?: string;
    };
    characters: {
      completed: boolean;
      count: number;
    };
    panels: {
      completed: boolean;
      total: number;
      generated: number;
    };
    exported: {
      completed: boolean;
    };
  };
}

export async function GET(): Promise<NextResponse<WorkflowProgressResponse | { error: string }>> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 获取用户最近的故事
    const latestStory = await prisma.story.findFirst({
      where: { user_id: payload.userId },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        title: true,
        story_characters: {
          select: { character_id: true },
        },
      },
    });

    // 如果有故事，获取相关的项目和分镜
    let panelStats = { total: 0, generated: 0 };
    let hasExported = false;

    if (latestStory) {
      const project = await prisma.project.findFirst({
        where: {
          user_id: payload.userId,
          story_id: latestStory.id,
        },
        orderBy: { updated_at: "desc" },
        include: {
          panels: {
            select: {
              id: true,
              generated_image: true,
            },
          },
        },
      });

      if (project) {
        panelStats = {
          total: project.panels.length,
          generated: project.panels.filter((p) => p.generated_image).length,
        };
        hasExported = project.status === "exported";
      }
    }

    // 计算当前步骤
    let currentStep: 1 | 2 | 3 | 4 = 1;

    const hasStory = !!latestStory;
    const hasCharacters = (latestStory?.story_characters?.length ?? 0) > 0;
    const hasGeneratedPanels = panelStats.generated > 0;

    if (hasStory) {
      currentStep = 2;
    }
    if (hasStory && hasCharacters) {
      currentStep = 3;
    }
    if (hasStory && hasCharacters && hasGeneratedPanels) {
      currentStep = 4;
    }

    const response: WorkflowProgressResponse = {
      currentStep,
      steps: {
        story: {
          completed: hasStory,
          storyId: latestStory?.id,
          storyTitle: latestStory?.title ?? undefined,
        },
        characters: {
          completed: hasCharacters,
          count: latestStory?.story_characters?.length ?? 0,
        },
        panels: {
          completed: hasGeneratedPanels,
          total: panelStats.total,
          generated: panelStats.generated,
        },
        exported: {
          completed: hasExported,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取工作流进度失败:", error);
    return NextResponse.json(
      { error: "获取进度失败" },
      { status: 500 }
    );
  }
}
