/**
 * 前端本地镜头数量预估工具函数
 *
 * 注意：这些函数仅用于快速的客户端预估，不消耗 API 调用
 * 对于需要精确计算的场景，应使用 /api/chapter/[id]/estimate-panels
 */

import type { DensityMode, PanelEstimation, ChapterOutline } from "../types";

/**
 * 镜头密度配置（与后端保持一致）
 */
const GENRE_DENSITY_MAP: Record<string, number> = {
  suspense: 220,
  romance: 280,
  adventure: 200,
  scifi: 240,
  daily: 300,
  fantasy: 230,
  default: 250,
};

const DENSITY_MODE_MULTIPLIER: Record<DensityMode, number> = {
  sparse: 1.4,
  standard: 1.0,
  dense: 0.6,
};

const PANEL_CONSTRAINTS = {
  MIN_PANELS_ABSOLUTE: 5,
  MAX_PANELS_ABSOLUTE: 50,
};

/**
 * 前端快速计算镜头数量
 *
 * @param wordCount 章节字数
 * @param genre 故事类型
 * @param densityMode 密度模式
 * @returns 预估镜头数
 */
export function calculatePanelCountClient(
  wordCount: number,
  genre: string,
  densityMode: DensityMode = "standard"
): number {
  const genreDensity = GENRE_DENSITY_MAP[genre] || GENRE_DENSITY_MAP.default;
  const adjustedDensity = genreDensity * DENSITY_MODE_MULTIPLIER[densityMode];
  const rawCount = Math.ceil(wordCount / adjustedDensity);

  return Math.max(
    PANEL_CONSTRAINTS.MIN_PANELS_ABSOLUTE,
    Math.min(PANEL_CONSTRAINTS.MAX_PANELS_ABSOLUTE, rawCount)
  );
}

/**
 * 生成警告信息
 */
function generateWarnings(wordCount: number, estimatedCount: number): string[] {
  const warnings: string[] = [];

  if (wordCount < 1500) {
    warnings.push("章节过短（少于1500字），建议补充内容或与其他章节合并");
  }

  if (wordCount > 12000) {
    warnings.push("章节过长（超过12000字），建议拆分以获得更好的分镜效果");
  }

  if (estimatedCount >= PANEL_CONSTRAINTS.MAX_PANELS_ABSOLUTE) {
    warnings.push(
      `镜头数已达到上限（${PANEL_CONSTRAINTS.MAX_PANELS_ABSOLUTE}个），系统将自动截断`
    );
  }

  if (estimatedCount <= PANEL_CONSTRAINTS.MIN_PANELS_ABSOLUTE) {
    warnings.push(`镜头数过少（${estimatedCount}个），可能影响叙事完整性`);
  }

  return warnings;
}

/**
 * 从章节大纲对象快速预估镜头数
 *
 * @param chapter 章节大纲对象
 * @param genre 故事类型
 * @param densityMode 密度模式
 * @param creditsPerPanel 每个镜头消耗的 credits（默认2）
 * @returns 预估结果
 */
export function estimatePanelCountFromOutline(
  chapter: ChapterOutline,
  genre: string,
  densityMode: DensityMode = "standard",
  creditsPerPanel: number = 2
): PanelEstimation {
  // 计算章节字数（优先使用 content，否则使用 outline）
  const text = chapter.content || chapter.outline || "";
  const wordCount = text.length;

  // 计算预估镜头数
  const estimatedCount = calculatePanelCountClient(wordCount, genre, densityMode);

  // 计算范围（±30%）
  const minCount = Math.max(
    PANEL_CONSTRAINTS.MIN_PANELS_ABSOLUTE,
    Math.floor(estimatedCount * 0.7)
  );
  const maxCount = Math.min(
    PANEL_CONSTRAINTS.MAX_PANELS_ABSOLUTE,
    Math.ceil(estimatedCount * 1.3)
  );

  // 计算 credits 消耗
  const estimatedCredits = estimatedCount * creditsPerPanel;

  // 生成警告
  const warnings = generateWarnings(wordCount, estimatedCount);

  // 获取基础密度
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
 * 批量预估多个章节
 */
export function batchEstimatePanelCountFromOutlines(
  chapters: ChapterOutline[],
  genre: string,
  densityMode: DensityMode = "standard",
  creditsPerPanel: number = 2
): PanelEstimation[] {
  return chapters.map((chapter) =>
    estimatePanelCountFromOutline(chapter, genre, densityMode, creditsPerPanel)
  );
}

/**
 * 获取批量预估摘要
 */
export function getEstimationSummary(estimations: PanelEstimation[]): {
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
