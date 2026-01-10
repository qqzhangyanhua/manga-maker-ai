# NineGridDialog 组件文档

## 概述

九宫格图片生成对话框，用于选择 9 个分镜并生成 3×3 布局的九宫格图片。

## 文件结构

```
components/
├── NineGridDialog.tsx          # 主对话框组件
├── PanelSelector.tsx           # 分镜选择器子组件
├── useNineGridDialog.ts        # 状态管理 Hook
├── types.ts                    # 类型定义
├── __tests__/
│   └── NineGridDialog.test.tsx # 测试用例
└── README.md                   # 本文档
```

## 快速开始

### 基本使用

```typescript
import { NineGridDialog } from "@/app/scripts/[id]/components/NineGridDialog";

function MyComponent() {
  const [open, setOpen] = useState(false);
  const chapters = [...]; // 章节数据
  
  return (
    <NineGridDialog
      open={open}
      onOpenChange={setOpen}
      storyId="story-id"
      projectId="project-id"
      chapters={chapters}
      onSuccess={() => {
        console.log("九宫格生成成功");
      }}
    />
  );
}
```

### Props 说明

```typescript
interface NineGridDialogProps {
  // 对话框打开状态
  open: boolean;
  
  // 对话框状态变化回调
  onOpenChange: (open: boolean) => void;
  
  // 故事 ID
  storyId: string;
  
  // 项目 ID（必须存在）
  projectId: string | null;
  
  // 章节列表
  chapters: Chapter[];
  
  // 生成成功回调
  onSuccess: () => void;
}
```

## 组件架构

### 1. NineGridDialog (主组件)

**职责**:
- 对话框布局和表单管理
- 章节、风格、参考图选择
- 表单提交和错误处理

**关键功能**:
- 表单验证（使用 zod + react-hook-form）
- 生成九宫格图片 API 调用
- 成功/失败状态处理

### 2. PanelSelector (子组件)

**职责**:
- 展示章节分镜列表
- 处理分镜选择交互
- 提供快捷操作（选择前9个、清空选择）

**Props**:
```typescript
interface PanelSelectorProps {
  panels: Panel[];              // 分镜列表
  selectedPanelIds: string[];   // 已选分镜 ID
  isLoading: boolean;           // 加载状态
  onPanelToggle: (panelId: string) => void;  // 切换选择
  onSelectFirst9: () => void;   // 选择前9个
  onClearSelection: () => void; // 清空选择
}
```

### 3. useNineGridDialog (状态管理 Hook)

**职责**:
- 集中管理对话框状态（使用 useReducer）
- 数据加载逻辑
- 事件处理器

**返回值**:
```typescript
{
  state: DialogState;           // 当前状态
  handlers: {
    handlePanelToggle: (panelId: string) => void;
    handleSelectFirst9: () => void;
    handleClearSelection: () => void;
    handleReset: () => void;
    setGenerating: (generating: boolean) => void;
  };
}
```

### 4. types.ts (类型定义)

**包含类型**:
- 数据模型: `Chapter`, `Panel`, `ComicStyle`, `CharacterAsset`
- 组件 Props: `NineGridDialogProps`, `PanelSelectorProps`
- 状态管理: `DialogState`, `DialogAction`
- 表单数据: `FormData`
- API 接口: `GenerateNineGridRequest`, `GenerateNineGridResponse`

## 状态管理

### 状态结构

```typescript
interface DialogState {
  // 数据加载状态
  chapterPanels: Panel[];
  isLoadingPanels: boolean;
  comicStyles: ComicStyle[];
  isLoadingStyles: boolean;
  characterAssets: CharacterAsset[];
  isLoadingAssets: boolean;
  
  // 选择状态
  selectedChapterId: string;
  selectedPanelIds: string[];
  
  // 生成状态
  isGenerating: boolean;
}
```

### Action 类型

```typescript
type DialogAction =
  | { type: "SET_CHAPTER"; chapterId: string }
  | { type: "SET_PANELS"; panels: Panel[] }
  | { type: "SET_LOADING_PANELS"; loading: boolean }
  | { type: "SET_STYLES"; styles: ComicStyle[] }
  | { type: "SET_LOADING_STYLES"; loading: boolean }
  | { type: "SET_ASSETS"; assets: CharacterAsset[] }
  | { type: "SET_LOADING_ASSETS"; loading: boolean }
  | { type: "TOGGLE_PANEL"; panelId: string }
  | { type: "SELECT_FIRST_9" }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_GENERATING"; generating: boolean }
  | { type: "RESET" };
```

## 数据流

