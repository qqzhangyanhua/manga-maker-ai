import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { ensureProjectCharacters, filterOwnedCharacterIds } from "@/lib/project";
import { callChatCompletionStreamByType } from "@/lib/llm-provider";

const splitSystemPrompt = `你是一位专业的漫画分镜编辑。

任务：将一个分镜拆分为两个独立的分镜。

输出要求（严格JSON格式）：
{
  "panel1": {
    "panel_type": "wide/medium/closeup/action/dialogue/transition",
    "importance": "high/medium/low",
    "description": "第一个分镜的中文场景描述",
    "visual_prompt": "第一个分镜的简化视觉描述",
    "english_prompt": "First panel English prompt for AI generation",
    "dialogue": "第一个分镜的对白（如有）",
    "character_id": "角色UUID（优先使用）",
    "emotion": "情绪",
    "camera_angle": "俯视/仰视/平视/荷兰角",
    "shot_size": "特写/近景/中景/全景/远景"
  },
  "panel2": {
    "panel_type": "wide/medium/closeup/action/dialogue/transition",
    "importance": "high/medium/low",
    "description": "第二个分镜的中文场景描述",
    "visual_prompt": "第二个分镜的简化视觉描述",
    "english_prompt": "Second panel English prompt for AI generation",
    "dialogue": "第二个分镜的对白（如有）",
    "character_id": "角色UUID（优先使用）",
    "emotion": "情绪",
    "camera_angle": "俯视/仰视/平视/荷兰角",
    "shot_size": "特写/近景/中景/全景/远景"
  }
}

规则：
1. 将原分镜的内容合理拆分为两个连贯的画面
2. 如果有对话和动作，可以分为：对话镜头 + 动作镜头
3. 如果描述较长，可以按时间顺序或因果关系拆分
4. 确保两个分镜之间有明确的叙事衔接
5. 根据用户的拆分提示（split_hint）进行拆分`;

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
    const { panel_id, split_hint } = body;

    if (!panel_id) {
      return NextResponse.json({ error: "缺少 panel_id" }, { status: 400 });
    }

    // 获取 panel 并检查权限
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: { project: true },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作此分镜" }, { status: 403 });
    }

    // 调用 LLM 拆分分镜
    const userPrompt = `
请将以下分镜拆分为两个独立的分镜：

原分镜：
- 类型：${panel.panel_type}
- 重要性：${panel.importance}
- 描述：${panel.description}
- 对白：${panel.dialogue || "无"}
- 角色ID：${panel.character_id || "无"}
- 情绪：${panel.emotion || "无"}
- 镜头角度：${panel.camera_angle || "平视"}
- 镜头尺寸：${panel.shot_size || "中景"}

拆分提示：${split_hint || "根据内容自然拆分为两个连贯的画面"}

请输出拆分后的两个分镜JSON。`;

    let content = "";
    for await (const chunk of callChatCompletionStreamByType({
      providerType: "storyboard",
      messages: [
        { role: "system", content: splitSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1500,
      options: {
        userId: payload.userId,
      },
    })) {
      content += chunk;
    }

    let splitData;
    try {
      splitData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "LLM返回格式错误", raw_content: content },
        { status: 500 }
      );
    }

    if (!splitData.panel1 || !splitData.panel2) {
      return NextResponse.json(
        { error: "LLM返回数据不完整" },
        { status: 500 }
      );
    }

    // LLM 给出的角色 ID 只保留当前用户角色库中的，其余回落到原分镜角色或置空
    const asId = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : null);
    const candidateIds = [asId(splitData.panel1.character_id), asId(splitData.panel2.character_id), panel.character_id];
    const ownedCharacterIds = await filterOwnedCharacterIds(prisma, payload.userId, candidateIds);
    const pickCharacterId = (llmValue: unknown) =>
      [asId(llmValue), panel.character_id].find((id): id is string => !!id && ownedCharacterIds.has(id)) ?? null;
    const characterId1 = pickCharacterId(splitData.panel1.character_id);
    const characterId2 = pickCharacterId(splitData.panel2.character_id);

    // 使用事务删除旧 panel 并创建两个新 panel
    const newPanels = await prisma.$transaction(async (tx) => {
      await ensureProjectCharacters(tx, {
        projectId: panel.project_id,
        userId: payload.userId,
        characterIds: [characterId1, characterId2],
      });

      // 后续 panels 的 order 都要 +1 (使用 Prisma query 代替 raw SQL)
      await tx.panel.updateMany({
        where: {
          project_id: panel.project_id,
          panel_order: { gt: panel.panel_order },
        },
        data: {
          panel_order: { increment: 1 },
        },
      });

      // 创建第一个新 panel（替换原位置）
      const created1 = await tx.panel.create({
        data: {
          project_id: panel.project_id,
          panel_order: panel.panel_order,
          panel_type: splitData.panel1.panel_type,
          importance: splitData.panel1.importance,
          description: splitData.panel1.description,
          visual_prompt: splitData.panel1.visual_prompt || splitData.panel1.description,
          prompt_used: splitData.panel1.english_prompt,
          dialogue: splitData.panel1.dialogue || null,
          character_id: characterId1,
          emotion: splitData.panel1.emotion || null,
          camera_angle: splitData.panel1.camera_angle || null,
          shot_size: splitData.panel1.shot_size || null,
          script_segment_id: panel.script_segment_id,
          script_start: panel.script_start,
          script_end: panel.script_end ? Math.floor((panel.script_start || 0 + (panel.script_end || 0)) / 2) : null,
        },
      });

      // 创建第二个新 panel（插入到下一个位置）
      const created2 = await tx.panel.create({
        data: {
          project_id: panel.project_id,
          panel_order: panel.panel_order + 1,
          panel_type: splitData.panel2.panel_type,
          importance: splitData.panel2.importance,
          description: splitData.panel2.description,
          visual_prompt: splitData.panel2.visual_prompt || splitData.panel2.description,
          prompt_used: splitData.panel2.english_prompt,
          dialogue: splitData.panel2.dialogue || null,
          character_id: characterId2,
          emotion: splitData.panel2.emotion || null,
          camera_angle: splitData.panel2.camera_angle || null,
          shot_size: splitData.panel2.shot_size || null,
          script_segment_id: panel.script_segment_id,
          script_start: panel.script_end ? Math.floor((panel.script_start || 0 + (panel.script_end || 0)) / 2) : null,
          script_end: panel.script_end,
        },
      });

      // 删除原 panel
      await tx.panel.delete({
        where: { id: panel_id },
      });

      return [created1, created2];
    });

    return NextResponse.json({
      success: true,
      panels: newPanels,
      message: "分镜已拆分",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Split panel error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
