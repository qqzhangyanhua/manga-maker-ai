# Script Page UX Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the script page (`/scripts/[id]`) with inline editing, drag-and-drop reordering, and a new storyboard overview tab.

**Architecture:** Three-phase progressive enhancement on existing Tab structure. Phase 1 adds inline editing to panel cards. Phase 2 integrates `@dnd-kit` for drag-and-drop (already partially implemented in `ChapterPanelEditor`). Phase 3 adds a new "故事板" Tab with thumbnail grid view.

**Tech Stack:** React 18, Next.js 14, TypeScript, @dnd-kit/core, @dnd-kit/sortable, Tailwind CSS, shadcn/ui

---

## Phase 1: Inline Editing (Tasks 1-6)

### Task 1: Create useInlineEdit Hook

**Files:**
- Create: `src/app/scripts/[id]/hooks/useInlineEdit.ts`
- Test: `src/app/scripts/[id]/hooks/useInlineEdit.test.ts`

**Step 1: Write the failing test**

```typescript
// src/app/scripts/[id]/hooks/useInlineEdit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInlineEdit } from "./useInlineEdit";

describe("useInlineEdit", () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with isEditing false", () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "test content",
        onSave: mockOnSave,
      })
    );

    expect(result.current.isEditing).toBe(false);
    expect(result.current.value).toBe("test content");
  });

  it("should enter edit mode when startEditing is called", () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "test content",
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.startEditing();
    });

    expect(result.current.isEditing).toBe(true);
  });

  it("should cancel editing and restore original value on cancelEditing", () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "original",
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.startEditing();
      result.current.setValue("modified");
    });

    expect(result.current.value).toBe("modified");

    act(() => {
      result.current.cancelEditing();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.value).toBe("original");
  });

  it("should debounce save calls", async () => {
    mockOnSave.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "test",
        onSave: mockOnSave,
        debounceMs: 300,
      })
    );

    act(() => {
      result.current.startEditing();
      result.current.setValue("new value");
    });

    // Save not called immediately
    expect(mockOnSave).not.toHaveBeenCalled();

    // Fast-forward debounce timer
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnSave).toHaveBeenCalledWith("new value");
  });

  it("should set saveStatus to saving during save", async () => {
    let resolvePromise: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnSave.mockReturnValue(savePromise);

    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "test",
        onSave: mockOnSave,
        debounceMs: 0,
      })
    );

    act(() => {
      result.current.startEditing();
      result.current.setValue("new value");
    });

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.saveStatus).toBe("saving");

    await act(async () => {
      resolvePromise!();
    });

    expect(result.current.saveStatus).toBe("saved");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/scripts/[id]/hooks/useInlineEdit.test.ts`
Expected: FAIL with "Cannot find module './useInlineEdit'"

**Step 3: Write minimal implementation**

```typescript
// src/app/scripts/[id]/hooks/useInlineEdit.ts
/**
 * Inline 编辑 Hook
 * 提供编辑状态管理、防抖保存、乐观更新功能
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseInlineEditOptions {
  /** 初始值 */
  initialValue: string;
  /** 保存回调 */
  onSave: (value: string) => Promise<void>;
  /** 防抖延迟（毫秒），默认 300ms */
  debounceMs?: number;
  /** 保存成功后状态持续时间（毫秒），默认 2000ms */
  savedDurationMs?: number;
}

export interface UseInlineEditReturn {
  /** 当前值 */
  value: string;
  /** 设置值 */
  setValue: (value: string) => void;
  /** 是否处于编辑模式 */
  isEditing: boolean;
  /** 开始编辑 */
  startEditing: () => void;
  /** 取消编辑（恢复原值） */
  cancelEditing: () => void;
  /** 确认保存并退出编辑 */
  confirmEditing: () => void;
  /** 保存状态 */
  saveStatus: SaveStatus;
  /** 错误信息 */
  error: string | null;
}

export function useInlineEdit({
  initialValue,
  onSave,
  debounceMs = 300,
  savedDurationMs = 2000,
}: UseInlineEditOptions): UseInlineEditReturn {
  const [value, setValueState] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // 保存原始值用于取消恢复
  const originalValueRef = useRef(initialValue);
  // 防抖定时器
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保存成功状态定时器
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 最新值引用（用于防抖回调）
  const latestValueRef = useRef(value);

  // 同步外部 initialValue 变化
  useEffect(() => {
    if (!isEditing) {
      setValueState(initialValue);
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  // 执行保存
  const executeSave = useCallback(
    async (valueToSave: string) => {
      if (valueToSave === originalValueRef.current) {
        return; // 值未变化，不保存
      }

      setSaveStatus("saving");
      setError(null);

      try {
        await onSave(valueToSave);
        originalValueRef.current = valueToSave; // 更新原始值
        setSaveStatus("saved");

        // 2秒后恢复 idle 状态
        savedTimerRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, savedDurationMs);
      } catch (err) {
        setSaveStatus("error");
        setError(err instanceof Error ? err.message : "保存失败");
      }
    },
    [onSave, savedDurationMs]
  );

  // 设置值（带防抖保存）
  const setValue = useCallback(
    (newValue: string) => {
      setValueState(newValue);
      latestValueRef.current = newValue;

      // 清除之前的防抖定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 设置新的防抖定时器
      debounceTimerRef.current = setTimeout(() => {
        void executeSave(latestValueRef.current);
      }, debounceMs);
    },
    [debounceMs, executeSave]
  );

  // 开始编辑
  const startEditing = useCallback(() => {
    originalValueRef.current = value;
    setIsEditing(true);
    setError(null);
  }, [value]);

  // 取消编辑
  const cancelEditing = useCallback(() => {
    // 清除防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setValueState(originalValueRef.current);
    setIsEditing(false);
    setSaveStatus("idle");
    setError(null);
  }, []);

  // 确认编辑（立即保存）
  const confirmEditing = useCallback(() => {
    // 清除防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    void executeSave(value);
    setIsEditing(false);
  }, [executeSave, value]);

  return {
    value,
    setValue,
    isEditing,
    startEditing,
    cancelEditing,
    confirmEditing,
    saveStatus,
    error,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/scripts/[id]/hooks/useInlineEdit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scripts/[id]/hooks/useInlineEdit.ts src/app/scripts/[id]/hooks/useInlineEdit.test.ts
git commit -m "$(cat <<'EOF'
feat: add useInlineEdit hook for inline panel editing

- Debounced auto-save with configurable delay
- Optimistic updates with rollback on cancel
- Save status tracking (idle/saving/saved/error)
EOF
)"
```

