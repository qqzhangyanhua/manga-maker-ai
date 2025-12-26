# 剧本详情页快速修复指南

## 🚀 立即可实施的优化（30分钟内）

### 1. 删除重复的 CreateChapterDialog

**问题位置**：`src/app/scripts/[id]/page.tsx` L365-387

**修复步骤**：

```typescript
// ❌ 删除第二个重复的 CreateChapterDialog (L377-387)

// ✅ 保留第一个，调整状态管理
const [chapterDialogState, setChapterDialogState] = useState<{
  open: boolean;
  mode: 'create' | 'generate-next';
  nextOrder: number;
}>({ open: false, mode: 'create', nextOrder: 1 });

// 调整打开 Dialog 的方法
onCreateChapter={() => {
  const nextOrder = (data.chapters || []).length > 0
    ? Math.max(...(data.chapters || []).map(ch => ch.chapter_order)) + 1
    : 1;
  setChapterDialogState({ open: true, mode: 'create', nextOrder });
}}

onGenerateNext={() => {
  const nextOrder = (data.chapters || []).length > 0
    ? Math.max(...(data.chapters || []).map(ch => ch.chapter_order)) + 1
    : 1;
  setChapterDialogState({ open: true, mode: 'generate-next', nextOrder });
}}

// 保留一个 Dialog
<CreateChapterDialog
  open={chapterDialogState.open}
  onOpenChange={(open) => {
    if (!open) {
      setChapterDialogState({ open: false, mode: 'create', nextOrder: 1 });
    }
  }}
  storyId={storyId}
  nextChapterOrder={chapterDialogState.nextOrder}
  onSuccess={() => {
    void refreshStoryData();
    setChapterDialogState({ open: false, mode: 'create', nextOrder: 1 });
  }}
/>
```

---

### 2. 修复 Tab 切换的 DOM 操作

**问题位置**：`src/app/scripts/[id]/page.tsx` L335-340

**修复步骤**：

```typescript
// 1. 添加受控状态
const [activeTab, setActiveTab] = useState("panels");

// 2. 修改 Tabs 组件
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  {/* ... */}
</Tabs>

// 3. 修复回调
onViewPanels={(chapterId) => {
  setCurrentChapterId(chapterId);
  setActiveTab("panels"); // ✅ 直接设置状态
}}
```

---

### 3. 优化图片生成后的更新

**问题位置**：`src/app/scripts/[id]/page.tsx` L108-111

**修复步骤**：

```typescript
// 1. 导入 useQueryClient
import { useQueryClient } from '@tanstack/react-query';

// 2. 获取 queryClient
const queryClient = useQueryClient();

// 3. 修改 handleImageGenerated
async function handleImageGenerated(panelId: string, imageUrl: string) {
  // ✅ 局部更新缓存，避免全量刷新
  queryClient.setQueriesData(
    { queryKey: ['story-panels', storyId] },
    (old: { panels: Array<{ id: string; generated_image?: string }> } | undefined) => {
      if (!old) return old;
      return {
        ...old,
        panels: old.panels.map(p =>
          p.id === panelId ? { ...p, generated_image: imageUrl } : p
        ),
      };
    }
  );
  
  toast({ title: "图片生成成功" });
}
```

---

## ⏱️ 1小时内可完成的优化

### 4. 控制并发请求优先级

**问题位置**：`src/app/scripts/[id]/page.tsx` L49-51

**修复步骤**：

```typescript
// ✅ 先加载核心数据
const { 
  data, 
  isLoading, 
  hasStory,
  // ...
} = useStoryDataOptimized(storyId);

// ✅ 等核心数据加载完成后再加载次要数据
const enabled = hasStory && !isLoading;

const { 
  data: characterAssets = [], 
  // ...
} = useCharacterAssets({ enabled });

const { 
  data: storyCharacters = [], 
  // ...
} = useStoryCharacters(storyId, { enabled });
```

**修改 Hook 支持 enabled 参数**：

```typescript
// src/app/scripts/[id]/hooks/useCharacterAssets.ts
export function useCharacterAssets(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['character-assets'],
    queryFn: async () => {
      // ...
    },
    enabled: options?.enabled ?? true, // ✅ 添加 enabled 选项
    staleTime: 5 * 60 * 1000,
  });
}

// src/app/scripts/[id]/hooks/useStoryCharacters.ts
export function useStoryCharacters(
  storyId: string, 
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['story-characters', storyId],
    queryFn: async () => {
      // ...
    },
    enabled: options?.enabled ?? true, // ✅ 添加 enabled 选项
    staleTime: 2 * 60 * 1000,
  });
}
```

