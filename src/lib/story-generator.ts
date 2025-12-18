/**
 * Story Generator - Core logic for AI story generation
 */

import { callChatCompletionByType, callChatCompletionStreamByType } from "./llm-provider";

export type StoryGenre = "suspense" | "romance" | "adventure" | "scifi" | "daily" | "fantasy";
export type StoryLength = "short" | "medium" | "long";

export interface StoryPremise {
    premise: string;
    genre?: StoryGenre;
    characterCount?: number;
    length?: StoryLength;
    templateId?: string;
}

export interface StoryCharacter {
    name: string;
    role: "protagonist" | "antagonist" | "supporting";
    description: string;
    arc?: string;
    traits?: string[];
}

export interface StoryAct {
    actNumber: number;
    name: string;
    summary: string;
    scenes: string[];
    keyEvents?: string[];
}

export interface StoryOutline {
    title: string;
    genre: string;
    logline: string;
    acts: StoryAct[];
    characters: StoryCharacter[];
    themes: string[];
    setting?: string;
}

const STORY_GENERATION_SYSTEM_PROMPT = `你是一位资深编剧和故事顾问,擅长创作各种类型的精彩故事。你深谙叙事技巧,能够创作出引人入胜、情节丰富、人物立体的完整故事大纲。

任务: 根据用户的创意前提,生成完整、详细、富有深度的故事大纲。

输出要求(严格JSON格式):
{
  "title": "故事标题（简洁有力,能吸引读者）",
  "genre": "类型(suspense/romance/adventure/scifi/daily/fantasy)",
  "logline": "一句话概括故事核心冲突和吸引力（30-50字,包含主角、目标、障碍）",
  "setting": "故事背景设定（时间、地点、世界观,100-150字,营造氛围）",
  "acts": [
    {
      "actNumber": 1,
      "name": "第一幕 - 建立（Setup）",
      "summary": "本幕概述（150-200字,包含主角日常、触发事件、选择冒险）",
      "scenes": [
        "场景1：详细描述（50-80字,包含地点、角色、核心冲突、情感基调）",
        "场景2：...",
        "场景3：..."
      ],
      "keyEvents": [
        "关键事件1：具体描述事件及其对故事的影响",
        "关键事件2：...",
        "情节点1：明确标注第一幕结尾的重大转折"
      ],
      "conflicts": ["本幕呈现的主要冲突1", "冲突2"],
      "characterDevelopment": "本幕中角色的状态和初步发展"
    },
    {
      "actNumber": 2,
      "name": "第二幕A - 对抗/上升（Confrontation）",
      "summary": "本幕概述（150-200字）",
      "scenes": ["场景1", "场景2", "场景3", "场景4"],
      "keyEvents": ["关键事件1", "关键事件2", "中点：故事的重大转折"],
      "conflicts": ["本幕升级的冲突"],
      "characterDevelopment": "角色面对挑战,开始成长"
    },
    {
      "actNumber": 3,
      "name": "第二幕B - 低谷/危机（Crisis）",
      "summary": "本幕概述（150-200字,主角遭遇最大挫折）",
      "scenes": ["场景1", "场景2", "场景3"],
      "keyEvents": ["关键事件1", "至暗时刻：主角最大的失败", "情节点2：决心反击"],
      "conflicts": ["本幕的绝境困境"],
      "characterDevelopment": "角色内心转变,获得成长顿悟"
    },
    {
      "actNumber": 4,
      "name": "第三幕 - 解决/高潮（Resolution）",
      "summary": "本幕概述（150-200字,主角运用成长对抗终极挑战）",
      "scenes": ["场景1：最终准备", "场景2：高潮对决", "场景3：结局余韵"],
      "keyEvents": ["关键事件1：决战开始", "高潮：终极对决", "结局：新世界"],
      "conflicts": ["终极冲突的解决"],
      "characterDevelopment": "角色完成弧光,展现成长后的全新自我"
    }
  ],
  "characters": [
    {
      "name": "角色名",
      "role": "protagonist/antagonist/supporting",
      "description": "详细角色描述（外貌特征、性格特点、背景故事,100-150字）",
      "arc": "角色弧光（从什么状态→经历什么→成长为什么,80-120字）",
      "traits": ["特质1（如：固执）", "特质2（如：善良）", "特质3（如：机智）"],
      "motivation": "核心动机（角色为什么要做这件事）",
      "conflict": "内在冲突（角色内心的矛盾）",
      "relationships": ["与角色X的关系", "与角色Y的关系"],
      "visualHint": "视觉提示（简短描述便于后续绘画,如：红发少年、黑色风衣侦探）"
    }
  ],
  "themes": ["主题1（如：成长与自我认同）", "主题2（如：真相的代价）"],
  "plotTwists": ["情节转折1：在第X幕揭示的反转", "转折2：..."],
  "worldBuilding": "世界观补充（如有特殊设定,如科幻世界规则、魔法体系等）"
}

创作规则:
1. 故事结构要完整严谨（起承转合,三幕/四幕结构）:
   - short: 3幕, 每幕3-4个场景,总计10-12个场景
   - medium: 4幕, 每幕4-6个场景,总计18-24个场景
   - long: 5幕, 每幕5-8个场景,总计30-40个场景

2. 情节密度要高,富有张力:
   - 每个场景要有明确目标和冲突
   - 关键事件要推动剧情发展
   - 必须包含明确的情节点（Plot Points）：情节点1、中点、至暗时刻、情节点2
   - 设置至少2-3个情节转折/反转

3. 角色要立体丰满:
   - 每个主要角色都要有清晰的动机、目标、冲突
   - 主角必须有完整的角色弧光（成长变化）
   - 角色间要有复杂的关系网络
   - 反派/对手也要有合理动机,不能脸谱化

4. 冲突要层次分明:
   - 外在冲突（主角 vs 对手/环境）
   - 内在冲突（主角内心的矛盾挣扎）
   - 人际冲突（主角与盟友/家人的分歧）

5. 主题要深刻且贯穿全文,不要流于表面

6. 场景描述要具体生动:
   - 包含环境氛围
   - 角色情感状态
   - 关键动作/对话意图

7. 确保逻辑自洽,前后呼应,伏笔与回收完整

请创作一个引人入胜、情节紧凑、人物鲜活、富有深度的完整故事大纲！`;

