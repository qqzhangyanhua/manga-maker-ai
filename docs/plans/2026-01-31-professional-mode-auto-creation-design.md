# 专业创作模式 - 向导式一键生成设计方案

> 日期：2026-01-31
> 状态：已确认

## 背景

现有专业创作模式存在用户体验痛点：
- 每个阶段都要手动选模板
- 每个阶段都要手动填写输入（Textarea、Input）
- 用户不知道填什么，只能盯着空白框
- 四个阶段重复操作，体验割裂

## 目标

将专业创作模式改造为**向导式一键生成**：
- 用户只需选择类型，系统自动完成四阶段
- 每阶段提供 2-3 个方案供用户选择
- 选择后可编辑，手动确认进入下一阶段
- 最终预览汇总，支持回退任意阶段重做

## 核心流程

```
选类型 → [创意阶段: 3方案选1 → 可编辑 → 确认]
       → [设定阶段: 3方案选1 → 可编辑 → 确认]
       → [框架阶段: 3方案选1 → 可编辑 → 确认]
       → [创作阶段: 3方案选1 → 可编辑 → 确认]
       → 预览汇总 → 可回退任意阶段 → 创建项目
```

## 一、流程阶段变化

### 现有流程

```
genre_select → workflow → generating → result → (循环4次) → completing
```

### 新流程

```
genre_select → options_generating → options_select → editing → (循环4次) → preview → completing
```

### 新增阶段说明

| 阶段 | 职责 |
|-----|------|
| `options_generating` | 调用 AI 生成 3 个方案，显示 loading |
| `options_select` | 展示 3 个方案卡片，用户选择 1 个 |
| `editing` | 用户可编辑选中的方案，确认后进入下一 phase |
| `preview` | 四阶段全部完成后，汇总展示，支持回退重做 |

## 二、API 层设计

### 新增 API

| API | 端点 | 方法 | 说明 |
|-----|------|------|------|
| `generateOptions` | `/workflow/{id}/generate-options` | POST | 生成 3 个方案 |
| `selectOption` | `/workflow/{id}/select-option` | POST | 选中某个方案并保存 |
| `redoPhase` | `/workflow/{id}/redo-phase` | POST | 回退到指定阶段重做 |

### generateOptions

```typescript
// 请求：无需用户输入，后端根据 session 上下文自动生成
POST /api/novel/workflow/{session_id}/generate-options

// 响应
{
  options: [
    { id: "opt_1", content: "方案1内容...", summary: "一句话摘要" },
    { id: "opt_2", content: "方案2内容...", summary: "一句话摘要" },
    { id: "opt_3", content: "方案3内容...", summary: "一句话摘要" }
  ],
  phase: "creative"
}
```

### selectOption

```typescript
// 请求
POST /api/novel/workflow/{session_id}/select-option
{
  option_id: "opt_1",
  edited_content: "用户可能编辑后的内容"  // 可选，未编辑则为空
}

// 响应
{
  saved: true,
  current_phase: "creative",
  completed_phases: ["creative"]
}
```

### redoPhase

```typescript
// 请求
POST /api/novel/workflow/{session_id}/redo-phase
{
  phase: "creative"
}

// 响应
{
  current_phase: "creative",
  completed_phases: []
}
```

### 设计要点

- `generateOptions` 不需要用户输入，后端基于已完成阶段的结果自动构建 prompt
- 每个方案带 `summary` 字段，用于卡片展示标题
- `selectOption` 支持传入编辑后内容，一次调用完成"选择+保存"

## 三、前端组件设计

### 新增组件

```
stages/
├── OptionsGenerating.tsx   # 方案生成中 loading
├── OptionsSelect.tsx       # 3 个方案卡片选择
├── Editing.tsx             # 编辑选中方案
├── Preview.tsx             # 四阶段汇总预览
```

### OptionsSelect 组件结构

```
┌─────────────────────────────────────────────────────────┐
│  创意阶段 - 选择你喜欢的方向                              │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │  方案 A     │ │  方案 B     │ │  方案 C     │        │
│  │             │ │             │ │             │        │
│  │ [摘要标题]  │ │ [摘要标题]  │ │ [摘要标题]  │        │
│  │             │ │             │ │             │        │
│  │ 预览文字... │ │ 预览文字... │ │ 预览文字... │        │
│  │             │ │             │ │             │        │
│  │   [选择]    │ │   [选择]    │ │   [选择]    │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                         │
│  [重新生成]                                              │
└─────────────────────────────────────────────────────────┘
```

### Editing 组件结构

```
┌─────────────────────────────────────────────────────────┐
│  创意阶段 - 编辑确认                                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │  [Textarea: 选中方案内容，可编辑]               │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [返回重选]                        [确认，进入下一阶段]   │
└─────────────────────────────────────────────────────────┘
```

### Preview 组件结构

```
┌─────────────────────────────────────────────────────────┐
│  创作完成 - 预览汇总                                      │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✓ 创意阶段                              [重做]   │   │
│  │   "都市异能，普通上班族获得..."                   │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ ✓ 设定阶段                              [重做]   │   │
│  │   主角：李默，28岁程序员...                       │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ ✓ 框架阶段                              [重做]   │   │
│  │   第一卷：觉醒篇（共12章）...                     │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ ✓ 创作阶段                              [重做]   │   │
│  │   第一章开头：凌晨三点的写字楼...                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  项目名称: [________________]                            │
│                                                         │
│  [取消]                                   [创建项目]     │
└─────────────────────────────────────────────────────────┘
```

## 四、状态机改造

### types.ts 改动

