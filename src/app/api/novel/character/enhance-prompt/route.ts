/**
 * POST /api/novel/character/enhance-prompt
 * AI 强化角色描述提示词
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { logInfo, logError } from "@/lib/api-logger";
import type {
  EnhancePromptRequest,
  EnhancePromptResponse,
} from "./types";

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 2. 解析请求体
    const body = (await req.json()) as EnhancePromptRequest;
    const {
      characterName,
      characterDescription,
      traits = [],
      basePrompt = "",
    } = body;

    // 验证必需字段
    if (!characterName || !characterDescription) {
      return NextResponse.json(
        { error: "缺少必需字段：characterName, characterDescription" },
        { status: 400 }
      );
    }

    logInfo("开始强化提示词", {
      endpoint: "/api/novel/character/enhance-prompt",
      userId: payload.userId,
      characterName,
    });

    // 3. 构建 LLM 提示词
    const systemPrompt = `你是一个专业的角色形象描述专家，擅长将角色描述转换为适合 AI 绘画的详细提示词。

要求：
1. 包含外貌特征（年龄、性别、发型、发色、服装、身材）
2. 包含气质和风格
3. 使用英文关键词，用逗号分隔
4. 避免抽象概念，使用具体描述
5. 适合 Stable Diffusion 模型生成角色立绘
6. 不要包含背景描述，只专注角色本身

格式示例：
young woman, 20 years old, long black hair, blue eyes, wearing white dress, elegant, gentle smile, standing pose`;

    const userPrompt = `角色名称: ${characterName}
角色描述: ${characterDescription}
${traits.length > 0 ? `性格特质: ${traits.join(", ")}` : ""}
${basePrompt ? `初始提示词: ${basePrompt}` : ""}

请生成适合 Stable Diffusion 的角色形象提示词，只返回提示词本身，不要添加其他说明。`;

    // 4. 调用 LLM API
    const llmResponse = await callChatCompletionByType({
      providerType: "prompt_enhancement",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 500,
      options: { userId: payload.userId },
    });

    const enhancedPrompt = llmResponse.content.trim();

    logInfo("提示词强化成功", {
      characterName,
      originalLength: characterDescription.length,
      enhancedLength: enhancedPrompt.length,
      durationMs: Date.now() - startedAt,
    });

    // 5. 提取建议关键词（从增强后的提示词中提取前 5 个关键词）
    const suggestions = enhancedPrompt
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 5);

    // 6. 返回响应
    const response: EnhancePromptResponse = {
      success: true,
      enhancedPrompt,
      suggestions,
      message: "提示词强化成功",
    };

    return NextResponse.json(response);
  } catch (error) {
    logError("强化提示词失败", error, {
      durationMs: Date.now() - startedAt,
    });

    // 如果是算力不足错误，返回特定错误信息
    if (error instanceof Error && error.message.includes("算力不足")) {
      return NextResponse.json(
        { error: error.message },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: "强化提示词失败，请稍后重试" },
      { status: 500 }
    );
  }
}
