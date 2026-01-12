/**
 * Story Templates - Predefined story structures
 */

export interface StoryTemplateData {
    name: string;
    category: "suspense" | "romance" | "adventure" | "scifi" | "daily" | "fantasy";
    description: string;
    structure: {
        acts: {
            name: string;
            purpose: string;
            keyElements: string[];
        }[];
        plotPoints: string[];
    };
    prompts: {
        systemPrompt: string;
        examplePremises: string[];
    };
}

export const PREDEFINED_TEMPLATES: StoryTemplateData[] = [
    {
        name: "三幕剧结构",
        category: "daily",
        description: "经典的三幕剧结构,适合大多数故事类型",
        structure: {
            acts: [
                {
                    name: "第一幕 - 建立",
                    purpose: "介绍角色、世界观和冲突",
                    keyElements: ["日常世界", "激励事件", "拒绝召唤", "跨越门槛"],
                },
                {
                    name: "第二幕 - 对抗",
                    purpose: "角色面对挑战,冲突升级",
                    keyElements: ["试炼", "盟友与敌人", "接近最深洞穴", "磨难"],
                },
                {
                    name: "第三幕 - 解决",
                    purpose: "高潮和结局",
                    keyElements: ["奖赏", "回归之路", "复活", "带着灵药归来"],
                },
            ],
            plotPoints: [
                "激励事件(第一幕结束)",
                "中点转折(第二幕中间)",
                "最低点(第二幕结束)",
                "高潮(第三幕)",
            ],
        },
        prompts: {
            systemPrompt: "使用经典三幕剧结构,确保每一幕都有清晰的目标和转折点。",
            examplePremises: [
                "一个普通上班族意外获得了读心术的能力",
                "两个性格截然不同的人被困在电梯里",
                "一个失忆的侦探必须解开自己的身份之谜",
            ],
        },
    },
    {
        name: "英雄之旅",
        category: "adventure",
        description: "约瑟夫·坎贝尔的英雄之旅模型,适合冒险和成长故事",
        structure: {
            acts: [
                {
                    name: "启程",
                    purpose: "英雄离开舒适区",
                    keyElements: ["平凡世界", "冒险召唤", "拒绝召唤", "遇见导师", "跨越第一道门槛"],
                },
                {
                    name: "启蒙",
                    purpose: "英雄在新世界中成长",
                    keyElements: ["试炼、盟友、敌人", "接近最深的洞穴", "磨难", "奖赏"],
                },
                {
                    name: "归来",
                    purpose: "英雄带着收获回归",
                    keyElements: ["回归之路", "复活", "带着灵药归来"],
                },
            ],
            plotPoints: [
                "冒险召唤",
                "跨越门槛",
                "中点磨难",
                "最终考验",
                "凯旋归来",
            ],
        },
        prompts: {
            systemPrompt: "遵循英雄之旅的12个阶段,强调角色的成长和转变。",
            examplePremises: [
                "一个胆小的少年必须拯救被黑暗势力占领的王国",
                "一个普通学生发现自己是古老预言中的救世主",
                "一个退休的战士被迫重新拿起武器保护家园",
            ],
        },
    },
    {
        name: "悬疑推理结构",
        category: "suspense",
        description: "适合悬疑、推理、犯罪类故事",
        structure: {
            acts: [
                {
                    name: "第一幕 - 案件发生",
                    purpose: "建立谜题和悬念",
                    keyElements: ["案件发生", "侦探登场", "初步调查", "发现线索"],
                },
                {
                    name: "第二幕 - 深入调查",
                    purpose: "揭示更多线索,制造误导",
                    keyElements: ["访谈嫌疑人", "发现新证据", "假线索", "案情复杂化"],
                },
                {
                    name: "第三幕 - 真相大白",
                    purpose: "揭示真相和动机",
                    keyElements: ["关键证据", "推理过程", "真凶揭露", "动机解释"],
                },
            ],
            plotPoints: [
                "案件发生",
                "第一个重要线索",
                "误导性发现",
                "关键突破",
                "真相揭示",
            ],
        },
        prompts: {
            systemPrompt: "设置悬念和线索,确保逻辑严密,真相出人意料但合理。",
            examplePremises: [
                "一个密室杀人案,所有嫌疑人都有不在场证明",
                "一系列看似无关的案件背后隐藏着惊人的阴谋",
                "一个侦探发现自己正在调查的案件与自己的过去有关",
            ],
        },
    },
    {
        name: "浪漫爱情结构",
        category: "romance",
        description: "适合爱情、情感类故事",
        structure: {
            acts: [
                {
                    name: "第一幕 - 相遇",
                    purpose: "两人相遇,产生初步印象",
                    keyElements: ["初次相遇", "第一印象", "吸引与抗拒", "开始了解"],
                },
                {
                    name: "第二幕 - 相知与阻碍",
                    purpose: "感情加深,但面临障碍",
                    keyElements: ["感情升温", "共同经历", "外部阻碍", "内心挣扎", "误会分离"],
                },
                {
                    name: "第三幕 - 重聚与承诺",
                    purpose: "克服障碍,走到一起",
                    keyElements: ["认清真心", "克服障碍", "重新相聚", "承诺未来"],
                },
            ],
            plotPoints: [
                "初次相遇",
                "感情萌芽",
                "第一次冲突",
                "分离危机",
                "重归于好",
            ],
        },
        prompts: {
            systemPrompt: "强调情感发展的自然性,障碍要合理,结局要令人满意。",
            examplePremises: [
                "两个青梅竹马因误会分开多年后重逢",
                "一个工作狂遇到了让他重新思考人生的人",
                "两个性格完全相反的人被迫合作完成一个项目",
            ],
        },
    },
    {
        name: "科幻世界观结构",
        category: "scifi",
        description: "适合科幻、未来设定的故事",
        structure: {
            acts: [
                {
                    name: "第一幕 - 世界建立",
                    purpose: "展示科幻世界和规则",
                    keyElements: ["世界观展示", "科技设定", "社会结构", "主角日常", "触发事件"],
                },
                {
                    name: "第二幕 - 冲突升级",
                    purpose: "科技或系统的问题暴露",
                    keyElements: ["发现问题", "调查真相", "阴谋揭露", "危机加剧"],
                },
                {
                    name: "第三幕 - 改变未来",
                    purpose: "解决危机,改变世界",
                    keyElements: ["最终对决", "系统改变", "新秩序", "未来展望"],
                },
            ],
            plotPoints: [
                "世界观建立",
                "发现异常",
                "真相揭示",
                "系统崩溃",
                "新世界诞生",
            ],
        },
        prompts: {
            systemPrompt: "构建完整的科幻世界观,科技设定要自洽,探讨科技与人性的关系。",
            examplePremises: [
                "在一个人类记忆可以被买卖的世界,一个人发现自己的记忆是假的",
                "AI统治的未来,一个程序员发现了系统的致命漏洞",
                "人类可以上传意识到虚拟世界,但有人想要回到现实",
            ],
        },
    },
    {
        name: "日常治愈结构",
        category: "daily",
        description: "适合日常、治愈、成长类故事",
        structure: {
            acts: [
                {
                    name: "第一幕 - 日常困境",
                    purpose: "展示角色的日常和小烦恼",
                    keyElements: ["日常生活", "小烦恼", "遇见关键人物", "新的可能"],
                },
                {
                    name: "第二幕 - 温暖时光",
                    purpose: "通过小事件获得成长和治愈",
                    keyElements: ["日常小事", "温暖互动", "逐渐改变", "小小挫折"],
                },
                {
                    name: "第三幕 - 成长收获",
                    purpose: "角色获得成长,找到方向",
                    keyElements: ["重要领悟", "做出改变", "温馨结局", "新的开始"],
                },
            ],
            plotPoints: [
                "日常开始",
                "遇见改变",
                "温暖瞬间",
                "小小挫折",
                "成长收获",
            ],
        },
        prompts: {
            systemPrompt: "注重细节和情感,通过日常小事展现角色成长,营造温暖治愈的氛围。",
            examplePremises: [
                "一个失业青年在小镇咖啡馆打工,逐渐找回生活的意义",
                "一个内向的学生加入了学校的园艺社,学会了与人相处",
                "一个工作压力大的白领开始学习烘焙,找到了新的生活方式",
            ],
        },
    },
];

