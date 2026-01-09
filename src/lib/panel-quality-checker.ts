/**
 * 分镜质量检查工具
 * 用于诊断分镜数据质量和生成配置问题
 */

import type { Panel, Character, Scene } from "@prisma/client";

export interface QualityCheckResult {
  score: number; // 0-100
  level: "excellent" | "good" | "warning" | "poor";
  issues: QualityIssue[];
  suggestions: string[];
}

export interface QualityIssue {
  type: "error" | "warning" | "info";
  category: "data" | "prompt" | "reference" | "consistency";
  message: string;
  field?: string;
}

/**
 * 检查单个分镜的质量
 */
export function checkPanelQuality(
  panel: Panel,
  options: {
    character?: Character | null;
    scene?: Scene | null;
    previousPanel?: Panel | null;
  } = {}
): QualityCheckResult {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  
  // 1. 检查基础数据
  checkBasicData(panel, issues, suggestions);
  
  // 2. 检查提示词质量
  checkPromptQuality(panel, issues, suggestions);
  
  // 3. 检查资产关联
  checkAssetLinks(panel, options.character, options.scene, issues, suggestions);
  
  // 4. 检查一致性
  if (options.previousPanel) {
    checkConsistency(panel, options.previousPanel, issues, suggestions);
  }
  
  // 计算得分
  const score = calculateScore(issues);
  const level = getQualityLevel(score);
  
  return {
    score,
    level,
    issues,
    suggestions,
  };
}

/**
 * 检查基础数据完整性
 */
function checkBasicData(
  panel: Panel,
  issues: QualityIssue[],
  suggestions: string[]
): void {
  // 检查描述
  if (!panel.description && !panel.visual_prompt) {
    issues.push({
      type: "error",
      category: "data",
      message: "缺少场景描述",
      field: "description",
    });
    suggestions.push("添加详细的场景描述（description 字段）");
  } else if (panel.description && panel.description.length < 20) {
    issues.push({
      type: "warning",
      category: "data",
      message: "场景描述过短",
      field: "description",
    });
    suggestions.push("扩充场景描述，添加更多细节");
  }
  
  // 检查镜头语言
  if (!panel.camera_angle) {
    issues.push({
      type: "warning",
      category: "data",
      message: "未设置镜头角度",
      field: "camera_angle",
    });
    suggestions.push("设置镜头角度（平视/俯视/仰视等）");
  }
  
  if (!panel.shot_size) {
    issues.push({
      type: "warning",
      category: "data",
      message: "未设置景别",
      field: "shot_size",
    });
    suggestions.push("设置景别（特写/中景/全景等）");
  }
  
  // 检查分镜类型
  if (!panel.panel_type) {
    issues.push({
      type: "info",
      category: "data",
      message: "未设置分镜类型",
      field: "panel_type",
    });
  }
}

/**
 * 检查提示词质量
 */
function checkPromptQuality(
  panel: Panel,
  issues: QualityIssue[],
  suggestions: string[]
): void {
  // 检查 prompt_used 是否被误用
  if (panel.prompt_used) {
    const hasEnhancedInstructions = 
      panel.prompt_used.includes("Characters in this scene:") ||
      panel.prompt_used.includes("Important: Please generate") ||
      panel.prompt_used.includes("Art style:");
    
    if (hasEnhancedInstructions) {
      issues.push({
        type: "warning",
        category: "prompt",
        message: "prompt_used 包含增强指令，不应作为基础提示词",
        field: "prompt_used",
      });
      suggestions.push("使用 description 字段作为基础提示词");
      suggestions.push("避免重复使用 prompt_used，会导致指令叠加");
    }
    
    // 检查是否有重复指令
    const instructionCount = (panel.prompt_used.match(/Important:/g) || []).length;
    if (instructionCount > 1) {
      issues.push({
        type: "error",
        category: "prompt",
        message: `检测到 ${instructionCount} 个重复的增强指令`,
        field: "prompt_used",
      });
      suggestions.push("清理重复的增强指令");
      suggestions.push("使用 buildCompletePrompt 重新构建提示词");
    }
  }
  
  // 检查描述中是否提到角色但未关联
  if (panel.description) {
    const mentionsCharacter = /([一-龥]{2,4}(?:先生|女士|小姐|侠客)?)/.test(panel.description);
    if (mentionsCharacter && !panel.character_id) {
      issues.push({
        type: "warning",
        category: "data",
        message: "描述中提到角色但未关联 character_id",
        field: "character_id",
      });
      suggestions.push("为分镜关联角色资产以保持一致性");
    }
  }
}

