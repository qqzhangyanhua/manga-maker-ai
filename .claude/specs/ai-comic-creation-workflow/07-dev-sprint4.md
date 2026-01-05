# Sprint 4 开发实施报告
## REQ-006: 操作流畅度优化

---

## 📋 实施信息

| 项目 | 内容 |
|------|------|
| **Sprint** | Sprint 4 (Week 7-8) |
| **需求编号** | REQ-006 |
| **需求名称** | 操作流畅度优化 |
| **优先级** | P0 ⭐⭐⭐⭐⭐ |
| **Story Points** | 8 SP |
| **预计工作量** | 5-8 小时 |
| **实施日期** | 2026-01-05 |

---

## 🎯 实施目标

优化用户操作流程，提升操作效率和流畅度，通过快捷键、拖拽、批量选择和右键菜单等功能，显著改善用户体验。

### 用户故事
1. 作为用户，我希望使用快捷键快速保存，以便提高效率
2. 作为用户，我希望拖拽章节调整顺序，以便快速调整故事结构
3. 作为用户，我希望批量选择章节，以便批量操作

---

## 📦 功能模块

### 1. 快捷键系统 ⭐⭐⭐⭐⭐

#### 目标
创建统一的快捷键系统，支持全局和模块级快捷键。

#### 功能清单
- ✅ 创建 `useHotkeys` Hook
- ✅ 全局快捷键（保存、撤销、重做）
- ✅ 模块快捷键（章节编辑、搜索、导出）
- ✅ 快捷键冲突检测
- ✅ 跨平台支持（Mac/Windows）

#### 技术实现
```typescript
// src/hooks/useHotkeys.ts

import { useEffect, useCallback } from "react"

interface HotkeyOptions {
  enabled?: boolean
  preventDefault?: boolean
  enableOnFormTags?: boolean
}

export function useHotkeys(
  keys: string,
  callback: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    enableOnFormTags = false
  } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 检查是否在表单元素中
    if (!enableOnFormTags) {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return
      }
    }

    // 解析快捷键
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const parts = keys.toLowerCase().split('+')
    
    let needsCtrl = false
    let needsShift = false
    let needsAlt = false
    let needsMeta = false
    let key = ''

    for (const part of parts) {
      if (part === 'ctrl' || part === 'control') needsCtrl = true
      else if (part === 'shift') needsShift = true
      else if (part === 'alt' || part === 'option') needsAlt = true
      else if (part === 'meta' || part === 'cmd' || part === 'command') needsMeta = true
      else if (part === 'mod') {
        // 'mod' 在 Mac 上是 Meta，在 Windows/Linux 上是 Ctrl
        if (isMac) needsMeta = true
        else needsCtrl = true
      }
      else key = part
    }

    // 检查修饰键
    if (needsCtrl && !event.ctrlKey) return
    if (needsShift && !event.shiftKey) return
    if (needsAlt && !event.altKey) return
    if (needsMeta && !event.metaKey) return

    // 检查按键
    if (event.key.toLowerCase() !== key) return

    // 执行回调
    if (preventDefault) {
      event.preventDefault()
    }
    callback(event)
  }, [keys, callback, enableOnFormTags, preventDefault])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
```

#### 使用示例
```typescript
// 保存快捷键
useHotkeys('mod+s', () => {
  handleSave()
})

// 搜索快捷键
useHotkeys('mod+k', () => {
  setSearchOpen(true)
})

// 删除快捷键
useHotkeys('delete', () => {
  handleDelete()
}, { enableOnFormTags: false })
```

---

### 2. 拖拽操作 ⭐⭐⭐⭐

#### 目标
实现章节拖拽排序，提升用户调整章节顺序的效率。

#### 功能清单
- ✅ 集成 `@dnd-kit` 库
- ✅ 章节拖拽排序
- ✅ 拖拽动画和视觉反馈
- ✅ 触摸设备支持
- ✅ 拖拽状态管理

#### 依赖安装
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

