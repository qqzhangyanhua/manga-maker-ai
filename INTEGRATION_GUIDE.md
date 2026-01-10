# 🔗 集成指南 - 如何使用新架构

## ⚡ 快速开始

### 1. 导入新模块（1分钟）

在 `NineGridDialog.tsx` 顶部添加：

```typescript
import {
  useNineGridStore,
  useNineGridData,
  useNineGridGeneration,
  PanelGrid,
} from '@/features/nine-grid';
```

### 2. 替换状态管理（2分钟）

```typescript
// ❌ 删除这些
// const [state, dispatch] = useReducer(dialogReducer, initialState);
// const chapterPanelsRef = useRef<Panel[]>([]);
// ... 所有 useReducer 相关代码

// ✅ 替换为
const store = useNineGridStore();
const { loadChapterPanels, loadInitialData } = useNineGridData();
const { generateNineGrid } = useNineGridGeneration();
```

### 3. 替换数据加载（3分钟）

```typescript
// ❌ 删除这些函数
// const loadChapterPanels = useCallback(async (chapterId: string) => { ... });
// const loadComicStyles = useCallback(async () => { ... });
// const loadCharacterAssets = useCallback(async () => { ... });

// ✅ 已经在 useNineGridData Hook 中了
// 直接使用即可
```

### 4. 替换事件处理（2分钟）

```typescript
// ❌ 删除这些
// const handlePanelToggle = useCallback((panelId: string) => { ... });
// const handleSelectFirst9 = useCallback(() => { ... });
// const handleClearSelection = useCallback(() => { ... });

// ✅ 替换为
const { selectPanel, selectFirst9, clearSelection } = store;
```

### 5. 替换分镜渲染（5分钟）

```typescript
// ❌ 删除 500+ 行的分镜渲染代码
// <div className="grid grid-cols-1 gap-3">
//   {state.chapterPanels.map((panel) => (
//     <div ...>...</div>
//   ))}
// </div>

// ✅ 替换为一行
<PanelGrid />
```

---

## 📝 完整示例

### 修改后的 NineGridDialog.tsx

```typescript
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Grid3x3 } from "lucide-react";

// ✅ 导入新模块
import {
  useNineGridStore,
  useNineGridData,
  useNineGridGeneration,
  PanelGrid,
} from '@/features/nine-grid';

interface NineGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  projectId: string | null;
  chapters: Chapter[];
  onSuccess: () => void;
}

const formSchema = z.object({
  chapterId: z.string().min(1, "请选择章节"),
  comicStyleId: z.string().optional(),
  referenceImageId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function NineGridDialog({
  open,
  onOpenChange,
  storyId,
  projectId,
  chapters,
  onSuccess,
}: NineGridDialogProps) {
  // ✅ 使用新的 Store 和 Hooks
  const store = useNineGridStore();
  const { loadChapterPanels, loadInitialData } = useNineGridData();
  const { generateNineGrid } = useNineGridGeneration();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chapterId: "",
      comicStyleId: "none",
      referenceImageId: "none",
    },
  });
  
  // 对话框打开时加载初始数据
  useEffect(() => {
    if (open) {
      loadInitialData();
    } else {
      store.reset();
      form.reset();
    }
  }, [open]);
  
  // 监听章节变化
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "chapterId" && value.chapterId) {
        store.setSelectedChapterId(value.chapterId);
        loadChapterPanels(value.chapterId);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, loadChapterPanels, store]);
  
  // 提交处理
  const handleSubmit = async (data: FormData) => {
    if (!projectId) {
      return;
    }
    
    const selectedStyle = store.comicStyles.find(s => s.id === data.comicStyleId);
    const selectedAsset = store.characterAssets.find(a => a.id === data.referenceImageId);
    
    const result = await generateNineGrid({
      chapterId: data.chapterId,
      projectId,
      comicStyleId: selectedStyle?.id,
      stylePrompt: selectedStyle?.prompt_prefix,
      referenceImage: selectedAsset?.base_image_url,
    });
    
    if (result) {
      store.reset();
      form.reset();
      onOpenChange(false);
      onSuccess();
    }
  };
  
  const isValidSelection = store.selectedPanelIds.length === 9;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5" />
            生成九宫格图片
          </DialogTitle>
          <DialogDescription>
            选择 9 个分镜生成 3×3 九宫格布局的图片
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* 章节选择 */}
                <FormField
                  control={form.control}
                  name="chapterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>选择章节 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择要生成九宫格的章节" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {chapters.map((chapter) => (
                            <SelectItem key={chapter.id} value={chapter.id}>
                              第 {chapter.chapter_order} 章 - {chapter.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* ✅ 使用新的 PanelGrid 组件 */}
                {store.selectedChapterId && <PanelGrid />}
                
                {/* 风格和参考图选择 */}
                {/* ... 保持原有的风格和参考图选择代码 ... */}
              </div>
            </ScrollArea>
            
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={store.isGenerating}
              >
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={store.isGenerating || !isValidSelection}
              >
                {store.isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Grid3x3 className="mr-2 h-4 w-4" />
                    生成九宫格图片
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🎯 关键改进点

### 1. 代码行数大幅减少

```
修改前: 807 行
修改后: ~300 行
减少: 63%
```

### 2. 状态管理统一

```typescript
// 修改前: 3 种状态管理方式
// - useReducer
// - useForm
// - useRef

// 修改后: 2 种
// - Zustand Store (主要状态)
// - useForm (表单状态)
```

### 3. 职责清晰

```typescript
// Store: 状态管理
// Hooks: 业务逻辑
// Services: API 调用
// Components: UI 渲染
```

---

## ✅ 验证步骤

### 1. 检查导入

```bash
# 确保没有导入错误
pnpm build
```

### 2. 测试功能

```
1. 打开对话框
2. 选择章节
3. 验证自动选择前9个
4. 手动调整选择
5. 提交生成
```

### 3. 检查性能

```
1. 打开 React DevTools
2. 查看渲染次数
3. 验证无不必要的重渲染
```

---

## 🐛 常见问题

### Q1: 导入错误？

```bash
# 检查路径
import { useNineGridStore } from '@/features/nine-grid';

# 如果报错，检查 tsconfig.json 的 paths 配置
```

### Q2: Store 状态不更新？

```typescript
// 确保使用 Store 的 Actions
const { selectPanel } = useNineGridStore();

// 而不是直接修改状态
// ❌ store.selectedPanelIds.push(id);
// ✅ store.selectPanel(id);
```

### Q3: 组件不渲染？

```typescript
// 确保组件订阅了 Store
const { chapterPanels } = useNineGridStore();

// Zustand 会自动追踪使用的状态
// 只有使用的状态变化时才会重渲染
```

---

## 📚 相关文档

- `REFACTOR_P0_P1_COMPLETE.md` - 完整实施报告
- `NINE_GRID_DIALOG_ANALYSIS.md` - 架构分析
- `NINE_GRID_REFACTOR_GUIDE.md` - 重构指南

---

**准备好了吗？开始集成！** 🚀✨