---

### Task 2: Create InlineEditableField Component

**Files:**
- Create: `src/app/scripts/[id]/components/InlineEditableField.tsx`

**Step 1: Write the component**

```typescript
// src/app/scripts/[id]/components/InlineEditableField.tsx
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
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/components/InlineEditableField.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/scripts/[id]/components/InlineEditableField.tsx
git commit -m "$(cat <<'EOF'
feat: add InlineEditableField component

- Single-click to enter edit mode
- Auto-save on blur with debounce
- Keyboard shortcuts (Cmd+Enter, Esc)
- Visual save status feedback
EOF
)"
```

---

### Task 3: Create InlineEditablePanelCard Component

**Files:**
- Create: `src/app/scripts/[id]/components/InlineEditablePanelCard.tsx`

**Step 1: Write the component**

```typescript
// src/app/scripts/[id]/components/InlineEditablePanelCard.tsx
/**
 * 可 Inline 编辑的分镜卡片
 * 在原有 PanelCard 基础上添加字段级别的 inline 编辑能力
 */

"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, AlertCircle, Maximize2, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { InlineEditableField } from "./InlineEditableField";
import { ImagePreviewDialog } from "@/components/ImagePreview/ImagePreviewDialog";
import type { Panel } from "../types/script-editor.types";

interface InlineEditablePanelCardProps {
  panel: Panel;
  index: number;
  actions?: React.ReactNode;
  onPanelUpdate?: (panelId: string, field: string, value: string) => Promise<void>;
  compact?: boolean;
}

export function InlineEditablePanelCard({
  panel,
  index,
  actions,
  onPanelUpdate,
  compact = false,
}: InlineEditablePanelCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageUrl = (panel.generated_image || panel.image_url) ?? null;

  // 保存字段
  const handleSaveField = useCallback(
    async (field: string, value: string) => {
      if (!onPanelUpdate) return;

      try {
        await onPanelUpdate(panel.id, field, value);
      } catch (error) {
        toast({
          title: "保存失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        throw error; // 重新抛出以便 InlineEditableField 显示错误状态
      }
    },
    [panel.id, onPanelUpdate, toast]
  );

  // 检查是否为流式生成中的临时分镜
  const isGenerating = (panel as Panel & { _isGenerating?: boolean })._isGenerating || false;

  return (
    <>
      <Card className={`group hover:border-primary/50 transition-colors ${compact ? "text-sm" : ""}`}>
        <CardHeader className={`flex flex-row items-start justify-between space-y-0 ${compact ? "pb-1 pt-3 px-3" : "pb-2"}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className={compact ? "text-xs px-1.5 py-0" : ""}>
              #{index + 1}
            </Badge>
            {panel.shot_size && (
              <Badge variant="outline" className={compact ? "text-xs px-1.5 py-0" : ""}>
                {panel.shot_size}
              </Badge>
            )}
            {!compact && panel.camera_angle && (
              <Badge variant="outline">{panel.camera_angle}</Badge>
            )}

            {/* 角色绑定状态 */}
            {compact ? (
              panel.character_id ? (
                <User className="w-3 h-3 text-green-600" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-500" />
              )
            ) : (
              panel.character_id ? (
                <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
                  <User className="w-3 h-3 mr-1" />
                  角色已绑定
                </Badge>
              ) : (
                <Badge variant="default" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  未绑定角色
                </Badge>
              )
            )}
          </div>
          {actions}
        </CardHeader>

        <CardContent className={compact ? "pt-2 px-3 pb-2" : "pt-4"}>
          {compact ? (
            // 紧凑模式：只显示描述，不可编辑
            <div className="space-y-1">
              <p className="text-xs line-clamp-2">
                {panel.description || panel.visual_description || "无描述"}
              </p>
              {panel.dialogue && (
                <p className="text-xs italic text-muted-foreground line-clamp-1">
                  {panel.dialogue}
                </p>
              )}
            </div>
          ) : isGenerating ? (
            // 生成中：显示原始内容，不可编辑
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">画面描述</span>
                <p className="text-sm">{panel.description || "生成中..."}</p>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">对白</span>
                <p className="text-sm italic text-muted-foreground">
                  {panel.dialogue || "生成中..."}
                </p>
              </div>
            </div>
          ) : (
            // 正常模式：可 inline 编辑
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InlineEditableField
                value={panel.visual_description || panel.description || ""}
                onSave={(value) => handleSaveField("visual_description", value)}
                label="画面描述"
                placeholder="描述这个分镜的画面内容..."
                multiline
                maxRows={4}
              />

              <InlineEditableField
                value={panel.dialogue || ""}
                onSave={(value) => handleSaveField("dialogue", value)}
                label="对白"
                placeholder="角色的对白内容..."
                multiline
                maxRows={3}
              />
            </div>
          )}

          {/* 角色描述（可选显示） */}
          {!compact && panel.character_descriptions && (
            <div className="mt-4">
              <InlineEditableField
                value={panel.character_descriptions}
                onSave={(value) => handleSaveField("character_descriptions", value)}
                label="角色描述"
                placeholder="描述出场角色..."
                multiline
                maxRows={2}
              />
            </div>
          )}
        </CardContent>

        {imageUrl && (
          <CardFooter className="bg-muted/10 p-0 overflow-hidden rounded-b-lg">
            <div className={`w-full relative group/image ${compact ? "h-24" : "h-32"}`}>
              <img
                src={imageUrl}
                alt="Shot preview"
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setPreviewOpen(true)}
              />
              {/* 图片操作按钮 */}
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/image:opacity-100">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewOpen(true);
                  }}
                >
                  <Maximize2 className="w-4 h-4 mr-1" />
                  预览
                </Button>
                {!compact && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/panel/editor/${panel.id}`);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                )}
              </div>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* 图片预览对话框 */}
      <ImagePreviewDialog
        open={previewOpen}
        imageUrl={imageUrl}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/components/InlineEditablePanelCard.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/scripts/[id]/components/InlineEditablePanelCard.tsx
git commit -m "$(cat <<'EOF'
feat: add InlineEditablePanelCard component

- Inline editing for visual_description, dialogue, character_descriptions
- Preserves original PanelCard layout and styling
- Disabled editing for generating panels
EOF
)"
```

---

### Task 4: Create usePanelInlineUpdate Hook

**Files:**
- Create: `src/app/scripts/[id]/hooks/usePanelInlineUpdate.ts`

**Step 1: Write the hook**

```typescript
// src/app/scripts/[id]/hooks/usePanelInlineUpdate.ts
/**
 * Panel Inline 更新 Hook
 * 封装单字段更新 API 调用
 */

import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UsePanelInlineUpdateOptions {
  /** 更新成功后的回调 */
  onSuccess?: () => void;
}

export function usePanelInlineUpdate(options: UsePanelInlineUpdateOptions = {}) {
  const { toast } = useToast();
  const { onSuccess } = options;

  /**
   * 更新分镜的单个字段
   */
  const updatePanelField = useCallback(
    async (panelId: string, field: string, value: string) => {
      const response = await fetch(`/api/panel/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "更新失败");
      }

      onSuccess?.();
    },
    [onSuccess]
  );

  /**
   * 批量更新分镜字段
   */
  const updatePanelFields = useCallback(
    async (panelId: string, updates: Record<string, string>) => {
      const response = await fetch(`/api/panel/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "更新失败");
      }

      onSuccess?.();
    },
    [onSuccess]
  );

  return {
    updatePanelField,
    updatePanelFields,
  };
}
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/hooks/usePanelInlineUpdate.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/scripts/[id]/hooks/usePanelInlineUpdate.ts
git commit -m "$(cat <<'EOF'
feat: add usePanelInlineUpdate hook for API calls

- Single field update via PATCH /api/panel/:id
- Batch field updates support
EOF
)"
```

---

### Task 5: Integrate InlineEditablePanelCard into ChapterPanelEditor

**Files:**
- Modify: `src/components/SerialChapterList/ChapterPanelEditor.tsx`

**Step 1: Update ChapterPanelEditor to use InlineEditablePanelCard**

```typescript
// 在 ChapterPanelEditor.tsx 中添加以下修改

// 1. 添加导入
import { InlineEditablePanelCard } from "@/app/scripts/[id]/components/InlineEditablePanelCard";
import { usePanelInlineUpdate } from "@/app/scripts/[id]/hooks/usePanelInlineUpdate";

// 2. 在组件内部添加 hook
const { updatePanelField } = usePanelInlineUpdate({
  onSuccess: () => {
    // 静默成功，不刷新整个列表
  },
});

// 3. 添加处理函数
const handlePanelUpdate = useCallback(
  async (panelId: string, field: string, value: string) => {
    await updatePanelField(panelId, field, value);
  },
  [updatePanelField]
);

// 4. 在 SortablePanelCard 中传递 onPanelUpdate
// 修改 SortablePanelCard 的使用，或者创建一个新的包装组件
```

**Step 2: Create SortableInlineEditablePanelCard wrapper**

由于 `SortablePanelCard` 内部使用 `PanelCard`，我们需要创建一个新的可排序+可编辑的组件。

```typescript
// src/app/scripts/[id]/components/PanelEditor/SortableInlineEditablePanelCard.tsx
/**
 * 可拖拽 + 可 Inline 编辑的分镜卡片
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { InlineEditablePanelCard } from "../InlineEditablePanelCard";
import type { Panel } from "../../types/script-editor.types";

interface SortableInlineEditablePanelCardProps {
  panel: Panel;
  index: number;
  actions?: React.ReactNode;
  onPanelUpdate?: (panelId: string, field: string, value: string) => Promise<void>;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

export function SortableInlineEditablePanelCard({
  panel,
  index,
  actions,
  onPanelUpdate,
  isSelected = false,
  onSelectionChange,
}: SortableInlineEditablePanelCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: panel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : panel._isGenerating ? 0.7 : 1,
  };

  // 检查是否是新追加的分镜
  const isNewlyAdded = !panel._isGenerating && panel.created_at &&
    (Date.now() - new Date(panel.created_at).getTime()) < 30000;

  const isGeneratingClass = panel._isGenerating
    ? "border-2 border-dashed border-primary/50 animate-in fade-in slide-in-from-bottom-4 duration-500"
    : isNewlyAdded
    ? "border-2 border-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-500"
    : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isSelected ? "ring-2 ring-primary rounded-lg" : ""} ${isGeneratingClass}`}
    >
      {/* 批量选择复选框 */}
      {onSelectionChange && !panel._isGenerating && (
        <div className="absolute left-12 top-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              onSelectionChange(checked === true);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 生成中标记 */}
      {panel._isGenerating && (
        <div className="absolute left-12 top-4 z-10">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            生成中
          </Badge>
        </div>
      )}

      {/* 新追加标记 */}
      {isNewlyAdded && (
        <div className="absolute left-12 top-4 z-10">
          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
            新追加
          </Badge>
        </div>
      )}

      {/* 拖拽手柄 */}
      {!panel._isGenerating && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 p-2 hover:bg-muted/50 rounded"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      {/* Inline 可编辑的 PanelCard */}
      <div className={onSelectionChange ? "ml-20" : "ml-10"}>
        <InlineEditablePanelCard
          panel={panel}
          index={index}
          actions={actions}
          onPanelUpdate={onPanelUpdate}
        />
      </div>
    </div>
  );
}
```

**Step 3: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/components/PanelEditor/SortableInlineEditablePanelCard.tsx`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/scripts/[id]/components/PanelEditor/SortableInlineEditablePanelCard.tsx
git commit -m "$(cat <<'EOF'
feat: add SortableInlineEditablePanelCard component

- Combines drag-and-drop with inline editing
- Preserves existing selection and status indicators
EOF
)"
```

---

### Task 6: Update ChapterPanelEditor to Use New Component

**Files:**
- Modify: `src/components/SerialChapterList/ChapterPanelEditor.tsx`

**Step 1: Update imports and add hook**

在 `ChapterPanelEditor.tsx` 文件顶部添加：

```typescript
// 替换原有的 SortablePanelCard 导入
import { SortableInlineEditablePanelCard } from "@/app/scripts/[id]/components/PanelEditor/SortableInlineEditablePanelCard";
import { usePanelInlineUpdate } from "@/app/scripts/[id]/hooks/usePanelInlineUpdate";
```

**Step 2: Add hook and handler in component**

在组件函数内部添加：

```typescript
// 在 ChapterPanelEditor 组件内部，其他 hooks 之后添加
const { updatePanelField } = usePanelInlineUpdate();

const handlePanelUpdate = useCallback(
  async (panelId: string, field: string, value: string) => {
    await updatePanelField(panelId, field, value);
  },
  [updatePanelField]
);
```

**Step 3: Replace SortablePanelCard with SortableInlineEditablePanelCard**

在 JSX 中替换：

```typescript
// 将
<SortablePanelCard
  key={panel.id}
  panel={panel as ScriptPanel}
  index={index}
  actions={...}
/>

// 替换为
<SortableInlineEditablePanelCard
  key={panel.id}
  panel={panel as ScriptPanel}
  index={index}
  onPanelUpdate={handlePanelUpdate}
  actions={...}
/>
```

**Step 4: Run lint and type check**

Run: `npm run lint -- --fix src/components/SerialChapterList/ChapterPanelEditor.tsx && npm run type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/SerialChapterList/ChapterPanelEditor.tsx
git commit -m "$(cat <<'EOF'
feat: integrate inline editing into ChapterPanelEditor

- Replace SortablePanelCard with SortableInlineEditablePanelCard
- Add usePanelInlineUpdate hook for API calls
- Inline editing now available for all panel fields
EOF
)"
```

---

## Phase 2: Enhanced Drag-and-Drop (Tasks 7-10)

> Note: Basic drag-and-drop is already implemented in `ChapterPanelEditor.tsx` using `@dnd-kit`. This phase enhances it with cross-chapter movement and chapter reordering.

### Task 7: Create Chapter Reorder API

**Files:**
- Create: `src/app/api/chapter/reorder/route.ts`

**Step 1: Write the API route**

```typescript
// src/app/api/chapter/reorder/route.ts
/**
 * Chapter Reorder API
 * PUT /api/chapter/reorder - 批量更新章节顺序
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface ReorderRequest {
  story_id: string;
  chapter_orders: Array<{ id: string; chapter_order: number }>;
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body: ReorderRequest = await req.json();
    const { story_id, chapter_orders } = body;

    if (!story_id) {
      return NextResponse.json({ error: "缺少 story_id" }, { status: 400 });
    }

    if (!chapter_orders || !Array.isArray(chapter_orders) || chapter_orders.length === 0) {
      return NextResponse.json({ error: "缺少 chapter_orders" }, { status: 400 });
    }

    // 验证故事所有权
    const story = await prisma.story.findUnique({
      where: { id: story_id },
      select: { user_id: true },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 验证所有章节属于该故事
    const chapterIds = chapter_orders.map((c) => c.id);
    const chapters = await prisma.chapter.findMany({
      where: {
        id: { in: chapterIds },
        story_id,
      },
      select: { id: true },
    });

    if (chapters.length !== chapterIds.length) {
      return NextResponse.json(
        { error: "部分章节不存在或不属于该故事" },
        { status: 400 }
      );
    }

    // 使用事务批量更新
    await prisma.$transaction(
      chapter_orders.map((item) =>
        prisma.chapter.update({
          where: { id: item.id },
          data: { chapter_order: item.chapter_order },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "章节顺序已更新",
    });
  } catch (error) {
    console.error("Chapter reorder error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/api/chapter/reorder/route.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/chapter/reorder/route.ts
git commit -m "$(cat <<'EOF'
feat: add chapter reorder API

- PUT /api/chapter/reorder for batch chapter order updates
- Validates story ownership and chapter membership
- Uses transaction for atomic updates
EOF
)"
```

---

### Task 8: Create Panel Cross-Chapter Move API

**Files:**
- Create: `src/app/api/panel/move-to-chapter/route.ts`

**Step 1: Write the API route**

```typescript
// src/app/api/panel/move-to-chapter/route.ts
/**
 * Panel Move to Chapter API
 * POST /api/panel/move-to-chapter - 将分镜移动到另一个章节
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface MoveRequest {
  panel_id: string;
  target_chapter_id: string;
  target_order?: number; // 可选，不提供则追加到末尾
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body: MoveRequest = await req.json();
    const { panel_id, target_chapter_id, target_order } = body;

    if (!panel_id || !target_chapter_id) {
      return NextResponse.json(
        { error: "缺少必需参数" },
        { status: 400 }
      );
    }

    // 获取分镜及其项目信息
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: {
        project: { select: { user_id: true } },
        chapter: { select: { story_id: true } },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 验证目标章节
    const targetChapter = await prisma.chapter.findUnique({
      where: { id: target_chapter_id },
      include: {
        story: { select: { user_id: true, project_id: true } },
      },
    });

    if (!targetChapter) {
      return NextResponse.json({ error: "目标章节不存在" }, { status: 404 });
    }

    if (targetChapter.story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作目标章节" }, { status: 403 });
    }

    // 如果分镜已在目标章节，直接返回
    if (panel.chapter_id === target_chapter_id) {
      return NextResponse.json({
        success: true,
        message: "分镜已在目标章节中",
      });
    }

    const sourceChapterId = panel.chapter_id;
    const sourceOrder = panel.panel_order;

    // 获取目标章节的最大 panel_order
    const maxOrderResult = await prisma.panel.aggregate({
      where: { chapter_id: target_chapter_id },
      _max: { panel_order: true },
    });
    const maxOrder = maxOrderResult._max.panel_order || 0;
    const finalTargetOrder = target_order ?? maxOrder + 1;

    await prisma.$transaction(async (tx) => {
      // 1. 如果有源章节，更新源章节中后续分镜的顺序
      if (sourceChapterId) {
        await tx.panel.updateMany({
          where: {
            chapter_id: sourceChapterId,
            panel_order: { gt: sourceOrder },
          },
          data: { panel_order: { decrement: 1 } },
        });
      }

      // 2. 如果插入到中间位置，更新目标章节中后续分镜的顺序
      if (target_order !== undefined) {
        await tx.panel.updateMany({
          where: {
            chapter_id: target_chapter_id,
            panel_order: { gte: finalTargetOrder },
          },
          data: { panel_order: { increment: 1 } },
        });
      }

      // 3. 移动分镜到目标章节
      await tx.panel.update({
        where: { id: panel_id },
        data: {
          chapter_id: target_chapter_id,
          panel_order: finalTargetOrder,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "分镜已移动",
      data: {
        panel_id,
        target_chapter_id,
        new_order: finalTargetOrder,
      },
    });
  } catch (error) {
    console.error("Panel move error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "移动失败" },
      { status: 500 }
    );
  }
}
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/api/panel/move-to-chapter/route.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/panel/move-to-chapter/route.ts
git commit -m "$(cat <<'EOF'
feat: add panel move-to-chapter API

- POST /api/panel/move-to-chapter for cross-chapter panel moves
- Automatically reorders panels in source and target chapters
- Supports inserting at specific position or appending
EOF
)"
```

---

### Task 9: Create useDragDropReorder Hook

**Files:**
- Create: `src/app/scripts/[id]/hooks/useDragDropReorder.ts`

**Step 1: Write the hook**

```typescript
// src/app/scripts/[id]/hooks/useDragDropReorder.ts
/**
 * 拖拽排序 Hook
 * 封装章节和分镜的拖拽排序逻辑
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseDragDropReorderOptions {
  storyId: string;
  onSuccess?: () => void;
}

export function useDragDropReorder({ storyId, onSuccess }: UseDragDropReorderOptions) {
  const { toast } = useToast();
  const [isReordering, setIsReordering] = useState(false);

  /**
   * 重排序章节
   */
  const reorderChapters = useCallback(
    async (chapterOrders: Array<{ id: string; chapter_order: number }>) => {
      setIsReordering(true);
      try {
        const response = await fetch("/api/chapter/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            story_id: storyId,
            chapter_orders: chapterOrders,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "重排序失败");
        }

        onSuccess?.();
      } catch (error) {
        toast({
          title: "排序失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsReordering(false);
      }
    },
    [storyId, onSuccess, toast]
  );

  /**
   * 移动分镜到另一个章节
   */
  const movePanelToChapter = useCallback(
    async (panelId: string, targetChapterId: string, targetOrder?: number) => {
      setIsReordering(true);
      try {
        const response = await fetch("/api/panel/move-to-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panel_id: panelId,
            target_chapter_id: targetChapterId,
            target_order: targetOrder,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "移动失败");
        }

        toast({
          title: "移动成功",
          description: "分镜已移动到目标章节",
        });

        onSuccess?.();
      } catch (error) {
        toast({
          title: "移动失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsReordering(false);
      }
    },
    [onSuccess, toast]
  );

  /**
   * 章节内重排序分镜（使用现有 API）
   */
  const reorderPanelsInChapter = useCallback(
    async (updates: Array<{ id: string; panel_order: number }>, projectId: string) => {
      setIsReordering(true);
      try {
        const response = await fetch("/api/panel/batch-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates, projectId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "重排序失败");
        }

        onSuccess?.();
      } catch (error) {
        toast({
          title: "排序失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsReordering(false);
      }
    },
    [onSuccess, toast]
  );

  return {
    isReordering,
    reorderChapters,
    movePanelToChapter,
    reorderPanelsInChapter,
  };
}
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/hooks/useDragDropReorder.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/scripts/[id]/hooks/useDragDropReorder.ts
git commit -m "$(cat <<'EOF'
feat: add useDragDropReorder hook

- Chapter reordering via /api/chapter/reorder
- Cross-chapter panel moves via /api/panel/move-to-chapter
- In-chapter panel reordering via existing batch-update API
EOF
)"
```

---

### Task 10: Add Drag Handle to ChapterCard

**Files:**
- Modify: `src/components/SerialChapterList/ChapterCard.tsx`

**Step 1: Add drag handle prop and UI**

在 `ChapterCard.tsx` 中添加拖拽手柄支持：

```typescript
// 在 ChapterCardProps 接口中添加
interface ChapterCardProps {
  // ... existing props
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

// 在组件中添加拖拽手柄
{dragHandleProps && (
  <div
    {...dragHandleProps}
    className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-800/30 transition-colors"
  >
    <GripVertical className="w-5 h-5 text-gray-500" />
  </div>
)}
```

**Step 2: Update types.ts**

在 `types.ts` 中更新 `ChapterCardProps`：

```typescript
export interface ChapterCardProps {
  // ... existing props
  /** 拖拽手柄属性（由 dnd-kit 提供） */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}
```

**Step 3: Run lint check**

Run: `npm run lint -- --fix src/components/SerialChapterList/ChapterCard.tsx src/components/SerialChapterList/types.ts`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/SerialChapterList/ChapterCard.tsx src/components/SerialChapterList/types.ts
git commit -m "$(cat <<'EOF'
feat: add drag handle support to ChapterCard

- Optional dragHandleProps for dnd-kit integration
- Visual drag handle on left side of card
EOF
)"
```

---

## Phase 3: Storyboard Tab (Tasks 11-17)

### Task 11: Add STORYBOARD Tab Value

**Files:**
- Modify: `src/app/scripts/[id]/hooks/useUIState.ts`

**Step 1: Add new tab value**

```typescript
// 在 TAB_VALUES 中添加
export const TAB_VALUES = {
  SERIAL: 'serial',
  CHARACTERS: 'characters',
  STORYBOARD: 'storyboard', // 新增
  GALLERY: 'gallery',
  LAYOUT: 'layout',
} as const;
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/hooks/useUIState.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/scripts/[id]/hooks/useUIState.ts
git commit -m "$(cat <<'EOF'
feat: add STORYBOARD tab value to useUIState

- New tab for storyboard overview
EOF
)"
```

---

### Task 12: Create StoryboardThumbnail Component

**Files:**
- Create: `src/app/scripts/[id]/components/StoryboardTab/StoryboardThumbnail.tsx`

**Step 1: Write the component**

```typescript
// src/app/scripts/[id]/components/StoryboardTab/StoryboardThumbnail.tsx
/**
 * 故事板缩略图组件
 * 显示单个分镜的缩略图
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, ImageOff, AlertCircle } from "lucide-react";
import type { Panel } from "../../types/script-editor.types";

interface StoryboardThumbnailProps {
  panel: Panel;
  index: number;
  size: "small" | "medium" | "large";
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

const sizeMap = {
  small: "w-[60px] h-[60px]",
  medium: "w-[100px] h-[100px]",
  large: "w-[160px] h-[160px]",
};

export function StoryboardThumbnail({
  panel,
  index,
  size,
  isSelected = false,
  onClick,
  onDoubleClick,
}: StoryboardThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = panel.generated_image || panel.image_url;
  const isGenerating = (panel as Panel & { _isGenerating?: boolean })._isGenerating;

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "relative rounded-lg overflow-hidden cursor-pointer",
        "border-2 transition-all duration-200",
        "hover:scale-105 hover:shadow-lg",
        sizeMap[size],
        isSelected
          ? "border-primary ring-2 ring-primary/30"
          : "border-gray-700 hover:border-gray-500"
      )}
    >
      {/* 序号角标 */}
      <div className="absolute top-1 left-1 z-10 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
        {index + 1}
      </div>

      {/* 状态指示器 */}
      {isGenerating && (
        <div className="absolute top-1 right-1 z-10">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
      )}

      {/* 图片内容 */}
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={`Panel ${index + 1}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          {imageError ? (
            <AlertCircle className="w-6 h-6 text-destructive" />
          ) : (
            <ImageOff className="w-6 h-6 text-gray-500" />
          )}
        </div>
      )}

      {/* 选中遮罩 */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}
    </div>
  );
}
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/components/StoryboardTab/StoryboardThumbnail.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/scripts/[id]/components/StoryboardTab/StoryboardThumbnail.tsx
git commit -m "$(cat <<'EOF'
feat: add StoryboardThumbnail component

