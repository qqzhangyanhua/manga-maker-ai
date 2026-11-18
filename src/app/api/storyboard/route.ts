import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { Prisma, prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { QuotaExceededError, assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { findStoryProject } from "@/lib/project";

const systemPrompt = `你是一位资深的漫画分镜导演和AI绘画专家。

任务：将用户输入的故事描述拆解为2-12个连贯的漫画分镜，并提供剧本分段信息。

硬性要求（严格遵守）：
- 只输出 JSON，不要加入任何解释、前后缀、markdown 代码块或多余文本
- 字段使用半角双引号，避免全角标点；空值用 null；不要新增未定义字段
- panel 数量根据故事复杂度 2-12 个；描述字段控制在合理长度：description 80-150 字中文，visual_prompt 20-60 字中文，english_prompt 80-180 英文字符

输出格式：
{
  "project_title": "项目标题（从故事中提取）",
  "style": "漫画风格（日式/美式/写实等）",
  "total_panels": 数量,
  "script_segments": [
    {
      "id": "seg_1",
      "text": "原文片段（从故事中提取的完整句子或段落）",
      "start": 0,
      "end": 50
    }
  ],
  "panels": [
    {
      "panel_order": 1,
      "script_segment_id": "seg_1",
      "script_start": 0,
      "script_end": 50,
      "panel_type": "wide/medium/closeup/action/dialogue/transition",
      "importance": "high/medium/low",
      "description": "中文场景描述，包含角色动作、表情、环境细节（80-150字）",
      "visual_prompt": "简化的可编辑视觉描述（20-60字中文，更简洁易懂）",
      "english_prompt": "English visual prompt for AI image generation, detailed and vivid (80-180 chars)",
      "character_id": "角色UUID（如果故事有关联角色）",
      "emotion": "情绪（如：愤怒/悲伤/开心/平静）",
      "dialogue": "对白内容（如有）",
      "camera_angle": "俯视/仰视/平视/荷兰角",
      "shot_size": "特写/近景/中景/全景/远景"
    }
  ]
}

规则：
1. 根据故事长度和复杂度，生成2-12个分镜（简单故事2-4个，复杂故事8-12个）
2. script_segments: 将原文按分镜需要切分为片段，每个片段对应一个或多个分镜，text 必须直接摘自原文
3. 每个 panel 必须包含：
   - script_segment_id: 关联到对应的剧本片段
   - script_start/script_end: 记录在原文中的字符位置
   - description: 详细的中文场景描述（供AI理解）
   - visual_prompt: 简化版描述（供用户编辑）
   - english_prompt: 适合AI绘画的英文提示词（包含画风、光影、构图）
   - camera_angle: 必填（俯视/仰视/平视/荷兰角）
   - shot_size: 必填（特写/近景/中景/全景/远景）
4. 镜头类型分配：
   - wide: 开场/环境展示/过渡
   - closeup: 情绪特写/细节
   - action: 动作场景
   - dialogue: 对话场景
   - medium: 常规场景
   - transition: 场景转换
5. 英文 prompt 格式示例：
   "A lonely cat walking in neon-lit rainy city street at night, cyberpunk style, moody lighting, detailed fur texture, reflections on wet ground, cinematic composition, trending on artstation"
6. 禁止输出涉黄、暴力、政治等不合规内容；确保分镜连贯`;

export async function POST(req: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let usageSnapshot: { count: number; limit: number } | null = null;

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
    userId = payload.userId;

    const body = await req.json();
    const {
      story,
      panelCount,
      style,
      saveToDb = true,
      storyId,
    }: {
      story?: string;
      panelCount?: number;
      style?: string;
      saveToDb?: boolean;
      storyId?: string;
    } = body;

    if (!story || typeof story !== "string") {
      return NextResponse.json({ error: "缺少故事描述 story" }, { status: 400 });
    }

    if (storyId) {
      const linkedStory = await prisma.story.findUnique({
        where: { id: storyId },
        select: { user_id: true },
      });
      if (!linkedStory) {
        return NextResponse.json({ error: "关联的故事不存在" }, { status: 404 });
      }
      if (linkedStory.user_id !== userId) {
        return NextResponse.json({ error: "无权关联该故事" }, { status: 403 });
      }
    }

    // 配额校验
    try {
      usageSnapshot = await assertAndIncrementUsage({
        userId,
        action: "storyboard_generation",
        providerType: "storyboard",
      });
    } catch (quotaError) {
      if (quotaError instanceof QuotaExceededError) {
        return NextResponse.json(
          {
            error: quotaError.message,
            code: quotaError.code,
            limit: quotaError.limit,
            used: quotaError.count,
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    const userPrompt = `
<story>${story}</story>
参数：
- 目标分镜数量：${panelCount || "根据故事复杂度自动决定（2-12个）"}
- 漫画风格：${style || "根据故事内容推断"}

请只输出符合上方格式的 JSON，不要添加任何解释或多余文本。`;

    // 调用LLM生成分镜
    const { content } = await callChatCompletionByType({
      providerType: "storyboard",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 3000,
      options: {
        userId,
      },
    });

    // 解析LLM返回的JSON
    let storyboardData: Record<string, unknown>;
    try {
      storyboardData = JSON.parse(content) as Record<string, unknown>;
    } catch {
      await recordGenerationLog({
        userId,
        action: "storyboard_generation",
        providerType: "storyboard",
        status: "failed",
        durationMs: Date.now() - startedAt,
        requestPayload: { story, panelCount, style, saveToDb },
        responsePayload: { raw: content },
        errorMessage: "LLM返回格式错误",
      });

      return NextResponse.json(
        {
          error: "LLM返回格式错误，请重试",
          raw_content: content
        },
        { status: 500 }
      );
    }

    const panels = Array.isArray(storyboardData.panels) ? storyboardData.panels : [];

    // 保存到数据库
    if (saveToDb) {
      const projectTitle = typeof storyboardData.project_title === "string" ? storyboardData.project_title : "未命名项目";
      const storyboardStyle = typeof storyboardData.style === "string" ? storyboardData.style : undefined;
      const scriptSegments = Array.isArray(storyboardData.script_segments) ? storyboardData.script_segments : null;
      const asString = (value: unknown) => (typeof value === "string" ? value : undefined);
      const asNumber = (value: unknown) => (typeof value === "number" ? value : undefined);

      const validPanelTypes = ["wide", "medium", "closeup", "action", "dialogue", "transition"];
      const validImportanceLevels = ["high", "medium", "low"];

      const normalizedPanels = panels.map((panel, index) => {
        const panelData = panel as Record<string, unknown>;
        const dialogue = asString(panelData.dialogue);
        const shotSize = asString(panelData.shot_size);

        let panelType = asString(panelData.panel_type);
        if (!panelType || !validPanelTypes.includes(panelType)) {
          if (dialogue) {
            panelType = "dialogue";
          } else if (shotSize === "特写") {
            panelType = "closeup";
          } else if (index === 0) {
            panelType = "wide";
          } else {
            panelType = "medium";
          }
        }

        let importance = asString(panelData.importance);
        if (!importance || !validImportanceLevels.includes(importance)) {
          importance = "medium";
        }

        const description = asString(panelData.description) ?? "无描述";
        const englishPrompt = asString(panelData.english_prompt);
        const visualPrompt = asString(panelData.visual_prompt);
        const panelOrder = asNumber(panelData.panel_order) ?? index + 1;
        const scriptStart = asNumber(panelData.script_start);
        const scriptEnd = asNumber(panelData.script_end);

        return {
          panel_order: panelOrder,
          panel_type: panelType,
          importance: importance,
          description: description,
          dialogue: dialogue ?? null,
          character_id: asString(panelData.character_id) ?? null,
          emotion: asString(panelData.emotion) ?? null,
          prompt_used: englishPrompt ?? description,
          generated_image: null,
          script_segment_id: asString(panelData.script_segment_id) ?? null,
          script_start: scriptStart ?? null,
          script_end: scriptEnd ?? null,
          camera_angle: asString(panelData.camera_angle) ?? null,
          shot_size: shotSize ?? null,
          visual_prompt: visualPrompt ?? description,
        };
      });

      const scriptCreate = scriptSegments
        ? { create: { content: story, segments: scriptSegments as Prisma.InputJsonValue } }
        : undefined;
      const include = {
        panels: { orderBy: { panel_order: "asc" as const } },
        script: true,
      };

      // 一个故事只有一个主项目（ADR-0004）：主项目还是空的就把分镜写进去；
      // 已经有分镜或剧本时另建一个不关联故事的独立项目，不覆盖已有创作
      const storyProject = storyId ? await findStoryProject(prisma, storyId) : null;
      const fillStoryProject =
        storyProject !== null &&
        (await prisma.project.findFirst({
          where: { id: storyProject.id, panels: { none: {} }, script: { is: null } },
          select: { id: true },
        })) !== null;

      const project = fillStoryProject && storyProject
        ? await prisma.project.update({
            where: { id: storyProject.id },
            data: {
              description: storyProject.description ?? story,
              style: storyProject.style ?? storyboardStyle ?? style ?? null,
              updated_at: new Date(),
              panels: { create: normalizedPanels },
              script: scriptCreate,
            },
            include,
          })
        : await prisma.project.create({
            data: {
              user_id: payload.userId,
              title: projectTitle,
              description: story,
              style: storyboardStyle ?? style ?? null,
              status: "draft",
              // 只有故事还没有主项目时（触发器未部署的库）才关联故事
              story_id: storyId && !storyProject ? storyId : null,
              panels: { create: normalizedPanels },
              script: scriptCreate,
            },
            include,
          });

      await recordGenerationLog({
        userId,
        action: "storyboard_generation",
        providerType: "storyboard",
        status: "success",
        projectId: project.id,
        durationMs: Date.now() - startedAt,
        requestPayload: { story, panelCount, style, saveToDb, storyId },
        responsePayload: {
          project_id: project.id,
          panel_count: panels.length,
        },
      });

      return NextResponse.json({
        success: true,
        project,
        usage: usageSnapshot,
        message: `成功生成 ${panels.length} 个分镜`,
      });
    }

    await recordGenerationLog({
      userId,
      action: "storyboard_generation",
      providerType: "storyboard",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: { story, panelCount, style, saveToDb },
      responsePayload: {
        panel_count: panels.length,
      },
    });

    // 不保存，只返回生成结果
    return NextResponse.json({
      success: true,
      storyboard: storyboardData,
      usage: usageSnapshot,
      message: `成功生成 ${panels.length} 个分镜`,
    });

  } catch (error) {
    console.error("Storyboard generation error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    if (userId) {
      await recordGenerationLog({
        userId,
        action: "storyboard_generation",
        providerType: "storyboard",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
