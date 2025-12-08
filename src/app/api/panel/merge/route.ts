import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";

const mergeSystemPrompt = `你是一位专业的漫画分镜编辑。

任务：将两个相邻的分镜融合为一个分镜。

输出要求（严格JSON格式）：
{
  "panel_type": "wide/medium/closeup/action/dialogue/transition",
  "importance": "high/medium/low",
  "description": "融合后的中文场景描述",
  "visual_prompt": "融合后的简化视觉描述",
  "english_prompt": "Merged English prompt for AI generation",
  "dialogue": "融合后的对白（如有）",
  "character_name": "角色名（如有）",
  "emotion": "情绪",
  "camera_angle": "俯视/仰视/平视/荷兰角",
  "shot_size": "特写/近景/中景/全景/远景"
}

规则：
1. 保留两个分镜的核心内容，自然融合为一个连贯的画面
2. 如果有多个角色或动作，确保在描述中都有体现
3. 优先级取两者中较高的那个
4. 对白可以合并或选择更重要的那个
5. 镜头类型和尺寸根据融合后的内容重新评估`;

export async function POST(req: Request) {
  try {
    // 验证用户身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body = await req.json();
    const { panel_ids, project_id } = body;

    if (!Array.isArray(panel_ids) || panel_ids.length !== 2) {
      return NextResponse.json(
        { error: "必须选择两个分镜进行合并" },
        { status: 400 }
      );
    }

    if (!project_id) {
      return NextResponse.json({ error: "缺少 project_id" }, { status: 400 });
    }

    // 检查 project 是否属于当前用户
    const project = await prisma.project.findUnique({
      where: { id: project_id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作此项目" }, { status: 403 });
    }

    // 获取两个 panels
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panel_ids },
        project_id,
      },
      orderBy: { panel_order: "asc" },
    });

    if (panels.length !== 2) {
      return NextResponse.json({ error: "分镜不存在或不属于该项目" }, { status: 404 });
    }

    // 确保两个 panels 是相邻的
    if (Math.abs(panels[0].panel_order - panels[1].panel_order) !== 1) {
      return NextResponse.json(
        { error: "只能合并相邻的分镜" },
        { status: 400 }
      );
    }

    // 调用 LLM 融合分镜
    const userPrompt = `
请将以下两个分镜融合为一个：

分镜1：
- 类型：${panels[0].panel_type}
- 重要性：${panels[0].importance}
- 描述：${panels[0].description}
- 对白：${panels[0].dialogue || "无"}
- 角色：${panels[0].character_name || "无"}
- 情绪：${panels[0].emotion || "无"}
- 镜头角度：${panels[0].camera_angle || "平视"}
- 镜头尺寸：${panels[0].shot_size || "中景"}

分镜2：
- 类型：${panels[1].panel_type}
- 重要性：${panels[1].importance}
- 描述：${panels[1].description}
- 对白：${panels[1].dialogue || "无"}
- 角色：${panels[1].character_name || "无"}
- 情绪：${panels[1].emotion || "无"}
- 镜头角度：${panels[1].camera_angle || "平视"}
- 镜头尺寸：${panels[1].shot_size || "中景"}

请输出融合后的分镜JSON。`;

    const { content } = await callChatCompletionByType({
      providerType: "storyboard",
      messages: [
        { role: "system", content: mergeSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    let mergedData;
    try {
      mergedData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "LLM返回格式错误", raw_content: content },
        { status: 500 }
      );
    }

    // 使用事务删除两个旧 panel 并创建新 panel
    const newPanel = await prisma.$transaction(async (tx) => {
      // 删除两个旧 panels
      await tx.panel.deleteMany({
        where: { id: { in: panel_ids } },
      });

      // 创建新 panel（使用较小的 panel_order）
      const newOrder = Math.min(panels[0].panel_order, panels[1].panel_order);
      const created = await tx.panel.create({
        data: {
          project_id,
          panel_order: newOrder,
          panel_type: mergedData.panel_type,
          importance: mergedData.importance,
          description: mergedData.description,
          visual_prompt: mergedData.visual_prompt || mergedData.description,
          prompt_used: mergedData.english_prompt,
          dialogue: mergedData.dialogue || null,
          character_name: mergedData.character_name || null,
          emotion: mergedData.emotion || null,
          camera_angle: mergedData.camera_angle || null,
          shot_size: mergedData.shot_size || null,
          script_segment_id: panels[0].script_segment_id, // 保留第一个的 segment_id
          script_start: panels[0].script_start,
          script_end: panels[1].script_end, // 扩展到第二个的结束位置
        },
      });

      // 重新排序后续 panels（-1 因为删除了两个，新增了一个）
      await tx.$executeRaw`
        UPDATE panels
        SET panel_order = panel_order - 1
        WHERE project_id = ${project_id}::uuid
        AND panel_order > ${Math.max(panels[0].panel_order, panels[1].panel_order)}
      `;

      return created;
    });

    return NextResponse.json({
      success: true,
      panel: newPanel,
      message: "分镜已合并",
    });
  } catch (error) {
    console.error("Merge panels error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
