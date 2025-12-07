import { NextResponse } from "next/server";
import { callChatCompletionByType } from "@/lib/llm-provider";

const systemPrompt = `你是一位资深的漫画分镜导演。
任务：将用户输入的小说文本拆解为 4-6 个漫画分镜。
规则：
1) 提取角色外貌/穿着（若上下文有）。
2) 将心理活动转化为可视化的表情或肢体动作。
3) 提取对白并标注说话人。
4) 为每个分镜给出镜头语言（俯视/仰视/平视/荷兰角）、景别（特写/中景/全景等）、格子形状。
5) 输出 JSON，字段：project_title, style, panels[].id, text_source, panel_type, visual_description, characters[], dialogue{speaker,content}|null, sfx|null, composition_layout, camera, shot_size, pacing。
6) 动作/惊叹情绪 → 倾斜或不规则分镜；平静对白 → 规整矩形。
7) 视线引导：上一格角色视线或镜头移动方向应自然延续到下一格。`;

export async function POST(req: Request) {
  const body = await req.json();
  const {
    script,
    style,
    character,
    panelCount = 5,
    providerType = "storyboard",
  }: {
    script?: string;
    style?: string;
    character?: string;
    panelCount?: number;
    providerType?: string;
  } = body;

  if (!script || typeof script !== "string") {
    return NextResponse.json({ error: "缺少剧本文本 script" }, { status: 400 });
  }

  const userPrompt = `
用户文本：
${script}

补充参数：
- 目标分镜数量：${panelCount}
- 漫画风格：${style || "未指定，保持中性"}
- 角色类型：${character || "未指定，按文本推断"}

请严格输出 JSON，遵循字段规范。`;

  try {
    const { content, raw, provider } = await callChatCompletionByType({
      providerType,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 2000,
    });

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      // 如果无法解析，仍返回原始文本，交由前端提示
    }

    return NextResponse.json({
      provider: {
        id: provider.id,
        type: provider.provider_type,
        name: provider.provider_name,
        model: provider.model,
        base_url: provider.base_url,
      },
      result_text: content,
      result_parsed: parsed,
      raw,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
