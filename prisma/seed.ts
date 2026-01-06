/**
 * Database Seed Script
 *
 * Seeds:
 * 1. Official panel templates
 * 2. Official story templates
 * 3. System user for sample projects
 * 4. Sample projects for new user onboarding
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PREDEFINED_TEMPLATES } from '../src/lib/story-templates';

const prisma = new PrismaClient();

// System user for sample projects
const SYSTEM_USER = {
  email: 'system@comicai.local',
  name: 'ComicAI System',
  password: 'system-user-not-for-login-' + Math.random().toString(36),
  role: 'user' as const,
  status: 'active' as const,
};

// Sample projects data
const SAMPLE_PROJECTS = [
  {
    category: 'beginner',
    story: {
      title: '校园日常：迟到的早晨',
      premise: '高中生小明因为熬夜打游戏导致起床迟到，在上学路上遇到各种搞笑的事情，最后发现今天其实是周末。',
      genre: 'daily',
      outline: {
        acts: [
          { title: '起床', description: '闹钟响了，小明挣扎着起床' },
          { title: '冲刺', description: '一路狂奔去学校' },
          { title: '意外', description: '发现学校大门紧闭' },
          { title: '真相', description: '原来今天是周末' },
        ],
      },
    },
    project: {
      title: '校园日常：迟到的早晨',
      description: '一个关于迟到的搞笑4格漫画',
      style: '日式漫画',
    },
    panels: [
      {
        panel_order: 1,
        panel_type: 'medium',
        importance: 'high',
        description: '清晨的卧室，闹钟显示7:45，小明睁开惺忪的睡眼，一脸懵逼地看着闹钟',
        dialogue: '啊！！迟到了！！',
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/1a1a2e/ffffff?text=Panel+1',
      },
      {
        panel_order: 2,
        panel_type: 'action',
        importance: 'high',
        description: '小明一边穿衣服一边嘴里叼着面包，冲出家门，速度线强调快速移动',
        dialogue: '来不及了来不及了！',
        camera_angle: '平视',
        shot_size: '全景',
        generated_image: 'https://placehold.co/600x600/16213e/ffffff?text=Panel+2',
      },
      {
        panel_order: 3,
        panel_type: 'medium',
        importance: 'high',
        description: '小明气喘吁吁地站在学校门口，发现大门紧锁，周围空无一人',
        dialogue: '咦？怎么没人...',
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/0f3460/ffffff?text=Panel+3',
      },
      {
        panel_order: 4,
        panel_type: 'closeup',
        importance: 'high',
        description: '小明看着手机日历，上面清楚地显示"周六"，表情从惊讶变成无奈',
        dialogue: '今天...周六？',
        camera_angle: '俯视',
        shot_size: '特写',
        generated_image: 'https://placehold.co/600x600/e94560/ffffff?text=Panel+4',
      },
    ],
  },
  {
    category: 'intermediate',
    story: {
      title: '奇幻冒险：勇者的第一步',
      premise: '年轻的冒险者艾拉第一次接受任务，去森林里寻找失踪的商人，却意外遇到了一只受伤的小龙，决定帮助它。',
      genre: 'fantasy',
      outline: {
        acts: [
          { title: '接任务', description: '艾拉在公会接下第一个任务' },
          { title: '进森林', description: '独自进入神秘的魔法森林' },
          { title: '遭遇战', description: '听到奇怪的声音，准备战斗' },
          { title: '意外发现', description: '发现是一只受伤的小龙' },
          { title: '决心', description: '决定帮助小龙，开启新的冒险' },
          { title: '出发', description: '带着小龙继续前进' },
          { title: '伏笔', description: '远处有神秘的目光注视着他们' },
          { title: '篇章结束', description: '冒险才刚刚开始' },
        ],
      },
    },
    project: {
      title: '奇幻冒险：勇者的第一步',
      description: '一个关于勇者与小龙相遇的奇幻故事',
      style: '日式漫画',
    },
    panels: [
      {
        panel_order: 1,
        panel_type: 'wide',
        importance: 'high',
        description: '冒险者公会内部，各种冒险者在聊天喝酒，年轻的艾拉站在任务板前',
        dialogue: '这个任务...我来试试！',
        camera_angle: '平视',
        shot_size: '全景',
        generated_image: 'https://placehold.co/800x400/2d3436/ffffff?text=Panel+1',
      },
      {
        panel_order: 2,
        panel_type: 'medium',
        importance: 'medium',
        description: '艾拉走在神秘的森林小路上，周围是高大的古树，阳光透过树叶洒下',
        dialogue: null,
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/00b894/ffffff?text=Panel+2',
      },
      {
        panel_order: 3,
        panel_type: 'closeup',
        importance: 'high',
        description: '艾拉听到奇怪的声音，握紧了手中的剑，警惕地环顾四周',
        dialogue: '什么声音？！',
        camera_angle: '平视',
        shot_size: '特写',
        generated_image: 'https://placehold.co/600x600/6c5ce7/ffffff?text=Panel+3',
      },
      {
        panel_order: 4,
        panel_type: 'medium',
        importance: 'high',
        description: '灌木丛中，一只受伤的小龙躺在地上，翅膀上有伤口，眼神警惕又恐惧',
        dialogue: '是...龙？！',
        camera_angle: '俯视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/fd79a8/ffffff?text=Panel+4',
      },
      {
        panel_order: 5,
        panel_type: 'closeup',
        importance: 'high',
        description: '艾拉收起剑，蹲下身子，温柔地看着小龙，伸出手',
        dialogue: '别怕...我不会伤害你',
        camera_angle: '平视',
        shot_size: '近景',
        generated_image: 'https://placehold.co/600x600/e17055/ffffff?text=Panel+5',
      },
      {
        panel_order: 6,
        panel_type: 'medium',
        importance: 'medium',
        description: '小龙慢慢靠近艾拉，用头蹭了蹭她的手',
        dialogue: null,
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/74b9ff/ffffff?text=Panel+6',
      },
      {
        panel_order: 7,
        panel_type: 'wide',
        importance: 'medium',
        description: '远处的山崖上，一个黑色斗篷的神秘人影注视着森林',
        dialogue: '有意思...',
        camera_angle: '仰视',
        shot_size: '远景',
        generated_image: 'https://placehold.co/800x400/2d3436/ffffff?text=Panel+7',
      },
      {
        panel_order: 8,
        panel_type: 'wide',
        importance: 'high',
        description: '艾拉抱着小龙，在夕阳下继续前进，画面温馨而充满希望',
        dialogue: '走吧，一起去冒险！',
        camera_angle: '平视',
        shot_size: '远景',
        generated_image: 'https://placehold.co/800x400/fdcb6e/ffffff?text=Panel+8',
      },
    ],
  },
  {
    category: 'advanced',
    story: {
      title: '科幻短篇：最后的记忆',
      premise: '2157年，人类可以将记忆上传到云端。老科学家李明在生命的最后时刻，选择删除自己的所有记忆，只保留一个——与已故妻子的初次相遇。',
      genre: 'scifi',
      outline: {
        acts: [
          { title: '未来世界', description: '展示记忆上传技术的普及' },
          { title: '抉择时刻', description: '李明面对记忆删除的选择' },
          { title: '回忆涌现', description: '一生的回忆在脑海中闪过' },
          { title: '那一天', description: '与妻子初次相遇的记忆' },
          { title: '告别', description: '其他记忆开始消散' },
          { title: '永恒', description: '只剩下那个最珍贵的瞬间' },
        ],
      },
    },
    project: {
      title: '科幻短篇：最后的记忆',
      description: '一个关于记忆与爱的科幻故事',
      style: '美式漫画',
    },
    panels: [
      {
        panel_order: 1,
        panel_type: 'wide',
        importance: 'high',
        description: '2157年的城市全景，高楼大厦间有全息广告："记忆云端，永恒保存"',
        dialogue: null,
        camera_angle: '俯视',
        shot_size: '远景',
        generated_image: 'https://placehold.co/800x400/0984e3/ffffff?text=Panel+1',
      },
      {
        panel_order: 2,
        panel_type: 'medium',
        importance: 'high',
        description: '医院病房，老年李明躺在床上，周围是各种科技设备，医生站在旁边',
        dialogue: '李教授，您确定要删除所有记忆吗？',
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/636e72/ffffff?text=Panel+2',
      },
      {
        panel_order: 3,
        panel_type: 'closeup',
        importance: 'high',
        description: '李明的眼睛特写，眼中有坚定的光芒，嘴角带着微笑',
        dialogue: '只保留一个就够了...',
        camera_angle: '平视',
        shot_size: '特写',
        generated_image: 'https://placehold.co/600x600/b2bec3/ffffff?text=Panel+3',
      },
      {
        panel_order: 4,
        panel_type: 'medium',
        importance: 'medium',
        description: '记忆画面：年轻的李明获得诺贝尔奖，闪光灯不断',
        dialogue: null,
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/ffeaa7/ffffff?text=Panel+4',
      },
      {
        panel_order: 5,
        panel_type: 'medium',
        importance: 'medium',
        description: '记忆画面：李明与儿女们的合影，全家福',
        dialogue: null,
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/fab1a0/ffffff?text=Panel+5',
      },
      {
        panel_order: 6,
        panel_type: 'medium',
        importance: 'high',
        description: '记忆画面：年轻的李明第一次见到妻子，阳光下她正在图书馆看书，发丝在光中闪耀',
        dialogue: '你好...这本书可以借我看看吗？',
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/ff7675/ffffff?text=Panel+6',
      },
      {
        panel_order: 7,
        panel_type: 'closeup',
        importance: 'high',
        description: '年轻妻子抬头微笑的瞬间，定格在时间中',
        dialogue: null,
        camera_angle: '平视',
        shot_size: '特写',
        generated_image: 'https://placehold.co/600x600/fd79a8/ffffff?text=Panel+7',
      },
      {
        panel_order: 8,
        panel_type: 'medium',
        importance: 'medium',
        description: '其他记忆像碎片一样消散，只有那个微笑的画面越来越清晰',
        dialogue: null,
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/a29bfe/ffffff?text=Panel+8',
      },
      {
        panel_order: 9,
        panel_type: 'closeup',
        importance: 'high',
        description: '现在的李明，闭上眼睛，脸上带着平静幸福的笑容',
        dialogue: '这就够了...',
        camera_angle: '平视',
        shot_size: '特写',
        generated_image: 'https://placehold.co/600x600/dfe6e9/ffffff?text=Panel+9',
      },
      {
        panel_order: 10,
        panel_type: 'wide',
        importance: 'high',
        description: '最后一格：那个阳光明媚的图书馆，年轻的两人相视而笑，时间仿佛永恒',
        dialogue: null,
        camera_angle: '平视',
        shot_size: '全景',
        generated_image: 'https://placehold.co/800x400/ffeaa7/ffffff?text=Panel+10',
      },
      {
        panel_order: 11,
        panel_type: 'medium',
        importance: 'medium',
        description: '画外音：2157年，人类发明了永恒保存记忆的技术',
        dialogue: null,
        camera_angle: '平视',
        shot_size: '中景',
        generated_image: 'https://placehold.co/600x600/81ecec/ffffff?text=Panel+11',
      },
      {
        panel_order: 12,
        panel_type: 'wide',
        importance: 'high',
        description: '最后一幅：那个微笑，在数字世界中永远闪耀，配文字：但有些记忆，本就是永恒的',
        dialogue: '- 完 -',
        camera_angle: '平视',
        shot_size: '全景',
        generated_image: 'https://placehold.co/800x400/74b9ff/ffffff?text=The+End',
      },
    ],
  },
];

// Official templates (existing)
const OFFICIAL_TEMPLATES = [
  {
    name: "经典对话-3",
    description: "适用于两人对话场景的3分镜模板，强调情绪变化和互动",
    panel_count: 3,
    tags: ["对话", "日常", "情感"],
    template_data: {
      panels: [
        { panel_type: "medium", camera_angle: "平视", shot_size: "中景", importance: "high" as const, relative_position: 0 },
        { panel_type: "closeup", camera_angle: "平视", shot_size: "特写", importance: "high" as const, relative_position: 1 },
        { panel_type: "medium", camera_angle: "平视", shot_size: "中景", importance: "medium" as const, relative_position: 2 }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "快节奏战斗-4",
    description: "适用于快速战斗场景的4分镜模板，强调动作连贯性和冲击力",
    panel_count: 4,
    tags: ["战斗", "动作", "热血"],
    template_data: {
      panels: [
        { panel_type: "action", camera_angle: "平视", shot_size: "全景", importance: "high" as const, relative_position: 0 },
        { panel_type: "action", camera_angle: "仰视", shot_size: "近景", importance: "high" as const, relative_position: 1 },
        { panel_type: "action", camera_angle: "俯视", shot_size: "特写", importance: "high" as const, relative_position: 2 },
        { panel_type: "action", camera_angle: "平视", shot_size: "远景", importance: "medium" as const, relative_position: 3 }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "情感爆发-3",
    description: "适用于情感高潮场景的3分镜模板，强调内心变化和情绪渲染",
    panel_count: 3,
    tags: ["情感", "剧情", "特写"],
    template_data: {
      panels: [
        { panel_type: "medium", camera_angle: "平视", shot_size: "中景", importance: "medium" as const, relative_position: 0 },
        { panel_type: "closeup", camera_angle: "平视", shot_size: "特写", importance: "high" as const, relative_position: 1 },
        { panel_type: "closeup", camera_angle: "俯视", shot_size: "特写", importance: "high" as const, relative_position: 2 }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "悬疑氛围-4",
    description: "适用于悬疑紧张场景的4分镜模板，强调氛围营造和信息揭示",
    panel_count: 4,
    tags: ["悬疑", "氛围", "剧情"],
    template_data: {
      panels: [
        { panel_type: "wide", camera_angle: "俯视", shot_size: "远景", importance: "medium" as const, relative_position: 0 },
        { panel_type: "medium", camera_angle: "平视", shot_size: "中景", importance: "medium" as const, relative_position: 1 },
        { panel_type: "closeup", camera_angle: "荷兰角", shot_size: "特写", importance: "high" as const, relative_position: 2 },
        { panel_type: "closeup", camera_angle: "平视", shot_size: "特写", importance: "high" as const, relative_position: 3 }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "场景转换-3",
    description: "适用于场景切换的3分镜模板，强调空间感和过渡流畅性",
    panel_count: 3,
    tags: ["转场", "叙事", "场景"],
    template_data: {
      panels: [
        { panel_type: "transition", camera_angle: "平视", shot_size: "全景", importance: "medium" as const, relative_position: 0 },
        { panel_type: "transition", camera_angle: "平视", shot_size: "中景", importance: "low" as const, relative_position: 1 },
        { panel_type: "medium", camera_angle: "平视", shot_size: "中景", importance: "medium" as const, relative_position: 2 }
      ]
    },
    thumbnail_url: null
  },
];

// Layout Templates for the Layout Editor
const LAYOUT_TEMPLATES = [
  // Japanese manga style
  {
    name: "日式-单格",
    category: "japanese",
    description: "单格全页面，适合封面或大场景",
    width: 1080,
    height: 1920,
    panel_slots: [
      { id: "slot-1", x: 2, y: 2, width: 96, height: 96 },
    ],
    is_system: true,
    recommended: true,
  },
  {
    name: "日式-两格竖",
    category: "japanese",
    description: "上下两格分布，适合对话或对比",
    width: 1080,
    height: 1920,
    panel_slots: [
      { id: "slot-1", x: 2, y: 2, width: 96, height: 47 },
      { id: "slot-2", x: 2, y: 51, width: 96, height: 47 },
    ],
    is_system: true,
    recommended: true,
  },
  {
    name: "日式-三格竖",
    category: "japanese",
    description: "三格垂直分布，适合剧情推进",
    width: 1080,
    height: 1920,
    panel_slots: [
      { id: "slot-1", x: 2, y: 2, width: 96, height: 31 },
      { id: "slot-2", x: 2, y: 35, width: 96, height: 31 },
      { id: "slot-3", x: 2, y: 68, width: 96, height: 30 },
    ],
    is_system: true,
    recommended: true,
  },
  {
    name: "日式-四格经典",
    category: "japanese",
    description: "2x2 经典四格，适合搞笑漫画",
    width: 1080,
    height: 1920,
    panel_slots: [
      { id: "slot-1", x: 2, y: 2, width: 47, height: 47 },
      { id: "slot-2", x: 51, y: 2, width: 47, height: 47 },
      { id: "slot-3", x: 2, y: 51, width: 47, height: 47 },
      { id: "slot-4", x: 51, y: 51, width: 47, height: 47 },
    ],
    is_system: true,
    recommended: true,
  },
  {
    name: "日式-五格对角",
    category: "japanese",
    description: "五格对角布局，适合动作场景",
    width: 1080,
    height: 1920,
    panel_slots: [
      { id: "slot-1", x: 2, y: 2, width: 60, height: 30 },
      { id: "slot-2", x: 64, y: 2, width: 34, height: 30 },
      { id: "slot-3", x: 2, y: 34, width: 96, height: 32 },
      { id: "slot-4", x: 2, y: 68, width: 47, height: 30 },
      { id: "slot-5", x: 51, y: 68, width: 47, height: 30 },
    ],
    is_system: true,
    recommended: false,
  },
  {
    name: "日式-六格均匀",
    category: "japanese",
    description: "2x3 六格均匀布局",
    width: 1080,
    height: 1920,
    panel_slots: [
      { id: "slot-1", x: 2, y: 2, width: 47, height: 31 },
      { id: "slot-2", x: 51, y: 2, width: 47, height: 31 },
      { id: "slot-3", x: 2, y: 35, width: 47, height: 31 },
      { id: "slot-4", x: 51, y: 35, width: 47, height: 31 },
      { id: "slot-5", x: 2, y: 68, width: 47, height: 30 },
      { id: "slot-6", x: 51, y: 68, width: 47, height: 30 },
    ],
    is_system: true,
    recommended: false,
  },
  // American comic style
  {
    name: "美式-横幅",
    category: "american",
    description: "横向宽幅布局，适合动作场景",
    width: 2063,
    height: 3131,
    panel_slots: [
      { id: "slot-1", x: 2, y: 2, width: 96, height: 30 },
      { id: "slot-2", x: 2, y: 34, width: 96, height: 32 },
      { id: "slot-3", x: 2, y: 68, width: 96, height: 30 },
    ],
    is_system: true,
    recommended: true,
  },
  {
    name: "美式-动态格",
    category: "american",
    description: "不规则动态布局，适合超级英雄",
    width: 2063,
    height: 3131,
    panel_slots: [
      { id: "slot-1", x: 2, y: 2, width: 96, height: 35 },
      { id: "slot-2", x: 2, y: 39, width: 48, height: 28 },
      { id: "slot-3", x: 52, y: 39, width: 46, height: 28 },
      { id: "slot-4", x: 2, y: 69, width: 60, height: 29 },
      { id: "slot-5", x: 64, y: 69, width: 34, height: 29 },
    ],
    is_system: true,
    recommended: true,
  },
  // Webtoon style
  {
    name: "条漫-单格",
    category: "webtoon",
    description: "条漫单格，适合手机阅读",
    width: 800,
    height: 1280,
    panel_slots: [
      { id: "slot-1", x: 0, y: 0, width: 100, height: 100 },
    ],
    is_system: true,
    recommended: true,
  },
  {
    name: "条漫-两格",
    category: "webtoon",
    description: "条漫两格垂直布局",
    width: 800,
    height: 1600,
    panel_slots: [
      { id: "slot-1", x: 0, y: 0, width: 100, height: 48 },
      { id: "slot-2", x: 0, y: 52, width: 100, height: 48 },
    ],
    is_system: true,
    recommended: true,
  },
  {
    name: "条漫-三格",
    category: "webtoon",
    description: "条漫三格垂直布局",
    width: 800,
    height: 2000,
    panel_slots: [
      { id: "slot-1", x: 0, y: 0, width: 100, height: 32 },
      { id: "slot-2", x: 0, y: 34, width: 100, height: 32 },
      { id: "slot-3", x: 0, y: 68, width: 100, height: 32 },
    ],
    is_system: true,
    recommended: true,
  },
  // Free style
  {
    name: "自由-空白",
    category: "free",
    description: "空白画布，自由创作",
    width: 1080,
    height: 1920,
    panel_slots: [],
    is_system: true,
    recommended: true,
  },
  {
    name: "自由-网格辅助",
    category: "free",
    description: "带网格辅助线的空白画布",
    width: 1080,
    height: 1920,
    panel_slots: [],
    is_system: true,
    recommended: false,
  },
];

async function main() {
  console.log('开始种子数据初始化...\n');

  // 1. Create or get system user
  console.log('1. 创建/获取系统用户...');
  let systemUser = await prisma.user.findUnique({
    where: { email: SYSTEM_USER.email }
  });

  if (!systemUser) {
    const hashedPassword = await bcrypt.hash(SYSTEM_USER.password, 10);
    systemUser = await prisma.user.create({
      data: {
        email: SYSTEM_USER.email,
        name: SYSTEM_USER.name,
        password_hash: hashedPassword,
        role: SYSTEM_USER.role,
        status: SYSTEM_USER.status,
        verified: true,
      }
    });
    console.log('✓ 创建系统用户:', systemUser.email);
  } else {
    console.log('✓ 系统用户已存在:', systemUser.email);
  }

  // 2. Clear and create official panel templates
  console.log('\n2. 创建官方分镜模板...');
  await prisma.panelTemplate.deleteMany({
    where: { is_official: true }
  });

  for (const template of OFFICIAL_TEMPLATES) {
    await prisma.panelTemplate.create({
      data: {
        ...template,
        is_official: true,
        is_public: true,
        user_id: null
      }
    });
    console.log(`✓ 创建分镜模板: ${template.name}`);
  }

  // 3. Clear and create official story templates
  console.log('\n3. 创建官方故事模板...');
  await prisma.storyTemplate.deleteMany({
    where: { user_id: null, is_public: true }
  });

  for (const template of PREDEFINED_TEMPLATES) {
    await prisma.storyTemplate.create({
      data: {
        name: template.name,
        category: template.category,
        description: template.description,
        structure: template.structure as any,
        prompts: template.prompts as any,
        is_public: true,
        user_id: null, // System template
      }
    });
    console.log(`✓ 创建故事模板: ${template.name} (${template.category})`);
  }

  // 4. Clear existing sample projects
  console.log('\n4. 清理已有示例项目...');
  await prisma.story.deleteMany({
    where: { is_sample: true }
  });

  // 5. Create sample projects
  console.log('\n5. 创建示例项目...');
  for (const sample of SAMPLE_PROJECTS) {
    // Create story
    const story = await prisma.story.create({
      data: {
        user_id: systemUser.id,
        title: sample.story.title,
        premise: sample.story.premise,
        genre: sample.story.genre,
        outline: sample.story.outline,
        status: 'completed',
        is_sample: true,
        sample_category: sample.category,
      }
    });

    // Create project
    const project = await prisma.project.create({
      data: {
        user_id: systemUser.id,
        story_id: story.id,
        title: sample.project.title,
        description: sample.project.description,
        style: sample.project.style,
        status: 'completed',
      }
    });

    // Create panels
    for (const panel of sample.panels) {
      await prisma.panel.create({
        data: {
          project_id: project.id,
          panel_order: panel.panel_order,
          panel_type: panel.panel_type,
          importance: panel.importance,
          description: panel.description,
          dialogue: panel.dialogue,
          camera_angle: panel.camera_angle,
          shot_size: panel.shot_size,
          generated_image: panel.generated_image,
        }
      });
    }

    console.log(`✓ 创建示例项目: ${sample.story.title} (${sample.panels.length} 格)`);
  }

  // 6. Clear and create layout templates
  console.log('\n6. 创建布局模板...');
  await prisma.layoutTemplate.deleteMany({
    where: { is_system: true }
  });

  for (const template of LAYOUT_TEMPLATES) {
    await prisma.layoutTemplate.create({
      data: {
        name: template.name,
        category: template.category,
        description: template.description,
        width: template.width,
        height: template.height,
        panel_slots: template.panel_slots,
        is_system: template.is_system,
        recommended: template.recommended,
        user_id: null,
        use_count: 0,
      }
    });
    console.log(`✓ 创建布局模板: ${template.name} (${template.category})`);
  }

  console.log(`\n种子数据初始化完成！`);
  console.log(`- 官方分镜模板: ${OFFICIAL_TEMPLATES.length} 个`);
  console.log(`- 官方故事模板: ${PREDEFINED_TEMPLATES.length} 个`);
  console.log(`- 布局模板: ${LAYOUT_TEMPLATES.length} 个`);
  console.log(`- 示例项目: ${SAMPLE_PROJECTS.length} 个`);
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
