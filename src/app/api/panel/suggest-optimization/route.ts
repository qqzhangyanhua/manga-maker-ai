/**
 * AI 分镜优化建议 API
 * POST /api/panel/suggest-optimization
 *
 * 分析当前分镜，推荐镜头角度、景别、构图等优化建议
 *
 * 请求体:
 * {
 *   panel_id: string  // 要优化的分镜ID
 * }
 *
 * 返回:
 * {
 *   success: boolean
 *   optimization: PanelOptimization
 * }
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionStreamByType } from "@/lib/llm-provider";
import { recordGenerationLog } from "@/lib/generation-log";

export interface PanelOptimization {
  // 当前分析
  current_analysis: {
    strengths: string[];
    weaknesses: string[];
  };
  // 推荐的镜头设置
  recommended_camera: {
    angle: string;
    angle_reason: string;
  };
  recommended_shot: {
    size: string;
    size_reason: string;
  };
  recommended_panel_type: {
    type: string;
    type_reason: string;
  };
  // 优化后的视觉提示词
  optimized_visual_prompt: string;
  // 构图建议
  composition_tips: string[];
  // 情绪增强建议
  emotion_enhancement: string | null;
  // 整体评分 (1-10)
  current_score: number;
  potential_score: number;
}

const SYSTEM_PROMPT = `你是一位专业的漫画分镜师和视觉叙事专家。你的任务是分析给定的分镜内容，并提供专业的优化建议。

你需要从以下几个维度分析和优化：

1. **镜头角度 (camera_angle)**
   - 俯视: 表现压迫感、全局视角、渺小感
   - 仰视: 表现威严、高大、英雄感
   - 平视: 平等视角、日常对话、中性情感
   - 荷兰角: 紧张、不安、动态感

2. **景别 (shot_size)**
   - 特写: 情感特写、重要物品、紧张时刻
   - 近景: 对话场景、表情细节
   - 中景: 人物互动、动作展示
   - 全景: 环境交代、群体场景
   - 远景: 大场面、场景转换、史诗感

3. **分镜类型 (panel_type)**
   - wide: 宽幅画面，适合大场景
   - medium: 标准画面，通用场景
   - closeup: 特写画面，情感聚焦
   - action: 动作场景，动态构图
   - dialogue: 对话场景，角色互动
   - transition: 过渡画面，时空转换

4. **构图技巧**
   - 三分法构图
   - 对角线构图
   - 框架构图
   - 引导线
   - 留白运用

请以JSON格式返回分析结果：
{
  "current_analysis": {
    "strengths": ["优点1", "优点2"],
    "weaknesses": ["可改进点1", "可改进点2"]
  },
  "recommended_camera": {
    "angle": "俯视/仰视/平视/荷兰角",
    "angle_reason": "推荐理由"
  },
  "recommended_shot": {
    "size": "特写/近景/中景/全景/远景",
    "size_reason": "推荐理由"
  },
  "recommended_panel_type": {
    "type": "wide/medium/closeup/action/dialogue/transition",
    "type_reason": "推荐理由"
  },
  "optimized_visual_prompt": "优化后的英文视觉描述，更详细、更具表现力",
  "composition_tips": ["构图建议1", "构图建议2"],
  "emotion_enhancement": "情绪增强建议（如果适用）或 null",
  "current_score": 7,
  "potential_score": 9
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
    const { panel_id } = body;

    if (!panel_id) {
      return NextResponse.json({ error: "缺少 panel_id" }, { status: 400 });
    }

    // 获取分镜及其上下文
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: {
        project: {
          include: {
            panels: {
              orderBy: { panel_order: "asc" },
              take: 10, // 获取周围的分镜作为上下文
            },
            Story: true,
          },
        },
        character: true,
        scene: true,
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 找到当前分镜在序列中的位置
    const panelIndex = panel.project.panels.findIndex(p => p.id === panel_id);
    const prevPanel = panelIndex > 0 ? panel.project.panels[panelIndex - 1] : null;
    const nextPanel = panelIndex < panel.project.panels.length - 1 ? panel.project.panels[panelIndex + 1] : null;

    // 构建分析请求
    const userPrompt = buildAnalysisPrompt(panel, prevPanel, nextPanel);

    // 使用流式调用 LLM
    let accumulatedContent = "";
    for await (const chunk of callChatCompletionStreamByType({
      providerType: "story_generator",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 1500,
      options: {
        userId: userId!,
      },
    })) {
      accumulatedContent += chunk;
    }

    // 解析响应
    let optimization: PanelOptimization;
    try {
      const content = accumulatedContent.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        optimization = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法解析响应");
      }
    } catch (parseError) {
      console.error("Failed to parse LLM response:", parseError);
      throw new Error("AI 返回格式解析失败，请重试");
    }

    // 记录日志
    await recordGenerationLog({
      userId,
      action: "panel_optimization_suggestion",
      providerType: "story_generator",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: { panel_id },
      responsePayload: {
        current_score: optimization.current_score,
        potential_score: optimization.potential_score,
      },
    });

    return NextResponse.json({
      success: true,
      optimization,
      panel: {
        id: panel.id,
        description: panel.description,
        current_camera_angle: panel.camera_angle,
        current_shot_size: panel.shot_size,
        current_panel_type: panel.panel_type,
      },
    });
  } catch (error) {
    console.error("Suggest optimization error:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "panel_optimization_suggestion",
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
 * 构建分析请求
 */
