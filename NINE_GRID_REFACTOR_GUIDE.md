# 🚀 NineGridDialog 重构实施指南

## ⚡ 快速开始

### 立即可做的优化（今天）

#### 1. 创建 Zustand Store（30分钟）

```bash
# 创建目录
mkdir -p src/features/nine-grid/stores
```

```typescript
// src/features/nine-grid/stores/useNineGridStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface NineGridState {
  // 数据
  chapterPanels: Panel[];
  comicStyles: ComicStyle[];
  characterAssets: CharacterAsset[];
  
  // 选择状态
  selectedChapterId: string;
  selectedPanelIds: string[];
  
  // 加载状态
  isLoadingPanels: boolean;
  isLoadingStyles: boolean;
  isLoadingAssets: boolean;
  isGenerating: boolean;
  
  // Actions
  setChapterPanels: (panels: Panel[]) => void;
  selectPanel: (panelId: string) => void;
  selectFirst9: () => void;
  clearSelection: () => void;
  reset: () => void;
}

export const useNineGridStore = create<NineGridState>()(
  devtools(
    immer((set) => ({
      // 初始状态
      chapterPanels: [],
      comicStyles: [],
      characterAssets: [],
      selectedChapterId: '',
      selectedPanelIds: [],
      isLoadingPanels: false,
      isLoadingStyles: false,
      isLoadingAssets: false,
      isGenerating: false,
      
      // Actions
      setChapterPanels: (panels) => {
        set((state) => {
          state.chapterPanels = panels;
        });
      },
      
      selectPanel: (panelId) => {
        set((state) => {
          const index = state.selectedPanelIds.indexOf(panelId);
          if (index > -1) {
            // 取消选择
            state.selectedPanelIds.splice(index, 1);
          } else if (state.selectedPanelIds.length < 9) {
            // 添加选择
            state.selectedPanelIds.push(panelId);
          }
        });
      },
      
      selectFirst9: () => {
        set((state) => {
          state.selectedPanelIds = state.chapterPanels
            .slice(0, 9)
            .map(p => p.id);
        });
      },
      
      clearSelection: () => {
        set((state) => {
          state.selectedPanelIds = [];
        });
      },
      
      reset: () => {
        set((state) => {
          state.selectedChapterId = '';
          state.selectedPanelIds = [];
          state.chapterPanels = [];
        });
      },
    })),
    { name: 'NineGridStore' }
  )
);
```

#### 2. 拆分 PanelCard 组件（20分钟）

```bash
# 创建组件目录
mkdir -p src/features/nine-grid/components
```