/**
 * Get template by category
 */
export function getTemplatesByCategory(category: string): StoryTemplateData[] {
    return PREDEFINED_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get template by name
 */
export function getTemplateByName(name: string): StoryTemplateData | undefined {
    return PREDEFINED_TEMPLATES.find((t) => t.name === name);
}

/**
 * Get all template categories
 */
export function getAllCategories(): string[] {
    return Array.from(new Set(PREDEFINED_TEMPLATES.map((t) => t.category)));
}

/**
 * Chinese Novel Style Templates
 * 针对中文网文创作的详细模板
 */

export interface ChineseStoryTemplate {
    id: string;
    name: string;
    category: string; // 玄幻、都市、言情、悬疑、科幻、武侠
    genre: string;
    description: string;
    structure: {
        actCount: number;
        acts: {
            name: string;
            chapterCount: number;
            description: string;
            keyPoints: string[];
            suggestedLength: number; // 字数
        }[];
    };
    characterArchetypes: string[];
    commonTropes: string[];
    writingTips: string[];
    examples: string[];
    tags: string[];
    difficulty: "beginner" | "intermediate" | "advanced";
}

/**
 * 玄幻修真 - 三幕式
 */
export const xuanhuanTemplate: ChineseStoryTemplate = {
    id: "xuanhuan-3-act",
    name: "玄幻修真 - 三幕式",
    category: "玄幻",
    genre: "xuanhuan",
    description: "废柴逆袭、宗门大比、秘境探险的经典玄幻结构",
    structure: {
        actCount: 3,
        acts: [
            {
                name: "第一幕：初入仙途",
                chapterCount: 10,
                description: "主角发现修炼天赋，拜入宗门，初露锋芒",
                keyPoints: [
                    "金手指觉醒（神秘戒指、老爷爷、系统）",
                    "家族/宗门测试，显露天赋",
                    "拜师学艺，获得功法",
                    "初次历练，小试牛刀",
                    "引起强者注意，埋下伏笔",
                ],
                suggestedLength: 30000,
            },
            {
                name: "第二幕：历练成长",
                chapterCount: 20,
                description: "外出历练，遭遇挫折，突破瓶颈，建立势力",
                keyPoints: [
                    "秘境探险，获得宝物",
                    "遭遇强敌，生死危机",
                    "突破瓶颈，实力大增",
                    "结识同伴，建立势力",
                    "宗门大比，一鸣惊人",
                ],
                suggestedLength: 60000,
            },
            {
                name: "第三幕：巅峰对决",
                chapterCount: 10,
                description: "面对最终敌人，揭示真相，飞升成仙",
                keyPoints: [
                    "最终决战开始",
                    "真相揭露（身世、阴谋）",
                    "突破极限，超越自我",
                    "击败强敌，尘埃落定",
                    "飞升/开启新征程",
                ],
                suggestedLength: 30000,
            },
        ],
    },
    characterArchetypes: [
        "废柴逆袭型 - 从小被欺负，一朝觉醒天赋",
        "天才高冷型 - 天赋异禀，性格孤傲",
        "神秘转世型 - 拥有前世记忆或来历不明",
        "忠诚伙伴型 - 主角好友，生死与共",
        "红颜知己型 - 情感线索，后期助力",
    ],
    commonTropes: [
        "退婚流 - 未婚妻退婚，主角立誓逆袭",
        "宗门大比 - 展现实力，打脸反派",
        "秘境探险 - 发现宝物，提升实力",
        "拍卖会 - 遇见重要人物/宝物",
        "越级挑战 - 实力不如但靠智慧取胜",
    ],
    writingTips: [
        "前期节奏要快，快速吸引读者（金手指要尽早出现）",
        "中期要有波折，避免平铺直叙（主角不能一直赢）",
        "后期高潮迭起，情感升华（要有牺牲和成长）",
        "修炼体系要完整，等级划分要清晰",
        "世界观要宏大，但不要一次性抛出太多设定",
    ],
    examples: ["《斗破苍穹》", "《凡人修仙传》", "《完美世界》"],
    tags: ["热血", "升级流", "废柴逆袭", "打脸"],
    difficulty: "beginner",
};

/**
 * 都市重生 - 时间循环
 */
export const urbanRebirthTemplate: ChineseStoryTemplate = {
    id: "urban-rebirth-loop",
    name: "都市重生 - 时间循环",
    category: "都市",
    genre: "urban",
    description: "主角回到过去，改变命运，弥补遗憾",
    structure: {
        actCount: 4,
        acts: [
            {
                name: "第一幕：重生之时",
                chapterCount: 8,
                description: "主角在人生低谷重生，回到学生时代",
                keyPoints: [
                    "前世遗憾（破产、亲人离世、恋人分离）",
                    "意外重生，回到关键节点",
                    "利用先知优势，抓住机遇",
                    "改变第一个命运转折点",
                ],
                suggestedLength: 24000,
            },
            {
                name: "第二幕：积累资本",
                chapterCount: 12,
                description: "利用前世记忆积累财富和人脉",
                keyPoints: [
                    "投资未来暴利行业",
                    "结识前世贵人",
                    "弥补家庭遗憾",
                    "建立商业帝国雏形",
                ],
                suggestedLength: 36000,
            },
            {
                name: "第三幕：对抗前世宿敌",
                chapterCount: 10,
                description: "与前世害自己的人展开斗争",
                keyPoints: [
                    "宿敌出现，但时间线改变",
                    "商业竞争/智斗",
                    "揭露前世真相",
                    "战胜宿敌，改写命运",
                ],
                suggestedLength: 30000,
            },
            {
                name: "第四幕：圆满人生",
                chapterCount: 5,
                description: "前世遗憾一一弥补，收获圆满",
                keyPoints: [
                    "拯救前世逝去的亲人",
                    "与前世恋人重新开始",
                    "事业巅峰",
                    "展望未来",
                ],
                suggestedLength: 15000,
            },
        ],
    },
    characterArchetypes: [
        "重生主角 - 拥有未来记忆",
        "前世仇人 - 今生的主要对手",
        "温柔女主 - 前世错过的爱人",
        "商业伙伴 - 信任的盟友",
    ],
    commonTropes: [
        "先知先觉 - 利用未来信息获利",
        "弥补遗憾 - 拯救前世重要的人",
        "打脸复仇 - 对前世害自己的人",
        "商业帝国 - 从零开始建立商业版图",
    ],
    writingTips: [
        "平衡主角的金手指，不要让他太无敌",
        "感情线要自然，不要为了虐而虐",
        "商业情节要有一定逻辑性",
        "前世今生对比，突出改变带来的差异",
    ],
    examples: ["《重生之财源滚滚》", "《重生之都市修仙》"],
    tags: ["重生", "都市", "商战", "爽文"],
    difficulty: "beginner",
};

/**
 * 所有中文网文模板
 */
export const CHINESE_STORY_TEMPLATES: ChineseStoryTemplate[] = [
    xuanhuanTemplate,
    urbanRebirthTemplate,
];

/**
 * 根据 ID 获取中文网文模板
 */
export function getChineseTemplateById(id: string): ChineseStoryTemplate | undefined {
    return CHINESE_STORY_TEMPLATES.find((t) => t.id === id);
}

/**
 * 根据分类获取中文网文模板
 */
export function getChineseTemplatesByCategory(category: string): ChineseStoryTemplate[] {
    return CHINESE_STORY_TEMPLATES.filter((t) => t.category === category);
}

/**
 * 模板分类列表
 */
export const TEMPLATE_CATEGORIES = [
    { value: "玄幻", label: "玄幻修真", icon: "zap" },
    { value: "都市", label: "都市重生", icon: "building" },
    { value: "言情", label: "都市言情", icon: "heart" },
    { value: "悬疑", label: "悬疑推理", icon: "search" },
    { value: "科幻", label: "科幻未来", icon: "rocket" },
    { value: "武侠", label: "武侠江湖", icon: "sword" },
] as const;
