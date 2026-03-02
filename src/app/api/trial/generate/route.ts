import { NextRequest } from "next/server";
import {
  checkRateLimit,
  incrementRateLimit,
  checkGlobalLimit,
  incrementGlobalLimit,
} from "@/lib/rate-limit";
import { storeTrialResult } from "@/lib/trial-store";
import { callChatCompletionStreamByType } from "@/lib/llm-provider";

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

interface StreamEvent {
  type: "progress" | "chunk" | "panels" | "done" | "error";
  progress?: number;
  text?: string;
  chunk?: string;
  panels?: TrialPanel[];
  remainingTrials?: number;
  trialId?: string;
  message?: string;
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

// 生成带描述文本的占位图 URL（试用模式不调用真实图像生成 API）
function generatePanelImages(
  descriptions: string[],
  _stylePrompt: string
): string[] {
  return descriptions.map((desc, i) => {
    const colors = [
      { bg: "1a1a2e", fg: "e2e2e2" },
      { bg: "16213e", fg: "e2e2e2" },
      { bg: "0f3460", fg: "e2e2e2" },
      { bg: "533483", fg: "e2e2e2" },
    ];
    const color = colors[i % colors.length];
    const shortDesc = desc.length > 30 ? desc.slice(0, 30) + "..." : desc;
    const encodedDesc = encodeURIComponent(shortDesc);
    return `https://placehold.co/512x512/${color.bg}/${color.fg}?text=${encodedDesc}&font=noto`;
  });
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const sendEvent = (controller: ReadableStreamDefaultController, data: StreamEvent) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = (await request.json()) as TrialGenerateRequest;
        const { prompt, styleId = "manga", fingerprint } = body;

        // 验证参数
        if (!prompt || prompt.trim().length < 10) {
          sendEvent(controller, {
            type: "error",
            message: "故事描述太短，至少需要 10 个字符",
          });
          controller.close();
          return;
        }

        if (!fingerprint) {
          sendEvent(controller, {
            type: "error",
            message: "缺少必要参数",
          });
          controller.close();
          return;
        }

        // 检查频率限制
        const rateLimit = checkRateLimit(fingerprint, 3);
        if (!rateLimit.allowed) {
          sendEvent(controller, {
            type: "error",
            message: "今日体验次数已用完，请注册账号获取更多配额",
          });
          controller.close();
          return;
        }

        // 检查全局限制
        if (!checkGlobalLimit(1000)) {
          sendEvent(controller, {
            type: "error",
            message: "服务繁忙，请稍后重试",
          });
          controller.close();
          return;
        }

        sendEvent(controller, {
          type: "progress",
          progress: 10,
          text: "正在分析你的故事创意...",
        });

        const systemPrompt = `你是一个漫画分镜师。用户会给你一个故事想法，你需要将它转换为4格漫画的分镜描述。

硬性要求：
- 只输出 JSON 数组，不要添加解释、前后缀或 markdown 代码块
- 每格描述中文 50-100 字，保持起承转合，禁止涉黄/暴力/政治/真实人物/网址

要求：
1. 每格描述要简洁明了，包含场景、角色动作和表情
2. 4格要形成完整的叙事（起承转合）
3. 描述要适合 AI 图像生成，包含视觉细节
4. 每格描述不超过 100 字

输出格式（JSON数组）：
["第1格描述", "第2格描述", "第3格描述", "第4格描述"]

只输出 JSON 数组，不要其他内容。`;

        let accumulatedContent = "";

        sendEvent(controller, {
          type: "progress",
          progress: 30,
          text: "AI 正在构思分镜剧情...",
        });

        // 调用 LLM 流式生成分镜描述
        for await (const chunk of callChatCompletionStreamByType({
          providerType: "story_generator",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `故事想法：<story>${prompt}</story>\n漫画风格：${styleId}` },
          ],
          temperature: 0.8,
          maxTokens: 1000,
          options: {
            skipCreditsCheck: true, // 试用功能不消耗用户算力
          },
        })) {
          accumulatedContent += chunk;
          sendEvent(controller, {
            type: "chunk",
            chunk,
          });
        }

        // 解析 JSON 响应
        const content = accumulatedContent.trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error("LLM 响应格式错误");
        }

        const descriptions = JSON.parse(jsonMatch[0]) as string[];
        if (!Array.isArray(descriptions) || descriptions.length !== 4) {
          throw new Error("分镜数量不正确");
        }

        sendEvent(controller, {
          type: "progress",
          progress: 60,
          text: "正在生成分镜图像...",
        });

        // 生成图像
        const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.manga;
        const imageUrls = generatePanelImages(descriptions, stylePrompt);

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

        sendEvent(controller, {
          type: "panels",
          panels,
          remainingTrials: rateLimit.remaining - 1,
          trialId,
        });

        sendEvent(controller, {
          type: "done",
          message: "生成完成",
        });

        controller.close();
      } catch (error) {
        console.error("体验生成失败:", error);
        sendEvent(controller, {
          type: "error",
          message: error instanceof Error ? error.message : "生成失败，请稍后重试",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
