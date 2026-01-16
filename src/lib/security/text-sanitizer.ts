/**
 * Text Sanitizer
 * 清理和验证对话框文本
 */

export interface SanitizeOptions {
  maxLength?: number;
  allowNewlines?: boolean;
  allowSpecialChars?: boolean;
}

/**
 * 清理对话框文本
 *
 * 移除:
 * - 控制字符 (0x00-0x1F, 0x7F-0x9F)
 * - 零宽字符 (Zero-width characters)
 * - 方向控制字符 (Bidirectional control)
 *
 * @param text - 原始文本
 * @param options - 清理选项
 * @returns 清理后的文本
 */
export function sanitizeDialogueText(
  text: string,
  options: SanitizeOptions = {}
): string {
  const {
    maxLength = 500,
    allowNewlines = true,
    allowSpecialChars = true,
  } = options;

  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text;

  // 1. 移除控制字符 (保留换行符和制表符如果允许)
  if (allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }

  // 2. 移除零宽字符
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 3. 移除方向控制字符 (防止文本方向攻击)
  sanitized = sanitized.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');

  // 4. 移除不可见字符
  sanitized = sanitized.replace(/[\u00AD\u034F\u061C]/g, '');

  // 5. 移除特殊字符 (可选)
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[^\w\s\u4e00-\u9fa5.,!?;:'"()-]/g, '');
  }

  // 6. 规范化空白字符
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // 7. 限制长度
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * 验证文本是否安全
 */
export function isValidDialogueText(text: string, maxLength = 500): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  if (text.length > maxLength) {
    return false;
  }

  // 检查是否包含危险字符
  const dangerousPattern = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/;
  if (dangerousPattern.test(text)) {
    return false;
  }

  return true;
}

/**
 * 估算文本渲染行数 (用于布局计算)
 */
export function estimateTextLines(
  text: string,
  maxWidth: number,
  charWidth = 20
): number {
  if (!text) return 0;

  const charsPerLine = Math.floor(maxWidth / charWidth);
  if (charsPerLine <= 0) return 1;

  const lines = text.split('\n');
  let totalLines = 0;

  for (const line of lines) {
    const lineChars = line.length;
    totalLines += Math.max(1, Math.ceil(lineChars / charsPerLine));
  }

  return totalLines;
}
