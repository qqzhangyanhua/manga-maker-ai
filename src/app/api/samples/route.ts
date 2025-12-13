import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface SampleProject {
  id: string;
  title: string;
  premise: string;
  genre: string;
  category: string;
  panelCount: number;
  coverImage: string | null;
  createdAt: Date;
}

interface SamplesResponse {
  samples: SampleProject[];
}

/**
 * GET /api/samples
 * 获取所有示例项目（无需登录）
 */
export async function GET(): Promise<NextResponse<SamplesResponse>> {
  try {
    const stories = await prisma.story.findMany({
      where: {
        is_sample: true,
      },
      include: {
        projects: {
          include: {
            panels: {
              select: {
                id: true,
                generated_image: true,
                panel_order: true,
              },
              orderBy: {
                panel_order: "asc",
              },
            },
          },
        },
      },
      orderBy: [
        { sample_category: "asc" },
        { created_at: "desc" },
      ],
    });

    const samples: SampleProject[] = stories.map((story) => {
      const project = story.projects[0];
      const panels = project?.panels || [];
      // 使用第一个面板的图片作为封面
      const coverImage = panels[0]?.generated_image || null;

      return {
        id: story.id,
        title: story.title,
        premise: story.premise,
        genre: story.genre,
        category: story.sample_category || "beginner",
        panelCount: panels.length,
        coverImage,
        createdAt: story.created_at,
      };
    });

    return NextResponse.json({ samples });
  } catch (error) {
    console.error("获取示例项目失败:", error);
    return NextResponse.json({ samples: [] });
  }
}
