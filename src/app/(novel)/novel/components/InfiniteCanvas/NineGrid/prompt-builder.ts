/**
 * 九宫格提示词构建工具
 */

import type { ShotDesignBasic } from './types';

/**
 * 截断字符串到指定长度
 */
function truncateText(text: string, maxLength: number = 80): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + '...';
}

/**
 * 格式化镜头编号（01-09）
 */
function formatShotNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/**
 * 构建单个镜头的提示词行
 */
function buildShotLine(shot: ShotDesignBasic, index: number): string {
  const num = formatShotNumber(index);
  const desc = truncateText(shot.shot_description || shot.prompt || '无描述', 100);

  // 可选：添加镜头参数
  const params = [shot.camera_angle, shot.shot_size]
    .filter(Boolean)
    .join('，');

  if (params) {
    return `镜头${num}：${desc}（${params}）`;
  }
  return `镜头${num}：${desc}`;
}

/**
 * 构建九宫格生成提示词
 *
 * @param shots - 9个镜头设计数据（必须恰好9个）
 * @param stylePrefix - 漫画风格提示词前缀
 * @param plotSummary - 剧情概述
 * @returns 完整的九宫格生成提示词
 */
export function buildNineGridPrompt(
  shots: ShotDesignBasic[],
  stylePrefix: string,
  plotSummary: string
): string {
  if (shots.length !== 9) {
    throw new Error(`九宫格需要恰好9个镜头，当前提供了 ${shots.length} 个`);
  }

  // 构建9个镜头描述
  const shotLines = shots
    .map((shot, index) => buildShotLine(shot, index))
    .join('\n');

  // 拼接完整提示词
  const parts: string[] = [];

  // 1. 风格前缀（如果有）
  if (stylePrefix && stylePrefix.trim()) {
    parts.push(stylePrefix.trim());
  }

  // 2. 九宫格模板核心内容
  const templateCore = `根据[${truncateText(plotSummary, 200)}],生成一张具有凝聚力的[3×3]网格图像，包含在同一环境中的[9]个不同摄像机镜头，严格保持人物/物体、服装和光线的一致性，[8K]分辨率，[16：9]画幅。`;
  parts.push(templateCore);

  // 3. 镜头描述
  parts.push(shotLines);

  // 4. 结尾说明
  parts.push('最后加上图1是什么角色，图2是什么角色或者场景。生成的一定是九宫格，且每个格子比例都是16：9');

  return parts.join('\n\n');
}

/**
 * 验证镜头选择是否有效
 */
export function validateNineGridSelection(
  selectedShotIds: string[],
  allShots: ShotDesignBasic[]
): { valid: boolean; message: string } {
  if (selectedShotIds.length !== 9) {
    return {
      valid: false,
      message: `请选择恰好9个镜头（当前已选择 ${selectedShotIds.length} 个）`,
    };
  }

  // 检查所有选中的镜头是否存在
  const shotMap = new Map(allShots.map((s) => [s.id, s]));
  const missingIds = selectedShotIds.filter((id) => !shotMap.has(id));

  if (missingIds.length > 0) {
    return {
      valid: false,
      message: `部分镜头不存在`,
    };
  }

  return { valid: true, message: '' };
}

/**
 * 检查镜头是否连续
 */
export function checkShotsConsecutive(
  selectedShots: ShotDesignBasic[]
): { consecutive: boolean; gaps: number[] } {
  if (selectedShots.length <= 1) {
    return { consecutive: true, gaps: [] };
  }

  // 按 shot_order 排序
  const sorted = [...selectedShots].sort((a, b) => a.shot_order - b.shot_order);
  const gaps: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].shot_order - sorted[i - 1].shot_order;
    if (diff > 1) {
      gaps.push(sorted[i - 1].shot_order);
    }
  }

  return {
    consecutive: gaps.length === 0,
    gaps,
  };
}
