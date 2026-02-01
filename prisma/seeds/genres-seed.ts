import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 预置专题列表
const PRESET_GENRES = [
  { code: "xuanhuan", display_name: "玄幻", description: "玄幻修仙、异世大陆类小说", sort_order: 1 },
  { code: "xiuzhen", display_name: "修真", description: "修真仙侠、道法修炼类小说", sort_order: 2 },
  { code: "dushi", display_name: "都市", description: "都市生活、现代言情类小说", sort_order: 3 },
  { code: "lishi", display_name: "历史", description: "历史穿越、架空历史类小说", sort_order: 4 },
  { code: "yanqing", display_name: "言情", description: "言情、甜宠、虐恋类小说", sort_order: 5 },
  { code: "xuanyi", display_name: "悬疑", description: "悬疑推理、惊悚恐怖类小说", sort_order: 6 },
  { code: "kehuan", display_name: "科幻", description: "科幻、未来、星际类小说", sort_order: 7 },
  { code: "youxi", display_name: "游戏", description: "游戏、电竞、虚拟现实类小说", sort_order: 8 },
];

export async function seedGenres() {
  console.log("Seeding genres...");

  for (const genre of PRESET_GENRES) {
    await prisma.genre.upsert({
      where: { code: genre.code },
      update: {
        display_name: genre.display_name,
        description: genre.description,
        sort_order: genre.sort_order,
      },
      create: genre,
    });
  }

  console.log(`Seeded ${PRESET_GENRES.length} genres`);
}

// 如果直接运行此文件
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedGenres()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
