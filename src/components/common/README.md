# Phase 0 通用组件库文档

这是 Phase 0 创建的通用组件和 Hooks 的使用文档。

## 目录结构

```
src/
├── components/
│   └── common/
│       ├── EmptyState/      # 空状态组件
│       ├── LoadingState/    # 加载状态组件
│       └── ErrorBanner/     # 错误提示横幅
└── hooks/
    ├── useBatchSelection.ts      # 批量选择逻辑
    └── useProgressCalculation.ts # 进度计算
```

---

## 组件

### 1. EmptyState - 空状态组件

用于显示空状态提示，引导用户进行下一步操作。

#### Props

```typescript
interface EmptyStateProps {
  icon: ReactNode;           // 图标（推荐使用 lucide-react）
  title: string;             // 主标题
  description?: string;      // 描述文字（可选）
  action?: ReactNode;        // 操作按钮（可选）
  variant?: "default" | "compact";  // 样式变体
  className?: string;        // 自定义样式
}
```

#### 使用示例

```tsx
import { EmptyState } from "@/components/common/EmptyState";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

// 基础用法
<EmptyState
  icon={<BookOpen className="w-full h-full" />}
  title="还没有章节"
  description="创建第一个章节开始你的漫画创作之旅"
  action={
    <Button onClick={handleCreateChapter}>
      创建第一个章节
    </Button>
  }
/>

// 紧凑样式
<EmptyState
  icon={<BookOpen className="w-full h-full" />}
  title="暂无数据"
  variant="compact"
/>
```

---

### 2. LoadingState - 加载状态组件

显示步骤式加载进度，让用户清楚地了解当前加载状态。

#### Types

```typescript
type LoadingStepStatus = "pending" | "loading" | "completed" | "error";

interface LoadingStep {
  label: string;
  status: LoadingStepStatus;
}

interface LoadingStateProps {
  title: string;
  steps: LoadingStep[];
  className?: string;
}
```

#### 使用示例

```tsx
import { LoadingState } from "@/components/common/LoadingState";

const [steps, setSteps] = useState([
  { label: "加载基本信息", status: "completed" },
  { label: "加载章节数据", status: "loading" },
  { label: "加载分镜画面", status: "pending" },
]);

<LoadingState
  title="正在加载剧本数据..."
  steps={steps}
/>
```

#### 状态说明

- `pending`: 等待中（灰色圆圈）
- `loading`: 加载中（橙色旋转图标）
- `completed`: 已完成（绿色对勾）
- `error`: 错误（红色叉号）

---

### 3. ErrorBanner - 错误提示横幅

持久化错误提示，替代自动消失的 Toast。

#### Props

```typescript
interface ErrorBannerProps {
  message: string;           // 错误消息
  action?: ReactNode;        // 操作按钮（如重试）
  dismissible?: boolean;     // 是否可关闭（默认 true）
  onDismiss?: () => void;    // 关闭回调
  className?: string;
}
```

#### 使用示例

```tsx
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { Button } from "@/components/ui/button";

// 基础用法
<ErrorBanner
  message="加载失败，请稍后重试"
/>

// 带重试按钮
<ErrorBanner
  message="网络请求失败"
  action={
    <Button variant="outline" size="sm" onClick={handleRetry}>
      重试
    </Button>
  }
/>

// 不可关闭
<ErrorBanner
  message="该操作需要先完成前置步骤"
  dismissible={false}
/>

// 条件渲染
{error && (
  <ErrorBanner
    message={error.message}
    onDismiss={() => setError(null)}
  />
)}
```

---

## Hooks

### 1. useBatchSelection - 批量选择

管理列表项的批量选择状态，支持全选、范围选择等。

#### API

```typescript
interface UseBatchSelectionOptions<T> {
  items: T[];                    // 列表项
  getId: (item: T) => string;    // 获取项的唯一ID
}

interface UseBatchSelectionReturn<T> {
  selectedIds: Set<string>;      // 已选中的ID集合
  selectedCount: number;         // 已选中数量
  selectedItems: T[];            // 已选中的项
  selectAll: () => void;         // 全选
  deselectAll: () => void;       // 取消全选
  toggleItem: (id: string) => void;            // 切换单项
  toggleRange: (startId: string, endId: string) => void;  // 范围选择
  isSelected: (id: string) => boolean;         // 判断是否已选
  isAllSelected: boolean;        // 是否全选
  isSomeSelected: boolean;       // 是否部分选择
}
```

#### 使用示例