/**
 * 检查资产关联
 */
function checkAssetLinks(
  panel: Panel,
  character: Character | null | undefined,
  scene: Scene | null | undefined,
  issues: QualityIssue[],
  suggestions: string[]
): void {
  // 检查角色关联
  if (!panel.character_id) {
    issues.push({
      type: "info",
      category: "reference",
      message: "未关联角色资产",
      field: "character_id",
    });
    suggestions.push("关联角色资产以使用角色参考图");
  } else if (character) {
    // 检查角色是否有参考图
    if (!character.reference_image && !character.base_image_url) {
      issues.push({
        type: "warning",
        category: "reference",
        message: `角色 "${character.name}" 没有参考图`,
        field: "character_id",
      });
      suggestions.push(`为角色 "${character.name}" 添加 reference_image 或 base_image_url`);
    }
  }
  
  // 检查场景关联
  if (!panel.scene_id) {
    issues.push({
      type: "info",
      category: "reference",
      message: "未关联场景资产",
      field: "scene_id",
    });
    suggestions.push("关联场景资产以使用场景参考图");
  } else if (scene) {
    // 检查场景是否有参考图
    if (!scene.reference_image) {
      issues.push({
        type: "info",
        category: "reference",
        message: `场景 "${scene.name}" 没有参考图`,
        field: "scene_id",
      });
    }
  }
}

/**
 * 检查与前一个分镜的一致性
 */
function checkConsistency(
  panel: Panel,
  previousPanel: Panel,
  issues: QualityIssue[],
  suggestions: string[]
): void {
  // 检查角色一致性
  if (previousPanel.character_id && panel.character_id !== previousPanel.character_id) {
    issues.push({
      type: "info",
      category: "consistency",
      message: "角色发生变化，注意保持风格一致",
    });
  }
  
  // 检查场景一致性
  if (previousPanel.scene_id && panel.scene_id !== previousPanel.scene_id) {
    issues.push({
      type: "info",
      category: "consistency",
      message: "场景发生变化",
    });
  }
  
  // 检查转场类型
  if (panel.panel_type === "transition" && previousPanel.panel_type === "transition") {
    issues.push({
      type: "warning",
      category: "consistency",
      message: "连续两个转场分镜，可能影响叙事节奏",
    });
    suggestions.push("考虑调整分镜类型或合并转场");
  }
}

/**
 * 计算质量得分
 */
function calculateScore(issues: QualityIssue[]): number {
  let score = 100;
  
  for (const issue of issues) {
    switch (issue.type) {
      case "error":
        score -= 20;
        break;
      case "warning":
        score -= 10;
        break;
      case "info":
        score -= 5;
        break;
    }
  }
  
  return Math.max(0, score);
}

/**
 * 获取质量等级
 */
function getQualityLevel(score: number): "excellent" | "good" | "warning" | "poor" {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "warning";
  return "poor";
}

/**
 * 批量检查章节中的所有分镜
 */
