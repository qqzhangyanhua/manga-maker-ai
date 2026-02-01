/**
 * 可 Inline 编辑的文本字段组件
 * 支持单击进入编辑、自动保存、键盘快捷键
 */

"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { Edit2, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInlineEdit, type SaveStatus } from "../hooks/useInlineEdit";

interface InlineEditableFieldProps {
  /** 初始值 */
  value: string;
  /** 保存回调 */
  onSave: (value: string) => Promise<void>;
  /** 占位文本 */
  placeholder?: string;
  /** 是否多行 */
  multiline?: boolean;
  /** 最大行数（多行模式） */
  maxRows?: number;
  /** 自定义类名 */
  className?: string;
  /** 标签文本 */
  label?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case "saving":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          保存中...
        </span>
      );
    case "saved":
      return (
        <span className="flex items-center gap-1 text-xs text-green-500 animate-in fade-in duration-300">
          <Check className="w-3 h-3" />
          已保存
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <X className="w-3 h-3" />
          保存失败
        </span>
      );
    default:
      return null;
  }
}

export function InlineEditableField({
  value: initialValue,
  onSave,
  placeholder = "点击编辑...",
  multiline = false,
  maxRows = 4,
  className,
  label,
  disabled = false,
}: InlineEditableFieldProps) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const {
    value,
    setValue,
    isEditing,
    startEditing,
    cancelEditing,
    confirmEditing,
    saveStatus,
    error,
  } = useInlineEdit({
    initialValue,
    onSave,
    debounceMs: 300,
  });

  // 进入编辑模式时聚焦
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // 将光标移到末尾
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  // 键盘事件处理
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      confirmEditing();
    } else if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      confirmEditing();
    }
  };

  // 失焦时确认保存
  const handleBlur = () => {
    // 延迟执行，避免点击按钮时触发
    setTimeout(() => {
      if (isEditing) {
        confirmEditing();
      }
    }, 100);
  };

  if (disabled) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        {value || placeholder}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <SaveStatusIndicator status={saveStatus} />
        </div>
      )}

      {isEditing ? (
        <div className="relative">
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder}
              rows={Math.min(value.split("\n").length + 1, maxRows)}
              className={cn(
                "w-full px-3 py-2 text-sm rounded-md",
                "bg-background border-2 border-primary/50",
                "focus:outline-none focus:border-primary",
                "resize-none transition-colors",
                saveStatus === "error" && "border-destructive",
                className
              )}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder}
              className={cn(
                "w-full px-3 py-2 text-sm rounded-md",
                "bg-background border-2 border-primary/50",
                "focus:outline-none focus:border-primary",
                "transition-colors",
                saveStatus === "error" && "border-destructive",
                className
              )}
            />
          )}

          {/* 快捷键提示 */}
          <div className="absolute right-2 bottom-2 text-xs text-muted-foreground">
            {multiline ? "Cmd+Enter 保存 · Esc 取消" : "Enter 保存 · Esc 取消"}
          </div>
        </div>
      ) : (
        <div
          onClick={startEditing}
          className={cn(
            "group relative px-3 py-2 text-sm rounded-md cursor-pointer",
            "hover:bg-muted/50 transition-colors",
            "border border-transparent hover:border-muted-foreground/20",
            className
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || placeholder}
          </span>

          {/* 编辑图标 */}
          <Edit2
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "w-4 h-4 text-muted-foreground",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* 无标签时的保存状态 */}
      {!label && <SaveStatusIndicator status={saveStatus} />}
    </div>
  );
}
