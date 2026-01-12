/**
 * 创作进度分析工具
 *
 * 分析小说项目的完成度和质量
 */

import type { ChapterOutline, Character, WorldSetting } from "@/app/(novel)/novel/[id]/types";

/**
 * 进度分析结果
 */
export interface ProgressAnalysis {
  overall: OverallProgress;
  plot: PlotProgress;
  characters: CharacterProgress;
  worldBuilding: WorldBuildingProgress;
  recommendations: string[];
}

/**
 * 整体进度
 */
export interface OverallProgress {
  percentage: number; // 0-100
  status: 'not-started' | 'in-progress' | 'near-complete' | 'complete';
  estimatedDaysRemaining?: number;
  chapters: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  wordCount: {
    current: number;
    target: number | null;
    percentage: number;
  };
}

/**
 * 剧情结构进度
 */
export interface PlotProgress {
  percentage: number;
  hasOpening: boolean;
  hasDevelopment: boolean;
  hasClimax: boolean;
  hasResolution: boolean;
  structureType?: 'three-act' | 'five-act' | 'journey' | 'unknown';
  issues: string[];
}

/**
 * 角色发展进度
 */
export interface CharacterProgress {
  percentage: number;
  characters: CharacterAnalysis[];
}

/**
 * 角色分析
 */
export interface CharacterAnalysis {
  character: Character;
  development: number; // 0-100
  hasBackstory: boolean;
  hasArc: boolean;
  consistency: number; // 0-100
  appearances: number; // 出场章节数
  issues: string[];
}

/**
 * 世界观构建进度
 */
export interface WorldBuildingProgress {
  percentage: number;
  locations: {
    count: number;
    recommended: number;
  };
  factions: {
    count: number;
    recommended: number;
  };
  rules: {
    count: number;
    recommended: number;
  };
}

/**
 * 分析项目整体进度
 */
export function analyzeProjectProgress(
  outlines: ChapterOutline[],
  characters: Character[],
  worldSetting: WorldSetting | null,
  targetWords: number | null
): ProgressAnalysis {
  const overall = analyzeOverallProgress(outlines, targetWords);
  const plot = analyzePlotProgress(outlines);
  const charProgress = analyzeCharacterProgress(outlines, characters);
  const world = analyzeWorldBuildingProgress(worldSetting);

  const recommendations = generateRecommendations(
    overall,
    plot,
    charProgress,
    world
  );

  return {
    overall,
    plot,
    characters: charProgress,
    worldBuilding: world,
    recommendations,
  };
}

/**
 * 分析整体进度
 */
function analyzeOverallProgress(
  outlines: ChapterOutline[],
  targetWords: number | null
): OverallProgress {
  const total = outlines.length;
  const completed = outlines.filter(
    (ch) => ch.status === "completed" || (ch.content && ch.content.length > 0)
  ).length;
  const inProgress = outlines.filter(
    (ch) => ch.status !== "completed" && (ch.outline && ch.outline.length > 0)
  ).length;
  const notStarted = outlines.filter(
    (ch) => !ch.content && (!ch.outline || ch.outline.length === 0)
  ).length;

  const totalWords = outlines.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  let percentage = 0;
  if (total > 0) {
    percentage = Math.round((completed / total) * 100);
  }

  let status: OverallProgress['status'];
  if (total === 0) status = 'not-started';
  else if (percentage < 30) status = 'in-progress';
  else if (percentage < 80) status = 'in-progress';
  else if (percentage < 100) status = 'near-complete';
  else status = 'complete';

  // 估算剩余天数
  let estimatedDaysRemaining: number | undefined;
  if (inProgress > 0 || notStarted > 0) {
    const remaining = inProgress + notStarted;
    const avgDaily = 0.5; // 假设每天完成 0.5 章
    estimatedDaysRemaining = Math.ceil(remaining / avgDaily);
  }

  const wordPercentage = targetWords
    ? Math.min(100, Math.round((totalWords / targetWords) * 100))
    : 0;

  return {
    percentage,
    status,
    estimatedDaysRemaining,
    chapters: {
      total,
      completed,
      inProgress,
      notStarted,
    },
    wordCount: {
      current: totalWords,
      target: targetWords,
      percentage: wordPercentage,
    },
  };
}

/**
 * 分析剧情结构进度
 */
function analyzePlotProgress(outlines: ChapterOutline[]): PlotProgress {
  const total = outlines.length;

  // 检测关键章节
  const keyChapters = outlines.filter((ch) => ch.isKeyChapter);
  const hasOpening = keyChapters.some((ch) => {
    const firstQuarter = Math.floor(total * 0.25);
    return ch.chapterNumber <= firstQuarter;
  });
  const hasClimax = keyChapters.some((ch) => {
    const thirdQuarter = Math.floor(total * 0.75);
    return ch.chapterNumber >= thirdQuarter;
  });
  const hasDevelopment = keyChapters.length >= 2;
  const hasResolution = outlines.some((ch) => ch.chapterNumber === total);

  // 检测结构类型
  let structureType: PlotProgress['structureType'] = 'unknown';
  if (keyChapters.length >= 3) {
    structureType = 'three-act';
  }

  // 计算进度百分比
  const checks = [hasOpening, hasDevelopment, hasClimax, hasResolution];
  const percentage = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );

  // 识别问题
  const issues: string[] = [];
  if (!hasOpening && total > 0) {
    issues.push('缺少明确的开篇章节');
  }
  if (!hasDevelopment && total > 5) {
    issues.push('剧情发展不够充分');
  }
  if (!hasClimax && total > 0) {
    issues.push('缺少高潮部分');
  }
  if (!hasResolution && total > 0) {
    issues.push('缺少结局');
  }
  if (total < 3) {
    issues.push('章节数量较少，故事结构可能不完整');
  }

  return {
    percentage,
    hasOpening,
    hasDevelopment,
    hasClimax,
    hasResolution,
    structureType,
    issues,
  };
}

