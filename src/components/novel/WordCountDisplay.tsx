/**
 * 字数统计显示组件
 * 
 * 显示编辑器的字数、字符数、段落数等统计信息
 */

"use client";

import { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';

export interface WordCountDisplayProps {
  /**
   * Tiptap 编辑器实例
   */
  editor: Editor | null;
  
  /**
   * 自定义类名
   */
  className?: string;
}

export function WordCountDisplay({ editor, className = '' }: WordCountDisplayProps) {
  const [stats, setStats] = useState({
    characters: 0,
    words: 0,
  });

  useEffect(() => {
    if (!editor) return;

    const updateStats = () => {
      const characterCount = editor.storage.characterCount.characters();
      const words = editor.storage.characterCount.words();
      
      setStats({
        characters: characterCount,
        words,
      });
    };

    // 初始化统计
    updateStats();

    // 监听内容变化
    editor.on('update', updateStats);

    return () => {
      editor.off('update', updateStats);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`flex items-center gap-4 text-sm text-muted-foreground ${className}`}>
      <span>{stats.words} 字</span>
      <span>{stats.characters} 字符</span>
    </div>
  );
}
