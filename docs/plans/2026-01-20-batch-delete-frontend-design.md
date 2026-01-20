# 批量删除章节 - 前端 UI 设计文档

**日期**: 2026-01-20
**作者**: Claude (Brainstorming)
**状态**: Approved

## 概述

为小说编辑器实现批量删除章节功能，采用明确的选择模式切换和两步确认流程，确保操作安全且不干扰现有的单选编辑流程。

## 背景

- 后端 API 已实现：`POST /api/novel/batch/delete` 支持软删除和硬删除
- `useBatchSelection` Hook 已实现但未使用
- 现有 `BatchImportDialog` 可作为参考
- `ChapterList` 目前仅支持单选章节进行编辑

## 设计目标

1. **清晰的交互模式**：明确的选择模式切换，避免误触
2. **安全的删除流程**：两步确认 + 软删除/硬删除选项
3. **良好的用户体验**：完整的错误处理和边界情况处理
4. **可扩展性**：为未来批量生成功能预留扩展点

## 架构设计

### 组件结构

**新建组件**:

1. **`BatchDeleteDialog.tsx`** - 批量删除确认对话框
   - 显示待删除章节列表
   - 软删除/硬删除选项切换
   - 警告文案和确认按钮

2. **`BatchOperationToolbar.tsx`** - 批量操作工具栏
   - 显示选中数量
   - 删除按钮、取消选择按钮
   - 为批量生成预留扩展点

**修改现有组件**:

1. **`ChaptersTab.tsx`**
   - 添加"选择"/"完成"按钮切换模式
   - 管理选择模式状态
   - 集成工具栏和删除对话框

2. **`ChapterList.tsx`**
   - 集成 `useBatchSelection` hook
   - 根据模式显示/隐藏复选框
   - 支持 Shift+Click 范围选择

### 数据流

```
用户点击"选择"按钮
  → ChaptersTab 设置 selectionMode = true
  → ChapterList 显示复选框
  → 用户勾选章节
  → useBatchSelection 管理选中状态
  → 显示 BatchOperationToolbar
  → 点击删除按钮
  → 打开 BatchDeleteDialog
  → 用户确认 + 选择删除类型
  → 调用 API /api/novel/batch/delete
  → 成功后刷新列表 + 退出选择模式
```

## 详细设计

### 1. BatchDeleteDialog 组件

**文件路径**: `src/app/(novel)/novel/[id]/components/BatchDeleteDialog.tsx`

**Props 接口**:
```typescript
interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedChapters: Array<{
    id: string;
    title: string;
    chapterNumber: number;
  }>;
  onConfirm: (chapterIds: string[], softDelete: boolean) => Promise<void>;
}
```

**UI 结构**:
- **Header**: "批量删除章节" + 选中数量徽章
- **章节列表**: ScrollArea 显示待删除章节（标题 + 章节号）
- **删除模式选择**: Radio Group
  - 软删除（默认）: "标记为已删除（可恢复）"
  - 硬删除: "永久删除（不可恢复）" + 红色警告图标
- **警告文案**: 根据删除模式动态显示
- **Footer**: "取消" + "确认删除" 按钮（硬删除时按钮为红色）

**状态管理**:
- `deleteMode`: 'soft' | 'hard' (默认 'soft')
- `isDeleting`: boolean (加载状态)

### 2. BatchOperationToolbar 组件

**文件路径**: `src/app/(novel)/novel/[id]/components/BatchOperationToolbar.tsx`

**Props 接口**:
```typescript
interface BatchOperationToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}
```

**UI 布局**:
- 固定在章节列表上方的工具栏
- 左侧: 选中数量提示 "已选择 X 个章节"
- 右侧: 操作按钮组
  - "取消" 按钮（Outline variant）
  - "删除" 按钮（Destructive variant，红色）
- 使用 `novelTheme` 保持视觉一致性

### 3. ChaptersTab 修改

**新增状态**:
```typescript
const [selectionMode, setSelectionMode] = useState(false);
const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
const {
  selectedIds,
  clearSelection,
  exitSelectionMode,
  toggleSelection,
  selectRange,
  isSelected,
} = useBatchSelection();
```

**UI 修改**:
- 章节列表 Header 右侧按钮组：
  - selectionMode = false: "批量导入" + "选择" + "创建"
  - selectionMode = true: "完成" + "创建"
- 有选中章节时显示 `BatchOperationToolbar`
- 集成 `BatchDeleteDialog`

