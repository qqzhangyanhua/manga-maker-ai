import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";

const systemPrompt = `你是一位资深的漫画分镜导演和AI绘画专家。

任务：将用户输入的故事描述拆解为2-12个连贯的漫画分镜。

输出要求（严格JSON格式）：
{
  "project_title": "项目标题（从故事中提取）",
  "style": "漫画风格（日式/美式/写实等）",
  "total_panels": 数量,
  "panels": [
    {
      "panel_order": 1,
      "panel_type": "wide/medium/closeup/action/dialogue/transition",
      "importance": "high/medium/low",
      "description": "中文场景描述，包含角色动作、表情、环境细节",
      "english_prompt": "English visual prompt for AI image generation, detailed and vivid",
      "character_name": "角色名（如有）",
      "emotion": "情绪（如：愤怒/悲伤/开心/平静）",
      "dialogue": "对白内容（如有）",
      "camera_angle": "俯视/仰视/平视/荷兰角",
      "shot_size": "特写/近景/中景/全景/远景"
    }
  ]
}

规则：
1. 根据故事长度和复杂度，生成2-12个分镜（简单故事2-4个，复杂故事8-12个）
2. 每个分镜必须同时包含：
   - description: 详细的中文场景描述
   - english_prompt: 适合AI绘画的英文提示词（包含画风、光影、构图）
3. 镜头类型分配：
   - wide: 开场/环境展示/过渡
   - closeup: 情绪特写/细节
   - action: 动作场景
   - dialogue: 对话场景
   - medium: 常规场景
   - transition: 场景转换
4. 英文prompt格式示例：
   "A lonely cat walking in neon-lit rainy city street at night, cyberpunk style, moody lighting, detailed fur texture, reflections on wet ground, cinematic composition, trending on artstation"
5. 确保分镜之间的连贯性和视觉引导`;

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
    const {
      story,
      panelCount,
      style,
      saveToDb = true,
    }: {
      story?: string;
      panelCount?: number;
      style?: string;
      saveToDb?: boolean;
    } = body;

    if (!story || typeof story !== "string") {
      return NextResponse.json({ error: "缺少故事描述 story" }, { status: 400 });
    }

    const userPrompt = `
故事描述：
${story}

参数：
- 目标分镜数量：${panelCount || "根据故事复杂度自动决定（2-12个）"}
- 漫画风格：${style || "根据故事内容推断"}

请严格按照JSON格式输出，确保每个分镜都有完整的中文描述和英文prompt。`;

    // 调用LLM生成分镜
    const { content } = await callChatCompletionByType({
      providerType: "storyboard",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 3000,
    });

    // 解析LLM返回的JSON
    let storyboardData;
    try {
      storyboardData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        {
          error: "LLM返回格式错误，请重试",
          raw_content: content
        },
        { status: 500 }
      );
    }

    // 保存到数据库
    if (saveToDb) {
      const project = await prisma.project.create({
        data: {
          user_id: payload.userId,
          title: storyboardData.project_title || "未命名项目",
          description: story,
          style: storyboardData.style || style || null,
          status: "draft",
          panels: {
            create: storyboardData.panels.map((panel: any) => ({
              panel_order: panel.panel_order,
              panel_type: panel.panel_type,
              importance: panel.importance,
              description: panel.description,
              dialogue: panel.dialogue || null,
              character_name: panel.character_name || null,
              emotion: panel.emotion || null,
              prompt_used: panel.english_prompt,
              generated_image: null, // 预留给图像生成
            })),
          },
        },
        include: {
          panels: {
            orderBy: { panel_order: "asc" },
          },
        },
      });

      return NextResponse.json({
        success: true,
        project,
        message: `成功生成 ${storyboardData.panels.length} 个分镜`,
      });
    }

    // 不保存，只返回生成结果
    return NextResponse.json({
      success: true,
      storyboard: storyboardData,
      message: `成功生成 ${storyboardData.panels.length} 个分镜`,
    });

  } catch (error) {
    console.error("Storyboard generation error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