export function checkChapterQuality(
  panels: Panel[],
  characters: Map<string, Character>,
  scenes: Map<string, Scene>
): {
  overallScore: number;
  overallLevel: string;
  panelResults: Array<{
    panelId: string;
    panelOrder: number;
    result: QualityCheckResult;
  }>;
  commonIssues: string[];
  recommendations: string[];
} {
  const panelResults = panels.map((panel, index) => {
    const character = panel.character_id ? characters.get(panel.character_id) : null;
    const scene = panel.scene_id ? scenes.get(panel.scene_id) : null;
    const previousPanel = index > 0 ? panels[index - 1] : null;
    
    return {
      panelId: panel.id,
      panelOrder: panel.panel_order,
      result: checkPanelQuality(panel, { character, scene, previousPanel }),
    };
  });
  
  // 计算总体得分
  const overallScore = Math.round(
    panelResults.reduce((sum, r) => sum + r.result.score, 0) / panelResults.length
  );
  
  const overallLevel = getQualityLevel(overallScore);
  
  // 收集常见问题
  const issueCount = new Map<string, number>();
  panelResults.forEach((r) => {
    r.result.issues.forEach((issue) => {
      const key = issue.message;
      issueCount.set(key, (issueCount.get(key) || 0) + 1);
    });
  });
  
  const commonIssues = Array.from(issueCount.entries())
    .filter(([_, count]) => count >= 3) // 至少出现3次
    .sort((a, b) => b[1] - a[1])
    .map(([issue, count]) => `${issue} (${count} 个分镜)`);
  
  // 生成推荐
  const recommendations: string[] = [];
  
  if (commonIssues.some((i) => i.includes("未关联角色"))) {
    recommendations.push("批量关联角色资产以提升一致性");
  }
  
  if (commonIssues.some((i) => i.includes("prompt_used"))) {
    recommendations.push("修改生成逻辑，使用 description 而不是 prompt_used");
  }
  
  if (commonIssues.some((i) => i.includes("没有参考图"))) {
    recommendations.push("为角色和场景添加参考图");
  }
  
  return {
    overallScore,
    overallLevel,
    panelResults,
    commonIssues,
    recommendations,
  };
}

/**
 * 生成质量报告（Markdown 格式）
 */
export function generateQualityReport(
  chapterTitle: string,
  checkResult: ReturnType<typeof checkChapterQuality>
): string {
  const { overallScore, overallLevel, panelResults, commonIssues, recommendations } = checkResult;
  
  let report = `# 章节质量检查报告\n\n`;
  report += `**章节**: ${chapterTitle}\n`;
  report += `**总体得分**: ${overallScore}/100 (${overallLevel})\n`;
  report += `**检查时间**: ${new Date().toLocaleString("zh-CN")}\n\n`;
  
  report += `---\n\n`;
  
  // 总体评估
  report += `## 📊 总体评估\n\n`;
  if (overallLevel === "excellent") {
    report += `✅ **优秀** - 分镜数据质量很高，可以直接生成\n\n`;
  } else if (overallLevel === "good") {
    report += `✅ **良好** - 分镜数据质量不错，有少量可优化项\n\n`;
  } else if (overallLevel === "warning") {
    report += `⚠️ **警告** - 存在一些问题，建议优化后再生成\n\n`;
  } else {
    report += `❌ **较差** - 存在较多问题，强烈建议先优化\n\n`;
  }
  
  // 常见问题
  if (commonIssues.length > 0) {
    report += `## ⚠️ 常见问题\n\n`;
    commonIssues.forEach((issue) => {
      report += `- ${issue}\n`;
    });
    report += `\n`;
  }
  
  // 推荐操作
  if (recommendations.length > 0) {
    report += `## 💡 推荐操作\n\n`;
    recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    report += `\n`;
  }
  
  // 分镜详情
  report += `## 📋 分镜详情\n\n`;
  panelResults.forEach((pr) => {
    const icon = pr.result.level === "excellent" ? "✅" : 
                 pr.result.level === "good" ? "✅" :
                 pr.result.level === "warning" ? "⚠️" : "❌";
    
    report += `### ${icon} Panel ${pr.panelOrder} (得分: ${pr.result.score}/100)\n\n`;
    
    if (pr.result.issues.length > 0) {
      report += `**问题**:\n`;
      pr.result.issues.forEach((issue) => {
        const typeIcon = issue.type === "error" ? "❌" :
                        issue.type === "warning" ? "⚠️" : "ℹ️";
        report += `- ${typeIcon} ${issue.message}\n`;
      });
      report += `\n`;
    }
    
    if (pr.result.suggestions.length > 0) {
      report += `**建议**:\n`;
      pr.result.suggestions.forEach((sug) => {
        report += `- ${sug}\n`;
      });
      report += `\n`;
    }
  });
  
  return report;
}