**删除处理函数**:
```typescript
const handleBatchDelete = async (
  chapterIds: string[],
  softDelete: boolean
) => {
  try {
    const response = await fetch('/api/novel/batch/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapter_ids: chapterIds,
        soft_delete: softDelete,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.detail || '删除失败');
    }

    toast.success(`已删除 ${chapterIds.length} 个章节`);

    // 如果删除了当前编辑的章节，清空选中状态
    if (selectedChapter && chapterIds.includes(selectedChapter.id)) {
      onSelectChapter(null);
    }

    onRefresh?.();
    exitSelectionMode();
    setBatchDeleteOpen(false);
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : '删除失败，请重试'
    );
  }
};
```

### 4. ChapterList 修改

**新增 Props**:
```typescript
interface ChapterListProps {
  chapters: ChapterOutline[];
  selectedChapter: ChapterOutline | null;
  onSelect: (chapter: ChapterOutline) => void;
  loading: boolean;
  genre?: string;
  // 新增
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelection?: (chapterId: string, event: React.MouseEvent) => void;
}
```

**UI 变化**:
- selectionMode = true 时，每个章节项左侧显示 Checkbox
- Checkbox 使用 `selectedIds?.includes(chapter.id)` 判断选中状态
- 点击章节项时的行为：
  - 如果 selectionMode = true，触发 `onToggleSelection(chapter.id, event)`
  - 否则触发原有的 `onSelect(chapter)`
- 保持现有的视觉样式（紫色高亮、字数统计、镜头预估）

## 错误处理

### API 调用失败

```typescript
try {
  const response = await fetch('/api/novel/batch/delete', {...});
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.detail || '删除失败');
  }
} catch (error) {
  toast.error(error instanceof Error ? error.message : '删除失败，请重试');
  // 保持对话框打开，允许用户重试
}
```

### 权限验证

- 后端验证章节属于当前用户项目
- 前端显示 401/403 时提示"无权限删除这些章节"

## 边界情况处理

### 1. 空选择
- `BatchOperationToolbar` 仅在 `selectedCount > 0` 时渲染
- 删除按钮在 `selectedIds.length === 0` 时禁用

### 2. 删除当前正在编辑的章节
- 删除成功后检查 `selectedChapter?.id` 是否在删除列表中
- 如果是，清空当前选中章节（显示空状态）

### 3. 删除所有章节
- 允许删除所有章节
- 删除后显示"暂无章节"空状态

### 4. 并发操作
- 删除进行中时，通过 `isDeleting` 状态禁用所有操作按钮
- 显示 Loading 图标

### 5. 快速退出
- 点击"完成"或"取消"按钮时，立即清空选择并退出模式
- 关闭 `BatchDeleteDialog` 时不清空选择（允许重新打开）

## 测试策略

### 手动测试清单

1. ✅ 进入/退出选择模式功能正常
2. ✅ 单选、Shift+范围选择功能正常
3. ✅ 批量删除对话框正确显示待删除章节
4. ✅ 软删除和硬删除都能正常工作
5. ✅ 删除成功后列表刷新，选择模式退出
6. ✅ 删除当前编辑的章节后，编辑器正确清空
7. ✅ API 错误时显示正确的错误提示
8. ✅ 删除进行中时按钮正确禁用

### API 测试

- 确认后端 `/api/novel/batch/delete` 端点可用
- 测试软删除和硬删除的不同行为
- 验证权限检查（无权删除他人章节）

## 实施步骤

### Phase 1: 创建新组件 (30-45 分钟)

1. 创建 `BatchDeleteDialog.tsx` - 删除确认对话框
2. 创建 `BatchOperationToolbar.tsx` - 批量操作工具栏

### Phase 2: 修改现有组件 (30-45 分钟)

3. 修改 `ChaptersTab.tsx` - 集成选择模式和新组件
4. 修改 `ChapterList.tsx` - 支持多选交互

### Phase 3: 测试与优化 (15-30 分钟)

5. 手动测试所有功能
6. 修复发现的问题
7. 优化用户体验细节

**预计总时间**: 1.5 - 2 小时

## 未来扩展

此设计为批量生成功能预留了扩展点：

1. **BatchOperationToolbar**: 可添加"批量生成"按钮
2. **useBatchSelection**: 可复用于批量生成的章节选择
3. **选择模式**: 可支持多种批量操作类型

批量生成实施时，只需：
- 创建 `BatchGenerateDialog.tsx`
- 在工具栏添加"生成"按钮
- 实现 SSE 流式进度显示

## 总结

这个设计方案实现了：
- ✅ 清晰的选择模式切换（不干扰现有单选编辑）
- ✅ 安全的两步删除确认流程
- ✅ 完整的错误处理和边界情况处理
- ✅ 为批量生成功能预留扩展点
- ✅ 保持与现有 UI 的视觉一致性
