import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { logInfo, logError } from "@/lib/api-logger";
import type { CharacterRecommendation, CharacterDistribution, RecommendCharactersResponse } from "@/app/scripts/[id]/types/ai-recommendation";

/**
 * AI 角色推荐 API
 * Phase 2.1
 *
 * 分析剧本内容和现有角色，推荐需要添加的角色类型
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const storyId = params.id;
    logInfo("AI recommendation request received", { endpoint: "/api/story/[id]/recommend-characters", storyId });

    // 认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    userId = payload.userId;
    logInfo("User authenticated", { endpoint: "/api/story/[id]/recommend-characters", userId, storyId });

    // 获取剧本信息
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        story_characters: {
          include: {
            character: true,
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "剧本不存在" }, { status: 404 });
    }

    // 权限检查
    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    logInfo("Story data fetched", { endpoint: "/api/story/[id]/recommend-characters", userId, storyId, characterCount: story.story_characters.length });

    // 计算当前角色分布
    const distribution: CharacterDistribution = {
      protagonist: 0,
      antagonist: 0,
      supporting: 0,
      minor: 0,
    };

    story.story_characters.forEach((sc) => {
      const role = sc.role as keyof CharacterDistribution;
      if (role in distribution) {
        distribution[role]++;
      }
    });

    logInfo("Character distribution calculated", { endpoint: "/api/story/[id]/recommend-characters", userId, storyId, distribution });

    // 构建 AI 分析 prompt
    const systemPrompt = `你是一位资深的故事编剧和角色设计专家。你的任务是分析剧本内容和现有角色分布，推荐需要添加的角色类型。

角色类型说明：
- protagonist（主角）: 故事的核心人物，推动剧情发展
- antagonist（反派）: 对抗主角的角色，制造冲突
- supporting（配角）: 辅助剧情的角色，丰富故事层次
- minor（龙套）: 次要背景角色，填充场景

分析要点：
1. 一个完整的故事通常需要：1-2 个主角、1-2 个反派、3-5 个配角、若干龙套
2. 主角和反派的对立是故事冲突的核心
3. 配角可以是主角的盟友、导师、情感纽带等
4. 避免角色类型过于单一，影响故事丰富度

请返回 JSON 格式：
{
  "recommendations": [
    {
      "role": "antagonist",
      "reason": "剧本缺少反派角色，建议添加强大的对手制造冲突",
      "suggested_description": "一位野心勃勃的竞争者，与主角理念相悖，手段强硬",
      "priority": "high"
    }
  ]
}

优先级判断：
- high: 严重缺失，影响故事完整性（如无反派、无主角）
- medium: 建议添加，增强故事张力（如配角不足）
- low: 可选添加，丰富细节（如龙套较少）

最多返回 3 个推荐。`;

    const userPrompt = `请分析以下剧本并推荐需要添加的角色类型：

剧本标题：${story.title || "未命名"}
剧本类型：${story.genre || "未知"}
剧本长度：${(story as any).story_length || "未知"}

剧本大纲：
${story.outline || story.premise || "无大纲信息"}

当前角色分布：
- 主角：${distribution.protagonist} 个
- 反派：${distribution.antagonist} 个
- 配角：${distribution.supporting} 个
- 龙套：${distribution.minor} 个

现有角色列表：
${story.story_characters.map((sc, index) => `${index + 1}. ${sc.character.name}（${getRoleLabel(sc.role)}）${sc.character.description ? ` - ${sc.character.description}` : ""}`).join("\n")}

请基于以上信息，推荐最需要添加的角色类型（最多 3 个）。`;

    logInfo("Calling LLM for recommendations", { endpoint: "/api/story/[id]/recommend-characters", userId, storyId });

    // 调用 LLM
    const response = await callChatCompletionByType({
      providerType: "character_analyzer",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1000,
      options: {
        userId,
        skipCreditsCheck: false,
      },
    });

    logInfo("LLM response received", { endpoint: "/api/story/[id]/recommend-characters", userId, storyId, creditsCost: response.creditsCost });

    // 解析 LLM 响应
    let recommendations: CharacterRecommendation[] = [];
    try {
      const parsed = JSON.parse(response.content);
      recommendations = parsed.recommendations || [];
    } catch (parseError) {
      logError("Failed to parse LLM response", parseError, { endpoint: "/api/story/[id]/recommend-characters", userId, storyId, rawContent: response.content });

      // 回退：返回基于规则的推荐
      recommendations = generateRuleBasedRecommendations(distribution);
    }

    // 限制推荐数量
    recommendations = recommendations.slice(0, 3);

    const result: RecommendCharactersResponse = {
      recommendations,
      current_distribution: distribution,
      story_summary: String(story.premise || story.outline || ""),
    };

    logInfo("Recommendations generated successfully", {
      endpoint: "/api/story/[id]/recommend-characters",
      userId,
      storyId,
      recommendationCount: recommendations.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    logError("AI recommendation failed", error, {
      endpoint: "/api/story/[id]/recommend-characters",
      userId: userId || "unknown",
      storyId: params.id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "AI 推荐失败，请稍后重试" },
      { status: 500 }
    );
  }
}

/**
 * 基于规则的推荐（LLM 失败时的回退方案）
 */
function generateRuleBasedRecommendations(
  distribution: CharacterDistribution
): CharacterRecommendation[] {
  const recommendations: CharacterRecommendation[] = [];

  // 规则1: 无主角
  if (distribution.protagonist === 0) {
    recommendations.push({
      role: "protagonist",
      reason: "故事缺少主角，建议添加核心人物推动剧情",
      suggested_description: "勇敢、有目标的主人公，面对挑战不断成长",
      priority: "high",
    });
  }

  // 规则2: 无反派
  if (distribution.antagonist === 0) {
    recommendations.push({
      role: "antagonist",
      reason: "故事缺少反派角色，建议添加对手制造冲突",
      suggested_description: "强大的对手，与主角理念相悖，制造故事张力",
      priority: "high",
    });
  }

  // 规则3: 配角不足
  if (distribution.supporting < 2) {
    recommendations.push({
      role: "supporting",
      reason: "配角较少，建议添加辅助角色丰富剧情层次",
      suggested_description: "主角的盟友或导师，提供帮助和情感支持",
      priority: "medium",
    });
  }

  // 规则4: 主角过多
  if (distribution.protagonist > 2 && recommendations.length < 3) {
    recommendations.push({
      role: "supporting",
      reason: "主角较多，建议添加配角平衡角色层次",
      suggested_description: "辅助剧情的重要角色，连接主角与世界观",
      priority: "medium",
    });
  }

  // 规则5: 完全没有龙套（可选）
  if (distribution.minor === 0 && recommendations.length < 3) {
    recommendations.push({
      role: "minor",
      reason: "建议添加龙套角色填充场景，增加故事真实感",
      suggested_description: "背景角色，为故事世界增添生活气息",
      priority: "low",
    });
  }

  return recommendations.slice(0, 3);
}

/**
 * 获取角色类型标签
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    protagonist: "主角",
    antagonist: "反派",
    supporting: "配角",
    minor: "龙套",
  };
  return labels[role] || role;
}
