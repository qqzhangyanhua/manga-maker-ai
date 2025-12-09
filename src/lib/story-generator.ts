/**
 * Story Generator - Core logic for AI story generation
 */

import { callChatCompletionByType } from "./llm-provider";

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

const STORY_GENERATION_SYSTEM_PROMPT = `你是一位资深编剧和故事顾问,擅长创作各种类型的故事。

任务: 根据用户的创意前提,生成完整的故事大纲。

输出要求(严格JSON格式):
{
  "title": "故事标题",
  "genre": "类型(suspense/romance/adventure/scifi/daily/fantasy)",
  "logline": "一句话概括故事核心",
  "setting": "故事背景设定",
  "acts": [
    {
      "actNumber": 1,
      "name": "第一幕 - 建立",
      "summary": "本幕概述",
      "scenes": ["场景1描述", "场景2描述"],
      "keyEvents": ["关键事件1", "关键事件2"]
    },
    {
      "actNumber": 2,
      "name": "第二幕 - 对抗",
      "summary": "本幕概述",
      "scenes": ["场景1描述", "场景2描述"],
      "keyEvents": ["关键事件1", "关键事件2"]
    },
    {
      "actNumber": 3,
      "name": "第三幕 - 解决",
      "summary": "本幕概述",
      "scenes": ["场景1描述", "场景2描述"],
      "keyEvents": ["关键事件1", "关键事件2"]
    }
  ],
  "characters": [
    {
      "name": "角色名",
      "role": "protagonist/antagonist/supporting",
      "description": "角色描述(外貌、性格、背景)",
      "arc": "角色弧光(角色如何成长变化)",
      "traits": ["特质1", "特质2", "特质3"]
    }
  ],
  "themes": ["主题1", "主题2"]
}

规则:
1. 根据故事长度调整幕数和场景数:
   - short: 3幕, 每幕2-3个场景
   - medium: 3-4幕, 每幕3-5个场景
   - long: 5幕, 每幕4-6个场景
2. 角色数量根据用户要求,默认2-4个主要角色
3. 确保故事结构完整,有清晰的起承转合
4. 每个角色都要有明确的动机和目标
5. 主题要与故事内容紧密相关`;

/**
 * Generate story outline from premise
 */
export async function generateStoryOutline(
    premise: StoryPremise
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
    });

    try {
        const outline = JSON.parse(content);
        return outline as StoryOutline;
    } catch (error) {
        throw new Error(`Failed to parse story outline: ${content}`);
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
    storyContext?: string
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
    });

    try {
        const character = JSON.parse(content);
        return character as CharacterSetup;
    } catch (error) {
        throw new Error(`Failed to parse character setup: ${content}`);
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
    detailLevel: "brief" | "detailed" = "detailed"
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
    });

    try {
        const result = JSON.parse(content);
        return result.expandedScenes as ExpandedScene[];
    } catch (error) {
        throw new Error(`Failed to parse expanded scenes: ${content}`);
    }
}
