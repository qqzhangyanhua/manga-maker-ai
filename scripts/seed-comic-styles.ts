import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const comicStylesData = [
  {
    style_key: "manga",
    name_zh: "日式漫画",
    name_en: "MANGA",
    image_url: "/assets/style-manga.jpg",
    tag_color: "bg-comic-pink text-background",
    description: "经典的日式漫画风格，特点是大眼睛、夸张表情和动态分镜",
    prompt_prefix: "japanese manga style, anime art style",
    sort_order: 1,
    enabled: true,
  },
  {
    style_key: "american",
    name_zh: "美式漫画",
    name_en: "AMERICAN",
    image_url: "/assets/style-american.jpg",
    tag_color: "bg-comic-red text-foreground",
    description: "美式超级英雄漫画风格，强调肌肉线条和英雄主义",
    prompt_prefix: "american comic book style, superhero art style",
    sort_order: 2,
    enabled: true,
  },
  {
    style_key: "webtoon",
    name_zh: "韩式条漫",
    name_en: "WEBTOON",
    image_url: "/assets/style-webtoon.jpg",
    tag_color: "bg-comic-blue text-background",
    description: "韩国网络漫画风格，适合竖屏阅读，色彩柔和细腻",
    prompt_prefix: "korean webtoon style, manhwa art style",
    sort_order: 3,
    enabled: true,
  },
  {
    style_key: "european",
    name_zh: "欧式漫画",
    name_en: "EUROPEAN",
    image_url: "/assets/style-european.jpg",
    tag_color: "bg-comic-purple text-foreground",
    description: "欧洲漫画风格，注重写实和细节，艺术感强",
    prompt_prefix: "european comic style, bande dessinée style",
    sort_order: 4,
    enabled: true,
  },
  {
    style_key: "watercolor",
    name_zh: "水彩风格",
    name_en: "WATERCOLOR",
    image_url: "/assets/style-watercolor.jpg",
    tag_color: "bg-comic-green text-background",
    description: "柔和的水彩画风格，适合温馨治愈系作品",
    prompt_prefix: "watercolor art style, soft painting",
    sort_order: 5,
    enabled: true,
  },
  {
    style_key: "retro",
    name_zh: "复古漫画",
    name_en: "RETRO",
    image_url: "/assets/style-retro.jpg",
    tag_color: "bg-comic-orange text-background",
    description: "经典复古漫画风格，怀旧色调和半调网点",
    prompt_prefix: "retro comic style, vintage comic book art",
    sort_order: 6,
    enabled: true,
  },
];

async function main() {
  console.log("🚀 开始导入漫画风格数据...\n");

  for (const style of comicStylesData) {
    try {
      const existing = await prisma.comicStyle.findUnique({
        where: { style_key: style.style_key },
      });

      if (existing) {
        // 更新已存在的记录
        await prisma.comicStyle.update({
          where: { style_key: style.style_key },
          data: style,
        });
        console.log(`✅ 更新风格: ${style.name_zh} (${style.style_key})`);
      } else {
        // 创建新记录
        await prisma.comicStyle.create({
          data: style,
        });
        console.log(`✨ 创建风格: ${style.name_zh} (${style.style_key})`);
      }
    } catch (error) {
      console.error(`❌ 处理失败: ${style.name_zh}`, error);
    }
  }

  // 统计信息
  const total = await prisma.comicStyle.count();
  const enabled = await prisma.comicStyle.count({ where: { enabled: true } });

  console.log("\n📊 导入完成统计:");
  console.log(`   总数: ${total}`);
  console.log(`   启用: ${enabled}`);
  console.log(`   禁用: ${total - enabled}`);
}

main()
  .catch((e) => {
    console.error("❌ 导入失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
