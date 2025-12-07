import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";

// POST /api/character/outfits - Create new outfit for character
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
    const { character_id, outfit_name, outfit_type, description } = body;

    if (!character_id || !outfit_name || !outfit_type) {
      return NextResponse.json(
        { error: "角色ID、服装名称和类型不能为空" },
        { status: 400 }
      );
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

    // Generate prompt for outfit
    const systemPrompt = `你是一个专业的服装设计师。请根据角色和服装类型生成详细的服装描述提示词。
要求：
1. 保持角色外观一致性
2. 详细描述服装的款式、颜色、材质
3. 包含配饰和细节
4. 使用专业的服装设计术语`;

    const userPrompt = `角色：${character.name}
角色描述：${character.description || ""}
服装类型：${outfit_type}
服装名称：${outfit_name}
${description ? `附加描述：${description}` : ""}

请生成该服装的详细提示词修饰语（用于添加到角色生成提示词中），输出纯文本。`;

    let promptModifier = "";
    let triggerWord = "";

    try {
      const { content } = await callChatCompletionByType({
        providerType: "storyboard",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 500,
      });

      promptModifier = content.trim();
      triggerWord = outfit_type === "default" ? "" : `${outfit_type}_outfit`;
    } catch (error) {
      console.error("Failed to generate outfit prompt:", error);
      promptModifier = `wearing ${outfit_type} outfit, ${outfit_name}`;
      triggerWord = outfit_type === "default" ? "" : `${outfit_type}_outfit`;
    }

    // If setting as default, unset other defaults
    if (outfit_type === "default") {
      await prisma.characterOutfit.updateMany({
        where: {
          character_id,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    }

    // Create outfit
    const outfit = await prisma.characterOutfit.create({
      data: {
        character_id,
        outfit_name,
        outfit_type,
        prompt_modifier: promptModifier,
        trigger_word: triggerWord,
        is_default: outfit_type === "default",
        image_url: "/placeholder-outfit.jpg", // Replace with actual generated image
      },
    });

    return NextResponse.json({ outfit }, { status: 201 });
  } catch (error) {
    console.error("Create outfit error:", error);
    return NextResponse.json({ error: "创建服装失败" }, { status: 500 });
  }
}
