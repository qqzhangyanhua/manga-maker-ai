/**
 * Mock 分镜数据 - 用于快速测试
 */
const MOCK_STORYBOARDS = {
  rabbit_fitness: {
    title: "兔子的健身之路",
    style: "可爱日式漫画风格",
    panels: [
      {
        panelNumber: 1,
        sceneDescription: "一个明亮的健身房，各种健身器材整齐排列，几个肌肉发达的动物在锻炼",
        characterAction: "小兔子站在门口，背着小包，眼神紧张地看着周围的健身器材，耳朵紧张地竖着",
        dialogue: "我...我真的能变强吗？",
        visualPrompt: "Cute white rabbit character standing nervously at gym entrance, wearing casual sportswear, big expressive eyes showing anxiety, ears standing up, bright modern gym interior with exercise equipment in background, other muscular animals working out, manga style, soft lighting, detailed character design",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 2,
        sceneDescription: "健身房内，杠铃区域，小兔子面前摆放着很轻的哑铃",
        characterAction: "小兔子双手握着小哑铃，表情认真，额头冒汗，身体微微颤抖",
        dialogue: "好重啊...但是我不能放弃！",
        visualPrompt: "White rabbit character lifting small dumbbells with determined expression, sweating, body trembling slightly, close-up shot showing effort, gym equipment in background, manga art style, dynamic action lines, bright gym lighting",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 3,
        sceneDescription: "训练室一角，小兔子坐在长椅上，看起来很沮丧",
        characterAction: "小兔子低着头，耳朵耷拉下来，手里拿着训练日志，表情困惑失落",
        dialogue: "为什么还是没有进步呢...",
        visualPrompt: "Sad white rabbit sitting on gym bench, ears drooping down, holding training journal, disappointed expression, soft shadows, melancholic mood, manga style emotional scene, medium shot",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 4,
        sceneDescription: "健身房休息区，一个 AI 教练机器人出现，屏幕上显示训练计划",
        characterAction: "小兔子抬起头，眼睛发亮，看着 AI 教练的全息屏幕，耳朵重新竖起来",
        dialogue: "原来是训练方法不对！",
        visualPrompt: "Excited white rabbit looking at holographic AI coach display, robot trainer with digital screen showing workout plans, rabbit's ears perked up, eyes sparkling with hope, futuristic gym setting, manga style, bright optimistic colors",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 5,
        sceneDescription: "健身房训练区，各种健身器材，能量感十足的画面",
        characterAction: "小兔子在跑步机上奔跑，表情充满斗志，肌肉线条开始显现，汗水飞溅",
        dialogue: "我能感觉到自己在变强！",
        visualPrompt: "Energetic white rabbit running on treadmill with determined expression, visible muscle definition starting to show, sweat droplets flying, dynamic motion lines, powerful stance, manga action style, bright energetic lighting",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 6,
        sceneDescription: "健身房舞台中央，聚光灯照射，其他动物围观鼓掌",
        characterAction: "小兔子站在领奖台上，展示健美肌肉，双臂弯曲展示二头肌，自信满满地微笑",
        dialogue: "我做到了！这就是努力的成果！",
        visualPrompt: "Muscular confident white rabbit posing on stage, flexing biceps, wearing competition attire, spotlights shining, other animals cheering in background, trophy nearby, victorious manga style pose, detailed muscle definition, celebratory atmosphere",
        imageUrl: null,
        isEditing: false
      }
    ]
  },

  cat_chef: {
    title: "小猫的料理梦",
    style: "温馨治愈系漫画",
    panels: [
      {
        panelNumber: 1,
        sceneDescription: "一家温馨的小餐厅厨房，锅碗瓢盆整齐摆放",
        characterAction: "小橘猫戴着大厨帽，站在高高的凳子上，好奇地看着料理台上的食材",
        dialogue: "今天要做出最美味的料理！",
        visualPrompt: "Cute orange tabby cat wearing oversized chef hat, standing on stool at kitchen counter, curious expression, kitchen utensils and fresh ingredients on counter, warm cozy restaurant kitchen, manga style, soft warm lighting",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 2,
        sceneDescription: "厨房料理台特写，食材散落一地",
        characterAction: "小猫惊慌失措，打翻了面粉袋，全身都是白色粉末，眼睛睁得大大的",
        dialogue: "呜哇！糟糕了！",
        visualPrompt: "Panicked orange cat covered in white flour, flour bag tipped over, ingredients scattered, shocked wide eyes, white powder cloud, comedic manga scene, dynamic action, kitchen chaos",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 3,
        sceneDescription: "厨房角落，小猫独自坐着，周围是失败的料理",
        characterAction: "小猫耷拉着耳朵和尾巴，看着烧焦的锅，表情沮丧失落",
        dialogue: "我果然不适合当厨师吗...",
        visualPrompt: "Sad orange cat sitting in corner, drooping ears and tail, burnt cooking pot nearby, failed dishes around, melancholic atmosphere, soft shadows, emotional manga scene, close-up on disappointed expression",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 4,
        sceneDescription: "厨房门口，一位慈祥的老鼠师傅出现，手里拿着勺子",
        characterAction: "小猫抬起头，眼中重新燃起希望，老鼠师傅微笑着伸出手",
        dialogue: "料理的秘诀在于用心和耐心！",
        visualPrompt: "Wise old mouse chef with spoon reaching out to cat, cat looking up with hopeful eyes, warm lighting from doorway, mentor-student moment, heartwarming manga scene, gentle expressions",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 5,
        sceneDescription: "热闹的厨房，小猫认真地按照步骤料理",
        characterAction: "小猫戴着围裙，专注地搅拌锅里的食物，表情认真，舌头微微伸出",
        dialogue: "一步一步，慢慢来...",
        visualPrompt: "Focused orange cat wearing apron, stirring pot carefully, tongue slightly out in concentration, steam rising from pot, organized kitchen workspace, detailed cooking scene, manga style, warm ambient lighting",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 6,
        sceneDescription: "餐厅用餐区，客人们围坐在桌前",
        characterAction: "小猫骄傲地端着精美的料理，客人们眼睛发亮，竖起大拇指",
        dialogue: "这是我做的第一道成功的料理！",
        visualPrompt: "Proud orange cat chef presenting beautiful dish to happy customers, dish on elegant plate with garnish, customers giving thumbs up with sparkling eyes, warm restaurant atmosphere, celebratory manga scene, detailed food illustration",
        imageUrl: null,
        isEditing: false
      }
    ]
  },

  robot_friend: {
    title: "机器人的第一个朋友",
    style: "科幻温情漫画",
    panels: [
      {
        panelNumber: 1,
        sceneDescription: "未来城市街道，高楼大厦和飞行器，人来人往",
        characterAction: "一个小机器人独自站在人群中，LED 眼睛暗淡，看着周围匆忙走过的人们",
        dialogue: "大家都有朋友...只有我一个人...",
        visualPrompt: "Small lonely robot standing in futuristic city street, dim LED eyes, crowds of people walking past ignoring it, tall buildings and flying vehicles in background, cyberpunk manga style, cold blue lighting",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 2,
        sceneDescription: "城市公园，小机器人试图接近一群孩子",
        characterAction: "小机器人伸出手想要打招呼，但孩子们害怕地后退，机器人的天线垂下来",
        dialogue: "对不起...我不是想吓到你们...",
        visualPrompt: "Sad robot reaching out hand to group of scared children backing away, robot's antenna drooping, city park background, rejected gesture, melancholic scene, manga emotional storytelling",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 3,
        sceneDescription: "公园长椅下，雨开始下了",
        characterAction: "小机器人蜷缩在长椅下避雨，LED 眼睛闪烁着悲伤的蓝光，雨水打在身上",
        dialogue: "",
        visualPrompt: "Small robot curled up under park bench in rain, sad blue LED eyes flickering, rain drops hitting metal body, lonely atmosphere, dramatic manga scene, dark rainy mood lighting",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 4,
        sceneDescription: "长椅旁，一把小雨伞遮住了雨",
        characterAction: "小女孩蹲下来，用雨伞为机器人遮雨，温柔地微笑，机器人惊讶地抬起头",
        dialogue: "你也怕淋雨吗？我们一起躲雨吧！",
        visualPrompt: "Kind little girl holding umbrella over robot, crouching down with gentle smile, surprised robot looking up, rain in background, heartwarming moment, warm colors breaking through cold scene, manga style emotional connection",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 5,
        sceneDescription: "阳光明媚的公园，彩虹出现在天空",
        characterAction: "小女孩和小机器人手拉手一起玩耍，机器人的 LED 眼睛变成明亮的绿色爱心形状",
        dialogue: "你是我的第一个朋友！",
        visualPrompt: "Happy robot and little girl holding hands playing together, robot's LED eyes showing bright green hearts, rainbow in sky, sunny park, joyful atmosphere, friendship theme, vibrant manga style, cheerful lighting",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 6,
        sceneDescription: "傍晚的城市天台，星星开始出现",
        characterAction: "小女孩和机器人坐在天台边缘，一起看星空，机器人的天线亮起温暖的光",
        dialogue: "有了朋友，世界变得好美丽！",
        visualPrompt: "Silhouette of girl and robot sitting on rooftop edge watching stars, robot's antenna glowing warmly, city lights below, starry sky above, peaceful evening scene, friendship bond, beautiful manga ending scene, warm twilight colors",
        imageUrl: null,
        isEditing: false
      }
    ]
  },

  dragon_bakery: {
    title: "小龙的面包店",
    style: "奇幻美食漫画",
    panels: [
      {
        panelNumber: 1,
        sceneDescription: "森林中的小木屋面包店，烟囱冒着烟",
        characterAction: "小绿龙从面包店的烤箱里吐火，不小心把面包烤焦了，慌张地扇动翅膀",
        dialogue: "啊！火太大了！",
        visualPrompt: "Cute green dragon breathing fire into oven, bread burning, panicked expression, flapping wings, cozy wooden bakery interior in forest, smoke coming from chimney, fantasy manga style, warm colors",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 2,
        sceneDescription: "面包店柜台，一排烧焦的面包",
        characterAction: "小龙沮丧地看着失败的面包，尾巴垂下来，头上冒出小黑云",
        dialogue: "我的火焰总是控制不好...",
        visualPrompt: "Disappointed green dragon looking at burnt bread on counter, tail drooping, small dark cloud above head, failed bakery products, sad expression, manga comedy style, soft lighting",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 3,
        sceneDescription: "森林小路，其他动物路过面包店时摇头",
        characterAction: "小龙透过窗户偷看，看到顾客们路过但不进来，眼中含泪",
        dialogue: "没有人要买我的面包...",
        visualPrompt: "Sad dragon peeking through bakery window, customers walking past shaking heads, teary eyes, forest path visible outside, melancholic scene, emotional manga moment",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 4,
        sceneDescription: "面包店内，一只智慧的猫头鹰飞进来，带着魔法书",
        characterAction: "猫头鹰翻开魔法书，教小龙用不同温度的火焰，小龙眼睛发亮",
        dialogue: "原来可以用小火慢烤！",
        visualPrompt: "Wise owl showing magic cookbook to excited dragon, dragon's eyes sparkling with realization, magical sparkles around book, fantasy bakery interior, mentor teaching scene, manga style with magical effects",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 5,
        sceneDescription: "面包店厨房，烤箱中金黄色的面包",
        characterAction: "小龙小心翼翼地控制火焰，吐出柔和的火焰给面包烤色，专注的表情",
        dialogue: "小火、慢烤、耐心...",
        visualPrompt: "Focused green dragon breathing gentle flame into oven, golden bread baking perfectly, concentrated expression, professional baking scene, warm glowing light from oven, detailed manga art style",
        imageUrl: null,
        isEditing: false
      },
      {
        panelNumber: 6,
        sceneDescription: "热闹的面包店，动物顾客们排起长队",
        characterAction: "小龙开心地递出完美的金黄面包，顾客们赞不绝口，店里挂满了五星好评",
        dialogue: "谢谢大家！这是世界上最好吃的龙焰面包！",
        visualPrompt: "Happy dragon serving perfect golden bread to long line of animal customers, five-star reviews on wall, bustling bakery, customers with sparkling eyes eating bread, successful business scene, vibrant manga style, warm cheerful atmosphere",
        imageUrl: null,
        isEditing: false
      }
    ]
  }
};

// 获取所有预设的标题列表
function getMockStoryboardTitles() {
  return Object.keys(MOCK_STORYBOARDS).map(key => ({
    key: key,
    title: MOCK_STORYBOARDS[key].title,
    style: MOCK_STORYBOARDS[key].style,
    panelCount: MOCK_STORYBOARDS[key].panels.length
  }));
}

// 根据 key 获取 mock 数据
function getMockStoryboard(key) {
  return MOCK_STORYBOARDS[key] || null;
}
