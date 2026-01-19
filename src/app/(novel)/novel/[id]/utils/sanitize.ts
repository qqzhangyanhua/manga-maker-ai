/**
 * 输入净化工具
 * 防止 XSS 攻击
 */

/**
 * 移除 HTML 标签，防止 XSS
 */
export function sanitizeHtml(input: string): string {
  if (!input) return input;

  // 创建临时 DOM 元素来解码 HTML 实体
  const doc = new DOMParser().parseFromString(input, 'text/html');
  const text = doc.body.textContent || '';

  // 移除所有 HTML 标签
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * 净化对象中的所有字符串值
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeHtml(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'string' ? sanitizeHtml(item) : item
      );
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * 验证字符串长度
 */
export function validateLength(
  value: string,
  maxLength: number,
  fieldName: string
): string | null {
  if (value && value.length > maxLength) {
    return `${fieldName}不能超过 ${maxLength} 个字符`;
  }
  return null;
}

/**
 * 验证数字范围
 */
export function validateRange(
  value: number | undefined,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value !== undefined) {
    if (value < min) {
      return `${fieldName}不能小于 ${min}`;
    }
    if (value > max) {
      return `${fieldName}不能大于 ${max}`;
    }
  }
  return null;
}

/**
 * 净化并验证条目表单数据
 */
export function sanitizeEntryFormData(data: {
  name?: string;
  description?: string;
  hint_text?: string;
  properties?: Record<string, string>;
  custom_fields?: Record<string, string>;
  tags?: string[];
}) {
  return {
    name: data.name ? sanitizeHtml(data.name).slice(0, 200) : data.name,
    description: data.description ? sanitizeHtml(data.description).slice(0, 5000) : data.description,
    hint_text: data.hint_text ? sanitizeHtml(data.hint_text).slice(0, 2000) : data.hint_text,
    properties: data.properties ? sanitizeObject(data.properties) : data.properties,
    custom_fields: data.custom_fields ? sanitizeObject(data.custom_fields) : data.custom_fields,
    tags: data.tags?.map(tag => sanitizeHtml(tag).slice(0, 50)).filter(Boolean),
  };
}
