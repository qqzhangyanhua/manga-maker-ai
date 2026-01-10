/**
 * Panel Estimator - 章节镜头数量预估系统
 *
 * 功能：根据章节内容、类型、长度等因素，智能预估应生成的分镜数量
 * 设计原则：
 * 1. 透明优先：用户始终知道会生成多少镜头
 * 2. 可控优先：提供密度选项，而非完全黑盒
 * 3. 成本优先：明确展示 credits 消耗
 */

import { prisma } from "./db";

/**
 * 镜头密度配置 - 每个类型的基础密度（字数/镜头）
 *
 * 行业经验值：
 * - 动作密集型：200-220字/镜（如冒险、悬疑）
 * - 对话密集型：280-300字/镜（如爱情、日常）
 * - 平衡叙事型：230-250字/镜（如科幻、奇幻）
 */
const GENRE_DENSITY_MAP: Record<string, number> = {
  suspense: 220,    // 悬疑：镜头紧凑，快节奏
  romance: 280,     // 爱情：镜头舒缓，重对话
  adventure: 200,   // 冒险：镜头密集，动作多
  scifi: 240,       // 科幻：中等密度，场景展示
  daily: 300,       // 日常：镜头稀疏，慢节奏
  fantasy: 230,     // 奇幻：中等密度，平衡叙事
  default: 250,     // 未知类型的兜底值
};

/**
 * 密度模式调整系数
 * - sparse: 稀疏模式，省 credits，适合预算有限用户
 * - standard: 标准模式，平衡质量和成本
 * - dense: 密集模式，更细腻表现，适合高质量作品
 */
const DENSITY_MODE_MULTIPLIER: Record<DensityMode, number> = {
  sparse: 1.4,    // 350字/镜
  standard: 1.0,  // 250字/镜（基础值）
  dense: 0.6,     // 150字/镜
};

/**
 * 镜头数量边界约束
 */
const PANEL_CONSTRAINTS = {
  MIN_PANELS_ABSOLUTE: 5,   // 绝对最少（避免过于简陋）
  MAX_PANELS_ABSOLUTE: 50,  // 绝对最多（避免管理困难）
  RECOMMENDED_MIN: 12,       // 推荐最少
  RECOMMENDED_MAX: 25,       // 推荐最多
};

/**
 * 密度模式类型
 */
export type DensityMode = "sparse" | "standard" | "dense";

/**
 * 镜头数量预估结果
 */
export interface PanelEstimation {
  estimatedCount: number;      // 预估镜头数（核心数值）
  minCount: number;             // 最少镜头数（下界）
  maxCount: number;             // 最多镜头数（上界）
  wordCount: number;            // 章节字数统计
  baseDensity: number;          // 基础密度（字/镜）
  genre: string;                // 故事类型
  estimatedCredits: number;     // 预估消耗 credits
  densityMode: DensityMode;     // 当前密度模式
  warnings: string[];           // 警告信息（如章节过长/过短）
}

/**
 * 预估参数
 */
interface EstimateParams {
  chapterId: string;
  densityMode?: DensityMode;
}

/**
 * 计算镜头数量的核心算法
 *
 * @param wordCount 章节字数
 * @param genre 故事类型
 * @param densityMode 密度模式
 * @returns 预估的镜头数量
 */
function calculatePanelCount(
  wordCount: number,
  genre: string,
  densityMode: DensityMode = "standard"
): number {
  // 1. 获取类型基础密度
  const genreDensity = GENRE_DENSITY_MAP[genre] || GENRE_DENSITY_MAP.default;

  // 2. 应用密度模式调整
  const adjustedDensity = genreDensity * DENSITY_MODE_MULTIPLIER[densityMode];

  // 3. 计算基础镜头数
  const rawCount = Math.ceil(wordCount / adjustedDensity);

  // 4. 应用边界约束
  const constrainedCount = Math.max(
    PANEL_CONSTRAINTS.MIN_PANELS_ABSOLUTE,
    Math.min(PANEL_CONSTRAINTS.MAX_PANELS_ABSOLUTE, rawCount)
  );

  return constrainedCount;
}

/**
 * 生成警告信息
 *
 * @param wordCount 章节字数
 * @param estimatedCount 预估镜头数
 * @returns 警告信息数组
 */