- Three size variants (small/medium/large)
- Status indicators for generating/error states
- Selection highlight support
EOF
)"
```

---

### Task 13: Create StoryboardChapterSection Component

**Files:**
- Create: `src/app/scripts/[id]/components/StoryboardTab/StoryboardChapterSection.tsx`

**Step 1: Write the component**

```typescript
// src/app/scripts/[id]/components/StoryboardTab/StoryboardChapterSection.tsx
/**
 * 故事板章节区块
 * 显示单个章节的所有分镜缩略图
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StoryboardThumbnail } from "./StoryboardThumbnail";
import type { Panel } from "../../types/script-editor.types";

interface Chapter {
  id: string;
  title: string;
  chapter_order: number;
}

interface StoryboardChapterSectionProps {
  chapter: Chapter;
  panels: Panel[];
  thumbnailSize: "small" | "medium" | "large";
  selectedPanelIds: Set<string>;
  onPanelClick: (panelId: string, event: React.MouseEvent) => void;
  onPanelDoubleClick: (panelId: string) => void;
  onAddPanel?: () => void;
}

export function StoryboardChapterSection({
  chapter,
  panels,
  thumbnailSize,
  selectedPanelIds,
  onPanelClick,
  onPanelDoubleClick,
  onAddPanel,
}: StoryboardChapterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const chapterPanels = panels
    .filter((p) => p.chapter_id === chapter.id)
    .sort((a, b) => (a.panel_order || 0) - (b.panel_order || 0));

  return (
    <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden">
      {/* 章节标题栏 */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-sm text-gray-400">第{chapter.chapter_order}章</span>
          <span className="font-medium text-white">{chapter.title}</span>
          <span className="text-xs text-gray-500">({chapterPanels.length})</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className="text-gray-400 hover:text-white"
        >
          {isExpanded ? "收起" : "展开"}
        </Button>
      </div>

      {/* 缩略图网格 */}
      {isExpanded && (
        <div className="p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {chapterPanels.map((panel, index) => (
              <StoryboardThumbnail
                key={panel.id}
                panel={panel}
                index={index}
                size={thumbnailSize}
                isSelected={selectedPanelIds.has(panel.id)}
                onClick={(e) => onPanelClick(panel.id, e as unknown as React.MouseEvent)}
                onDoubleClick={() => onPanelDoubleClick(panel.id)}
              />
            ))}

            {/* 添加分镜按钮 */}
            {onAddPanel && (
              <button
                onClick={onAddPanel}
                className={cn(
                  "flex items-center justify-center rounded-lg",
                  "border-2 border-dashed border-gray-700 hover:border-gray-500",
                  "bg-gray-800/30 hover:bg-gray-800/50 transition-colors",
                  thumbnailSize === "small" && "w-[60px] h-[60px]",
                  thumbnailSize === "medium" && "w-[100px] h-[100px]",
                  thumbnailSize === "large" && "w-[160px] h-[160px]"
                )}
              >
                <Plus className="w-6 h-6 text-gray-500" />
              </button>
            )}
          </div>

          {chapterPanels.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无分镜
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/components/StoryboardTab/StoryboardChapterSection.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/scripts/[id]/components/StoryboardTab/StoryboardChapterSection.tsx
git commit -m "$(cat <<'EOF'
feat: add StoryboardChapterSection component

- Collapsible chapter sections
- Thumbnail grid with configurable size
- Add panel button placeholder
EOF
)"
```

---

### Task 14: Create StoryboardZoomControl Component

**Files:**
- Create: `src/app/scripts/[id]/components/StoryboardTab/StoryboardZoomControl.tsx`

**Step 1: Write the component**

```typescript
// src/app/scripts/[id]/components/StoryboardTab/StoryboardZoomControl.tsx
/**
 * 故事板缩放控制组件
 */

