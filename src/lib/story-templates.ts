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
 * 武侠江湖 - 群像剧
 */
export const wuxiaEnsembleTemplate: ChineseStoryTemplate = {
    id: "wuxia-ensemble",
    name: "武侠江湖 - 群像剧",
    category: "武侠",
    genre: "wuxia",
    description: "多角色视角，展现江湖恩怨情仇",
    structure: {
        actCount: 3,
        acts: [
            {
                name: "第一幕：江湖初现",
                chapterCount: 15,
                description: "各路人物登场，埋下伏笔",
                keyPoints: [
                    "多线叙事，介绍多个主角",
                    "江湖势力格局",
                    "各人物的动机和目标",
                    "看似无关的事件",
                    "武林秘籍/宝物出现",
                ],
                suggestedLength: 45000,
            },
            {
                name: "第二幕：命运交织",
                chapterCount: 20,
                description: "各线剧情开始交汇",
                keyPoints: [
                    "人物之间产生联系",
                    "共同事件将各方卷入",
                    "真相逐渐浮出水面",
                    "联盟与对抗形成",
                    "江湖大会/比武",
                ],
                suggestedLength: 60000,
            },
            {
                name: "第三幕：恩怨了断",
                chapterCount: 15,
                description: "所有线索汇聚，大结局",
                keyPoints: [
                    "前因后果全部揭露",
                    "多方势力最终对决",
                    "人物命运揭晓",
                    "江湖格局重新洗牌",
                    "侠之大者，为国为民",
                ],
                suggestedLength: 45000,
            },
        ],
    },
    characterArchetypes: [
        "名门正派弟子 - 武功高强，正义凛然",
        "魔教中人 - 外冷内热，重情重义",
        "江湖浪子 - 自由洒脱，行踪不定",
        "神秘高手 - 深藏不露，关键时刻出手",
        "阴谋家 - 操纵局势，幕后黑手",
    ],
    commonTropes: [
        "武功秘籍 - 争夺绝世武功",
        "血海深仇 - 复仇主线",
        "正邪之争 - 立场对立但互相欣赏",
        "情仇交织 - 情感与恩怨纠缠",
        "师徒传承 - 武学与精神传承",
    ],
    writingTips: [
        "群像剧要平衡各角色的戏份",
        "多线叙事要清晰，章节标题要明确视角",
        "武功描写要有画面感和层次感",
        "江湖规矩要有设定（帮派、门派、辈分）",
        "感情戏要细腻，但不能喧宾夺主",
    ],
    examples: ["《天龙八部》", "《笑傲江湖》", "《多情剑客无情剑》"],
    tags: ["武侠", "群像", "江湖", "恩怨"],
    difficulty: "intermediate",
};

/**
 * 都市言情 - 治愈系
 */
