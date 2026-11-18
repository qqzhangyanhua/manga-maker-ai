import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultChapter, ensureStoryProject } from "@/lib/project";
import { getTrialResult, markTrialClaimed } from "@/lib/trial-store";

interface ClaimRequest {
  trialId: string;
}

interface ClaimResponse {
  success: boolean;
  storyId?: string;
  projectId?: string;
  error?: string;
}

// 风格 ID 映射到风格名称
const STYLE_NAMES: Record<string, string> = {
  manga: "日式漫画",
  american: "美式漫画",
  webtoon: "韩式条漫",
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<ClaimResponse>> {
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

    // 获取请求参数
    const body = (await request.json()) as ClaimRequest;
    const { trialId } = body;

    if (!trialId) {
      return NextResponse.json(
        { success: false, error: "缺少 trialId 参数" },
        { status: 400 }
      );
    }

    // 获取体验结果
    const trialResult = getTrialResult(trialId);
    if (!trialResult) {
      return NextResponse.json(
        { success: false, error: "体验结果不存在或已过期" },
        { status: 404 }
      );
    }

    // 检查是否已被认领
    if (trialResult.claimed) {
      return NextResponse.json(
        { success: false, error: "该体验结果已被认领" },
        { status: 409 }
      );
    }

    // 创建故事和项目
    const styleName = STYLE_NAMES[trialResult.styleId] || trialResult.styleId;

    // 使用事务创建故事、项目和分镜
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建故事
      const story = await tx.story.create({
        data: {
          user_id: payload.userId,
          title: `体验作品 - ${new Date().toLocaleDateString("zh-CN")}`,
          premise: trialResult.prompt,
          genre: "daily",
          status: "draft",
          outline: JSON.stringify({
            source: "trial",
            trialId: trialId,
            originalPrompt: trialResult.prompt,
          }),
        },
      });

      // 2. 故事的主项目（新建故事时由数据库触发器创建），补上体验结果的描述和画风
      const storyProject = await ensureStoryProject(tx, story.id);
      const project = await tx.project.update({
        where: { id: storyProject.id },
        data: {
          description: trialResult.prompt,
          style: styleName,
          status: "draft",
          updated_at: new Date(),
        },
      });

      // 3. 创建分镜（挂在项目的第一章）
      const chapterId = await ensureDefaultChapter(tx, project.id);
      const panelPromises = trialResult.panels.map((panel, index) =>
        tx.panel.create({
          data: {
            project_id: project.id,
            chapter_id: chapterId,
            panel_order: index + 1,
            panel_type: "medium",
            importance: "medium",
            description: panel.description,
            generated_image: panel.imageUrl || null,
            prompt_used: `${panel.description}, ${styleName}`,
          },
        })
      );

      await Promise.all(panelPromises);

      return { storyId: story.id, projectId: project.id };
    });

    // 标记为已认领
    markTrialClaimed(trialId, payload.userId);

    return NextResponse.json({
      success: true,
      storyId: result.storyId,
      projectId: result.projectId,
    });
  } catch (error) {
    console.error("认领体验结果失败:", error);
    return NextResponse.json(
      { success: false, error: "认领失败，请稍后重试" },
      { status: 500 }
    );
  }
}