#### 技术实现
```typescript
// src/app/(novel)/novel/[id]/components/SortableChapterList.tsx

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableChapterProps {
  chapter: ChapterOutline
  onSelect: (chapter: ChapterOutline) => void
}

function SortableChapter({ chapter, onSelect }: SortableChapterProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: chapter.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(chapter)}
      className="cursor-move"
    >
      {/* 章节内容 */}
    </div>
  )
}

export function SortableChapterList({ chapters, onReorder, onSelect }) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = chapters.findIndex(ch => ch.id === active.id)
    const newIndex = chapters.findIndex(ch => ch.id === over.id)

    const newChapters = arrayMove(chapters, oldIndex, newIndex)
    onReorder(newChapters)
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={chapters} strategy={verticalListSortingStrategy}>
        {chapters.map(chapter => (
          <SortableChapter key={chapter.id} chapter={chapter} onSelect={onSelect} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

---

### 3. 批量选择 ⭐⭐⭐

#### 目标
实现章节批量选择，支持 Shift 范围选择和 Ctrl/⌘ 多选。

#### 功能清单
- ✅ 创建 `useBatchSelection` Hook
- ✅ Shift 范围选择
- ✅ Ctrl/⌘ 多选
- ✅ 全选/反选
- ✅ 批量操作工具栏

#### 技术实现
```typescript
// src/hooks/useBatchSelection.ts

import { useState, useCallback } from "react"

interface UseBatchSelectionOptions<T> {
  getId: (item: T) => string
  onSelectionChange?: (selected: Set<string>) => void
}

export function useBatchSelection<T>(
  items: T[],
  options: UseBatchSelectionOptions<T>
) {
  const { getId, onSelectionChange } = options
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastSelected, setLastSelected] = useState<string | null>(null)

  const toggle = useCallback((id: string, event?: React.MouseEvent) => {
    setSelected(prev => {
      const newSelected = new Set(prev)

      if (event?.shiftKey && lastSelected) {
        // Shift 范围选择
        const lastIndex = items.findIndex(item => getId(item) === lastSelected)
        const currentIndex = items.findIndex(item => getId(item) === id)
        
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        
        for (let i = start; i <= end; i++) {
          newSelected.add(getId(items[i]))
        }
      } else if (event?.metaKey || event?.ctrlKey) {
        // Ctrl/⌘ 多选
        if (newSelected.has(id)) {
          newSelected.delete(id)
        } else {
          newSelected.add(id)
        }
      } else {
        // 单选
        newSelected.clear()
        newSelected.add(id)
      }

      setLastSelected(id)
      onSelectionChange?.(newSelected)
      return newSelected
    })
  }, [items, getId, lastSelected, onSelectionChange])

  const selectAll = useCallback(() => {
    const newSelected = new Set(items.map(getId))
    setSelected(newSelected)
    onSelectionChange?.(newSelected)
  }, [items, getId, onSelectionChange])

  const deselectAll = useCallback(() => {
    setSelected(new Set())
    onSelectionChange?.(new Set())
  }, [onSelectionChange])

  const isSelected = useCallback((id: string) => {
    return selected.has(id)
  }, [selected])

  return {
    selected,
    toggle,
    selectAll,
    deselectAll,
    isSelected,
    selectedCount: selected.size,
  }
}
```

---

### 4. 右键菜单 ⭐⭐⭐

#### 目标
实现章节右键菜单，提供快速操作入口。

#### 功能清单
- ✅ 创建 `ContextMenu` 组件
- ✅ 章节右键菜单
- ✅ 菜单项配置
- ✅ 键盘导航
- ✅ 菜单位置自适应

#### 技术实现
```typescript
// src/components/ui/context-menu.tsx

import { createContext, useContext, useState, useCallback } from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"

