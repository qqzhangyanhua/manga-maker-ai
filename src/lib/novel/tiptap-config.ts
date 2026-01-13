/**
 * Tiptap 编辑器配置
 * 
 * 提供编辑器的基础配置、扩展和选项
 */

import { Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';

/**
 * 获取编辑器扩展配置
 */
export function getEditorExtensions(placeholder?: string): Extensions {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
    }),
    Placeholder.configure({
      placeholder: placeholder || '开始写作...',
    }),
    CharacterCount,
    Typography,
    Underline,
  ];
}

/**
 * 编辑器默认配置选项
 */
export const defaultEditorOptions = {
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] max-w-none',
    },
  },
  autofocus: 'end' as const,
  editable: true,
  injectCSS: false,
  immediatelyRender: false, // 修复 SSR 水合不匹配问题
};
