import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedComicStyles(): Promise<void> {
  console.log("Seeding comic styles...");

  const styles = [
    {
      style_key: "manga",
      name_zh: "日式漫画",
      name_en: "MANGA",
      image_url: "http://111.228.37.74:9000/input-image/styles/manga.jpg",
      tag_color: "bg-primary text-background",
      description: "日本漫画风格，黑白分明，强调线条和动态",
      sort_order: 1,
      enabled: true,
    },
    {
      style_key: "american",
      name_zh: "美式漫画",
      name_en: "AMERICAN",
      image_url: "http://111.228.37.74:9000/input-image/styles/american.jpg",
      tag_color: "bg-blue-500 text-white",
      description: "美国超级英雄风格，色彩鲜艳，强调肌肉和动作",
      sort_order: 2,
      enabled: true,
    },
    {
      style_key: "webtoon",
      name_zh: "条漫",
      name_en: "WEBTOON",
      image_url: "http://111.228.37.74:9000/input-image/styles/webtoon.jpg",
      tag_color: "bg-green-500 text-white",
      description: "韩式条漫，竖向滚动，色彩柔和",
      sort_order: 3,
      enabled: true,
    },
    {
      style_key: "monochrome",
      name_zh: "黑白条漫",
      name_en: "MONOCHROME",
      image_url: "http://111.228.37.74:9000/input-image/styles/monochrome.jpg",
      tag_color: "bg-gray-500 text-white",
      description: "经典黑白风格，注重光影和对比",
      sort_order: 4,
      enabled: true,
    },
    {
      style_key: "watercolor",
      name_zh: "水彩风格",
      name_en: "WATERCOLOR",
      image_url: "http://111.228.37.74:9000/input-image/styles/watercolor.jpg",
      tag_color: "bg-cyan-500 text-white",
      description: "柔和的水彩渲染，色彩自然流动，纸质肌理感",
      prompt_prefix: "watercolor painting style, soft colors, paper texture",
      sort_order: 5,
      enabled: true,
    },
    {
      style_key: "cyberpunk",
      name_zh: "赛博朋克",
      name_en: "CYBERPUNK",
      image_url: "http://111.228.37.74:9000/input-image/styles/cyberpunk.jpg",
      tag_color: "bg-purple-600 text-white",
      description: "未来科技感，霓虹色调，高对比度",
      prompt_prefix: "cyberpunk style, neon lights, futuristic, high contrast",
      sort_order: 6,
      enabled: true,
    },
    {
      style_key: "steampunk",
      name_zh: "蒸汽朋克",
      name_en: "STEAMPUNK",
      image_url: "http://111.228.37.74:9000/input-image/styles/steampunk.jpg",
      tag_color: "bg-amber-700 text-white",
      description: "维多利亚时代机械美学，齿轮、蒸汽、铜色调",
      prompt_prefix: "steampunk style, Victorian era, gears, brass and copper tones",
      sort_order: 7,
      enabled: true,
    },
    {
      style_key: "chinese-ink",
      name_zh: "中国水墨",
      name_en: "CHINESE INK",
      image_url: "http://111.228.37.74:9000/input-image/styles/chinese-ink.jpg",
      tag_color: "bg-slate-700 text-white",
      description: "传统水墨画风格，写意笔触，留白艺术",
      prompt_prefix: "Chinese ink painting style, traditional brush strokes, negative space",
      sort_order: 8,
      enabled: true,
    },
    {
      style_key: "pixel-art",
      name_zh: "像素风格",
      name_en: "PIXEL ART",
      image_url: "http://111.228.37.74:9000/input-image/styles/pixel-art.jpg",
      tag_color: "bg-pink-500 text-white",
      description: "复古8-bit/16-bit游戏风格，方块像素感",
      prompt_prefix: "pixel art style, 8-bit, retro game graphics",
      sort_order: 9,
      enabled: true,
    },
    {
      style_key: "realistic",
      name_zh: "写实风格",
      name_en: "REALISTIC",
      image_url: "http://111.228.37.74:9000/input-image/styles/realistic.jpg",
      tag_color: "bg-stone-600 text-white",
      description: "照片级真实感，细节丰富，自然光影",
      prompt_prefix: "photorealistic, highly detailed, natural lighting",
      sort_order: 10,
      enabled: true,
    },
    {
      style_key: "minimalist",
      name_zh: "极简风格",
      name_en: "MINIMALIST",
      image_url: "http://111.228.37.74:9000/input-image/styles/minimalist.jpg",
      tag_color: "bg-gray-400 text-white",
      description: "简洁线条，几何图形，纯色块，少即是多",
      prompt_prefix: "minimalist style, simple lines, geometric shapes, flat colors",
      sort_order: 11,
      enabled: true,
    },
    {
      style_key: "gothic",
      name_zh: "哥特风格",
      name_en: "GOTHIC",
      image_url: "http://111.228.37.74:9000/input-image/styles/gothic.jpg",
      tag_color: "bg-indigo-900 text-white",
      description: "黑暗哥特美学，神秘氛围，尖拱与花窗",
      prompt_prefix: "gothic style, dark atmosphere, ornate details, dramatic shadows",
      sort_order: 12,
      enabled: true,
    },
    {
      style_key: "vintage",
      name_zh: "复古风格",
      name_en: "VINTAGE",
      image_url: "http://111.228.37.74:9000/input-image/styles/vintage.jpg",
      tag_color: "bg-orange-600 text-white",
      description: "怀旧复古感，老旧纸张，褪色效果",
      prompt_prefix: "vintage style, aged paper, faded colors, retro aesthetic",
      sort_order: 13,
      enabled: true,
    },
    {
      style_key: "chibi",
      name_zh: "Q版萌系",
      name_en: "CHIBI",
      image_url: "http://111.228.37.74:9000/input-image/styles/chibi.jpg",
      tag_color: "bg-rose-400 text-white",
      description: "可爱Q版比例，大头小身，萌系表情",
      prompt_prefix: "chibi style, cute proportions, big head, kawaii",
      sort_order: 14,
      enabled: true,
    },
  ];

  for (const style of styles) {
    await prisma.comicStyle.upsert({
      where: { style_key: style.style_key },
      update: style,
      create: style,
    });
    console.log("Created/Updated style:", style.name_zh);
  }

  console.log("Comic styles seeded successfully!");
}

async function main(): Promise<void> {
  try {
    await seedComicStyles();
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