```typescript
// DialogStage 新增阶段
export type DialogStage =
  | "genre_select"
  | "options_generating"  // 新增
  | "options_select"      // 新增
  | "editing"             // 新增
  | "preview"             // 新增
  | "completing"
  | "session_expired";

// 删除的阶段
// - "workflow"      → 被 options_select 替代
// - "generating"    → 被 options_generating 替代
// - "result"        → 被 editing 替代

// WorkflowState 新增字段
export interface WorkflowState {
  // ... 现有字段保留 ...

  // 新增
  generatedOptions: GeneratedOption[];  // 3 个方案
  selectedOptionId: string | null;      // 选中的方案 ID
  editingContent: string;               // 编辑中的内容
  phaseResults: PhaseResult[];          // 四阶段结果汇总
}

// 新增类型
export interface GeneratedOption {
  id: string;
  content: string;
  summary: string;
}

export interface PhaseResult {
  phase: string;
  phaseName: string;
  content: string;
  summary: string;
}
```

### WorkflowAction 新增

```typescript
export type WorkflowAction =
  // ... 现有 action 保留 ...

  // 新增
  | { type: "GENERATE_OPTIONS_SUCCESS"; payload: GeneratedOption[] }
  | { type: "SELECT_OPTION"; payload: { id: string; content: string } }
  | { type: "SET_EDITING_CONTENT"; payload: string }
  | { type: "CONFIRM_PHASE"; payload: PhaseResult }
  | { type: "REDO_PHASE"; payload: string }  // phase name
  | { type: "REGENERATE_OPTIONS" };
```

### 状态转换图

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  genre_select ──[startWorkflow]──→ options_generating       │
│                                           │                 │
│                          [generateOptions success]          │
│                                           ↓                 │
│                                    options_select           │
│                                      │       │              │
│                      [SELECT_OPTION] ↓       ↓ [REGENERATE] │
│                                   editing    │              │
│                                      │       │              │
│                                      ↓───────┘              │
│                         [CONFIRM_PHASE]                     │
│                              │                              │
│              ┌───────────────┴───────────────┐              │
│              ↓                               ↓              │
│    (还有未完成阶段)                    (4阶段全部完成)        │
│    options_generating                   preview             │
│                                           │                 │
│                              ┌────────────┴─────────────┐   │
│                              ↓                          ↓   │
│                        [REDO_PHASE]              [完成创建]  │
│                    options_generating            completing │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### reducer 关键逻辑

```typescript
case "GENERATE_OPTIONS_SUCCESS":
  return {
    ...state,
    stage: "options_select",
    generatedOptions: action.payload,
    loading: false,
  };

case "SELECT_OPTION":
  return {
    ...state,
    stage: "editing",
    selectedOptionId: action.payload.id,
    editingContent: action.payload.content,
  };

case "CONFIRM_PHASE":
  const newPhaseResults = [...state.phaseResults, action.payload];
  const isAllComplete = newPhaseResults.length === 4;
  return {
    ...state,
    stage: isAllComplete ? "preview" : "options_generating",
    phaseResults: newPhaseResults,
    generatedOptions: [],
    selectedOptionId: null,
    editingContent: "",
  };

case "REDO_PHASE":
  return {
    ...state,
    stage: "options_generating",
    phaseResults: state.phaseResults.filter(r => r.phase !== action.payload),
    // 后端也需要回退到对应阶段
  };
```

## 五、改动范围

### 前端改动文件

| 文件 | 操作 | 说明 |
|-----|------|------|
| `types.ts` | 修改 | 新增 Stage、State 字段、Action 类型 |
| `api.ts` | 修改 | 新增 generateOptions、selectOption、redoPhase |
| `useWorkflowMachine.ts` | 修改 | reducer 新增 case 处理 |
| `index.tsx` | 修改 | renderContent 新增阶段分支 |
| `stages/OptionsGenerating.tsx` | 新增 | loading 组件 |
| `stages/OptionsSelect.tsx` | 新增 | 方案选择卡片 |
| `stages/Editing.tsx` | 新增 | 编辑确认组件 |
| `stages/Preview.tsx` | 新增 | 预览汇总组件 |
| `stages/Workflow.tsx` | 删除 | 不再需要 |
| `stages/Generating.tsx` | 删除 | 被 OptionsGenerating 替代 |
| `stages/Result.tsx` | 删除 | 被 Editing 替代 |

### 后端改动（Python FastAPI）

| 端点 | 操作 | 说明 |
|-----|------|------|
| `POST /workflow/{id}/generate-options` | 新增 | 生成 3 个方案 |
| `POST /workflow/{id}/select-option` | 新增 | 保存选中方案 |
| `POST /workflow/{id}/redo-phase` | 新增 | 回退到指定阶段 |
| `POST /workflow/{id}/execute` | 保留 | 可复用内部逻辑 |

## 六、实施步骤

```
Phase 1: 后端 API（先有接口才能联调）
├── 1.1 新增 generate-options 端点
├── 1.2 新增 select-option 端点
├── 1.3 新增 redo-phase 端点
└── 1.4 调整 session 状态管理逻辑

Phase 2: 前端类型和状态机
├── 2.1 更新 types.ts（新类型定义）
├── 2.2 更新 api.ts（新 API 封装）
└── 2.3 更新 useWorkflowMachine.ts（reducer）

Phase 3: 前端组件
├── 3.1 新增 OptionsGenerating.tsx
├── 3.2 新增 OptionsSelect.tsx
├── 3.3 新增 Editing.tsx
├── 3.4 新增 Preview.tsx
└── 3.5 更新 index.tsx（renderContent）

Phase 4: 清理和测试
├── 4.1 删除旧组件（Workflow/Generating/Result）
├── 4.2 端到端测试完整流程
└── 4.3 处理边界情况（网络错误、会话过期等）
```