function generateWarnings(wordCount: number, estimatedCount: number): string[] {
  const warnings: string[] = [];

  // 警告1: 章节过短
  if (wordCount < 1500) {
    warnings.push("章节过短（少于1500字），建议补充内容或与其他章节合并");
  }

  // 警告2: 章节过长
  if (wordCount > 12000) {
    warnings.push("章节过长（超过12000字），建议拆分以获得更好的分镜效果");
  }

  // 警告3: 镜头数达到上限
  if (estimatedCount >= PANEL_CONSTRAINTS.MAX_PANELS_ABSOLUTE) {
    warnings.push(
      `镜头数已达到上限（${PANEL_CONSTRAINTS.MAX_PANELS_ABSOLUTE}个），系统将自动截断`
    );
  }

  // 警告4: 镜头数过少
  if (estimatedCount <= PANEL_CONSTRAINTS.MIN_PANELS_ABSOLUTE) {
    warnings.push(
      `镜头数过少（${estimatedCount}个），可能影响叙事完整性`
    );
  }

  return warnings;
}

/**
 * 预估章节应生成的镜头数量
 *
 * 核心功能：
 * 1. 从数据库加载章节和故事信息
 * 2. 根据字数、类型、密度模式计算预估镜头数
 * 3. 计算预估的 credits 消耗
 * 4. 生成警告信息
 *
 * @param params 预估参数
 * @returns 预估结果
 * @throws Error 如果章节不存在或缺少必要字段
 */
export async function estimatePanelCount(
  params: EstimateParams
): Promise<PanelEstimation> {
  const { chapterId, densityMode = "standard" } = params;

  // 1. 加载章节数据（包含 story 关联）
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      story: {
        select: {
          genre: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new Error(`章节不存在: ${chapterId}`);
  }

  if (!chapter.summary) {
    throw new Error("章节缺少梗概（summary），无法预估镜头数量");
  }

  // 2. 计算章节字数
  const wordCount = chapter.summary.length;
  const genre = chapter.story.genre;

  // 3. 计算预估镜头数
  const estimatedCount = calculatePanelCount(wordCount, genre, densityMode);

  // 4. 计算预估范围（±30%）
  const minCount = Math.max(
    PANEL_CONSTRAINTS.MIN_PANELS_ABSOLUTE,
    Math.floor(estimatedCount * 0.7)
  );
  const maxCount = Math.min(
    PANEL_CONSTRAINTS.MAX_PANELS_ABSOLUTE,
    Math.ceil(estimatedCount * 1.3)
  );

  // 5. 查询 credits 成本（从 llm_providers 表）
  let creditsPerPanel = 2; // 默认值
  try {
    const provider = await prisma.llmProvider.findFirst({
      where: {
        provider_type: "script_analyzer",
        enabled: true,
      },
      orderBy: {
        priority: "asc",
      },
    });

    if (provider && provider.credits_cost > 0) {
      creditsPerPanel = provider.credits_cost;
    }
  } catch (error) {
    console.warn("无法查询 LLM provider 成本，使用默认值", error);
  }

  // 6. 计算预估 credits 消耗
  const estimatedCredits = estimatedCount * creditsPerPanel;

  // 7. 生成警告信息
  const warnings = generateWarnings(wordCount, estimatedCount);

  // 8. 获取基础密度
  const baseDensity =
    (GENRE_DENSITY_MAP[genre] || GENRE_DENSITY_MAP.default) *
    DENSITY_MODE_MULTIPLIER[densityMode];

  return {
    estimatedCount,
    minCount,
    maxCount,
    wordCount,
    baseDensity,
    genre,
    estimatedCredits,
    densityMode,
    warnings,
  };
}

/**
 * 批量预估多个章节的镜头数量
 *
 * 适用场景：用户想一次性生成整个故事的所有分镜
 *
 * @param chapterIds 章节 ID 数组
 * @param densityMode 密度模式
 * @returns 所有章节的预估结果数组
 */
export async function batchEstimatePanelCount(
  chapterIds: string[],
  densityMode: DensityMode = "standard"
): Promise<PanelEstimation[]> {
  const results = await Promise.all(
    chapterIds.map((chapterId) =>
      estimatePanelCount({ chapterId, densityMode })
    )
  );

  return results;
}

/**
 * 获取预估摘要（用于批量生成的汇总信息）
 *
 * @param estimations 预估结果数组
 * @returns 汇总信息
 */
export function getSummary(estimations: PanelEstimation[]): {
  totalPanels: number;
  totalCredits: number;
  totalWordCount: number;
  averagePanelsPerChapter: number;
} {
  const totalPanels = estimations.reduce(
    (sum, est) => sum + est.estimatedCount,
    0
  );
  const totalCredits = estimations.reduce(
    (sum, est) => sum + est.estimatedCredits,
    0
  );
  const totalWordCount = estimations.reduce(
    (sum, est) => sum + est.wordCount,
    0
  );
  const averagePanelsPerChapter =
    estimations.length > 0 ? Math.round(totalPanels / estimations.length) : 0;

  return {
    totalPanels,
    totalCredits,
    totalWordCount,
    averagePanelsPerChapter,
  };
}
