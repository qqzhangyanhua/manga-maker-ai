import { NextRequest, NextResponse } from "next/server";
import { callChatCompletionByType } from "@/lib/llm-provider";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, style, character } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "请提供有效的描述文本" },
        { status: 400 }
      );
    }

    const systemPrompt = `你是一位专业的漫画创作顾问，擅长将简单的场景描述优化为详细、富有画面感的漫画提示词。

你的任务是分析用户的原始描述，然后：
1. **保留核心意图**：不改变用户想表达的主要场景和情感
2. **增强视觉细节**：添加具体的动作、表情、环境、光影、构图等细节
3. **提升表现力**：使用更生动的形容词和漫画术语
4. **适配风格**：根据选择的漫画风格调整描述风格

输出格式（JSON）：
{
  "analysis": "对原始描述的简短分析（不超过50字）",
  "optimized": "优化后的完整描述（80-200字）",
  "suggestions": ["建议1", "建议2", "建议3"]
}

注意：
- 优化后的描述应该是一段流畅的文字，不是关键词堆砌
- 建议要具体可操作，比如"可以添加环境细节"而不是"可以改进"
- 保持中文输出`;

    const userMessage = `
原始描述：${prompt}
${style ? `选择的风格：${style}` : ""}
${character ? `选择的角色：${character}` : ""}

请分析并优化这段描述，返回 JSON 格式。`;

    const result = await callChatCompletionByType({
      providerType: "prompt_optimizer",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      maxTokens: 800,
    });

    // 尝试解析 JSON
    let parsed;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("未找到 JSON 格式");
      }
    } catch (e) {
      // 如果解析失败，返回原始内容
      return NextResponse.json({
        analysis: "描述过于简单，缺少视觉细节",
        optimized: result.content.trim(),
        suggestions: [
          "添加具体的动作和表情",
          "描述环境和氛围",
          "增加光影和构图细节",
        ],
      });
    }

    return NextResponse.json({
      analysis: parsed.analysis || "已分析完成",
      optimized: parsed.optimized || result.content,
      suggestions: parsed.suggestions || [],
      original: prompt,
    });
  } catch (error: any) {
    console.error("[Prompt Optimize Error]", error);

    if (error.message?.includes("未找到可用的模型配置")) {
      return NextResponse.json(
        {
          error: "AI 优化功能未配置",
          hint: '请在管理后台添加 provider_type="prompt_optimizer" 的 LLM 配置',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "AI 优化失败，请稍后再试" },
      { status: 500 }
    );
  }
}