### 1. 对话框打开
```
用户打开对话框
  ↓
加载漫画风格列表 (GET /api/comic-styles?enabled=true)
  ↓
加载角色素材列表 (GET /api/character)
```

### 2. 选择章节
```
用户选择章节
  ↓
加载章节分镜 (GET /api/chapter/{chapterId}/panels)
  ↓
自动选择前9个分镜（如果有足够分镜）
```

### 3. 生成九宫格
```
用户提交表单
  ↓
验证选择（必须恰好9个分镜）
  ↓
构建请求参数
  ↓
发送生成请求 (POST /api/chapter/{chapterId}/generate-nine-grid-image)
  ↓
显示成功/失败提示
  ↓
调用 onSuccess 回调
  ↓
关闭对话框
```

## API 接口

### 1. 获取章节分镜
```
GET /api/chapter/{chapterId}/panels

Response:
{
  panels: Panel[]
}
```

### 2. 获取漫画风格
```
GET /api/comic-styles?enabled=true

Response:
{
  data: ComicStyle[]
}
```

### 3. 获取角色素材
```
GET /api/character

Response:
{
  characters: CharacterAsset[]
}
```

### 4. 生成九宫格图片
```
POST /api/chapter/{chapterId}/generate-nine-grid-image

Request:
{
  project_id: string;
  panel_ids: string[];
  comic_style_id?: string;
  style_prompt?: string | null;
  reference_image?: string | null;
}

Response:
{
  success: boolean;
  error?: string;
  data?: {
    imageUrl: string;
  };
}
```

## 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 运行特定测试
pnpm test NineGridDialog
```

### 测试覆盖

- ✅ 组件渲染
- ✅ 数据加载
- ✅ 分镜选择
- ✅ 表单提交
- ✅ 错误处理
- ✅ 边界条件

## 最佳实践

### 1. 类型安全
```typescript
// ✅ 好的做法：使用明确的类型
import type { Chapter, Panel } from "./types";

const chapters: Chapter[] = [...];
const panels: Panel[] = [...];

// ❌ 避免使用 any
const data: any = [...]; // 不要这样做
```

### 2. 错误处理
```typescript
// ✅ 好的做法：完整的错误处理
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("请求失败");
  }
  const data = await response.json();
  // 处理数据
} catch (error) {
  console.error("错误:", error);
  toast({
    title: "错误",
    description: error instanceof Error ? error.message : "未知错误",
    variant: "destructive",
  });
}
```

### 3. 性能优化
```typescript
// ✅ 好的做法：使用 useCallback 缓存回调
const handleClick = useCallback(() => {
  // 处理点击
}, [依赖项]);

// ✅ 好的做法：使用 useMemo 缓存计算值
const filteredData = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);
```

## 常见问题

### Q1: 如何自定义分镜选择逻辑？

修改 `useNineGridDialog.ts` 中的 `handlePanelToggle` 函数：

```typescript
const handlePanelToggle = useCallback((panelId: string) => {
  // 自定义逻辑
  dispatch({ type: "TOGGLE_PANEL", panelId });
}, []);
```

### Q2: 如何添加新的表单字段？

1. 在 `types.ts` 中添加类型定义
2. 在 `NineGridDialog.tsx` 中更新表单 schema
3. 在表单中添加新的 FormField

### Q3: 如何修改自动选择逻辑？

修改 `useNineGridDialog.ts` 中的 `loadChapterPanels` 函数：

```typescript
// 自动选择前9个
if (panels.length >= 9) {
  dispatch({ type: "SELECT_FIRST_9" });
}
```

## 维护指南

### 添加新功能
1. 在 `types.ts` 中添加必要的类型定义
2. 在 `useNineGridDialog.ts` 中添加状态和逻辑
3. 在组件中添加 UI
4. 在测试文件中添加测试用例

### 修复 Bug
1. 在测试文件中添加复现 Bug 的测试用例
2. 修复代码
3. 确保测试通过
4. 运行 lint 检查

### 代码审查清单
- [ ] 类型定义完整且准确
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告
- [ ] 测试用例通过
- [ ] 代码符合项目规范
- [ ] 文档已更新

## 相关资源

- [React Hook Form 文档](https://react-hook-form.com/)
- [Zod 文档](https://zod.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [Vitest 文档](https://vitest.dev/)

## 更新日志

### 2026-01-10 - 重构版本
- ✅ 类型定义分离到 `types.ts`
- ✅ 状态管理提取到 `useNineGridDialog.ts`
- ✅ 分镜选择器独立为 `PanelSelector.tsx`
- ✅ 主组件精简到 403 行
- ✅ 添加完整的测试套件
- ✅ 提升代码可读性和可维护性
