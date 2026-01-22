/**
 * 富文本编辑器组件
 * 
 * 基于 Tiptap 的富文本编辑器，支持：
 * - 基础格式化（加粗、斜体、下划线等）
 * - Markdown 快捷键
 * - 字数统计
 * - 自动保存
 */

"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import { getEditorExtensions, defaultEditorOptions } from '@/lib/novel/tiptap-config';
import { serializeContent, deserializeContent } from '@/lib/novel/content-serializer';
import { EditorToolbar } from './EditorToolbar';
import type { Editor } from '@tiptap/react';

export interface RichTextEditorProps {
  /**
   * 编辑器内容（JSON 格式）
   */
  content?: string;

  /**
   * 内容变化回调
   */
  onChange?: (content: string) => void;

  /**
   * 占位符文本
   */
  placeholder?: string;

  /**
   * 是否可编辑
   */
  editable?: boolean;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 编辑器实例就绪回调
   */
  onEditorReady?: (editor: Editor) => void;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  editable = true,
  className = '',
  onEditorReady,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: getEditorExtensions(placeholder),
    content: content ? deserializeContent(content) : '',
    editable,
    ...defaultEditorOptions,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange?.(serializeContent(json));
    },
  });

  // 通知父组件编辑器已就绪
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // 当外部 content 变化时更新编辑器
  useEffect(() => {
    if (!editor) return;

    const currentContent = serializeContent(editor.getJSON());

    // 如果没有新内容，清空编辑器
    if (!content) {
      if (currentContent !== '{"type":"doc","content":[]}') {
        editor.commands.setContent('', { emitUpdate: false });
      }
      return;
    }

    // 内容不同时才更新
    if (currentContent !== content) {
      const parsedContent = deserializeContent(content);
      editor.commands.setContent(parsedContent, { emitUpdate: false });
    }
  }, [content, editor]);

  // 当 editable 变化时更新编辑器
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