/**
 * Try to fix common JSON syntax errors and extract JSON from markdown
 */
function fixJsonSyntax(jsonString: string): string {
    let fixed = jsonString.trim();

    // Remove markdown code block wrappers (```json ... ``` or ``` ... ```)
    fixed = fixed.replace(/^```(?:json)?\s*\n?/g, '');
    fixed = fixed.replace(/\n?```\s*$/g, '');
    fixed = fixed.trim();

    // Fix missing colons in object properties (e.g., "keyEvents [" -> "keyEvents": [)
    fixed = fixed.replace(/"(\w+)"\s+(\[|\{)/g, '"$1": $2');

    // Remove trailing commas before closing braces/brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Fix missing commas between array elements
    fixed = fixed.replace(/"\s+"([^"])/g, '", "$1');

    return fixed;
}

/**
 * Generate story outline from premise
 */
export async function generateStoryOutline(
    premise: StoryPremise,
    userId?: string
): Promise<StoryOutline> {
    const { premise: idea, genre, characterCount, length, templateId } = premise;

    const userPrompt = `
创意前提: ${idea}

参数:
- 类型: ${genre || "根据创意自动判断"}
- 角色数量: ${characterCount || "2-4个主要角色"}
- 故事长度: ${length || "medium"}
${templateId ? `- 使用模板ID: ${templateId}` : ""}

请严格按照JSON格式输出完整的故事大纲。`;

    const { content } = await callChatCompletionByType({
        providerType: "story_generator",
        messages: [
            { role: "system", content: STORY_GENERATION_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        maxTokens: 3000,
        options: userId ? { userId } : { skipCreditsCheck: true },
    });

    try {
        // Try to parse original content
        const outline = JSON.parse(content);
        return outline as StoryOutline;
    } catch (error) {
        // Try to fix common syntax errors and parse again
        try {
            const fixedContent = fixJsonSyntax(content);
            const outline = JSON.parse(fixedContent);
            console.log("⚠️ JSON syntax fixed automatically");
            return outline as StoryOutline;
        } catch (retryError) {
            console.error("Original JSON:", content);
            console.error("Fixed attempt JSON:", fixJsonSyntax(content));
            throw new Error(`Failed to parse story outline after fix attempts: ${content.substring(0, 500)}...`);
        }
    }
}

/**
 * Generate story outline from premise with streaming
 * @param premise Story premise
 * @param onChunk Callback for each text chunk
 * @param userId User ID for credits
 * @returns Complete story outline after streaming
 */
export async function generateStoryOutlineStream(
    premise: StoryPremise,
    onChunk: (chunk: string) => void,
    userId?: string
): Promise<StoryOutline> {
    const { premise: idea, genre, characterCount, length, templateId } = premise;

    const userPrompt = `
创意前提: ${idea}

参数:
- 类型: ${genre || "根据创意自动判断"}
- 角色数量: ${characterCount || "2-4个主要角色"}
- 故事长度: ${length || "medium"}
${templateId ? `- 使用模板ID: ${templateId}` : ""}

请严格按照JSON格式输出完整的故事大纲。`;

    let accumulatedContent = "";

    for await (const chunk of callChatCompletionStreamByType({
        providerType: "story_generator",
        messages: [
            { role: "system", content: STORY_GENERATION_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        maxTokens: 3000,
        options: userId ? { userId } : { skipCreditsCheck: true },
    })) {
        accumulatedContent += chunk;
        onChunk(chunk);
    }

    try {
        // Try to parse original content
        const outline = JSON.parse(accumulatedContent);
        return outline as StoryOutline;
    } catch (error) {
        // Try to fix common syntax errors and parse again
        try {
            const fixedContent = fixJsonSyntax(accumulatedContent);
            const outline = JSON.parse(fixedContent);
            console.log("⚠️ JSON syntax fixed automatically");
            return outline as StoryOutline;
        } catch (retryError) {
            console.error("Original JSON:", accumulatedContent);
            console.error("Fixed attempt JSON:", fixJsonSyntax(accumulatedContent));
            throw new Error(`Failed to parse story outline after fix attempts: ${accumulatedContent.substring(0, 500)}...`);
        }
    }
}

const CHARACTER_SETUP_SYSTEM_PROMPT = `你是一位角色设计专家。

任务: 根据角色描述,生成详细的角色设定。

输出JSON格式:
{
  "name": "角色名",
  "role": "protagonist/antagonist/supporting",
  "description": "详细描述(外貌、性格、背景)",
  "arc": "角色弧光",
  "traits": ["特质1", "特质2", "特质3"],
  "goals": "角色目标",
  "conflicts": "内在/外在冲突",
  "relationships": ["与其他角色的关系"],
  "visualDescription": "视觉描述(用于AI绘画)"
}`;

export interface CharacterSetup extends StoryCharacter {
    goals?: string;
    conflicts?: string;
    relationships?: string[];
    visualDescription?: string;
}

/**
 * Generate detailed character setup
 */
export async function generateCharacterSetup(
    characterDescription: string,
    storyContext?: string,
    userId?: string
): Promise<CharacterSetup> {
    const userPrompt = `
角色描述: ${characterDescription}
${storyContext ? `\n故事背景: ${storyContext}` : ""}

请生成详细的角色设定。`;

    const { content } = await callChatCompletionByType({
        providerType: "story_generator",
        messages: [
            { role: "system", content: CHARACTER_SETUP_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 1500,
        options: userId ? { userId } : { skipCreditsCheck: true },
    });

    try {
        const character = JSON.parse(content);
        return character as CharacterSetup;
    } catch (error) {
        throw new Error(`Failed to parse character setup: ${content}`);
    }
}

/**
 * Generate detailed character setup (streaming version)
 */
export async function generateCharacterSetupStream(
    characterDescription: string,
    onChunk: (chunk: string) => void,
    storyContext?: string,
    userId?: string
): Promise<CharacterSetup> {
    const userPrompt = `
角色描述: ${characterDescription}
${storyContext ? `\n故事背景: ${storyContext}` : ""}

请生成详细的角色设定。`;

    let accumulatedContent = "";

    for await (const chunk of callChatCompletionStreamByType({
        providerType: "story_generator",
        messages: [
            { role: "system", content: CHARACTER_SETUP_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 1500,
        options: userId ? { userId } : { skipCreditsCheck: true },
    })) {
        accumulatedContent += chunk;
        onChunk(chunk);
    }

    try {
        const character = JSON.parse(accumulatedContent);
        return character as CharacterSetup;
    } catch (error) {
        throw new Error(`Failed to parse character setup: ${accumulatedContent}`);
    }
}

const STORY_EXPANSION_SYSTEM_PROMPT = `你是一位故事扩展专家。

任务: 将简要的场景描述扩展为详细的剧情内容。

输出JSON格式:
{
  "expandedScenes": [
    {
      "sceneNumber": 1,
      "title": "场景标题",
      "setting": "场景设定",
      "description": "详细描述",
      "characters": ["出场角色"],
      "dialogue": ["关键对话"],
      "action": "动作描述",
      "emotion": "情绪氛围"
    }
  ]
}`;

export interface ExpandedScene {
    sceneNumber: number;
    title: string;
    setting: string;
    description: string;
    characters: string[];
    dialogue?: string[];
    action: string;
    emotion: string;
}

/**
 * Expand story act with detailed scenes
 */
export async function expandStoryAct(
    act: StoryAct,
    characters: StoryCharacter[],
    detailLevel: "brief" | "detailed" = "detailed",
    userId?: string
): Promise<ExpandedScene[]> {
    const userPrompt = `
幕次: ${act.name}
概述: ${act.summary}
场景列表: ${act.scenes.join(", ")}
角色: ${characters.map((c) => c.name).join(", ")}
详细程度: ${detailLevel}

请将每个场景扩展为详细内容。`;

    const { content } = await callChatCompletionByType({
        providerType: "story_generator",
        messages: [
            { role: "system", content: STORY_EXPANSION_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 2500,
        options: userId ? { userId } : { skipCreditsCheck: true },
    });

    try {
        const result = JSON.parse(content);
        return result.expandedScenes as ExpandedScene[];
    } catch (error) {
        throw new Error(`Failed to parse expanded scenes: ${content}`);
    }
}

/**
 * Expand story act with detailed scenes (streaming version)
 */
export async function expandStoryActStream(
    act: StoryAct,
    characters: StoryCharacter[],
    onChunk: (chunk: string) => void,
    detailLevel: "brief" | "detailed" = "detailed",
    userId?: string
): Promise<ExpandedScene[]> {
    const userPrompt = `
幕次: ${act.name}
概述: ${act.summary}
场景列表: ${act.scenes.join(", ")}
角色: ${characters.map((c) => c.name).join(", ")}
详细程度: ${detailLevel}

请将每个场景扩展为详细内容。`;

    let accumulatedContent = "";

    for await (const chunk of callChatCompletionStreamByType({
        providerType: "story_generator",
        messages: [
            { role: "system", content: STORY_EXPANSION_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 2500,
        options: userId ? { userId } : { skipCreditsCheck: true },
    })) {
        accumulatedContent += chunk;
        onChunk(chunk);
    }

    try {
        const result = JSON.parse(accumulatedContent);
        return result.expandedScenes as ExpandedScene[];
    } catch (error) {
        throw new Error(`Failed to parse expanded scenes: ${accumulatedContent}`);
    }
}
