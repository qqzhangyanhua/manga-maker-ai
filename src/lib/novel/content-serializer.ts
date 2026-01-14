/**
 * 内容序列化工具
 * 
 * 提供 Tiptap JSON 内容的序列化和反序列化功能
 */

import { JSONContent } from '@tiptap/react';

/**
 * 序列化内容为 JSON 字符串
 * 
 * @param content - Tiptap JSON 内容
 * @returns JSON 字符串
 */
export function serializeContent(content: JSONContent): string {
  try {
    return JSON.stringify(content);
  } catch (error) {
    console.error('Failed to serialize content:', error);
    throw new Error('内容序列化失败');
  }
}

/**
 * 反序列化 JSON 字符串为内容对象
 * 
 * @param json - JSON 字符串
 * @returns Tiptap JSON 内容
 */
export function deserializeContent(json: string): JSONContent {
  // 处理空内容
  if (!json || json.trim() === '') {
    return {
      type: 'doc',
      content: [],
    };
  }

  try {
    const content = JSON.parse(json);
    
    // 验证基本结构
    if (!content || typeof content !== 'object') {
      throw new Error('Invalid content structure');
    }

    // 确保有 type 字段
    if (!content.type) {
      throw new Error('Missing type field');
    }

    return content as JSONContent;
  } catch (error) {
    console.error('Failed to deserialize content:', error);
    
    // 如果解析失败，尝试将其作为纯文本处理
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: json,
            },
          ],
        },
      ],
    };
  }
}

/**
 * 将纯文本转换为 Tiptap JSON 格式
 * 用于迁移旧的纯文本内容
 *
 * @param text - 纯文本内容
 * @returns Tiptap JSON 内容
 */
export function textToTiptapJSON(text: string): JSONContent {
  if (!text || text.trim() === '') {
    return {
      type: 'doc',
      content: [],
    };
  }

  // 🔧 修复：支持多种段落分隔方式
  // 1. 优先按双换行分割（标准段落）
  // 2. 如果没有双换行，按单换行分割（兼容AI生成的文本）
  let paragraphs: string[];

  if (text.includes('\n\n')) {
    // 有双换行，使用标准分割
    paragraphs = text.split(/\n\n+/);
  } else {
    // 没有双换行，按单换行分割
    paragraphs = text.split(/\n+/);
  }

  const content = paragraphs.map((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return null;

    // 检查是否是标题（以 # 开头）
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      return {
        type: 'heading',
        attrs: { level: Math.min(level, 6) },
        content: [
          {
            type: 'text',
            text: headingMatch[2],
          },
        ],
      };
    }

    return {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: trimmed,
        },
      ],
    };
  }).filter(Boolean) as JSONContent[];

  return {
    type: 'doc',
    content,
  };
}

/**
 * 将 Tiptap JSON 转换为纯文本
 * 用于导出或显示
 * 
 * @param content - Tiptap JSON 内容
 * @returns 纯文本
 */
export function tiptapJSONToText(content: JSONContent): string {
  if (!content || !content.content) {
    return '';
  }

  const extractText = (node: JSONContent): string => {
    if (node.type === 'text') {
      return node.text || '';
    }

    if (!node.content) {
      return '';
    }

    return node.content.map(extractText).join('');
  };

  return content.content.map((node) => {
    const text = extractText(node);
    
    // 为段落、标题等块级元素添加换行
    if (['paragraph', 'heading'].includes(node.type || '')) {
      return text + '\n\n';
    }
    
    return text;
  }).join('').trim();
}
