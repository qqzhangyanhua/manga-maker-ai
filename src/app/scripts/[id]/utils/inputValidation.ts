/**
 * 输入验证工具
 * 用于验证和清理用户输入,防止注入攻击和数据异常
 */

import type { BackgroundGenerationParams, ValidatedBackgroundParams } from '../types/domain.types';

// ==================== 常量定义 ====================

const MAX_PROMPT_LENGTH = 2000;
const MAX_NEGATIVE_PROMPT_LENGTH = 1000;

// 危险字符正则表达式
const DANGEROUS_CHARS_REGEX = /[<>{}]/g;

// ==================== 验证错误类 ====================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ==================== 字符串清理函数 ====================

/**
 * 清理字符串,移除危险字符
 */
export function sanitizeString(input: string): string {
  return input.replace(DANGEROUS_CHARS_REGEX, '').trim();
}

/**
 * 验证字符串长度
 */
export function validateLength(
  value: string,
  maxLength: number,
  fieldName: string
): void {
  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName}长度不能超过 ${maxLength} 个字符`,
      fieldName,
      'LENGTH_EXCEEDED'
    );
  }
}

// ==================== 背景生成参数验证 ====================

/**
 * 验证背景生成参数
 * @throws {ValidationError} 当参数无效时抛出错误
 */
export function validateBackgroundParams(
  params: BackgroundGenerationParams
): ValidatedBackgroundParams {
  // 验证必填字段
  if (!params.scene_type || params.scene_type.trim() === '') {
    throw new ValidationError(
      '场景类型不能为空',
      'scene_type',
      'REQUIRED'
    );
  }

  if (!params.style || params.style.trim() === '') {
    throw new ValidationError(
      '风格不能为空',
      'style',
      'REQUIRED'
    );
  }

  // 清理和验证 prompt
  const prompt = params.prompt || '';
  const sanitizedPrompt = sanitizeString(prompt);
  
  try {
    validateLength(sanitizedPrompt, MAX_PROMPT_LENGTH, '提示词');
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      '提示词验证失败',
      'prompt',
      'VALIDATION_FAILED'
    );
  }

  // 清理和验证 negative_prompt
  const negativePrompt = params.negative_prompt || '';
  const sanitizedNegativePrompt = sanitizeString(negativePrompt);
  
  try {
    validateLength(sanitizedNegativePrompt, MAX_NEGATIVE_PROMPT_LENGTH, '负面提示词');
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      '负面提示词验证失败',
      'negative_prompt',
      'VALIDATION_FAILED'
    );
  }

  // 返回验证后的参数
  return {
    scene_type: sanitizeString(params.scene_type),
    style: sanitizeString(params.style),
    prompt: sanitizedPrompt,
    negative_prompt: sanitizedNegativePrompt,
  };
}

// ==================== 章节 ID 验证 ====================

/**
 * 验证章节 ID 格式
 */
export function validateChapterId(chapterId: string): void {
  if (!chapterId || chapterId.trim() === '') {
    throw new ValidationError(
      '章节 ID 不能为空',
      'chapterId',
      'REQUIRED'
    );
  }

  // UUID 格式验证 (可选,根据实际 ID 格式调整)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(chapterId)) {
    throw new ValidationError(
      '章节 ID 格式无效',
      'chapterId',
      'INVALID_FORMAT'
    );
  }
}

// ==================== 通用验证辅助函数 ====================

/**
 * 安全执行验证,返回结果对象
 */
export function safeValidate<T>(
  validator: () => T
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const data = validator();
    return { success: true, data };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    // 未知错误转换为 ValidationError
    return {
      success: false,
      error: new ValidationError(
        error instanceof Error ? error.message : '验证失败',
        'unknown',
        'UNKNOWN_ERROR'
      ),
    };
  }
}
