/**
 * Database Seed Script - Phase 1
 *
 * Seeds official panel templates
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OFFICIAL_TEMPLATES = [
  {
    name: "经典对话-3",
    description: "适用于两人对话场景的3分镜模板，强调情绪变化和互动",
    panel_count: 3,
    tags: ["对话", "日常", "情感"],
    template_data: {
      panels: [
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "high" as const,
          relative_position: 0
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 1
        },
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 2
        }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "深度对话-4",
    description: "适用于关键对话场景的4分镜模板，强调戏剧张力和情感推进",
    panel_count: 4,
    tags: ["对话", "剧情", "情感"],
    template_data: {
      panels: [
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "全景",
          importance: "medium" as const,
          relative_position: 0
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 1
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 2
        },
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 3
        }
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
        {
          panel_type: "action",
          camera_angle: "平视",
          shot_size: "全景",
          importance: "high" as const,
          relative_position: 0
        },
        {
          panel_type: "action",
          camera_angle: "仰视",
          shot_size: "近景",
          importance: "high" as const,
          relative_position: 1
        },
        {
          panel_type: "action",
          camera_angle: "俯视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 2
        },
        {
          panel_type: "action",
          camera_angle: "平视",
          shot_size: "远景",
          importance: "medium" as const,
          relative_position: 3
        }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "史诗战斗-6",
    description: "适用于大型战斗场景的6分镜模板，强调场面感和叙事节奏",
    panel_count: 6,
    tags: ["战斗", "动作", "史诗"],
    template_data: {
      panels: [
        {
          panel_type: "wide",
          camera_angle: "平视",
          shot_size: "远景",
          importance: "high" as const,
          relative_position: 0
        },
        {
          panel_type: "action",
          camera_angle: "仰视",
          shot_size: "全景",
          importance: "high" as const,
          relative_position: 1
        },
        {
          panel_type: "action",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "high" as const,
          relative_position: 2
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 3
        },
        {
          panel_type: "action",
          camera_angle: "俯视",
          shot_size: "全景",
          importance: "medium" as const,
          relative_position: 4
        },
        {
          panel_type: "wide",
          camera_angle: "平视",
          shot_size: "远景",
          importance: "medium" as const,
          relative_position: 5
        }
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
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 0
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 1
        },
        {
          panel_type: "closeup",
          camera_angle: "俯视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 2
        }
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
        {
          panel_type: "wide",
          camera_angle: "俯视",
          shot_size: "远景",
          importance: "medium" as const,
          relative_position: 0
        },
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 1
        },
        {
          panel_type: "closeup",
          camera_angle: "荷兰角",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 2
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 3
        }
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
        {
          panel_type: "transition",
          camera_angle: "平视",
          shot_size: "全景",
          importance: "medium" as const,
          relative_position: 0
        },
        {
          panel_type: "transition",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "low" as const,
          relative_position: 1
        },
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 2
        }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "动作序列-6",
    description: "适用于连续动作场景的6分镜模板，强调动作流畅性和节奏感",
    panel_count: 6,
    tags: ["动作", "连续", "叙事"],
    template_data: {
      panels: [
        {
          panel_type: "action",
          camera_angle: "平视",
          shot_size: "全景",
          importance: "medium" as const,
          relative_position: 0
        },
        {
          panel_type: "action",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 1
        },
        {
          panel_type: "action",
          camera_angle: "仰视",
          shot_size: "近景",
          importance: "high" as const,
          relative_position: 2
        },
        {
          panel_type: "action",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 3
        },
        {
          panel_type: "action",
          camera_angle: "俯视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 4
        },
        {
          panel_type: "wide",
          camera_angle: "平视",
          shot_size: "远景",
          importance: "medium" as const,
          relative_position: 5
        }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "人物特写-3",
    description: "适用于人物刻画场景的3分镜模板，强调表情细节和情感表达",
    panel_count: 3,
    tags: ["特写", "人物", "情感"],
    template_data: {
      panels: [
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 0
        },
        {
          panel_type: "closeup",
          camera_angle: "仰视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 1
        },
        {
          panel_type: "closeup",
          camera_angle: "俯视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 2
        }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "环境展示-4",
    description: "适用于环境介绍场景的4分镜模板，强调空间感和氛围营造",
    panel_count: 4,
    tags: ["场景", "环境", "叙事"],
    template_data: {
      panels: [
        {
          panel_type: "wide",
          camera_angle: "平视",
          shot_size: "远景",
          importance: "high" as const,
          relative_position: 0
        },
        {
          panel_type: "wide",
          camera_angle: "俯视",
          shot_size: "全景",
          importance: "medium" as const,
          relative_position: 1
        },
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 2
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "近景",
          importance: "low" as const,
          relative_position: 3
        }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "回忆闪回-4",
    description: "适用于回忆场景的4分镜模板，强调时空转换和情感氛围",
    panel_count: 4,
    tags: ["回忆", "叙事", "情感"],
    template_data: {
      panels: [
        {
          panel_type: "transition",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 0
        },
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "全景",
          importance: "medium" as const,
          relative_position: 1
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 2
        },
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "high" as const,
          relative_position: 3
        }
      ]
    },
    thumbnail_url: null
  },
  {
    name: "蒙太奇序列-6",
    description: "适用于时间推移或并行叙事的6分镜模板，强调节奏感和信息密度",
    panel_count: 6,
    tags: ["蒙太奇", "叙事", "节奏"],
    template_data: {
      panels: [
        {
          panel_type: "medium",
          camera_angle: "平视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 0
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "特写",
          importance: "medium" as const,
          relative_position: 1
        },
        {
          panel_type: "medium",
          camera_angle: "俯视",
          shot_size: "全景",
          importance: "medium" as const,
          relative_position: 2
        },
        {
          panel_type: "closeup",
          camera_angle: "平视",
          shot_size: "近景",
          importance: "medium" as const,
          relative_position: 3
        },
        {
          panel_type: "medium",
          camera_angle: "仰视",
          shot_size: "中景",
          importance: "medium" as const,
          relative_position: 4
        },
        {
          panel_type: "wide",
          camera_angle: "平视",
          shot_size: "远景",
          importance: "low" as const,
          relative_position: 5
        }
      ]
    },
    thumbnail_url: null
  }
];

async function main() {
  console.log('开始种子数据初始化...');

  // Clear existing official templates (optional)
  console.log('清理已有的官方模板...');
  await prisma.panelTemplate.deleteMany({
    where: { is_official: true }
  });

  // Create official templates
  console.log('创建官方模板...');
  for (const template of OFFICIAL_TEMPLATES) {
    await prisma.panelTemplate.create({
      data: {
        ...template,
        is_official: true,
        is_public: true,
        user_id: null // Official templates have no owner
      }
    });
    console.log(`✓ 创建模板: ${template.name}`);
  }

  console.log(`\n种子数据初始化完成！共创建 ${OFFICIAL_TEMPLATES.length} 个官方模板。`);
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
