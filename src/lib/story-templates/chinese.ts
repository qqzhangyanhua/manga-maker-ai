import type { ChineseStoryTemplate } from "../type";

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

export const CHINESE_STORY_TEMPLATES: ChineseStoryTemplate[] = [
    xuanhuanTemplate,
    urbanRebirthTemplate,
    wuxiaEnsembleTemplate,
    romanceHealingTemplate,
    suspenseHeroTemplate,
    scifiFiveActTemplate,
];

export function getChineseTemplateById(id: string): ChineseStoryTemplate | undefined {
    return CHINESE_STORY_TEMPLATES.find((t) => t.id === id);
}

export function getChineseTemplatesByCategory(category: string): ChineseStoryTemplate[] {
    return CHINESE_STORY_TEMPLATES.filter((t) => t.category === category);
}

export const TEMPLATE_CATEGORIES = [
    { value: "玄幻", label: "玄幻修真", icon: "zap" },
    { value: "都市", label: "都市重生", icon: "building" },
    { value: "言情", label: "都市言情", icon: "heart" },
    { value: "悬疑", label: "悬疑推理", icon: "search" },
    { value: "科幻", label: "科幻未来", icon: "rocket" },
    { value: "武侠", label: "武侠江湖", icon: "sword" },
] as const;