function buildAnalysisPrompt(
  panel: {
    panel_order: number;
    description: string;
    visual_prompt: string | null;
    dialogue: string | null;
    emotion: string | null;
    camera_angle: string | null;
    shot_size: string | null;
    panel_type: string;
    character: { name: string } | null;
    scene: { name: string; scene_type: string } | null;
    project: {
      title: string;
      style: string | null;
      Story: { genre: string } | null;
    };
  },
  prevPanel: {
    description: string;
    camera_angle: string | null;
    shot_size: string | null;
    panel_type: string;
  } | null,
  nextPanel: {
    description: string;
    camera_angle: string | null;
    shot_size: string | null;
    panel_type: string;
  } | null
): string {
  const parts: string[] = [];

  // 项目上下文
  parts.push(`【项目】${panel.project.title}`);
  if (panel.project.style) {
    parts.push(`【风格】${panel.project.style}`);
  }
  if (panel.project.Story?.genre) {
    parts.push(`【类型】${panel.project.Story.genre}`);
  }

  // 前一个分镜（如果有）
  if (prevPanel) {
    parts.push(`\n【前一格分镜】`);
    parts.push(`描述: ${prevPanel.description}`);
    parts.push(`镜头: ${prevPanel.camera_angle || '未设定'} / ${prevPanel.shot_size || '未设定'} / ${prevPanel.panel_type}`);
  }

  // 当前分镜
  parts.push(`\n【当前分镜 - 第${panel.panel_order}格】（需要优化）`);
  parts.push(`描述: ${panel.description}`);
  if (panel.visual_prompt) {
    parts.push(`视觉提示词: ${panel.visual_prompt}`);
  }
  if (panel.dialogue) {
    parts.push(`对话: "${panel.dialogue}"`);
  }
  if (panel.emotion) {
    parts.push(`情绪: ${panel.emotion}`);
  }
  if (panel.character) {
    parts.push(`角色: ${panel.character.name}`);
  }
  if (panel.scene) {
    parts.push(`场景: ${panel.scene.name} (${panel.scene.scene_type})`);
  }
  parts.push(`当前镜头设置: ${panel.camera_angle || '未设定'} / ${panel.shot_size || '未设定'} / ${panel.panel_type}`);

  // 后一个分镜（如果有）
  if (nextPanel) {
    parts.push(`\n【后一格分镜】`);
    parts.push(`描述: ${nextPanel.description}`);
    parts.push(`镜头: ${nextPanel.camera_angle || '未设定'} / ${nextPanel.shot_size || '未设定'} / ${nextPanel.panel_type}`);
  }

  parts.push(`\n请分析当前分镜，并提供优化建议。注意要与前后分镜形成良好的视觉节奏，避免镜头设置过于单一。`);

  return parts.join('\n');
}
