# 专注模式重构 - 立即修复

## 执行时间
2026-01-06

## 🎯 修复目标

根据架构分析，立即修复专注模式的以下问题：

1. **集成 ScriptOperationsProvider** - 统一业务逻辑
2. **创建 usePanelImageGeneration Hook** - 共享图片生成逻辑
3. **简化 FocusModeContext** - 只保留 UI 状态
4. **统一类型系统** - 使用 Prisma 类型替代 @/types
5. **测试验证** - 确保功能完整性

## ✅ 已完成的工作

### 1. 集成 ScriptOperationsProvider ✅

**文件**: `src/app/scripts/[id]/focus/page.tsx`

```typescript
// 修改前
<ScriptDataProvider storyId={storyId}>
  <FocusModePageContent />
</ScriptDataProvider>

// 修改后
<ScriptDataProvider storyId={storyId}>
  <ScriptOperationsProvider>
    <FocusModePageContent />
  </ScriptOperationsProvider>
</ScriptDataProvider>
```

**影响**:
- 专注模式现在可以访问批量操作、错误处理等统一机制
- 为后续集成业务逻辑打下基础

### 2. 创建共享图片生成 Hook ✅

**文件**: `src/app/scripts/[id]/hooks/usePanelImageGeneration.ts`

**功能**:
```typescript
export function usePanelImageGeneration(options: UseImageGenerationOptions = {}) {
  return {
    isGenerating,
    generationProgress,
    previewImageUrl,
    generateImage,      // 生成单个面板图片
    cancelGeneration,   // 取消生成
    resetPreview,       // 重置预览图
  };
}
```

**优势**:
- 主页面和专注模式共享同一逻辑
- 统一 API 调用（`/api/panel/generate`）
- 统一错误处理和 Toast 提示

### 3. 简化 FocusModeContext ✅

**文件**: `src/app/scripts/[id]/contexts/FocusModeContext.tsx`

**重构前** (356 行):
- 包含完整的图片生成逻辑（105-170行）
- 包含 Panel 更新逻辑（178-242行）
- 包含错误处理和 Toast（分散各处）

**重构后** (204 行，-43%):
- **只保留 UI 状态**：导航、配置、预览
- **移除业务逻辑**：生成、更新、删除全部标记为占位符
- **移除重复 props**：不再需要 `storyId`, `projectId`, `onPanelUpdate`

**关键变化**:
```typescript
// FocusModeProvider Props
interface FocusModeProviderProps {
  children: React.ReactNode;
  panels: Panel[];              // ✅ 保留
  chapters: Chapter[];          // ✅ 保留
  characters: Character[];      // ✅ 保留
  initialPanelId?: string | null; // ✅ 保留
  onExit: () => void;           // ✅ 保留
  // ❌ 移除: storyId, projectId, onPanelUpdate
}

// Context 值
const contextValue: FocusModeContextValue = {
  state,                        // UI 状态
  actions,                      // 占位符操作
  panels, chapters, characters, // 数据源
  isLoading: false,
  setPreviewImage,              // ✅ 新增：预览控制
  toggleShowOriginal,           // ✅ 新增：切换原图
};
```

### 4. 统一类型系统 ⚠️ 进行中

**已修复**:
- ✅ `src/app/scripts/[id]/components/FocusMode/types.ts` - 使用 Prisma 类型
- ✅ `src/app/scripts/[id]/components/FocusMode/index.tsx` - 更新 Props
- ✅ `src/app/scripts/[id]/components/FocusMode/FocusModeLayout.tsx` - 新增 onPanelUpdate
- ✅ `src/app/scripts/[id]/components/FocusMode/ChapterPanelNav.tsx` - 使用 Prisma Panel/Chapter
- ✅ `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx` - 修正 ReferenceImage 导入
- ✅ `src/app/scripts/[id]/contexts/FocusModeContext.tsx` - 使用 Prisma Panel/Chapter/Character

**待修复的类型错误**:

1. **字段名不匹配** (ChapterPanelNav.tsx):
   - Prisma Panel: `generated_image`（字符串）
   - 组件期望: `image_url`（字符串）
   - **修复方案**: 更新组件代码使用 `generated_image`

2. **字段名不匹配** (PanelConfigSidebar.tsx):
   - Prisma Character: `reference_image`
   - 组件期望: `reference_image_url`
   - **修复方案**: 更新组件代码使用 `reference_image`

3. **ReferenceImage 类型不匹配**:
   - FocusMode/types.ts 定义包含 `source_type`
   - @/types/reference-image.types.ts 不包含 `source_type`
   - **修复方案**: 使用 FocusMode/types.ts 的定义

## 🔧 待完成的修复

### 任务 4.1: 修复 ChapterPanelNav 字段引用

**文件**: `src/app/scripts/[id]/components/FocusMode/ChapterPanelNav.tsx`

**错误**:
```
Property 'image_url' does not exist on type 'Panel'
Property 'image_generation_status' does not exist on type 'Panel'
```

**修复**:
```typescript
// 替换所有 panel.image_url -> panel.generated_image
<img src={panel.generated_image || "/placeholder.png"} />

// 注意：Panel 模型没有 image_generation_status 字段
// 需要从 prompt_used 或其他字段推断状态
const hasImage = !!panel.generated_image;
```

### 任务 4.2: 修复 PanelConfigSidebar 字段引用

**文件**: `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx`

