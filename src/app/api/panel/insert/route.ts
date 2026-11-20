import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { ensureDefaultChapter, ensureProjectCharacters, filterOwnedCharacterIds } from "@/lib/project";
import { callChatCompletionStreamByType } from "@/lib/llm-provider";

const insertSystemPrompt = `你是一位专业的漫画分镜编辑。

任务：根据用户描述创建一个新的分镜，用于插入到现有分镜序列中。

输出要求（严格JSON格式）：
{
  "panel_type": "wide/medium/closeup/action/dialogue/transition",
  "importance": "high/medium/low",
  "description": "新分镜的中文场景描述",
  "visual_prompt": "新分镜的简化视觉描述",
  "english_prompt": "New panel English prompt for AI generation",
  "dialogue": "对白（如有）",
  "character_name": "角色名（如有）",
  "emotion": "情绪",
  "camera_angle": "俯视/仰视/平视/荷兰角",
  "shot_size": "特写/近景/中景/全景/远景"
}

规则：
1. 根据用户的描述创建合适的分镜
2. 如果是过渡镜头，importance 应为 low，type 为 transition
3. 如果是特写镜头，shot_size 应为特写，type 为 closeup
4. 确保新分镜与上下文分镜有良好的衔接`;

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
    const { project_id, insert_after_order, insert_after_panel_id, description, use_llm = true } = body;

    if (!project_id) {
      return NextResponse.json({ error: "缺少 project_id" }, { status: 400 });
    }

    if (typeof insert_after_order !== "number") {
      return NextResponse.json({ error: "缺少 insert_after_order" }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: "缺少 description" }, { status: 400 });
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

    // 插入到末尾时带上阅读顺序最后一格的 id。章节各自从 1 编号后，panel_order 不再能唯一定位一格。
    const anchorId = typeof insert_after_panel_id === "string" ? insert_after_panel_id : "";
    const anchor = anchorId
      ? await prisma.panel.findFirst({
          where: { id: anchorId, project_id },
          select: { id: true, chapter_id: true, panel_order: true },
        })
      : null;
    if (anchorId && !anchor) {
      return NextResponse.json({ error: "未找到要接在后面的分镜" }, { status: 404 });
    }
    const insertAfterOrder = anchor?.panel_order ?? insert_after_order;

    // 获取上下文分镜（用于提供更好的上下文）。有锚点时只看那一章。
    const contextPanels = await prisma.panel.findMany({
      where: {
        project_id,
        ...(anchor ? { chapter_id: anchor.chapter_id } : {}),
        panel_order: {
          in: [insertAfterOrder, insertAfterOrder + 1],
        },
      },
      orderBy: { panel_order: "asc" },
    });

    let panelData;

    if (use_llm) {
      // 调用 LLM 生成分镜
      const contextInfo = contextPanels.length > 0
        ? `\n\n上下文分镜：\n${contextPanels.map((p, i) => `分镜${i + 1}（order=${p.panel_order}）: ${p.description}`).join("\n")}`
        : "";

      const userPrompt = `
请根据以下描述创建一个新的分镜：

${description}
${contextInfo}

这个分镜将插入到 order=${insertAfterOrder} 之后。

请输出新分镜的JSON。`;

      let content = "";
      for await (const chunk of callChatCompletionStreamByType({
        providerType: "storyboard",
        messages: [
          { role: "system", content: insertSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 1000,
        options: {
          userId: payload.userId,
        },
      })) {
        content += chunk;
      }

      try {
        panelData = JSON.parse(content);
      } catch {
        return NextResponse.json(
          { error: "LLM返回格式错误", raw_content: content },
          { status: 500 }
        );
      }
    } else {
      // 不使用 LLM，直接使用用户提供的描述
      panelData = {
        panel_type: "medium",
        importance: "medium",
        description,
        visual_prompt: description,
        english_prompt: description,
        dialogue: null,
        character_id: null,
        emotion: null,
        camera_angle: "平视",
        shot_size: "中景",
      };
    }

    // LLM 给出的角色 ID 只保留当前用户角色库中的，其余视为未绑定
    const llmCharacterId = typeof panelData.character_id === "string" ? panelData.character_id : null;
    const ownedCharacterIds = await filterOwnedCharacterIds(prisma, payload.userId, [llmCharacterId]);
    const characterId = llmCharacterId && ownedCharacterIds.has(llmCharacterId) ? llmCharacterId : null;

    // 使用事务插入新 panel
    const newPanel = await prisma.$transaction(async (tx) => {
      await ensureProjectCharacters(tx, {
        projectId: project_id,
        userId: payload.userId,
        characterIds: [characterId],
      });

      // 有锚点时新分镜留在那一章，只平移这一章。否则仍按项目范围的 panel_order。
      const chapterId = anchor
        ? anchor.chapter_id
        : contextPanels.find((p) => p.panel_order === insertAfterOrder)?.chapter_id ??
          contextPanels[0]?.chapter_id ??
          (await ensureDefaultChapter(tx, project_id));

      if (anchor) {
        await tx.$executeRaw`
          UPDATE panels
          SET panel_order = panel_order + 1
          WHERE project_id = ${project_id}::uuid
          AND chapter_id = ${anchor.chapter_id}::uuid
          AND panel_order > ${insertAfterOrder}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE panels
          SET panel_order = panel_order + 1
          WHERE project_id = ${project_id}::uuid
          AND panel_order > ${insertAfterOrder}
        `;
      }

      // 创建新 panel
      const created = await tx.panel.create({
        data: {
          project_id,
          chapter_id: chapterId,
          panel_order: insertAfterOrder + 1,
          panel_type: panelData.panel_type,
          importance: panelData.importance,
          description: panelData.description,
          visual_prompt: panelData.visual_prompt || panelData.description,
          prompt_used: panelData.english_prompt,
          dialogue: panelData.dialogue || null,
          character_id: characterId,
          emotion: panelData.emotion || null,
          camera_angle: panelData.camera_angle || null,
          shot_size: panelData.shot_size || null,
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      panel: newPanel,
      message: "分镜已插入",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Insert panel error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