"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type ThumbnailSize = "small" | "medium" | "large";

interface StoryboardZoomControlProps {
  size: ThumbnailSize;
  onSizeChange: (size: ThumbnailSize) => void;
  className?: string;
}

const sizeLabels: Record<ThumbnailSize, string> = {
  small: "小图",
  medium: "中图",
  large: "大图",
};

const sizeValues: ThumbnailSize[] = ["small", "medium", "large"];

export function StoryboardZoomControl({
  size,
  onSizeChange,
  className,
}: StoryboardZoomControlProps) {
  const currentIndex = sizeValues.indexOf(size);

  const handleSliderChange = (value: number[]) => {
    const newSize = sizeValues[value[0]];
    if (newSize) {
      onSizeChange(newSize);
    }
  };

  const handleZoomOut = () => {
    if (currentIndex > 0) {
      onSizeChange(sizeValues[currentIndex - 1]);
    }
  };

  const handleZoomIn = () => {
    if (currentIndex < sizeValues.length - 1) {
      onSizeChange(sizeValues[currentIndex + 1]);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 bg-[#1a1a1f]/80 backdrop-blur-sm",
        "border border-gray-800/50 rounded-lg",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        disabled={currentIndex === 0}
        className="h-8 w-8"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>

      <div className="w-24">
        <Slider
          value={[currentIndex]}
          min={0}
          max={sizeValues.length - 1}
          step={1}
          onValueChange={handleSliderChange}
          className="cursor-pointer"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        disabled={currentIndex === sizeValues.length - 1}
        className="h-8 w-8"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      <span className="text-xs text-gray-400 min-w-[3rem]">
        {sizeLabels[size]}
      </span>
    </div>
  );
}
```

**Step 2: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/components/StoryboardTab/StoryboardZoomControl.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/scripts/[id]/components/StoryboardTab/StoryboardZoomControl.tsx
git commit -m "$(cat <<'EOF'
feat: add StoryboardZoomControl component

- Slider for thumbnail size selection
- Zoom in/out buttons
- Three size presets (small/medium/large)
EOF
)"
```

---

### Task 15: Create StoryboardTab Main Component

**Files:**
- Create: `src/app/scripts/[id]/components/StoryboardTab/index.tsx`

**Step 1: Write the main component**

```typescript
// src/app/scripts/[id]/components/StoryboardTab/index.tsx
/**
 * 故事板 Tab 主组件
 * 提供全局缩略图视图
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { StoryboardChapterSection } from "./StoryboardChapterSection";
import { StoryboardZoomControl } from "./StoryboardZoomControl";
import { StoryboardPanelInfo } from "./StoryboardPanelInfo";
import type { Panel } from "../../types/script-editor.types";

interface Chapter {
  id: string;
  title: string;
  chapter_order: number;
}

interface StoryboardTabProps {
  chapters: Chapter[];
  panels: Panel[];
  onPanelDoubleClick: (panelId: string, chapterId: string) => void;
  onGeneratePanels?: (chapterId: string) => void;
}

type ThumbnailSize = "small" | "medium" | "large";

export function StoryboardTab({
  chapters,
  panels,
  onPanelDoubleClick,
  onGeneratePanels,
}: StoryboardTabProps) {
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>("medium");
  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // 排序章节
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_order - b.chapter_order),
    [chapters]
  );

  // 获取选中的分镜信息
  const selectedPanel = useMemo(() => {
    if (selectedPanelIds.size === 1) {
      const panelId = Array.from(selectedPanelIds)[0];
      return panels.find((p) => p.id === panelId) || null;
    }
    return null;
  }, [selectedPanelIds, panels]);

  // 处理分镜点击（支持多选）
  const handlePanelClick = useCallback(
    (panelId: string, event: React.MouseEvent) => {
      const chapterPanels = panels
        .filter((p) => {
          const clickedPanel = panels.find((pp) => pp.id === panelId);
          return p.chapter_id === clickedPanel?.chapter_id;
        })
        .sort((a, b) => (a.panel_order || 0) - (b.panel_order || 0));

      if (event.shiftKey && lastSelectedId) {
        // Shift+点击：范围选择
        const lastIndex = chapterPanels.findIndex((p) => p.id === lastSelectedId);
        const currentIndex = chapterPanels.findIndex((p) => p.id === panelId);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = chapterPanels.slice(start, end + 1).map((p) => p.id);

          setSelectedPanelIds((prev) => {
            const newSet = new Set(prev);
            rangeIds.forEach((id) => newSet.add(id));
            return newSet;
          });
        }
      } else if (event.metaKey || event.ctrlKey) {
        // Cmd/Ctrl+点击：切换选择
        setSelectedPanelIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(panelId)) {
            newSet.delete(panelId);
          } else {
            newSet.add(panelId);
          }
          return newSet;
        });
        setLastSelectedId(panelId);
      } else {
        // 普通点击：单选
        setSelectedPanelIds(new Set([panelId]));
        setLastSelectedId(panelId);
      }
    },
    [panels, lastSelectedId]
  );

  // 处理双击跳转
  const handlePanelDoubleClick = useCallback(
    (panelId: string) => {
      const panel = panels.find((p) => p.id === panelId);
      if (panel?.chapter_id) {
        onPanelDoubleClick(panelId, panel.chapter_id);
      }
    },
    [panels, onPanelDoubleClick]
  );

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          共 {chapters.length} 章 · {panels.length} 个分镜
          {selectedPanelIds.size > 0 && (
            <span className="ml-2 text-primary">
              · 已选 {selectedPanelIds.size} 个
            </span>
          )}
        </div>

        <StoryboardZoomControl
          size={thumbnailSize}
          onSizeChange={setThumbnailSize}
        />
      </div>

      {/* 章节列表 */}
      <div className="space-y-3">
        {sortedChapters.map((chapter) => (
          <StoryboardChapterSection
            key={chapter.id}
            chapter={chapter}
            panels={panels}
            thumbnailSize={thumbnailSize}
            selectedPanelIds={selectedPanelIds}
            onPanelClick={handlePanelClick}
            onPanelDoubleClick={handlePanelDoubleClick}
            onAddPanel={
              onGeneratePanels ? () => onGeneratePanels(chapter.id) : undefined
            }
          />
        ))}
      </div>

      {/* 选中分镜信息面板 */}
      {selectedPanel && (
        <StoryboardPanelInfo panel={selectedPanel} />
      )}

      {/* 空状态 */}
      {chapters.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          暂无章节，请先创建章节
        </div>
      )}
    </div>
  );
}

export { StoryboardThumbnail } from "./StoryboardThumbnail";
export { StoryboardChapterSection } from "./StoryboardChapterSection";
export { StoryboardZoomControl } from "./StoryboardZoomControl";
```

**Step 2: Create StoryboardPanelInfo component**

```typescript
// src/app/scripts/[id]/components/StoryboardTab/StoryboardPanelInfo.tsx
/**
 * 选中分镜的简要信息面板
 */

"use client";

import { Badge } from "@/components/ui/badge";
import type { Panel } from "../../types/script-editor.types";

interface StoryboardPanelInfoProps {
  panel: Panel;
}

export function StoryboardPanelInfo({ panel }: StoryboardPanelInfoProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#1a1a1f]/95 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-3 shadow-xl max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">#{panel.panel_order}</Badge>
          {panel.shot_size && <Badge variant="outline">{panel.shot_size}</Badge>}
          {panel.camera_angle && <Badge variant="outline">{panel.camera_angle}</Badge>}
        </div>
        <p className="text-sm text-gray-300 line-clamp-2">
          {panel.description || panel.visual_description || "无描述"}
        </p>
        {panel.dialogue && (
          <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">
            {panel.dialogue}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Run lint check**

Run: `npm run lint -- --fix src/app/scripts/[id]/components/StoryboardTab/`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/scripts/[id]/components/StoryboardTab/
git commit -m "$(cat <<'EOF'
feat: add StoryboardTab main component

- Chapter sections with thumbnail grids
- Multi-select support (Shift/Cmd+Click)
- Zoom control for thumbnail sizes
- Selected panel info panel
EOF
)"
```

---

### Task 16: Integrate StoryboardTab into ScriptPageTabs

**Files:**
- Modify: `src/app/scripts/[id]/components/ScriptPageTabs.tsx`
- Modify: `src/app/scripts/[id]/types/component-props.types.ts`

**Step 1: Update ScriptPageTabsProps**

在 `component-props.types.ts` 中添加：

```typescript
export interface ScriptPageTabsProps {
  // ... existing props
  /** 双击分镜跳转回章节创作 Tab */
  onStoryboardPanelDoubleClick?: (panelId: string, chapterId: string) => void;
}
```

**Step 2: Update ScriptPageTabs component**

在 `ScriptPageTabs.tsx` 中：

1. 添加导入：
```typescript
import { StoryboardTab } from "./StoryboardTab";
```

2. 添加新的 TabsTrigger：
```typescript
<TabsTrigger
  value={TAB_VALUES.STORYBOARD}
  className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
>
  <div className="flex items-center gap-2">
    <span>故事板</span>
    {progressStats.totalPanels > 0 && (
      <Badge variant="secondary" className="ml-1">
        {progressStats.generatedPanels}/{progressStats.totalPanels}
      </Badge>
    )}
  </div>
</TabsTrigger>
```

3. 添加 TabsContent：
```typescript
{/* 故事板视图 */}
<TabsContent value={TAB_VALUES.STORYBOARD} className="mt-0">
  <StoryboardTab
    chapters={chapters}
    panels={panels}
    onPanelDoubleClick={(panelId, chapterId) => {
      // 切换到章节创作 Tab 并定位
      onTabChange(TAB_VALUES.SERIAL);
      // TODO: 滚动到对应分镜
    }}
    onGeneratePanels={onGeneratePanels}
  />
</TabsContent>
```

**Step 3: Run lint and type check**

Run: `npm run lint -- --fix src/app/scripts/[id]/components/ScriptPageTabs.tsx && npm run type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/scripts/[id]/components/ScriptPageTabs.tsx src/app/scripts/[id]/types/component-props.types.ts
git commit -m "$(cat <<'EOF'
feat: integrate StoryboardTab into ScriptPageTabs

- New "故事板" tab between "关联角色" and "素材库"
- Panel count badge showing generation progress
- Double-click to navigate back to chapter view
EOF
)"
```

---

### Task 17: Final Integration and Testing

**Files:**
- Modify: `src/app/scripts/[id]/page.tsx` (if needed)

**Step 1: Verify all imports and exports**

确保所有新组件正确导出和导入。

**Step 2: Run full type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Run lint on all modified files**

Run: `npm run lint`
Expected: No errors

**Step 4: Manual testing checklist**

1. [ ] Inline 编辑：点击分镜描述可进入编辑模式
2. [ ] Inline 编辑：失焦或 Cmd+Enter 保存，Esc 取消
3. [ ] Inline 编辑：保存状态正确显示（保存中/已保存/失败）
4. [ ] 拖拽排序：分镜卡片可拖拽重排序
5. [ ] 故事板 Tab：正确显示所有章节和分镜缩略图
6. [ ] 故事板 Tab：缩放控制正常工作
7. [ ] 故事板 Tab：单击选中，Shift+点击范围选，Cmd+点击多选
8. [ ] 故事板 Tab：双击跳转到章节创作 Tab

**Step 5: Final commit**

```bash
git add .
git commit -m "$(cat <<'EOF'
feat: complete script page UX enhancement

Phase 1: Inline editing
- useInlineEdit hook with debounced auto-save
- InlineEditableField component
- InlineEditablePanelCard with field-level editing

Phase 2: Enhanced drag-and-drop
- Chapter reorder API
- Panel cross-chapter move API
- useDragDropReorder hook

Phase 3: Storyboard Tab
- StoryboardThumbnail component
- StoryboardChapterSection with collapsible sections
- StoryboardZoomControl with slider
- Multi-select support (Shift/Cmd+Click)
EOF
)"
```

---

## Summary

This implementation plan covers three phases:

**Phase 1 (Tasks 1-6):** Inline editing capability
- `useInlineEdit` hook for state management and debounced saving
- `InlineEditableField` component for individual editable fields
- `InlineEditablePanelCard` component integrating inline editing
- Integration into existing `ChapterPanelEditor`

**Phase 2 (Tasks 7-10):** Enhanced drag-and-drop
- Chapter reorder API (`/api/chapter/reorder`)
- Panel cross-chapter move API (`/api/panel/move-to-chapter`)
- `useDragDropReorder` hook for unified drag-drop operations
- Drag handle support in `ChapterCard`

**Phase 3 (Tasks 11-17):** Storyboard overview Tab
- New `STORYBOARD` tab value
- `StoryboardThumbnail` component for panel thumbnails
- `StoryboardChapterSection` for chapter grouping
- `StoryboardZoomControl` for thumbnail size adjustment
- `StoryboardTab` main component with multi-select support

---

**Plan complete and saved to `docs/plans/2026-02-02-script-page-ux-enhancement-implementation.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