**错误**:
```
Property 'reference_image_url' does not exist on type 'Character'
Did you mean 'reference_image'?
```

**修复**:
```typescript
// 替换所有 character.reference_image_url -> character.reference_image
const referenceImage = character.reference_image;
```

### 任务 4.3: 更新 ReferenceImageSelector 集成

**文件**: `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx` (line 455)

**错误**:
```
Property 'source_type' is missing in type
```

**修复方案**:
1. 确保传递给 ReferenceImageSelector 的数据符合 FocusMode/types.ts 定义
2. 或者在适配层添加 source_type 字段

### 任务 5: 集成 usePanelImageGeneration Hook

**目标**: 让专注模式使用新的共享 Hook

**修改文件**: `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx`

**实现**:
```typescript
import { usePanelImageGeneration } from "../../hooks/usePanelImageGeneration";
import { useScriptData } from "../../providers/ScriptDataProvider";

export function PanelConfigSidebar({ ... }) {
  const { state, actions } = useFocusMode();
  const { refetchAll } = useScriptData();

  // 使用共享 Hook
  const {
    isGenerating,
    previewImageUrl,
    generateImage
  } = usePanelImageGeneration({
    onSuccess: (imageUrl) => {
      actions.setPreviewImage?.(imageUrl);
    },
    onPanelUpdate: refetchAll
  });

  // 按钮点击
  const handleGenerate = async () => {
    if (!state.currentPanel) return;
    await generateImage(state.currentPanel.id, state.config);
  };

  return (
    <Button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? "生成中..." : "生成图片"}
    </Button>
  );
}
```

### 任务 6: 更新 Panel 编辑逻辑

**目标**: 使用 ScriptOperationsProvider 或创建专用 Hook

**方案 A**: 直接使用 API（当前方式，保持简单）
```typescript
const updatePanelDescription = async (description: string) => {
  const response = await fetch(`/api/panel/${panelId}`, {
    method: "PATCH",
    body: JSON.stringify({ description })
  });
  // ... 错误处理
  refetchAll(); // 使用 ScriptDataProvider
};
```

**方案 B**: 创建专用 Hook
```typescript
// src/app/scripts/[id]/hooks/usePanelUpdate.ts
export function usePanelUpdate() {
  const { refetchAll } = useScriptData();

  const updatePanel = async (panelId: string, data: Partial<Panel>) => {
    // ... API 调用
    await refetchAll();
  };

  return { updatePanel };
}
```

## 📊 重构前后对比

| 指标 | 重构前 | 重构后 | 改进 |
|------|-------|-------|------|
| **FocusModeContext 行数** | 356 行 | 204 行 | ⬇️ 43% |
| **业务逻辑位置** | FocusModeContext | Provider + Hook | ✅ 分离 |
| **代码复用** | 重复实现 | 共享 Hook | ✅ 提升 |
| **类型系统** | @/types (混乱) | Prisma 类型 | ✅ 统一 |
| **Provider 集成** | 缺失 | 完整 | ✅ 完整 |

## 🐛 已知问题

1. **Panel 字段名不统一**
   - 原因：Prisma schema 使用 `generated_image`，但组件期望 `image_url`
   - 影响：ChapterPanelNav, PanelConfigSidebar 无法正确显示图片
   - 状态：待修复（任务 4.1, 4.2）

2. **image_generation_status 字段缺失**
   - 原因：Panel 模型没有此字段
   - 影响：无法显示生成状态
   - 方案：用 `generated_image` 存在与否判断

3. **ReferenceImage 类型冲突**
   - 原因：两个地方定义了不同的 ReferenceImage 类型
   - 影响：类型检查失败
   - 状态：待修复（任务 4.3）

## 🚀 下一步行动

### 立即执行（优先级：P0）

1. **修复字段引用**
   - [ ] ChapterPanelNav: `image_url` → `generated_image`
   - [ ] PanelConfigSidebar: `reference_image_url` → `reference_image`
   - [ ] 移除对 `image_generation_status` 的引用

2. **类型检查通过**
   - [ ] 运行 `npx tsc --noEmit`
   - [ ] 确保 0 错误

### 后续优化（优先级：P1）

3. **集成 usePanelImageGeneration**
   - [ ] 更新 PanelConfigSidebar 使用 Hook
   - [ ] 移除 FocusModeContext 中的占位符
   - [ ] 测试图片生成功能

4. **功能测试**
   - [ ] 测试专注模式路由跳转
   - [ ] 测试面板导航（上一个/下一个）
   - [ ] 测试图片生成
   - [ ] 测试 Panel 描述/提示词更新

## 💡 Linus 评审

**当前状态**: "架构方向正确，但还有细节需要修复"

**评价**:
> "好。你消除了重复代码，统一了 Provider 架构。FocusModeContext 从 356 行减到 204 行，这是正确的方向。
>
> 但是你遇到的类型错误告诉我们：**数据模型是核心，UI 是次要的**。Prisma schema 定义了 `generated_image`，那就全部用 `generated_image`，不要在组件里期望 `image_url`。
>
> 字段名不统一是 bad taste 的标志。要么改 schema（破坏性），要么改组件（安全）。我们选后者。
>
> 继续修复类型错误，让类型检查通过。然后测试。代码能跑比理论完美重要。"

---

**作者**: Claude (Linus Mode)
**日期**: 2026-01-06
**状态**: 🔧 进行中 - 类型修复阶段
