/**
 * Incremental JSON Parser for streaming panel generation
 * Extracts complete panel objects from incomplete JSON streams
 */

export interface ParsedPanel {
  panel_order: number;
  description: string;
  visual_prompt: string;
  dialogue?: string;
  panel_type: string;
  importance: string;
  camera_angle?: string;
  shot_size?: string;
}

interface ParseResult {
  panels: ParsedPanel[];
  lastIndex: number; // 记录已解析到的位置
}

/**
 * 增量解析 JSON 流中的 panel 对象
 * @param jsonContent 累积的 JSON 内容（可能不完整）
 * @param lastParsedIndex 上次解析到的位置
 * @returns 新解析出的 panels 和新的解析位置
 */
export function parseIncrementalPanels(
  jsonContent: string,
  lastParsedIndex: number = 0
): ParseResult {
  const newPanels: ParsedPanel[] = [];

  // 查找 panels 数组的开始位置
  const panelsArrayMatch = jsonContent.match(/"panels"\s*:\s*\[/);
  if (!panelsArrayMatch || !panelsArrayMatch.index) {
    return { panels: [], lastIndex: 0 };
  }

  const arrayStart = panelsArrayMatch.index + panelsArrayMatch[0].length;

  // 从上次解析的位置继续（或从数组开始）
  let currentIndex = Math.max(lastParsedIndex, arrayStart);

  // 尝试提取完整的对象
  while (currentIndex < jsonContent.length) {
    // 跳过空白和逗号
    while (
      currentIndex < jsonContent.length &&
      /[\s,]/.test(jsonContent[currentIndex])
    ) {
      currentIndex++;
    }

    // 检查是否到达数组结尾
    if (jsonContent[currentIndex] === "]") {
      break;
    }

    // 查找对象开始
    if (jsonContent[currentIndex] !== "{") {
      currentIndex++;
      continue;
    }

    // 提取完整的对象（匹配 {} 对）
    const objResult = extractObject(jsonContent, currentIndex);
    if (!objResult) {
      // 对象不完整，等待更多数据
      break;
    }

    const { objectString, endIndex } = objResult;

    // 尝试解析为 JSON
    try {
      const parsed = JSON.parse(objectString) as ParsedPanel;

      // 验证必需字段
      if (
        typeof parsed.panel_order === "number" &&
        parsed.description &&
        parsed.visual_prompt
      ) {
        newPanels.push(parsed);
        currentIndex = endIndex + 1;
      } else {
        // 字段不完整，等待更多数据
        break;
      }
    } catch (error) {
      // JSON 解析失败，对象可能不完整
      console.warn("Failed to parse panel object:", objectString);
      break;
    }
  }

  return {
    panels: newPanels,
    lastIndex: currentIndex,
  };
}

/**
 * 从指定位置提取完整的 JSON 对象
 * @returns 对象字符串和结束位置，如果对象不完整则返回 null
 */
function extractObject(
  content: string,
  startIndex: number
): { objectString: string; endIndex: number } | null {
  if (content[startIndex] !== "{") {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let i = startIndex;

  while (i < content.length) {
    const char = content[i];

    if (escapeNext) {
      escapeNext = false;
      i++;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      i++;
      continue;
    }

    if (char === '"') {
      inString = !inString;
    } else if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          // 找到完整对象
          return {
            objectString: content.substring(startIndex, i + 1),
            endIndex: i,
          };
        }
      }
    }

    i++;
  }

  // 对象不完整
  return null;
}

/**
 * 尝试修复和清理 JSON 内容
 */
export function tryFixJSON(text: string): string {
  let cleaned = text.trim();

  // 提取 markdown 代码块中的 JSON
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  // 移除 BOM 和不可见字符
  cleaned = cleaned.replace(/^\uFEFF/, "");
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");

  return cleaned;
}
