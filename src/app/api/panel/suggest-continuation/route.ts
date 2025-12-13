/**
 * AI 续写建议 API
 * POST /api/panel/suggest-continuation
 *
 * 基于当前故事上下文，AI 自动建议下一个分镜内容
 *
 * 请求体:
 * {
 *   project_id: string      // 项目ID
 *   after_panel_id?: string // 在哪个分镜之后续写（可选，默认最后一个）
 *   count?: number          // 建议数量（1-3，默认1）
 * }
 *
 * 返回:
 * {
 *   success: boolean
 *   suggestions: PanelSuggestion[]
 * }
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { recordGenerationLog } from "@/lib/generation-log";

export interface PanelSuggestion {
  description: string;
  visual_prompt: string;
  dialogue: string | null;
  emotion: string | null;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  reasoning: string;
}

interface SuggestionsResponse {
  suggestions: PanelSuggestion[];
}

const SYSTEM_PROMPT = `你是一位专业的漫画分镜师和故事续写专家。你的任务是基于现有的故事脉络和分镜内容，建议下一个分镜应该是什么。

你需要考虑：
1. 故事的连贯性和节奏
2. 场景转换的自然性
3. 角色情感的发展
4. 视觉叙事的表现力

对于每个建议，你需要提供：
- description: 分镜的简短描述（中文，20-50字）
- visual_prompt: 用于AI绘图的视觉描述（英文，详细描述画面内容、构图、氛围）
- dialogue: 该分镜中的对话（中文，可为null）
- emotion: 主要角色的情绪（如: happy, sad, angry, surprised, neutral等）
- camera_angle: 推荐的镜头角度（俯视/仰视/平视/荷兰角）
- shot_size: 推荐的景别（特写/近景/中景/全景/远景）
- panel_type: 分镜类型（wide/medium/closeup/action/dialogue/transition）
- reasoning: 为什么这样建议的简短理由（中文，1-2句话）

请以JSON格式返回，格式如下：
{
  "suggestions": [
    {
      "description": "...",
      "visual_prompt": "...",
      "dialogue": "..." 或 null,
      "emotion": "...",
      "camera_angle": "...",
      "shot_size": "...",
      "panel_type": "...",
      "reasoning": "..."
    }
  ]
}`;

export async function POST(req: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;

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
    userId = payload.userId;

    const body = await req.json();
    const { project_id, after_panel_id, count = 1 } = body;

    if (!project_id) {
      return NextResponse.json({ error: "缺少 project_id" }, { status: 400 });
    }

    const suggestionCount = Math.min(Math.max(1, count), 3);

    // 获取项目和分镜
    const project = await prisma.project.findUnique({
      where: { id: project_id },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
        },
        Story: true,
        script: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 确定续写位置
    let contextPanels = project.panels;
    if (after_panel_id) {
      const panelIndex = project.panels.findIndex(p => p.id === after_panel_id);
      if (panelIndex !== -1) {
        contextPanels = project.panels.slice(0, panelIndex + 1);
      }
    }

    // 构建上下文
    const contextSummary = buildContextSummary(project, contextPanels);

    // 调用 LLM
    const userPrompt = `
项目信息：
${contextSummary}

请基于以上故事上下文，建议接下来的 ${suggestionCount} 个分镜。
确保建议的分镜能够：
1. 自然承接前面的剧情
2. 推动故事发展
3. 保持视觉叙事的多样性（避免连续使用相同的镜头角度和景别）

请以JSON格式返回建议。`;

    const result = await callChatCompletionByType({
      providerType: "story_generator",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    // 解析响应
    let suggestions: PanelSuggestion[] = [];
    try {
      const content = result.content.trim();
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: SuggestionsResponse = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
      }
    } catch (parseError) {
      console.error("Failed to parse LLM response:", parseError);
      throw new Error("AI 返回格式解析失败，请重试");
    }

    // 记录日志
    await recordGenerationLog({
      userId,
      action: "panel_continuation_suggestion",
      providerType: "story_generator",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: { project_id, after_panel_id, count: suggestionCount },
      responsePayload: { suggestion_count: suggestions.length },
    });

    return NextResponse.json({
      success: true,
      suggestions,
      context: {
        total_panels: project.panels.length,
        context_panels: contextPanels.length,
      },
    });
  } catch (error) {
    console.error("Suggest continuation error:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "panel_continuation_suggestion",
        providerType: "story_generator",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 构建上下文摘要
 */
function buildContextSummary(
  project: {
    title: string;
    description: string | null;
    style: string | null;
    Story: { title: string; genre: string; premise: string } | null;
    script: { content: string } | null;
  },
  panels: {
    panel_order: number;
    description: string;
    dialogue: string | null;
    emotion: string | null;
    camera_angle: string | null;
    shot_size: string | null;
    panel_type: string;
  }[]
): string {
  const parts: string[] = [];

  // 项目基本信息
  parts.push(`【项目标题】${project.title}`);
  if (project.description) {
    parts.push(`【项目描述】${project.description}`);
  }
  if (project.style) {
    parts.push(`【风格】${project.style}`);
  }

  // 故事信息
  if (project.Story) {
    parts.push(`【故事标题】${project.Story.title}`);
    parts.push(`【故事类型】${project.Story.genre}`);
    if (project.Story.premise) {
      parts.push(`【故事梗概】${project.Story.premise}`);
    }
  }

  // 剧本内容（截取前500字）
  if (project.script?.content) {
    const scriptPreview = project.script.content.substring(0, 500);
    parts.push(`【剧本片段】${scriptPreview}${project.script.content.length > 500 ? '...' : ''}`);
  }

  // 现有分镜（最近5个）
  const recentPanels = panels.slice(-5);
  if (recentPanels.length > 0) {
    parts.push(`\n【现有分镜】（共${panels.length}格，显示最近${recentPanels.length}格）`);
    recentPanels.forEach((panel, idx) => {
      const panelNum = panels.length - recentPanels.length + idx + 1;
      parts.push(`第${panelNum}格: ${panel.description}`);
      if (panel.dialogue) {
        parts.push(`  对话: "${panel.dialogue}"`);
      }
      if (panel.emotion) {
        parts.push(`  情绪: ${panel.emotion}`);
      }
      parts.push(`  镜头: ${panel.camera_angle || '未设定'} / ${panel.shot_size || '未设定'} / ${panel.panel_type}`);
    });
  }

  return parts.join('\n');
}
