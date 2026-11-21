import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { panels } from "@/lib/project/chapter-panels";
import { migrateLegacyJsonSegments, readMigratedPanelSegmentIds } from "@/lib/script-segment";
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

    let splitData: { panel1: SplitHalf; panel2: SplitHalf };
    try {
      const parsed = readSplitPayload(JSON.parse(content) as unknown);
      if (!parsed) {
        return NextResponse.json(
          { error: "LLM返回数据不完整" },
          { status: 500 }
        );
      }
      splitData = parsed;
    } catch {
      return NextResponse.json(
        { error: "LLM返回格式错误", raw_content: content },
        { status: 500 }
      );
    }

    // 先迁旧 JSON，再把拆出来的格子指向章节上的片段。迁之前原格子还在，字符串 id 才指得到。
    await migrateLegacyJsonSegments(prisma, panel.project_id);
    const segmentId = (await readMigratedPanelSegmentIds(prisma, panel.project_id)).get(panel.id) ?? panel.segment_id;

    // 在场角色由模块从原分镜继承。0 + 的优先级高于 ||，中点会算偏，保持原表达式不要加括号。
    const splitPanels = await prisma.$transaction(async (tx) => {
      const created = await panels(panel.project_id, { tx }).split(panel_id, [
        {
          panelType: splitData.panel1.panel_type,
          importance: splitData.panel1.importance,
          description: splitData.panel1.description,
          visualPrompt: splitData.panel1.visual_prompt || splitData.panel1.description,
          promptUsed: splitData.panel1.english_prompt,
          dialogue: splitData.panel1.dialogue || null,
          emotion: splitData.panel1.emotion || null,
          cameraAngle: splitData.panel1.camera_angle || null,
          shotSize: splitData.panel1.shot_size || null,
          segmentId,
          scriptStart: panel.script_start,
          scriptEnd: panel.script_end ? Math.floor((panel.script_start || 0 + (panel.script_end || 0)) / 2) : null,
        },
        {
          panelType: splitData.panel2.panel_type,
          importance: splitData.panel2.importance,
          description: splitData.panel2.description,
          visualPrompt: splitData.panel2.visual_prompt || splitData.panel2.description,
          promptUsed: splitData.panel2.english_prompt,
          dialogue: splitData.panel2.dialogue || null,
          emotion: splitData.panel2.emotion || null,
          cameraAngle: splitData.panel2.camera_angle || null,
          shotSize: splitData.panel2.shot_size || null,
          segmentId,
          scriptStart: panel.script_end ? Math.floor((panel.script_start || 0 + (panel.script_end || 0)) / 2) : null,
          scriptEnd: panel.script_end,
        },
      ]);
      const ids = created.map((row) => row.id);
      const rows = await tx.panel.findMany({ where: { id: { in: ids } } });
      const order = new Map(ids.map((id, index) => [id, index]));
      rows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
      return rows;
    });

    return NextResponse.json({
      success: true,
      panels: splitPanels,
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

interface SplitHalf {
  panel_type?: string;
  importance?: string;
  description?: string;
  visual_prompt?: string;
  english_prompt?: string;
  dialogue?: string | null;
  emotion?: string | null;
  camera_angle?: string | null;
  shot_size?: string | null;
}

function readSplitPayload(value: unknown): { panel1: SplitHalf; panel2: SplitHalf } | null {
  if (!isRecord(value)) return null;
  const panel1 = readSplitHalf(value.panel1);
  const panel2 = readSplitHalf(value.panel2);
  if (!panel1 || !panel2) return null;
  return { panel1, panel2 };
}

function readSplitHalf(value: unknown): SplitHalf | null {
  if (!isRecord(value)) return null;
  return {
    panel_type: readOptionalString(value.panel_type),
    importance: readOptionalString(value.importance),
    description: readOptionalString(value.description),
    visual_prompt: readOptionalString(value.visual_prompt),
    english_prompt: readOptionalString(value.english_prompt),
    dialogue: readOptionalString(value.dialogue) ?? null,
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
