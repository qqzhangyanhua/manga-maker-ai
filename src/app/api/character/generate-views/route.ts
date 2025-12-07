import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";

// POST /api/character/generate-views - Generate three-view images (front, side, back)
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body = await req.json();
    const { character_id, description } = body;

    if (!character_id) {
      return NextResponse.json({ error: "角色ID不能为空" }, { status: 400 });
    }

    // Verify character ownership
    const character = await prisma.character.findFirst({
      where: {
        id: character_id,
        user_id: payload.userId,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    // Generate prompt for three-view character sheet
    const systemPrompt = `你是一个专业的角色设计师。请根据角色描述生成详细的三视图（正面、侧面、背面）提示词。
要求：
1. 保持角色外观的一致性
2. 使用专业的角色设计术语
3. 明确指定视角（front view, side view, back view）
4. 包含服装、发型、配饰等细节
5. 使用 character sheet, turnaround, reference sheet 等关键词`;

    const userPrompt = `角色描述：${description || character.description || character.name}

请生成三视图的提示词，输出JSON格式：
{
  "front": "正面视图的详细提示词",
  "side": "侧面视图的详细提示词",
  "back": "背面视图的详细提示词"
}`;

    const { content } = await callChatCompletionByType({
      providerType: "storyboard",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    let prompts: { front: string; side: string; back: string };
    try {
      prompts = JSON.parse(content);
    } catch {
      // Fallback prompts
      const basePrompt = `${description || character.name}, character sheet, turnaround reference, white background, professional character design`;
      prompts = {
        front: `${basePrompt}, front view`,
        side: `${basePrompt}, side view`,
        back: `${basePrompt}, back view`,
      };
    }

    // In production, you would call Stable Diffusion API here
    // For now, we'll return the prompts and placeholder URLs
    const views = {
      front: {
        prompt: prompts.front,
        image_url: "/placeholder-front.jpg", // Replace with actual generated image
      },
      side: {
        prompt: prompts.side,
        image_url: "/placeholder-side.jpg",
      },
      back: {
        prompt: prompts.back,
        image_url: "/placeholder-back.jpg",
      },
    };

    // Save to database
    for (const [viewType, viewData] of Object.entries(views)) {
      await prisma.characterView.upsert({
        where: {
          character_id_view_type: {
            character_id,
            view_type: viewType,
          },
        },
        update: {
          image_url: viewData.image_url,
        },
        create: {
          character_id,
          view_type: viewType,
          image_url: viewData.image_url,
        },
      });
    }

    return NextResponse.json({ views, prompts });
  } catch (error) {
    console.error("Generate views error:", error);
    return NextResponse.json(
      { error: "生成三视图失败" },
      { status: 500 }
    );
  }
}