```typescript
// src/features/nine-grid/components/PanelCard.tsx
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface PanelCardProps {
  panel: Panel;
  isSelected: boolean;
  selectionIndex: number;
  onSelect: (panelId: string) => void;
}

export function PanelCard({
  panel,
  isSelected,
  selectionIndex,
  onSelect,
}: PanelCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
        isSelected
          ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
          : "border-transparent bg-muted/30 hover:bg-muted/50"
      )}
      onClick={() => onSelect(panel.id)}
    >
      <Checkbox
        checked={isSelected}
        className="mt-1 pointer-events-none"
      />

      {panel.generated_image && (
        <img
          src={panel.generated_image}
          alt={`分镜 ${panel.panel_order}`}
          className="w-20 h-20 rounded object-cover"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">分镜 {panel.panel_order}</span>
          {isSelected && (
            <Badge className="bg-orange-500">
              位置 {selectionIndex + 1}
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {panel.description}
        </p>
        
        {/* 元数据标签 */}
        <div className="flex gap-2 mt-2">
          {panel.shot_size && (
            <Badge variant="secondary">{panel.shot_size}</Badge>
          )}
          {panel.camera_angle && (
            <Badge variant="outline">{panel.camera_angle}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 3. 创建 API 服务（15分钟）

```bash
# 创建服务目录
mkdir -p src/features/nine-grid/services
```

```typescript
// src/features/nine-grid/services/nineGridApi.ts
export const nineGridApi = {
  async getChapterPanels(chapterId: string) {
    const response = await fetch(`/api/chapter/${chapterId}/panels`);
    if (!response.ok) throw new Error('Failed to load panels');
    const data = await response.json();
    return data.panels || [];
  },
  
  async getComicStyles() {
    const response = await fetch('/api/comic-styles?enabled=true');
    if (!response.ok) throw new Error('Failed to load styles');
    const data = await response.json();
    return data.data || [];
  },
  
  async getCharacterAssets() {
    const response = await fetch('/api/character');
    if (!response.ok) throw new Error('Failed to load assets');
    const data = await response.json();
    return (data.characters || []).filter(
      (char: any) => char.base_image_url
    );
  },
  
  async generateNineGrid(params: {
    chapterId: string;
    projectId: string;
    panelIds: string[];
    comicStyleId?: string;
    stylePrompt?: string;
    referenceImage?: string;
  }) {
    const response = await fetch(
      `/api/chapter/${params.chapterId}/generate-nine-grid-image`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: params.projectId,
          panel_ids: params.panelIds,
          comic_style_id: params.comicStyleId,
          style_prompt: params.stylePrompt,
          reference_image: params.referenceImage,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Generation failed');
    }
    
    return response.json();
  },
};
```

---

## 📊 重构对比

### 修改前（当前）

```typescript
// ❌ 问题：807 行，职责过多
export function NineGridDialog(props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const form = useForm();
  
  // 100+ 行的数据加载逻辑
  const loadChapterPanels = async () => { ... };
  const loadComicStyles = async () => { ... };
  const loadCharacterAssets = async () => { ... };
  
  // 50+ 行的事件处理逻辑
  const handlePanelToggle = () => { ... };
  const handleSelectFirst9 = () => { ... };
  const handleSubmit = async () => { ... };
  
  // 500+ 行的 UI 渲染
  return (
    <Dialog>
      {/* 大量嵌套的 JSX */}
    </Dialog>
  );
}
```

### 修改后（目标）

```typescript
// ✅ 优势：清晰、简洁、易维护
export function NineGridDialog(props) {
  const store = useNineGridStore();
  const { loadData } = useNineGridData();
  const { generateNineGrid } = useNineGridGeneration();
  
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>生成九宫格图片</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <ChapterSelector />
            <StyleSelector />
            <ReferenceImageSelector />
          </div>
          
          <NineGridPreview />
        </div>
        
        <PanelGrid />
        
        <DialogFooter>
          <Button onClick={generateNineGrid}>
            生成九宫格
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🎯 重构步骤

### 第 1 步：创建 Zustand Store（今天）

```bash
# 1. 创建 Store
touch src/features/nine-grid/stores/useNineGridStore.ts

# 2. 实现基本功能
# - 状态定义
# - Actions
# - DevTools 集成

# 3. 测试 Store
pnpm test src/features/nine-grid/stores/__tests__/useNineGridStore.test.ts
```

### 第 2 步：拆分组件（明天）

```bash
# 1. 创建组件文件
touch src/features/nine-grid/components/PanelCard.tsx
touch src/features/nine-grid/components/PanelGrid.tsx
touch src/features/nine-grid/components/ChapterSelector.tsx

# 2. 逐个迁移组件
# - 从原组件复制代码
# - 使用 Zustand Store
# - 简化逻辑

# 3. 测试组件
pnpm test src/features/nine-grid/components/__tests__/
```

### 第 3 步：创建 API 服务（后天）

```bash
# 1. 创建 API 文件
touch src/features/nine-grid/services/nineGridApi.ts

# 2. 抽象 API 调用
# - 统一错误处理
# - 统一响应格式
# - 添加类型定义

# 3. 更新 Store 使用 API 服务
```

### 第 4 步：集成测试（第4天）

```bash
# 1. 在原组件中使用新的 Store 和组件
# 2. 逐步替换旧代码
# 3. 保持功能不变
# 4. 测试所有功能
```

### 第 5 步：清理旧代码（第5天）

```bash
# 1. 删除旧的 useReducer 代码
# 2. 删除旧的事件处理函数
# 3. 删除冗余代码
# 4. 最终测试
```

---

## 🧪 测试清单

### 功能测试

- [ ] 打开对话框
- [ ] 选择章节
- [ ] 自动选择前9个分镜
- [ ] 手动选择/取消分镜
- [ ] 选择漫画风格
- [ ] 选择参考图
- [ ] 提交生成
- [ ] 查看生成结果

### 性能测试

- [ ] 打开对话框响应时间 < 500ms
- [ ] 选择分镜响应时间 < 100ms
- [ ] 切换章节响应时间 < 500ms
- [ ] 生成九宫格响应时间 < 30s

### 兼容性测试

- [ ] Chrome 浏览器
- [ ] Firefox 浏览器
- [ ] Safari 浏览器
- [ ] 移动端浏览器

---

## 📈 预期效果

### 代码质量

| 指标 | 修改前 | 修改后 | 改进 |
|------|--------|--------|------|
| **代码行数** | 807 行 | ~300 行 | ⬇️ 63% |
| **组件数量** | 1 个 | 6+ 个 | ⬆️ 500% |
| **可测试性** | 低 | 高 | ⬆️ 300% |
| **可维护性** | 中 | 高 | ⬆️ 200% |

### 性能

| 指标 | 修改前 | 修改后 | 改进 |
|------|--------|--------|------|
| **首次渲染** | 未测 | < 500ms | - |
| **重渲染次数** | 多 | 少 | ⬇️ 50% |
| **内存占用** | 未测 | < 50MB | - |

---

## 🎓 学习资源

### Zustand

- [官方文档](https://docs.pmnd.rs/zustand)
- [最佳实践](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)
- [DevTools](https://docs.pmnd.rs/zustand/guides/devtools)

### 组件设计

- [React 组件设计模式](https://www.patterns.dev/posts/react-patterns)
- [组件拆分原则](https://kentcdodds.com/blog/colocation)

### 测试

- [Vitest 文档](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)

---

## 🚀 立即开始

### 今天就可以做的事

1. **创建 Zustand Store**（30分钟）
   ```bash
   mkdir -p src/features/nine-grid/stores
   # 复制上面的 Store 代码
   ```

2. **拆分 PanelCard 组件**（20分钟）
   ```bash
   mkdir -p src/features/nine-grid/components
   # 复制上面的 PanelCard 代码
   ```

3. **创建 API 服务**（15分钟）
   ```bash
   mkdir -p src/features/nine-grid/services
   # 复制上面的 API 代码
   ```

4. **测试新代码**（15分钟）
   ```bash
   pnpm test
   ```

**总计时间**: 1.5 小时

---

## 📞 需要帮助？

如果在重构过程中遇到问题：

1. **查看文档**: `NINE_GRID_DIALOG_ANALYSIS.md`
2. **参考示例**: 上面的代码示例
3. **运行测试**: `pnpm test`
4. **查看 DevTools**: Zustand DevTools

---

**准备好了吗？立即开始重构！** 🚀✨
