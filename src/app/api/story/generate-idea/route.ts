import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { logInfo, logError } from "@/lib/api-logger";

const IDEA_GENERATION_SYSTEM_PROMPT = `你是一位富有创意的故事创作顾问。

任务: 生成一个引人入胜的故事创意，帮助用户开启创作灵感。

要求:
1. 创意要新颖独特，避免陈词滥调
2. 包含明确的主角、核心冲突和故事背景
3. 控制在150-200字以内
4. 富有画面感和情感张力
5. 适合改编为漫画或视觉作品

输出格式: 直接输出创意文本，不要添加标题或额外说明。

示例:
一个能看见他人寿命倒计时的少年，某天发现自己最好的朋友头顶显示的数字只剩下7天。为了改变命运，他开始追查死因，却发现真正的凶手竟然是自己未来的模样。在拯救朋友与面对自我之间，他必须做出艰难的选择。`;

const STORY_THEMES = [
    "时间循环",
    "身份互换",
    "平行世界",
    "失忆",
    "超能力觉醒",
    "神秘事件",
    "复仇",
    "寻找真相",
    "末日求生",
    "禁忌之恋",
    "校园悬疑",
    "科技失控",
    "魔法学院",
    "穿越重生",
    "都市奇幻",
];

export async function POST(req: Request) {
    const startedAt = Date.now();
    let userId: string | null = null;

    try {
        logInfo("Idea generation request received", { endpoint: "/api/story/generate-idea", method: "POST" });

        // Verify authentication (optional - allow unauthenticated requests for demo)
        const cookieStore = await cookies();
        const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

        if (token) {
            const payload = verifyAuthToken(token);
            if (payload?.userId) {
                userId = payload.userId;
                logInfo("User authenticated", { endpoint: "/api/story/generate-idea", userId });
            }
        }

        // Parse request body for optional theme hint
        let themeHint = "";
        try {
            const body = await req.json();
            themeHint = body.themeHint || "";
        } catch {
            // Empty body is fine
        }

        // Random theme selection if not provided
        const selectedTheme = themeHint || STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];

        const userPrompt = `请生成一个以"${selectedTheme}"为主题的故事创意。要确保创意新颖、引人入胜、适合视觉化呈现。`;

        logInfo("Starting idea generation", { endpoint: "/api/story/generate-idea", userId: userId || "anonymous", theme: selectedTheme });

        // Call LLM with skipCreditsCheck for free feature
        const { content } = await callChatCompletionByType({
            providerType: "story_generator",
            messages: [
                { role: "system", content: IDEA_GENERATION_SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.9, // Higher temperature for more creativity
            maxTokens: 300,
            options: { skipCreditsCheck: true }, // Free feature
        });

        logInfo("Idea generation completed", {
            endpoint: "/api/story/generate-idea",
            userId: userId || "anonymous",
            theme: selectedTheme,
            ideaLength: content.length,
            durationMs: Date.now() - startedAt
        });

        return NextResponse.json({
            success: true,
            idea: content.trim(),
            theme: selectedTheme,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        logError("Idea generation failed", error, {
            endpoint: "/api/story/generate-idea",
            userId: userId || "anonymous",
            durationMs: Date.now() - startedAt
        });

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