export const romanceHealingTemplate: ChineseStoryTemplate = {
    id: "romance-healing",
    name: "都市言情 - 治愈系",
    category: "言情",
    genre: "romance",
    description: "温暖治愈的现代都市爱情故事",
    structure: {
        actCount: 4,
        acts: [
            {
                name: "第一幕：相遇",
                chapterCount: 8,
                description: "男女主初次相遇，留下印象",
                keyPoints: [
                    "各自的生活状态和困境",
                    "意外的相遇（咖啡厅/图书馆/工作）",
                    "第一印象（好坏都行）",
                    "命运将两人联系在一起",
                ],
                suggestedLength: 24000,
            },
            {
                name: "第二幕：了解",
                chapterCount: 12,
                description: "逐渐了解对方，产生情愫",
                keyPoints: [
                    "被迫共处/合作",
                    "发现对方的优点和温柔",
                    "小误会/小甜蜜日常",
                    "感情萌芽，心动时刻",
                    "互相治愈对方的伤痛",
                ],
                suggestedLength: 36000,
            },
            {
                name: "第三幕：波折",
                chapterCount: 8,
                description: "感情遭遇考验和误会",
                keyPoints: [
                    "前任/情敌出现",
                    "工作/家庭压力",
                    "重大误会（但不狗血）",
                    "关系陷入危机",
                ],
                suggestedLength: 24000,
            },
            {
                name: "第四幕：和解",
                chapterCount: 7,
                description: "误会解除，终成眷属",
                keyPoints: [
                    "真相大白",
                    "各自成长和改变",
                    "勇敢表达真心",
                    "美好结局（婚礼/求婚）",
                ],
                suggestedLength: 21000,
            },
        ],
    },
    characterArchetypes: [
        "男主 - 高冷总裁/温柔医生/阳光运动员",
        "女主 - 独立职场/可爱学生/坚强单亲",
        "闺蜜 - 情感顾问，助攻",
        "情敌 - 制造冲突但不恶毒",
    ],
    commonTropes: [
        "契约恋爱 - 假戏真做",
        "冤家路窄 - 欢喜冤家",
        "办公室恋情 - 职场背景",
        "青梅竹马 - 儿时情缘重逢",
        "疗伤恋爱 - 互相治愈",
    ],
    writingTips: [
        "感情发展要自然，不能太快也不能拖沓",
        "甜度要适中，虐要适度且有意义",
        "细节描写要动人（眼神/动作/对话）",
        "人物要立体，有自己的事业和梦想",
        "现代都市背景要真实可信",
    ],
    examples: ["《你是我的荣耀》", "《微微一笑很倾城》", "《何以笙箫默》"],
    tags: ["言情", "治愈", "甜宠", "都市"],
    difficulty: "beginner",
};

/**
 * 悬疑推理 - 英雄之旅
 */
export const suspenseHeroTemplate: ChineseStoryTemplate = {
    id: "suspense-hero-journey",
    name: "悬疑推理 - 侦探叙事",
    category: "悬疑",
    genre: "suspense",
    description: "侦探通过层层线索，揭开惊天阴谋",
    structure: {
        actCount: 5,
        acts: [
            {
                name: "第一幕：平凡世界",
                chapterCount: 5,
                description: "主角过着普通生活，直到案件发生",
                keyPoints: [
                    "介绍主角背景和性格",
                    "凶案发生，打破平静",
                    "主角被卷入案件",
                    "发现第一个线索",
                ],
                suggestedLength: 15000,
            },
            {
                name: "第二幕：拒绝召唤",
                chapterCount: 3,
                description: "主角犹豫是否要深入调查",
                keyPoints: [
                    "案件看似简单",
                    "主角试图置身事外",
                    "但某些细节让他无法释怀",
                ],
                suggestedLength: 9000,
            },
            {
                name: "第三幕：跨越门槛",
                chapterCount: 8,
                description: "主角正式开始调查，进入危险世界",
                keyPoints: [
                    "发现案件背后的复杂性",
                    "第一个重要证人/嫌疑人",
                    "遭遇威胁/警告",
                    "决定追查到底",
                ],
                suggestedLength: 24000,
            },
            {
                name: "第四幕：试炼之路",
                chapterCount: 12,
                description: "调查过程中遭遇各种困难和陷阱",
                keyPoints: [
                    "线索交织，真假难辨",
                    "盟友背叛/身份反转",
                    "主角陷入绝境",
                    "发现关键突破口",
                ],
                suggestedLength: 36000,
            },
            {
                name: "第五幕：归来与真相",
                chapterCount: 7,
                description: "揭开真相，正义得到伸张",
                keyPoints: [
                    "真相大白（反转）",
                    "最终对决",
                    "善后处理",
                    "主角成长与改变",
                ],
                suggestedLength: 21000,
            },
        ],
    },
    characterArchetypes: [
        "侦探 - 主角，聪明敏锐但有缺陷",
        "助手 - 协助调查，提供不同视角",
        "反派 - 高智商罪犯",
        "受害者 - 案件关键人物",
    ],
    commonTropes: [
        "密室杀人 - 经典悬疑模式",
        "红鲱鱼 - 误导读者的线索",
        "反转 - 意想不到但合理的真相",
        "心理博弈 - 与罪犯的智力较量",
        "连环案件 - 多起案件有联系",
    ],
    writingTips: [
        "伏笔要埋得深，但不能太隐蔽",
        "线索要公平，读者应该能推理出来",
        "反转要合理，不能强行反转",
        "节奏控制：紧张和放松交替",
        "人物动机要充分且合理",
    ],
    examples: ["《福尔摩斯探案集》", "《白夜追凶》", "《无证之罪》"],
    tags: ["悬疑", "推理", "智斗", "反转"],
    difficulty: "intermediate",
};

