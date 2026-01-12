import { TemplateCategory, TemplateData } from "@/types/template";

type TemplatePreset = {
  name: string;
  description: string;
  panel_count: number;
  tags: string[];
  template_data: TemplateData;
  thumbnail_url?: string | null;
};

const makePanels = (configs: Array<{
  panel_type?: string | null;
  camera_angle?: string | null;
  shot_size?: string | null;
  importance?: "high" | "medium" | "low" | null;
}>): TemplateData["panels"] =>
  configs.map((panel, index) => ({
    panel_type: panel.panel_type ?? "medium",
    camera_angle: panel.camera_angle ?? null,
    shot_size: panel.shot_size ?? null,
    importance: panel.importance ?? "medium",
    relative_position: index,
  }));

const makeMeta = (category: TemplateCategory, opts: Omit<NonNullable<TemplateData["meta"]>, "category">) => ({
  category,
  ...opts,
});

export const officialTemplatePresets: TemplatePreset[] = [
  {
    name: "四格日常",
    description: "适合轻松日常/校园/生活段子，节奏快，对白短。",
    panel_count: 4,
    tags: ["四格", "日常", "轻松"],
    template_data: {
      meta: makeMeta("four", {
        recommendedPanelCount: 4,
        styleHint: "日常、校园、温馨、轻松",
        loglineExample: "主角试图在教室里藏住一只小猫，却被同桌发现。",
        beats: [
          { title: "设定", summary: "场景和角色登场，提出小冲突" },
          { title: "推进", summary: "尝试解决，出现意外" },
          { title: "反转", summary: "意外升级/误会放大" },
          { title: "收束", summary: "轻量反转或温馨落点" },
        ],
        dialogueGuidelines: {
          maxLinesPerBubble: 2,
          maxCharsPerBubble: 18,
          tone: "轻松、口语化",
        },
        cameraPlan: { wide: 1, medium: 2, closeup: 1 },
        layoutPresets: ["four-grid"],
        recommendedGenres: ["slice-of-life", "comedy", "school"],
        complexityLevel: "newbie",
        autoFill: { applyBeatsToStory: true, applyCameraToPanels: true, applyPromptSnippets: true },
        locks: { layout: true, beatCount: true },
        isFeatured: true,
      }),
      panels: makePanels([
        { panel_type: "establishing", shot_size: "medium" },
        { panel_type: "dialogue", shot_size: "medium" },
        { panel_type: "reaction", shot_size: "closeup" },
        { panel_type: "punchline", shot_size: "wide" },
      ]),
    },
  },
  {
    name: "短篇冒险",
    description: "6-8 格内完成一个小冒险或战斗，适合少年漫节奏。",
    panel_count: 8,
    tags: ["冒险", "战斗", "节奏快"],
    template_data: {
      meta: makeMeta("short", {
        recommendedPanelCount: 8,
        styleHint: "少年冒险，紧凑节奏，强调动作与情绪",
        loglineExample: "主角潜入遗迹抢夺能量核心，却被守护者拦截。",
        beats: [
          { title: "引入", summary: "目标/地点/危险明示" },
          { title: "进入", summary: "迈入危险区域，氛围营造" },
          { title: "冲突", summary: "遭遇阻碍或敌人，短促交锋" },
          { title: "升级", summary: "环境或敌人进化，紧张加码" },
          { title: "反制", summary: "主角机智/能力释放" },
          { title: "解决", summary: "目标达成或失败落点" },
          { title: "余波", summary: "代价/线索/伏笔" },
          { title: "收束", summary: "短促情绪落点" },
        ],
        dialogueGuidelines: {
          maxLinesPerBubble: 2,
          maxCharsPerBubble: 20,
          tone: "简洁有力，动作优先",
          tips: ["使用动词+拟声", "尽量避免长句"],
        },
        cameraPlan: { wide: 2, medium: 3, closeup: 3, special: ["倾斜/仰视用于压迫"] },
        promptSnippets: ["动态光影", "运动模糊", "速度线", "碎石飞溅"],
        negativePrompts: ["模糊", "解剖错误"],
        layoutPresets: ["two-column", "hero-splash"],
        recommendedGenres: ["adventure", "action", "sci-fi"],
        recommendedCharacters: { min: 1, max: 3, relationshipTips: "核心主角 + 同行/对手" },
        complexityLevel: "pro",
        autoFill: { applyBeatsToStory: true, applyCameraToPanels: true, applyPromptSnippets: true },
      }),
      panels: makePanels([
        { panel_type: "establishing", shot_size: "wide" },
        { panel_type: "build-up", shot_size: "medium" },
        { panel_type: "action", shot_size: "medium" },
        { panel_type: "action", shot_size: "closeup" },
        { panel_type: "turning-point", shot_size: "medium" },
        { panel_type: "climax", shot_size: "closeup" },
        { panel_type: "aftermath", shot_size: "medium" },
        { panel_type: "button", shot_size: "wide" },
      ]),
    },
  },
  {
    name: "情绪条漫",
    description: "纵向条漫，聚焦情绪起伏，适合抒情/生活感故事。",
    panel_count: 10,
    tags: ["条漫", "情绪", "抒情"],
    template_data: {
      meta: makeMeta("strip", {
        recommendedPanelCount: 10,
        styleHint: "竖版条漫，留白、呼吸感，重视表情细节",
        loglineExample: "夜班的护士在黎明前给孤独的病人讲了一个故事。",
        beats: [
          { title: "开场", summary: "情绪基调+环境" },
          { title: "引子", summary: "事件或回忆触发点" },
          { title: "情绪上扬", summary: "细节堆叠，角色互动" },
          { title: "停顿", summary: "留白/静止画面" },
          { title: "高潮", summary: "情绪峰值/坦白/冲突" },
          { title: "回落", summary: "余韵与安静" },
        ],
        dialogueGuidelines: {
          maxLinesPerBubble: 3,
          maxCharsPerBubble: 24,
          tone: "温柔、内心化",
        },
        cameraPlan: { wide: 2, medium: 5, closeup: 3 },
        promptSnippets: ["柔和光线", "手绘质感", "留白", "细腻表情"],
        layoutPresets: ["vertical-strip", "breathing-space"],
        recommendedGenres: ["romance", "slice-of-life", "healing"],
        complexityLevel: "newbie",
        autoFill: { applyBeatsToStory: true, applyCameraToPanels: true, applyPromptSnippets: true },
        isFeatured: true,
      }),
      panels: makePanels([
        { panel_type: "establishing", shot_size: "wide" },
        { panel_type: "dialogue", shot_size: "medium" },
        { panel_type: "reaction", shot_size: "closeup" },
        { panel_type: "quiet", shot_size: "medium" },
        { panel_type: "dialogue", shot_size: "medium" },
        { panel_type: "emotion-peak", shot_size: "closeup" },
        { panel_type: "pause", shot_size: "wide" },
        { panel_type: "intimate", shot_size: "closeup" },
        { panel_type: "closing", shot_size: "medium" },
        { panel_type: "button", shot_size: "wide" },
      ]),
    },
  },
  {
    name: "分幕剧情",
    description: "12 格分幕结构，适合小型故事或长场景对话的稳定节奏。",
    panel_count: 12,
    tags: ["剧情", "分幕", "对话"],
    template_data: {
      meta: makeMeta("comic", {
        recommendedPanelCount: 12,
        styleHint: "分幕叙事，平衡对话与场景，适合悬疑/剧情",
        loglineExample: "警探在咖啡馆与嫌疑人对话，真相在细节中逐渐浮现。",
        beats: [
          { title: "场景设定", summary: "环境+人物关系" },
          { title: "议题抛出", summary: "冲突或目标明确" },
          { title: "信息交换", summary: "对话/线索揭示" },
          { title: "压力升高", summary: "质问/误导/欺骗" },
          { title: "转折点", summary: "关键线索或情感破防" },
          { title: "对峙", summary: "最紧张的对话/动作" },
          { title: "解构", summary: "角色动机或真相拆解" },
          { title: "后果", summary: "决定与影响" },
          { title: "收束", summary: "情绪落点/伏笔" },
        ],
        dialogueGuidelines: {
          maxLinesPerBubble: 3,
          maxCharsPerBubble: 26,
          tone: "克制、逻辑清晰",
        },
        cameraPlan: { wide: 3, medium: 6, closeup: 3, special: ["侧逆光", "肩扛视角"] },
        promptSnippets: ["室内暖光", "咖啡店玻璃反射", "细腻表情", "景深"],
        layoutPresets: ["two-column", "dialogue-heavy"],
        recommendedGenres: ["drama", "mystery", "dialogue"],
        recommendedCharacters: { min: 2, max: 4, relationshipTips: "对手戏明确的两到三人" },
        complexityLevel: "pro",
        autoFill: { applyBeatsToStory: true, applyCameraToPanels: true, applyPromptSnippets: true },
      }),
      panels: makePanels([
        { panel_type: "establishing", shot_size: "wide" },
        { panel_type: "dialogue", shot_size: "medium" },
        { panel_type: "dialogue", shot_size: "medium" },
        { panel_type: "reaction", shot_size: "closeup" },
        { panel_type: "reveal", shot_size: "closeup" },
        { panel_type: "confront", shot_size: "medium" },
        { panel_type: "confront", shot_size: "medium" },
        { panel_type: "clue", shot_size: "closeup" },
        { panel_type: "aftermath", shot_size: "medium" },
        { panel_type: "turning-point", shot_size: "medium" },
        { panel_type: "resolution", shot_size: "wide" },
        { panel_type: "button", shot_size: "medium" },
      ]),
    },
  },
  // --- New Seed Data ---
  {
    name: "空白起手 (4格)",
    description: "完全空白的4格画布，适合自由发挥。",
    panel_count: 4,
    tags: ["空白", "基础", "自由"],
    template_data: {
      meta: makeMeta("blank", {
        recommendedPanelCount: 4,
        styleHint: "无预设风格",
        complexityLevel: "newbie",
        recommendedCharacters: { min: 1, max: 2 },
      }),
      panels: makePanels([
        { panel_type: null, shot_size: null },
        { panel_type: null, shot_size: null },
        { panel_type: null, shot_size: null },
        { panel_type: null, shot_size: null },
      ]),
    },
  },
  {
    name: "空白起手 (6格)",
    description: "标准6格分页，适合进阶创作。",
    panel_count: 6,
    tags: ["空白", "进阶", "标准"],
    template_data: {
      meta: makeMeta("blank", {
        recommendedPanelCount: 6,
        styleHint: "无预设风格",
        complexityLevel: "pro",
        recommendedCharacters: { min: 1, max: 4 },
      }),
      panels: makePanels([
        { panel_type: null, shot_size: null },
        { panel_type: null, shot_size: null },
        { panel_type: null, shot_size: null },
        { panel_type: null, shot_size: null },
        { panel_type: null, shot_size: null },
        { panel_type: null, shot_size: null },
      ]),
    },
  },
  {
    name: "双人对决 (动作)",
    description: "高强度的双人近身格斗分镜，强调打击感。",
    panel_count: 6,
    tags: ["动作", "战斗", "格斗"],
    template_data: {
      meta: makeMeta("short", {
        recommendedPanelCount: 6,
        styleHint: "高对比度，速度线，冲击力",
        complexityLevel: "pro",
        recommendedGenres: ["action", "martial-arts"],
        recommendedCharacters: { min: 2, max: 2, relationshipTips: "宿敌/对手" },
        cameraPlan: { wide: 1, medium: 2, closeup: 3, special: ["动态模糊", "特写冲击"] },
      }),
      panels: makePanels([
        { panel_type: "establishing", shot_size: "wide", importance: "medium" },
        { panel_type: "action", shot_size: "medium", importance: "high" },
        { panel_type: "reaction", shot_size: "closeup", importance: "low" },
        { panel_type: "action", shot_size: "closeup", importance: "high" },
        { panel_type: "impact", shot_size: "medium", importance: "high" },
        { panel_type: "aftermath", shot_size: "wide", importance: "medium" },
      ]),
    },
  },
  {
    name: "校园告白",
    description: "经典的校园天台或放学后的告白场景。",
    panel_count: 5,
    tags: ["恋爱", "校园", "情感"],
    template_data: {
      meta: makeMeta("short", {
        recommendedPanelCount: 5,
        styleHint: "暖色调，夕阳，逆光",
        complexityLevel: "newbie",
        recommendedGenres: ["romance", "school"],
        recommendedCharacters: { min: 2, max: 2, relationshipTips: "暗恋对象" },
      }),
      panels: makePanels([
        { panel_type: "establishing", shot_size: "wide" },
        { panel_type: "dialogue", shot_size: "medium" },
        { panel_type: "dialogue", shot_size: "closeup" },
        { panel_type: "confession", shot_size: "closeup" },
        { panel_type: "reaction", shot_size: "medium" },
      ]),
    },
  },
  {
    name: "恐怖惊悚 (短篇)",
    description: "利用阴影和特写的短篇恐怖叙事。",
    panel_count: 4,
    tags: ["恐怖", "悬疑", "惊悚"],
    template_data: {
      meta: makeMeta("four", {
        recommendedPanelCount: 4,
        styleHint: "暗调，阴影，压抑",
        complexityLevel: "pro",
        recommendedGenres: ["horror", "thriller"],
        recommendedCharacters: { min: 1, max: 1 },
      }),
      panels: makePanels([
        { panel_type: "establishing", shot_size: "wide" },
        { panel_type: "discovery", shot_size: "medium" },
        { panel_type: "tension", shot_size: "closeup" },
        { panel_type: "scare", shot_size: "closeup" },
      ]),
    },
  },
  {
    name: "家庭聚餐",
    description: "多角色的家庭聚餐场景，适合群像剧。",
    panel_count: 5,
    tags: ["日常", "家庭", "群像"],
    template_data: {
      meta: makeMeta("strip", {
        recommendedPanelCount: 5,
        styleHint: "温馨，拥挤，热闹",
        complexityLevel: "newbie",
        recommendedGenres: ["slice-of-life", "family"],
        recommendedCharacters: { min: 3, max: 6, relationshipTips: "家庭成员" },
      }),
      panels: makePanels([
        { panel_type: "establishing", shot_size: "wide" },
        { panel_type: "interaction", shot_size: "medium" },
        { panel_type: "dialogue", shot_size: "medium" },
        { panel_type: "reaction", shot_size: "medium" },
        { panel_type: "group", shot_size: "wide" },
      ]),
    },
  },
];
