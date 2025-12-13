import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  incrementRateLimit,
  checkGlobalLimit,
  incrementGlobalLimit,
} from "@/lib/rate-limit";
import { storeTrialResult } from "@/lib/trial-store";
import { callChatCompletionByType } from "@/lib/llm-provider";

interface TrialGenerateRequest {
  prompt: string;
  styleId?: string;
  fingerprint: string;
}

interface TrialPanel {
  order: number;
  description: string;
  imageUrl: string;
}

interface TrialGenerateResponse {
  success: boolean;
  panels: TrialPanel[];
  remainingTrials: number;
  trialId: string;
  error?: string;
}

// 生成唯一的 trial ID
function generateTrialId(): string {
  return `trial_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// 风格映射到提示词
const STYLE_PROMPTS: Record<string, string> = {
  manga: "Japanese manga style, black and white, screentone shading, dynamic action lines",
  american: "American comic book style, bold colors, strong shadows, superhero aesthetic",
  webtoon: "Korean webtoon style, vertical format, soft colors, clean linework",
};

// 调用 LLM 生成分镜描述
async function generatePanelDescriptions(
  prompt: string,
  styleId: string
): Promise<{ descriptions: string[]; error?: string }> {
  const systemPrompt = `你是一个漫画分镜师。用户会给你一个故事想法，你需要将它转换为4格漫画的分镜描述。

要求：
1. 每格描述要简洁明了，包含场景、角色动作和表情
2. 4格要形成完整的叙事（起承转合）
3. 描述要适合 AI 图像生成，包含视觉细节
4. 每格描述不超过 100 字

输出格式（JSON数组）：
["第1格描述", "第2格描述", "第3格描述", "第4格描述"]

只输出 JSON 数组，不要其他内容。`;

  try {
    const result = await callChatCompletionByType({
      providerType: "story_generator",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `故事想法：${prompt}\n漫画风格：${styleId}` },
      ],
      temperature: 0.8,
      maxTokens: 1000,
    });

    // 解析 JSON 响应
    const content = result.content.trim();
    // 尝试提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("LLM 响应格式错误");
    }

    const descriptions = JSON.parse(jsonMatch[0]) as string[];
    if (!Array.isArray(descriptions) || descriptions.length !== 4) {
      throw new Error("分镜数量不正确");
    }

    return { descriptions };
  } catch (error) {
    console.error("生成分镜描述失败:", error);
    return {
      descriptions: [],
      error: error instanceof Error ? error.message : "生成失败",
    };
  }
}

// 调用图像生成 API
async function generatePanelImages(
  descriptions: string[],
  stylePrompt: string
): Promise<string[]> {
  // TODO: 集成实际的图像生成 API
  // 当前返回占位图 URL
  const placeholderImages = [
    "https://placehold.co/400x400/1a1a2e/ffffff?text=Panel+1",
    "https://placehold.co/400x400/16213e/ffffff?text=Panel+2",
    "https://placehold.co/400x400/0f3460/ffffff?text=Panel+3",
    "https://placehold.co/400x400/e94560/ffffff?text=Panel+4",
  ];

  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 实际实现应该调用图像生成服务
  // const imageUrls = await Promise.all(
  //   descriptions.map(async (desc) => {
  //     const fullPrompt = `${desc}, ${stylePrompt}`;
  //     return await callImageGeneration(fullPrompt);
  //   })
  // );

  return placeholderImages;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<TrialGenerateResponse>> {
  try {
    const body = (await request.json()) as TrialGenerateRequest;
    const { prompt, styleId = "manga", fingerprint } = body;

    // 验证参数
    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          panels: [],
          remainingTrials: 0,
          trialId: "",
          error: "故事描述太短，至少需要 10 个字符",
        },
        { status: 400 }
      );
    }

    if (!fingerprint) {
      return NextResponse.json(
        {
          success: false,
          panels: [],
          remainingTrials: 0,
          trialId: "",
          error: "缺少必要参数",
        },
        { status: 400 }
      );
    }

    // 检查频率限制
    const rateLimit = checkRateLimit(fingerprint, 3);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          panels: [],
          remainingTrials: 0,
          trialId: "",
          error: "今日体验次数已用完，请注册账号获取更多配额",
        },
        { status: 429 }
      );
    }

    // 检查全局限制
    if (!checkGlobalLimit(1000)) {
      return NextResponse.json(
        {
          success: false,
          panels: [],
          remainingTrials: rateLimit.remaining,
          trialId: "",
          error: "服务繁忙，请稍后重试",
        },
        { status: 503 }
      );
    }

    // 生成分镜描述
    const { descriptions, error: descError } = await generatePanelDescriptions(
      prompt,
      styleId
    );

    if (descError || descriptions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          panels: [],
          remainingTrials: rateLimit.remaining,
          trialId: "",
          error: descError || "生成分镜失败",
        },
        { status: 500 }
      );
    }

    // 生成图像
    const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.manga;
    const imageUrls = await generatePanelImages(descriptions, stylePrompt);

    // 增加计数
    incrementRateLimit(fingerprint);
    incrementGlobalLimit();

    // 构建响应
    const panels: TrialPanel[] = descriptions.map((desc, index) => ({
      order: index + 1,
      description: desc,
      imageUrl: imageUrls[index] || "",
    }));

    const trialId = generateTrialId();

    // 存储结果以便注册后关联
    storeTrialResult({
      id: trialId,
      prompt,
      styleId,
      panels,
      fingerprint,
    });

    return NextResponse.json({
      success: true,
      panels,
      remainingTrials: rateLimit.remaining - 1,
      trialId,
    });
  } catch (error) {
    console.error("体验生成失败:", error);
    return NextResponse.json(
      {
        success: false,
        panels: [],
        remainingTrials: 0,
        trialId: "",
        error: "生成失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}
