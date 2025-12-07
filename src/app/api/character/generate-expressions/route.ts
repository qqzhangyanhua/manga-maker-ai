import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";

const EXPRESSION_TYPES = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "surprised",
  "shy",
  "confident",
  "worried",
  "determined",
];

const EXPRESSION_LABELS: Record<string, string> = {
  neutral: "平静",
  happy: "开心",
  sad: "悲伤",
  angry: "愤怒",
  surprised: "惊讶",
  shy: "害羞",
  confident: "自信",
  worried: "担忧",
  determined: "坚定",
};

// POST /api/character/generate-expressions - Generate expression matrix
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
    const { character_id, expression_type, generate_all } = body;

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

    // Determine which expressions to generate
    const expressionsToGenerate = generate_all
      ? EXPRESSION_TYPES
      : expression_type
      ? [expression_type]
      : [];

    if (expressionsToGenerate.length === 0) {
      return NextResponse.json(
        { error: "请指定要生成的表情类型" },
        { status: 400 }
      );
    }

    // Generate prompts for expressions
    const systemPrompt = `你是一个专业的角色表情设计师。请根据角色和表情类型生成详细的提示词。
要求：
1. 保持角色外观一致性
2. 突出表情的情感特征
3. 包含面部细节描述（眉毛、眼睛、嘴巴等）
4. 使用 portrait, close-up, facial expression 等关键词`;

    const expressions: Record<string, { prompt: string; image_url: string }> = {};

    for (const expType of expressionsToGenerate) {
      const userPrompt = `角色：${character.name}
描述：${character.description || ""}
表情类型：${EXPRESSION_LABELS[expType]}

请生成该表情的详细提示词，输出纯文本。`;

      try {
        const { content } = await callChatCompletionByType({
          providerType: "storyboard",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          maxTokens: 300,
        });

        expressions[expType] = {
          prompt: content.trim(),
          image_url: `/placeholder-${expType}.jpg`, // Replace with actual generated image
        };
      } catch (error) {
        console.error(`Failed to generate prompt for ${expType}:`, error);
        expressions[expType] = {
          prompt: `${character.name}, ${EXPRESSION_LABELS[expType]} expression, portrait, close-up`,
          image_url: `/placeholder-${expType}.jpg`,
        };
      }

      // Save to database
      await prisma.characterExpression.upsert({
        where: {
          character_id_expression_type: {
            character_id,
            expression_type: expType,
          },
        },
        update: {
          image_url: expressions[expType].image_url,
          prompt_suffix: expressions[expType].prompt,
        },
        create: {
          character_id,
          expression_type: expType,
          image_url: expressions[expType].image_url,
          prompt_suffix: expressions[expType].prompt,
        },
      });
    }

    return NextResponse.json({ expressions });
  } catch (error) {
    console.error("Generate expressions error:", error);
    return NextResponse.json(
      { error: "生成表情矩阵失败" },
      { status: 500 }
    );
  }
}
