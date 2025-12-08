export interface PromptExample {
  id: string;
  title: string;
  category: "action" | "emotion" | "environment" | "dialogue";
  prompt: string;
  thumbnail?: string;
  tags: string[];
}

export const promptExamples: PromptExample[] = [
  // 动作场景
  {
    id: "action-1",
    title: "英雄登场",
    category: "action",
    prompt: "超级英雄从天而降，落地时激起尘土飞扬，单膝跪地，披风在身后飘扬。背景是燃烧的城市废墟，夕阳余晖透过烟雾照射下来，形成强烈的逆光效果。英雄抬起头，眼神坚定，拳头紧握。低角度仰视构图，营造史诗感。",
    tags: ["英雄", "动作", "史诗", "逆光"],
  },
  {
    id: "action-2",
    title: "剑术对决",
    category: "action",
    prompt: "两位剑客在雨中对峙，雨滴在空中凝固成线条，刀刃交锋的瞬间火花四溅。主角的眼神锐利，雨水顺着发梢滴落，背景是模糊的竹林和闪电。动态模糊效果，速度线强化冲击感。",
    tags: ["战斗", "剑术", "雨中", "动态"],
  },
  {
    id: "action-3",
    title: "极速追逐",
    category: "action",
    prompt: "赛博朋克战士骑着悬浮摩托穿梭在霓虹闪烁的都市峡谷中，身后是爆炸的火光和追兵的激光。摩托尾部拖出光轨，背景建筑快速向后移动形成速度线。广角镜头，强烈的透视感，蓝紫色调主导。",
    tags: ["科幻", "追逐", "霓虹", "速度"],
  },

  // 情感场景
  {
    id: "emotion-1",
    title: "失意与决心",
    category: "emotion",
    prompt: "主角独自坐在天台边缘，双腿悬空，低头看着手中破碎的徽章。背景是夕阳西下的城市天际线，温暖的橙红色光线照在侧脸上。特写脸部表情：眼神黯淡但嘴角微微上扬，似乎在酝酿新的决心。",
    tags: ["情感", "独白", "夕阳", "特写"],
  },
  {
    id: "emotion-2",
    title: "重逢瞬间",
    category: "emotion",
    prompt: "校园少年在樱花树下看到多年未见的青梅竹马，花瓣纷飞中两人四目相对。少年瞳孔放大，脸颊微红，背着的书包滑落到地面。少女微笑着伸手，阳光透过樱花形成梦幻的光斑效果。浅景深，焦点在两人的眼神交汇处。",
    tags: ["青春", "重逢", "樱花", "浪漫"],
  },
  {
    id: "emotion-3",
    title: "战前宣言",
    category: "emotion",
    prompt: "战士举起染血的旗帜站在山丘顶端，面向密密麻麻的敌军，眼神中燃烧着不屈的斗志。狂风吹拂披风和旗帜，背后的天空乌云密布但透出一缕阳光。仰视构图，强调孤独但强大的气场。",
    tags: ["战斗", "决心", "史诗", "逆境"],
  },

  // 环境氛围
  {
    id: "environment-1",
    title: "魔法森林",
    category: "environment",
    prompt: "魔法师走进被蓝色荧光蘑菇照亮的森林深处，古老的树木缠绕着发光的藤蔓，空中飘浮着星点般的精灵之光。地面薄雾缭绕，魔法师手持法杖，杖顶的宝石发出柔和的光芒。神秘的暖冷色调对比，梦幻氛围。",
    tags: ["奇幻", "魔法", "森林", "神秘"],
  },
  {
    id: "environment-2",
    title: "赛博酒吧",
    category: "environment",
    prompt: "侦探走进昏暗的赛博朋克酒吧，霓虹灯管在墙上投射出红蓝交错的光影，全息投影广告在空中闪烁。吧台后机械调酒师正在工作，烟雾弥漫，背景客人的轮廓模糊。强烈的光影对比，未来黑色电影风格。",
    tags: ["赛博朋克", "酒吧", "霓虹", "悬疑"],
  },
  {
    id: "environment-3",
    title: "废墟探索",
    category: "environment",
    prompt: "冒险者站在倒塌的古代神殿前，巨大的石柱散落在地，藤蔓和苔藓覆盖了雕像。阳光从破损的穹顶倾泻而下，照亮漂浮的尘埃。远处有神秘的光芒闪烁。广角镜头，强调建筑的宏伟与沧桑感。",
    tags: ["冒险", "遗迹", "历史", "宏伟"],
  },

  // 对话场景
  {
    id: "dialogue-1",
    title: "师徒传承",
    category: "dialogue",
    prompt: "年迈的师父坐在道场中央，面前是跪坐的弟子。师父将祖传的剑缓缓递出，弟子双手接过，眼含热泪。背景是挂满武器的道场墙壁和透进来的月光。中景双人镜头，气氛庄重而温暖。",
    tags: ["师徒", "传承", "武道", "感动"],
  },
  {
    id: "dialogue-2",
    title: "秘密揭晓",
    category: "dialogue",
    prompt: "侦探在审讯室中面对嫌疑人，桌上的台灯投射出强烈的阴影。侦探突然摊开关键证据照片，嫌疑人的表情瞬间从镇定变为震惊，冷汗从额头滴落。对角线构图，黑白高对比度画面，悬疑氛围拉满。",
    tags: ["悬疑", "对峙", "推理", "高反差"],
  },
  {
    id: "dialogue-3",
    title: "告白时刻",
    category: "dialogue",
    prompt: "学生在放学后的空教室里，终于鼓起勇气向心仪的对象递出情书，脸红得像苹果，眼神躲闪。对方接过信封，表情先是惊讶后是羞涩的微笑。夕阳透过窗户洒在两人身上，空气中都是粉色的浪漫气泡。",
    tags: ["校园", "告白", "青春", "浪漫"],
  },
];

export const getCategoryName = (category: PromptExample["category"]) => {
  const map = {
    action: "动作场景",
    emotion: "情感表达",
    environment: "环境氛围",
    dialogue: "对话互动",
  };
  return map[category];
};

export const getCategoryColor = (category: PromptExample["category"]) => {
  const map = {
    action: "bg-comic-red/20 text-comic-red border-comic-red/30",
    emotion: "bg-comic-pink/20 text-comic-pink border-comic-pink/30",
    environment: "bg-comic-green/20 text-comic-green border-comic-green/30",
    dialogue: "bg-comic-blue/20 text-comic-blue border-comic-blue/30",
  };
  return map[category];
};