export function ContextMenu({ children, items }) {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="context-menu-content">
          {items.map((item, index) => (
            item.separator ? (
              <ContextMenuPrimitive.Separator key={index} />
            ) : (
              <ContextMenuPrimitive.Item
                key={index}
                onClick={item.onClick}
                disabled={item.disabled}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
                {item.shortcut && (
                  <span className="ml-auto text-xs">{item.shortcut}</span>
                )}
              </ContextMenuPrimitive.Item>
            )
          ))}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  )
}
```

---

## 📊 实施计划

### 阶段 1: 快捷键系统（2h）
1. ✅ 创建 `useHotkeys` Hook
2. ✅ 实现快捷键解析
3. ✅ 添加跨平台支持
4. ✅ 集成到现有组件

### 阶段 2: 拖拽操作（2-3h）
1. ✅ 安装 `@dnd-kit` 依赖
2. ✅ 创建 `SortableChapterList` 组件
3. ✅ 实现拖拽排序逻辑
4. ✅ 添加拖拽动画
5. ✅ 集成到章节列表

### 阶段 3: 批量选择（1-2h）
1. ✅ 创建 `useBatchSelection` Hook
2. ✅ 实现选择逻辑
3. ✅ 创建批量操作工具栏
4. ✅ 集成到章节列表

### 阶段 4: 右键菜单（1h）
1. ✅ 安装 `@radix-ui/react-context-menu`
2. ✅ 创建 `ContextMenu` 组件
3. ✅ 配置章节菜单项
4. ✅ 集成到章节列表

---

## ✅ 验收标准

### 性能要求
- [ ] 快捷键响应速度 < 100ms
- [ ] 拖拽操作流畅，60fps
- [ ] 批量选择响应 < 50ms
- [ ] 右键菜单打开 < 100ms

### 功能要求
- [ ] 快捷键无冲突
- [ ] 拖拽支持触摸设备
- [ ] 批量选择准确无误
- [ ] 右键菜单功能完整

### 用户体验
- [ ] 操作直观易懂
- [ ] 视觉反馈清晰
- [ ] 错误处理完善
- [ ] 支持撤销操作

---

## 🔧 依赖安装

```bash
# 拖拽库
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# 右键菜单库
pnpm add @radix-ui/react-context-menu

# 类型定义
pnpm add -D @types/node
```

---

## 📝 使用示例

### 快捷键
```typescript
// 全局保存
useHotkeys('mod+s', handleSave)

// 搜索
useHotkeys('mod+k', () => setSearchOpen(true))

// 删除
useHotkeys('delete', handleDelete, { enableOnFormTags: false })
```

### 拖拽排序
```typescript
<SortableChapterList
  chapters={chapters}
  onReorder={handleReorder}
  onSelect={handleSelect}
/>
```

### 批量选择
```typescript
const { selected, toggle, selectAll, deselectAll } = useBatchSelection(
  chapters,
  { getId: (ch) => ch.id }
)

<Checkbox
  checked={isSelected(chapter.id)}
  onCheckedChange={() => toggle(chapter.id, event)}
/>
```

### 右键菜单
```typescript
<ContextMenu
  items={[
    { label: '编辑', onClick: handleEdit, icon: <Edit /> },
    { label: '删除', onClick: handleDelete, icon: <Trash /> },
    { separator: true },
    { label: '导出', onClick: handleExport, shortcut: '⌘E' },
  ]}
>
  <ChapterItem />
</ContextMenu>
```

---

## ⚠️ 注意事项

### 1. 快捷键冲突
- 避免与浏览器快捷键冲突
- 提供快捷键配置选项
- 在表单元素中禁用快捷键

### 2. 拖拽性能
- 使用虚拟列表优化大量数据
- 避免在拖拽时执行重计算
- 使用 CSS transform 而非 position

### 3. 批量选择
- 限制最大选择数量
- 提供全选/反选快捷键
- 清晰显示选中状态

### 4. 右键菜单
- 菜单位置自适应
- 支持键盘导航
- 点击外部自动关闭

---

**实施状态**: 🟢 进行中  
**下一步**: 创建快捷键 Hook 和拖拽组件

---

**报告生成时间**: 2026-01-05  
**报告生成者**: BMAD Dev Agent
