import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { ensureDefaultChapter, ensureProjectCharacters, filterOwnedCharacterIds } from "@/lib/project";
import { panels } from "@/lib/project/chapter-panels";
import type { NewPanelInput, PanelInsertWhere } from "@/lib/project/chapter-panels";
import { callChatCompletionStreamByType } from "@/lib/llm-provider";

interface GeneratedPanelFields {
  panel_type?: string;
  importance?: string;
  description?: string;
  visual_prompt?: string;
  english_prompt?: string;
  dialogue?: string | null;
  character_id?: unknown;
  emotion?: string | null;
  camera_angle?: string | null;
  shot_size?: string | null;
}

const INSERT_ANCHOR_REQUIRED = "无法按序号定位分镜，请带上 insert_after_panel_id";

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

    let panelData: GeneratedPanelFields;

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
        const generated = readGeneratedPanel(JSON.parse(content) as unknown);
        if (!generated) {
          return NextResponse.json(
            { error: "LLM返回格式错误", raw_content: content },
            { status: 500 }
          );
        }
        panelData = generated;
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
    const libraryCharacterId = llmCharacterId && ownedCharacterIds.has(llmCharacterId) ? llmCharacterId : null;

    const newPanel = await prisma.$transaction(async (tx) => {
      const where = await resolveInsertWhere(tx, project_id, anchor?.id ?? null, insert_after_order);

      if (libraryCharacterId) {
        await ensureProjectCharacters(tx, {
          projectId: project_id,
          userId: payload.userId,
          characterIds: [libraryCharacterId],
        });
      }

      const writer = panels(project_id, { tx });
      const added = await writer.add(insertedPanelInput(panelData, description), where);
      const created = added[0];
      if (!created) {
        throw new Error("插入分镜失败");
      }

      if (libraryCharacterId) {
        const projectCharacter = await tx.projectCharacter.findUnique({
          where: {
            project_id_character_id: {
              project_id,
              character_id: libraryCharacterId,
            },
          },
          select: { id: true },
        });
        if (!projectCharacter) {
          throw new ApiError(400, "INVALID_CHARACTER", "角色不存在或不属于当前用户");
        }
        await writer.setLead([created.id], projectCharacter.id);
      }

      const panel = await tx.panel.findUnique({ where: { id: created.id } });
      if (!panel) {
        throw new Error("插入分镜失败");
      }
      return panel;
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

function readGeneratedPanel(value: unknown): GeneratedPanelFields | null {
  if (!isRecord(value)) return null;
  return {
    panel_type: readOptionalString(value.panel_type),
    importance: readOptionalString(value.importance),
    description: readOptionalString(value.description),
    visual_prompt: readOptionalString(value.visual_prompt),
    english_prompt: readOptionalString(value.english_prompt),
    dialogue: readOptionalString(value.dialogue) ?? null,
    character_id: value.character_id,
    emotion: readOptionalString(value.emotion) ?? null,
    camera_angle: readOptionalString(value.camera_angle) ?? null,
    shot_size: readOptionalString(value.shot_size) ?? null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function insertedPanelInput(panelData: GeneratedPanelFields, fallbackDescription: string): NewPanelInput {
  return {
    panelType: panelData.panel_type || "medium",
    importance: panelData.importance || "medium",
    description: panelData.description || fallbackDescription,
    visualPrompt: panelData.visual_prompt || panelData.description || fallbackDescription,
    promptUsed: panelData.english_prompt,
    dialogue: panelData.dialogue || null,
    emotion: panelData.emotion || null,
    cameraAngle: panelData.camera_angle || null,
    shotSize: panelData.shot_size || null,
  };
}

// 有锚点就接在那一格后面。没有锚点时，0 表示默认章的章首；序号全项目恰好一格才接在它后面。
async function resolveInsertWhere(
  tx: Prisma.TransactionClient,
  projectId: string,
  anchorId: string | null,
  insertAfterOrder: number,
): Promise<PanelInsertWhere> {
  if (anchorId) {
    return { after: anchorId };
  }
  if (insertAfterOrder === 0) {
    const chapterId = await ensureDefaultChapter(tx, projectId);
    return { chapter: chapterId, index: 0 };
  }
  const matches = await tx.panel.findMany({
    where: { project_id: projectId, panel_order: insertAfterOrder },
    select: { id: true },
  });
  const match = matches.length === 1 ? matches[0] : undefined;
  if (!match) {
    throw new ApiError(400, "AMBIGUOUS_PANEL_ORDER", INSERT_ANCHOR_REQUIRED);
  }
  return { after: match.id };
}