```tsx
import { useBatchSelection } from "@/hooks/useBatchSelection";

function PanelList({ panels }) {
  const selection = useBatchSelection({
    items: panels,
    getId: (panel) => panel.id,
  });

  return (
    <div>
      {/* 全选/取消全选 */}
      <Checkbox
        checked={selection.isAllSelected}
        indeterminate={selection.isSomeSelected}
        onCheckedChange={(checked) => {
          checked ? selection.selectAll() : selection.deselectAll();
        }}
      />

      {/* 列表项 */}
      {panels.map((panel) => (
        <div key={panel.id}>
          <Checkbox
            checked={selection.isSelected(panel.id)}
            onCheckedChange={() => selection.toggleItem(panel.id)}
          />
          {/* 面板内容 */}
        </div>
      ))}

      {/* 批量操作 */}
      {selection.selectedCount > 0 && (
        <Button onClick={() => batchGenerate(selection.selectedItems)}>
          批量生成 ({selection.selectedCount})
        </Button>
      )}
    </div>
  );
}
```

#### 支持 Shift 范围选择

```tsx
const [lastClickedId, setLastClickedId] = useState<string | null>(null);

function handleClick(id: string, event: React.MouseEvent) {
  if (event.shiftKey && lastClickedId) {
    selection.toggleRange(lastClickedId, id);
  } else {
    selection.toggleItem(id);
  }
  setLastClickedId(id);
}
```

---

### 2. useProgressCalculation - 进度计算

计算创作进度、完成度和预估时间。

#### API

```typescript
interface Chapter {
  id: string;
  // ... 其他字段
}

interface Panel {
  id: string;
  chapter_id: string;
  image_url?: string | null;
  // ... 其他字段
}

interface UseProgressCalculationOptions {
  chapters: Chapter[];
  panels: Panel[];
  timePerPanel?: number;  // 每个分镜生成时间（分钟），默认 0.5
}

type CreationStage = "empty" | "chapter_created" | "generating" | "ready_to_export";

interface ProgressCalculationResult {
  // 章节统计
  totalChapters: number;
  completedChapters: number;

  // 分镜统计
  totalPanels: number;
  completedPanels: number;
  pendingPanels: number;

  // 完成度
  completionRate: number;  // 0-100

  // 预估时间
  estimatedMinutes: number;

  // 当前阶段
  stage: CreationStage;
  stageLabel: string;
}
```

#### 使用示例

```tsx
import { useProgressCalculation } from "@/hooks/useProgressCalculation";

function ScriptPage({ chapters, panels }) {
  const progress = useProgressCalculation({
    chapters,
    panels,
    timePerPanel: 0.5,  // 每个分镜30秒
  });

  return (
    <div>
      {/* 显示进度 */}
      <div>
        <h3>创作进度</h3>
        <p>章节: {progress.completedChapters}/{progress.totalChapters}</p>
        <p>分镜: {progress.completedPanels}/{progress.totalPanels}</p>
        <p>完成度: {progress.completionRate}%</p>

        {progress.pendingPanels > 0 && (
          <p>预计还需 {progress.estimatedMinutes} 分钟</p>
        )}

        <p>当前阶段: {progress.stageLabel}</p>
      </div>

      {/* 根据阶段显示不同内容 */}
      {progress.stage === "empty" && (
        <EmptyState
          icon={<BookOpen />}
          title="开始创作"
          action={<Button>创建第一个章节</Button>}
        />
      )}

      {progress.stage === "ready_to_export" && (
        <Button>导出漫画</Button>
      )}
    </div>
  );
}
```

#### 阶段说明

- `empty`: 未开始（无章节）
- `chapter_created`: 章节已创建（但无分镜）
- `generating`: 分镜生成中（有未完成的分镜）
- `ready_to_export`: 可以导出（所有分镜已完成）

---

## 设计原则

1. **类型安全**: 所有组件和 Hooks 都有完整的 TypeScript 类型定义
2. **可复用**: 通用组件不依赖特定业务逻辑
3. **可定制**: 支持通过 className 和 variant 自定义样式
4. **性能优化**: Hooks 使用 useMemo/useCallback 避免不必要的重渲染
5. **无障碍**: 组件支持键盘导航和屏幕阅读器

---

## 后续计划

Phase 1 将使用这些基础组件实现：
- 空状态引导
- 智能操作提示
- Tab 进度徽章
- 进度指示器
- 错误处理优化

---

## 版本

- **创建日期**: 2026-01-03
- **版本**: Phase 0
- **维护者**: 架构团队