/**
 * 科幻未来 - 五幕式
 */
export const scifiFiveActTemplate: ChineseStoryTemplate = {
    id: "scifi-five-act",
    name: "科幻未来 - 世界观探索",
    category: "科幻",
    genre: "scifi",
    description: "探索科技与人性的关系，宏大的宇宙观",
    structure: {
        actCount: 5,
        acts: [
            {
                name: "第一幕：世界观建立",
                chapterCount: 8,
                description: "介绍未来世界和主角",
                keyPoints: [
                    "展现未来科技和社会结构",
                    "主角身份和处境",
                    "日常生活中的科技细节",
                    "暗示潜在危机",
                ],
                suggestedLength: 24000,
            },
            {
                name: "第二幕：激励事件",
                chapterCount: 5,
                description: "打破日常，开启冒险",
                keyPoints: [
                    "发现异常/秘密",
                    "被迫卷入事件",
                    "离开舒适区",
                    "接受任务/使命",
                ],
                suggestedLength: 15000,
            },
            {
                name: "第三幕：上升动作",
                chapterCount: 15,
                description: "面对挑战，收集资源，组建团队",
                keyPoints: [
                    "探索未知领域（太空/虚拟世界）",
                    "遭遇各种挑战",
                    "科技对抗/解谜",
                    "团队内部矛盾",
                    "发现更大的阴谋",
                ],
                suggestedLength: 45000,
            },
            {
                name: "第四幕：高潮对决",
                chapterCount: 8,
                description: "面对最终挑战，做出艰难选择",
                keyPoints: [
                    "真相揭露（AI叛变/外星入侵）",
                    "生死抉择（人性vs效率）",
                    "终极对决",
                    "牺牲与成长",
                ],
                suggestedLength: 24000,
            },
            {
                name: "第五幕：新世界",
                chapterCount: 4,
                description: "事件结束，世界改变",
                keyPoints: [
                    "善后处理",
                    "角色成长总结",
                    "开启新的可能性",
                    "留下悬念（系列作）",
                ],
                suggestedLength: 12000,
            },
        ],
    },
    characterArchetypes: [
        "科学家/工程师 - 技术专家",
        "军人/战士 - 战斗力量",
        "政治家/领袖 - 权谋博弈",
        "AI/机器人 - 探讨人性",
    ],
    commonTropes: [
        "太空歌剧 - 宏大星际叙事",
        "赛博朋克 - 高科技低生活",
        "时间旅行 - 因果律悖论",
        "人工智能觉醒 - 科技伦理",
        "平行宇宙 - 多元世界",
    ],
    writingTips: [
        "科幻设定要自洽，不能前后矛盾",
        "科技要有理论基础（即使是虚构的）",
        "人物关系在宏大背景下要有真实感",
        "不要让设定掩盖了故事本身",
        "探讨科技对人类的影响和伦理问题",
    ],
    examples: ["《三体》", "《银河帝国》", "《星际穿越》", "《流浪地球》"],
    tags: ["科幻", "太空", "人工智能", "硬科幻"],
    difficulty: "advanced",
};

/**
 * 所有中文网文模板
 */
export const CHINESE_STORY_TEMPLATES: ChineseStoryTemplate[] = [
    xuanhuanTemplate,
    urbanRebirthTemplate,
    wuxiaEnsembleTemplate,
    romanceHealingTemplate,
    suspenseHeroTemplate,
    scifiFiveActTemplate,
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