---

### 5. 统一 Dialog 状态管理

**使用已创建的 Hook**：

```typescript
// 1. 导入
import { useDialogState } from "./optimizations/useDialogState";

// 2. 使用
const dialog = useDialogState();

// 3. 替换原有状态
// ❌ 删除这些
// const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
// const [pendingChapterId, setPendingChapterId] = useState<string | null>(null);
// const [createChapterDialogOpen, setCreateChapterDialogOpen] = useState(false);
// const [generateNextChapterDialogOpen, setGenerateNextChapterDialogOpen] = useState(false);

// ✅ 使用统一管理
async function handleGeneratePanelsForChapter(chapterId: string): Promise<void> {
  if (!data?.story) {
    toast({ title: "故事不存在", variant: "destructive" });
    return;
  }
  
  const existingPanelCount = (data.panels || []).filter(
    p => p.chapter_id === chapterId
  ).length;
  
  dialog.openGeneratePanelsDialog(chapterId, existingPanelCount);
}

// Dialog 渲染
<GeneratePanelsDialog
  open={dialog.isOpen('generate-panels')}
  existingPanelCount={dialog.state.data?.existingPanelCount || 0}
  onOpenChange={(open) => !open && dialog.closeDialog()}
  onConfirm={(mode, panelCount) => {
    const chapterId = dialog.state.data?.chapterId;
    if (chapterId) {
      executeGeneration(chapterId, mode, panelCount);
      dialog.closeDialog();
    }
  }}
/>
```

---

## 📅 半天内可完成的优化

### 6. 实现按章节过滤的分镜加载

**步骤 1：修改 API 支持章节过滤**

已创建：`src/app/api/story/[id]/panels-optimized/route.ts`

**步骤 2：使用新的 API**

```typescript
// 1. 导入新 Hook
import { useOptimizedPanels } from './hooks/useOptimizedPanels';

// 2. 替换原有的 panels 获取
const {
  panels,
  pagination,
  projectId,
  isLoading: isPanelsLoading,
  updatePanelInCache,
  removePanelFromCache,
} = useOptimizedPanels(storyId, {
  chapterId: currentChapterId,
  page: 1,
  pageSize: 50, // 每页加载 50 个分镜
  enabled: !!data?.story,
});

// 3. 更新 handleImageGenerated
async function handleImageGenerated(panelId: string, imageUrl: string) {
  updatePanelInCache(panelId, { generated_image: imageUrl });
  toast({ title: "图片生成成功" });
}

// 4. 更新 handleDeletePanel
async function handleDeletePanel(panelId: string): Promise<void> {
  await execute(
    async () => {
      const response = await fetch(`/api/panel/${panelId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "删除分镜失败");
      }
      removePanelFromCache(panelId);
    },
    { successMessage: "分镜已删除" }
  );
}
```

---

## 🧪 测试验证

### 验证清单

- [ ] Tab 切换正常工作
- [ ] Dialog 打开/关闭正常
- [ ] 图片生成后无闪烁
- [ ] 删除分镜无闪烁
- [ ] 章节切换时分镜正确过滤
- [ ] 无控制台错误
- [ ] 无性能警告

### 性能测试

```typescript
// 在浏览器控制台执行
performance.mark('page-load-start');

// 页面加载完成后
performance.mark('page-load-end');
performance.measure('page-load', 'page-load-start', 'page-load-end');

// 查看结果
const measure = performance.getEntriesByName('page-load')[0];
console.log(`页面加载时间: ${measure.duration}ms`);
```

**目标指标**：
- 首屏加载 < 1s
- Tab 切换 < 100ms
- 图片更新 < 50ms

---

## 📝 回滚方案

如果优化后出现问题，按以下步骤回滚：

```bash
# 1. 查看当前改动
git diff src/app/scripts/[id]/page.tsx

# 2. 回滚单个文件
git checkout HEAD -- src/app/scripts/[id]/page.tsx

# 3. 或者回滚所有改动
git reset --hard HEAD
```

---

## ✅ 完成标准

- ✅ 代码无重复
- ✅ 无 DOM 直接操作
- ✅ 状态管理清晰
- ✅ 性能显著提升
- ✅ 通过所有测试
- ✅ 代码审查通过

---

## 🎯 下一步

完成快速修复后，可以继续实施：
1. 虚拟滚动（处理大量分镜）
2. 数据库索引优化
3. API 认证中间件提取
4. 添加单元测试

参考完整报告：`docs/SCRIPT_DETAILS_PAGE_OPTIMIZATION_REPORT.md`

