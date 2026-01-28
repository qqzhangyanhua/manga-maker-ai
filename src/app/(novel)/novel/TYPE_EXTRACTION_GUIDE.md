# 类型定义抽离指南

## 概述

本文档说明 `src/app/(novel)/novel` 目录下类型定义的组织结构和抽离规范。

## 已完成的工作

### 1. 创建的共享类型文件

#### ✅ `components/InfiniteCanvas/shared-types.ts`
包含跨多个组件共享的业务数据类型:
- `ComicStyle` - 漫画风格
- `ChapterCharacter` - 章节角色
- `NovelCharacter` - 小说角色
- `SelectableCharacter` - 可选角色
- `ShotImageCharacterInput` - 分镜角色输入
- `NineGridImage` - 九宫格图片
- `ProgressEvent`, `ImageEvent`, `CompletedEvent` - SSE 事件
- `CharacterWithPrompts` - 带 Prompt 的角色
- `PromptInfo` - Prompt 信息
- `GenerationParams` - 生成参数
- `GeneratingChapter` - 生成中的章节

#### ✅ `components/InfiniteCanvas/detail-panel-types.ts`
包含详情面板相关的业务数据类型:
- `ShotDetailResponse` - 分镜详情响应
- `GenerateShotImagePayload` - 分镜生成载荷
- `SceneImage`, `SceneDetailResponse` - 场景相关
- `ScriptSegment`, `ScriptDetailResponse` - 剧本相关
- `ComicPanel`, `FinalDetailResponse` - 最终漫画相关

#### ✅ `components/InfiniteCanvas/nodes-types.ts`
包含 React Flow 节点数据类型:
- `ChapterHeaderNodeData` - 章节标题节点
- `ScriptNodeData` - 剧本节点
- `ShotNodeData` - 分镜节点
- `SceneNodeData` - 场景节点
- `FinalNodeData` - 最终漫画节点

#### ✅ `type.ts` (根目录)
统一导出所有子模块类型的汇总文件

### 2. 已修改的文件示例

- ✅ `components/InfiniteCanvas/ShotNineGridDialog.tsx`
- ✅ `components/InfiniteCanvas/DetailPanel/ShotGroupSection.tsx`
- ✅ `components/InfiniteCanvas/CharacterLibraryDrawer.tsx`
- ✅ `components/InfiniteCanvas/GenerationProgress.tsx`

## 待完成的工作

### 高优先级 (需立即处理)

1. **DetailPanel 组件** (约 4 个文件)
   - `ShotDetailPanel.tsx` - 使用 `@prisma/client` 的 ShotDesign
   - `SceneDetailPanel.tsx`
   - `ScriptDetailPanel.tsx`
   - `FinalDetailPanel.tsx`

2. **Nodes 组件** (约 5 个文件)
   - `nodes/ShotNode.tsx`
   - `nodes/ScriptNode.tsx`
   - `nodes/SceneNode.tsx`
   - `nodes/FinalNode.tsx`
   - `nodes/ChapterHeaderNode.tsx`

3. **对话框组件** (约 10 个文件)
   - `PromptRefineDialog.tsx`
   - `GenerateShotImageDialog.tsx`
   - `GenerateSceneDialog.tsx`
   - `GenerateFinalDialog.tsx`
   - `AddChapterDialog.tsx`
   - `ShotCharacterBindingPanel.tsx`
   - `CharacterPromptEditorDialog.tsx`
   - `UpgradeNovelCharacterDialog.tsx`
   - `ChapterCharacterDialog.tsx`
   等

### 中优先级 (逐步优化)

4. **项目页面组件** (`[id]/components/` 约 30 个文件)
   - `CharacterManager.tsx`
   - `ChapterEditor.tsx`
   - `BatchDeleteDialog.tsx`
   - `OutlineEditor.tsx`
   - `GenerateCharactersDialog.tsx`
   等

5. **世界设定组件** (`[id]/components/world/` 约 10 个文件)
   - `WorldEntriesTab.tsx`
   - `ForeshadowingTab.tsx`
   - `ExtractWorldEntriesDialog.tsx`
   等

### 低优先级 (可选)

6. **通用组件** (约 10 个文件)
   - `EditorToolbar.tsx`
   - `SaveIndicator.tsx`
   - `ErrorState.tsx`
   - `ErrorBoundary.tsx`
   等

## 类型抽离规范

### 1. Props 接口处理

