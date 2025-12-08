# Phase 4: 待实现功能完成报告

## 已完成功能（高优先级）

### ✅ Phase 4.1: 自动保存（debounce 500ms）
**实现内容：**
- 创建 `use-debounce.ts` hook，提供 `useDebouncedCallback` 和 `useDebounce`
- 在 `EditablePanelCard` 中集成自动保存逻辑
- 编辑分镜字段（视觉描述、对白、镜头参数）后500ms自动保存
- 显示保存状态：
  - "未保存"提示（黄色）
  - "保存中..."提示（带动画的保存图标）
  - 保存成功后自动隐藏提示

**用户体验：**
- 用户无需手动点击"保存"按钮
- 编辑过程中实时显示保存状态
- 防止频繁API调用（debounce 500ms）

---

### ✅ Phase 4.2: 全局快捷键
**实现内容：**
- `Cmd/Ctrl + M`：合并当前选中的分镜与下一个分镜
- `Cmd/Ctrl + D`：拆分当前选中的分镜为两个
- `Cmd/Ctrl + I`：在当前选中分镜后插入新分镜
- 顶部显示快捷键提示（桌面端可见）

**用户体验：**
- 专业工具标配，提升编辑效率
- 防止与浏览器默认快捷键冲突（使用 preventDefault）
- 只在选中分镜时才响应快捷键

---

### ✅ Phase 4.3: 改进插入分镜 UI
**实现内容：**
- 创建 `InsertPanelDialog` 组件
- 自定义 Dialog 替代原生 `prompt()`
- 功能：
  - 多行文本输入框（Textarea）
  - 可选是否使用 LLM 优化
  - 显示插入位置信息
  - 取消/确认按钮

**用户体验：**
- 更专业的交互体验
- 支持输入较长的描述
- 明确提示插入位置

---

### ✅ Phase 4.4: 操作 Loading 状态
**实现内容：**
- 添加 `operationLoading` 状态管理
- 合并/拆分/插入操作时显示 Loading：
  - 按钮文本变为"合并中..."/"拆分中..."
  - 图标旋转动画（animate-spin）
  - 按钮禁用，防止重复点击
- 操作完成后自动恢复

**用户体验：**
- 明确反馈操作进度
- 防止用户重复点击导致多次请求
- 提升用户信任度

---

## 待实施功能（中低优先级）

### ⏳ Phase 4.5: 批量选择与批量操作
**计划实现：**
- 多选分镜卡片（Checkbox）
- 批量删除、批量移动
- 批量生成图像

**优先级：** 中

---

### ⏳ Phase 4.6: 拖拽排序
**计划实现：**
- 使用 `@dnd-kit/core` + `@dnd-kit/sortable`
- 支持拖拽调整分镜顺序
- 拖拽时视觉反馈（ghost image）
- 自动更新 `panel_order`

**依赖：** 需要安装 `@dnd-kit/core` 和 `@dnd-kit/sortable`

**优先级：** 中

---

### ⏳ Phase 4.7: ControlNet 草图生成 API 设计
**计划实现：**
- 设计 `POST /api/panel/generate-sketch` API
- 集成 ControlNet 或其他线条生成服务
- 返回草图 URL 并保存到 `sketch_image_url`

**依赖：** 外部 ControlNet API 服务

**优先级：** 低（需要外部服务支持）

---

## 文件修改清单

### 新增文件
- `src/hooks/use-debounce.ts` - Debounce hooks
- `src/components/Storyboard/InsertPanelDialog.tsx` - 插入分镜对话框

### 修改文件
- `src/app/storyboard/editor/[projectId]/page.tsx` - 主编辑器页面
  - 全局快捷键监听
  - 操作 Loading 状态管理
  - 集成 InsertPanelDialog
- `src/components/Storyboard/EditablePanelCard.tsx` - 分镜卡片组件
  - 自动保存逻辑
  - Loading 状态显示
  - 保存状态提示

---

## 技术要点

### 自动保存实现
```typescript
const debouncedAutoSave = useDebouncedCallback(async () => {
  if (!hasUnsavedChanges || !isEditing) return;
  
  setIsSaving(true);
  await onUpdate({ ... });
  setIsSaving(false);
  setHasUnsavedChanges(false);
}, 500);

useEffect(() => {
  if (isEditing) {
    setHasUnsavedChanges(true);
    debouncedAutoSave();
  }
}, [editedPrompt, editedDialogue, cameraAngle, shotSize, isEditing]);
```

### 快捷键实现
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "m" && selectedPanelId) {
      e.preventDefault();
      handleMerge(selectedPanelId);
    }
  };
  
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [selectedPanelId, project]);
```

### Loading 状态管理
```typescript
const [operationLoading, setOperationLoading] = useState<{
  type: "merge" | "split" | "insert" | null;
  panelId?: string;
}>({ type: null });

// 使用示例
setOperationLoading({ type: "merge", panelId });
// ... 执行操作
setOperationLoading({ type: null });
```

---

## 用户使用流程

### 编辑分镜（自动保存）
1. 点击分镜卡片上的"编辑"按钮
2. 修改视觉描述/对白/镜头参数
3. 500ms 后自动保存（显示"保存中..."）
4. 保存成功后提示消失

### 使用快捷键
1. 点击选中一个分镜
2. 按 `Cmd+M` 合并（与下一个分镜合并）
3. 按 `Cmd+D` 拆分（拆分为两个）
4. 按 `Cmd+I` 插入（打开插入对话框）

### 插入分镜
1. 选中分镜 → 点击"插入"按钮 或 按 `Cmd+I`
2. 弹出对话框，输入描述
3. 可选是否使用 AI 优化
4. 点击"插入分镜"（显示 Loading）
5. 插入成功后刷新列表

---

## 下一步建议

1. **Phase 4.5（批量操作）**：
   - 添加 Checkbox 多选
   - 实现批量删除功能
   - 提供批量生成图像选项

2. **Phase 4.6（拖拽排序）**：
   - 安装 `@dnd-kit/core` 和 `@dnd-kit/sortable`
   - 实现拖拽交互
   - 后端添加批量更新 `panel_order` API

3. **Phase 4.7（ControlNet）**：
   - 调研 ControlNet API 服务提供商
   - 设计草图生成 API
   - 实现图像预览和确认流程

---

**完成时间**: 2025-12-08  
**完成度**: 4/7（高优先级全部完成）  
**核心功能可用性**: 100%