/**
 * 分析角色发展进度
 */
function analyzeCharacterProgress(
  outlines: ChapterOutline[],
  characters: Character[]
): CharacterProgress {
  const characterAnalyses: CharacterAnalysis[] = characters.map((char) => {
    // 检查角色出场频率
    const appearances = outlines.filter((ch) =>
      ch.characters.includes(char.name)
    ).length;

    // 检查是否有背景故事
    const hasBackstory = Boolean(
      char.background && char.background.length > 50
    );

    // 检查是否有发展弧线（在多个章节中出现且有关联）
    const hasArc = appearances >= 2;

    // 检查一致性（这里简化处理）
    const consistency = 100; // TODO: 实现更复杂的检查

    // 计算发展度
    const development = Math.round(
      (hasBackstory ? 30 : 0) +
      (hasArc ? 40 : 0) +
      (appearances >= 3 ? 30 : 0)
    );

    // 识别问题
    const issues: string[] = [];
    if (!hasBackstory) {
      issues.push('缺少背景故事');
    }
    if (appearances === 0) {
      issues.push('未在任何章节中出现');
    } else if (appearances === 1 && char.role === 'protagonist') {
      issues.push('主角出场次数较少');
    }

    return {
      character: char,
      development,
      hasBackstory,
      hasArc,
      consistency,
      appearances,
      issues,
    };
  });

  // 计算整体进度
  const totalDev = characterAnalyses.reduce(
    (sum, ch) => sum + ch.development,
    0
  );
  const percentage =
    characterAnalyses.length > 0
      ? Math.round(totalDev / characterAnalyses.length)
      : 100;

  return {
    percentage,
    characters: characterAnalyses,
  };
}

/**
 * 分析世界观构建进度
 */
function analyzeWorldBuildingProgress(
  worldSetting: WorldSetting | null
): WorldBuildingProgress {
  const locations = worldSetting?.locations?.length || 0;
  const factions = worldSetting?.factions?.length || 0;
  const rules = worldSetting?.rules?.length || 0;

  const locationRec = Math.max(3, Math.ceil(locations / 2) * 2);
  const factionRec = Math.max(2, Math.ceil(factions / 2) * 2);
  const ruleRec = Math.max(2, Math.ceil(rules / 2) * 2);

  const locationPct = Math.min(100, Math.round((locations / locationRec) * 100));
  const factionPct = Math.min(100, Math.round((factions / factionRec) * 100));
  const rulePct = Math.min(100, Math.round((rules / ruleRec) * 100));

  const percentage = Math.round(
    (locationPct + factionPct + rulePct) / 3
  );

  return {
    percentage,
    locations: {
      count: locations,
      recommended: locationRec,
    },
    factions: {
      count: factions,
      recommended: factionRec,
    },
    rules: {
      count: rules,
      recommended: ruleRec,
    },
  };
}

/**
 * 生成改进建议
 */
function generateRecommendations(
  overall: OverallProgress,
  plot: PlotProgress,
  characters: CharacterProgress,
  world: WorldBuildingProgress
): string[] {
  const recommendations: string[] = [];

  // 基于整体进度的建议
  if (overall.chapters.notStarted > 0) {
    recommendations.push(
      `有 ${overall.chapters.notStarted} 个章节尚未开始，建议先完成大纲`
    );
  }

  // 基于剧情的建议
  if (plot.issues.length > 0) {
    recommendations.push(...plot.issues.slice(0, 2));
  }

  // 基于角色的建议
  const underdevelopedChars = characters.characters.filter(
    (ch) => ch.development < 50
  );
  if (underdevelopedChars.length > 0) {
    recommendations.push(
      `以下角色需要完善：${underdevelopedChars.map((ch) => ch.character.name).join('、')}`
    );
  }

  // 基于世界观的建议
  if (world.percentage < 50) {
    if (world.locations.count < world.locations.recommended) {
      recommendations.push(
        `建议增加地点设定（当前 ${world.locations.count}，推荐 ${world.locations.recommended}）`
      );
    }
    if (world.rules.count < world.rules.recommended) {
      recommendations.push(
        `建议增加世界规则（当前 ${world.rules.count}，推荐 ${world.rules.recommended}）`
      );
    }
  }

  // 字数建议
  if (overall.wordCount.target && overall.wordCount.current < overall.wordCount.target * 0.5) {
    recommendations.push('当前字数距离目标较远，建议加快创作节奏');
  }

  return recommendations;
}