#### 保留在组件文件内的情况:
```typescript
// ✅ 组件私有,简单的 Props
interface MyComponentProps {
  title: string;
  onClose: () => void;
}
```

#### 需要抽离的情况:
```typescript
// ❌ 跨文件共享的 Props
// 应抽离到对应的 types.ts

// ❌ 包含复杂业务数据的 Props
// 业务数据类型应先抽离,然后 Props 引用
```

### 2. 业务数据类型处理

#### 必须抽离:
```typescript
// ❌ 所有业务数据类型都应抽离
interface Character { ... }
interface ChapterOutline { ... }
interface ComicStyle { ... }

// ✅ 正确做法
import type { Character, ChapterOutline } from "../../type";
```

#### 避免重复定义:
```typescript
// ❌ 错误: 重复定义
// File A
interface ChapterOutline { ... }

// File B  
interface ChapterOutline { ... }

// ✅ 正确: 统一使用
import type { ChapterOutline } from "../../[id]/types";
```

### 3. Prisma 类型使用

优先使用 Prisma 生成的类型:
```typescript
// ✅ 正确
import type { ShotDesign, Character } from "@prisma/client";

// ❌ 错误: 重复定义 Prisma 已有的类型
interface ShotDesign {
  id: string;
  shot_order: number;
  // ...
}
```

### 4. 类型文件命名规范

- 模块根目录: `types.ts` 或 `type.ts`
- 共享类型: `shared-types.ts`
- 特定功能: `{feature}-types.ts` (如 `detail-panel-types.ts`)

## 迁移步骤模板

### 步骤 1: 识别类型定义

```typescript
// 找出所有 interface 和 type 定义
interface MyData { ... }
type MyType = ...
```

### 步骤 2: 判断是否需要抽离

- Props 接口: 简单的保留,复杂的抽离
- 业务数据类型: 必须抽离
- 已有 Prisma 类型: 直接使用

### 步骤 3: 抽离到对应的 types.ts

```typescript
// shared-types.ts
export interface MyData {
  // ...
}

export type MyType = ...
```

### 步骤 4: 修改原文件

```typescript
// 删除内联定义,添加导入
import type { MyData, MyType } from "./shared-types";

// Props 接口保留
interface MyComponentProps {
  data: MyData; // 使用导入的类型
  onClose: () => void;
}
```

### 步骤 5: 验证类型检查

```bash
npm run type-check
```

## 批量处理建议

由于涉及 100+ 文件,建议:

1. **按模块逐步处理**
   - 先完成 InfiniteCanvas (已部分完成)
   - 再处理项目页面
   - 最后处理通用组件

2. **使用自动化工具**
   - 考虑编写脚本批量替换简单模式
   - 复杂逻辑手动处理

3. **持续验证**
   - 每完成一个模块运行 `npm run type-check`
   - 确保不引入类型错误

## 已知问题和注意事项

1. **GenerationProgress.tsx 的 GeneratingChapter**
   - 与 `shared-types.ts` 中的定义字段不同
   - 已重命名为 `GeneratingChapterLocal` 避免冲突

2. **ShotDesign 类型**
   - 优先使用 `@prisma/client` 的类型
   - 某些组件有扩展字段,需要使用交叉类型:
     ```typescript
     import type { ShotDesign } from "@prisma/client";
     
     type ExtendedShotDesign = ShotDesign & {
       additionalField?: string;
     };
     ```

3. **Props 命名约定**
   - 统一使用 `{ComponentName}Props` 格式
   - 例如: `ShotDetailPanelProps`, `CharacterCardProps`

## 进度跟踪

- ✅ 已创建共享类型文件 (4 个)
- ✅ 已修改示例组件 (4 个)
- ⏳ 待修改 DetailPanel 组件 (4 个)
- ⏳ 待修改 Nodes 组件 (5 个)
- ⏳ 待修改对话框组件 (约 10 个)
- ⏳ 待修改项目页面组件 (约 30 个)
- ⏳ 待修改通用组件 (约 10 个)

**总进度**: 约 8 / 100+ 文件 (8%)

## 下一步行动

建议按以下顺序继续:

1. 完成 DetailPanel 组件 (高优先级)
2. 完成 Nodes 组件 (高优先级)
3. 完成对话框组件 (中优先级)
4. 逐步完成项目页面组件 (中优先级)
5. 最后完成通用组件 (低优先级)

每完成一个模块,运行类型检查确保无错误。
