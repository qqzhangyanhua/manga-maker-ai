# 专注模式角色图片生成 - 漫画风格支持

**实施日期**: 2026-01-08  
**功能**: 为专注模式添加带漫画风格选择的角色图片生成功能

## 概述

在专注模式的"出场角色"面板中，当角色没有图片时，用户可以点击生成按钮，弹出对话框选择漫画风格后生成角色图片。这确保了生成的角色图片不会偏离项目的整体美术风格。

## 功能特性

### 1. 漫画风格选择对话框
- ✅ 显示角色名称和描述
- ✅ 支持选择漫画风格（日式、美式、韩漫等）
- ✅ 支持"无风格"选项（使用默认风格）
- ✅ 风格选择器带缩略图预览
- ✅ 实时显示生成结果

### 2. 用户交互流程
1. 在专注模式右侧"出场角色"面板找到没有图片的角色
2. 点击角色卡片右下角的橙色生成按钮（✨图标）
3. 弹出"生成角色图片"对话框
4. 查看角色描述，选择合适的漫画风格
5. 点击"开始生成"按钮
6. 等待生成完成（显示加载动画）
7. 查看生成结果预览
8. 自动保存并刷新，关闭对话框

### 3. 技术实现

#### 对话框组件结构
```typescript
interface GenerateCharacterImageDialogProps {
  open: boolean;              // 对话框打开状态
  onOpenChange: (open: boolean) => void;  // 状态变化回调
  character: Character | null;  // 要生成图片的角色
  storyId: string;             // 当前故事ID
  onSuccess: () => void;       // 生成成功回调
}
```

#### API 调用
```typescript
POST /api/story/${storyId}/generate-character-image
{
  character_id: string,
  comic_style_id: string | null,  // 选择的漫画风格ID
  auto_save: true                 // 自动保存到角色库
}
```

## 实现文件

### 新增文件
1. **src/app/scripts/[id]/components/GenerateCharacterImageDialog.tsx**
   - 角色图片生成对话框组件
   - 包含漫画风格选择器
   - 处理生成和预览逻辑

### 修改文件
1. **src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx**
   - 集成生成对话框
   - 添加打开对话框的处理函数
   - 移除旧的直接生成逻辑

### 删除文件
1. **src/app/scripts/[id]/hooks/useCharacterImageGeneration.ts**
   - 已删除，因为对话框组件封装了完整的生成逻辑

## 参考实现

本功能参考了 `/assets?tab=characters` 页面的"创建新角色"对话框：
- **文件**: `src/components/AssetLibrary/CreateCharacterDialog.tsx`
- **借鉴点**:
  - 漫画风格选择器的 UI 设计
  - `/api/comic-styles` API 的调用方式
  - 风格选择与图片生成的集成逻辑
  - 表单状态管理和错误处理

## 核心代码片段

### 1. 对话框组件

```tsx
export function GenerateCharacterImageDialog({
  open,
  onOpenChange,
  character,
  storyId,
  onSuccess,
}: GenerateCharacterImageDialogProps) {
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("__none__");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");

  // 获取漫画风格列表
  useEffect(() => {
    if (open) {
      fetchStyles();
    }
  }, [open]);

  const handleGenerate = async () => {
    const response = await fetch(`/api/story/${storyId}/generate-character-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character_id: character.id,
        comic_style_id: selectedStyleId !== "__none__" ? selectedStyleId : null,
        auto_save: true,
      }),
    });
    // ... 处理响应
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* 角色描述 */}
      {/* 漫画风格选择器 */}
      {/* 生成按钮 */}
      {/* 生成结果预览 */}
    </Dialog>
  );
}
```

### 2. PanelConfigSidebar 集成

```tsx
// 状态管理
const [generateImageDialogOpen, setGenerateImageDialogOpen] = useState(false);
const [selectedCharacterForGeneration, setSelectedCharacterForGeneration] = useState<Character | null>(null);

// 打开对话框
const handleOpenGenerateDialog = (character: Character) => {
  setSelectedCharacterForGeneration(character);
  setGenerateImageDialogOpen(true);
};

// 生成成功回调
const handleGenerationSuccess = async () => {
  await refetchAll();
};

// 在角色卡片上的生成按钮
{!hasImage && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleOpenGenerateDialog(character as Character);
    }}
    className="absolute bottom-1 right-1 p-1.5 bg-orange-500..."
  >
    <Sparkles className="w-3 h-3 text-white" />
  </button>
)}

// 对话框组件
<GenerateCharacterImageDialog
  open={generateImageDialogOpen}
  onOpenChange={setGenerateImageDialogOpen}
  character={selectedCharacterForGeneration}
  storyId={storyId}
  onSuccess={handleGenerationSuccess}
/>
```

## UI/UX 设计亮点

### 1. 视觉一致性
- 对话框设计与"创建新角色"保持一致
- 使用相同的漫画风格选择器组件
- 橙色主题色贯穿整个交互流程

### 2. 信息展示
- 清晰显示角色名称和描述
- 风格选择器带缩略图，直观展示各风格差异
- 生成结果即时预览

### 3. 交互优化
- 生成按钮禁用状态明确
- 加载动画提供视觉反馈
- 生成成功后短暂延迟关闭，让用户看到结果
- 错误提示清晰友好

### 4. 性能优化
- 风格列表仅在对话框打开时加载
- 使用 React Query 缓存机制
- 成功后自动刷新相关数据

## 漫画风格说明

系统支持的漫画风格（通过 `/api/comic-styles` 获取）：
- **日式漫画** (MANGA): 经典日本动漫风格
- **美式漫画** (AMERICAN): 超级英雄风格
- **韩式漫画** (WEBTOON): 韩国网络漫画风格
- **水墨风格** (INK): 中国传统水墨画风格
- **无风格**: 使用默认 AI 生成风格

每个风格都有对应的 `prompt_prefix`，会在生成时添加到提示词中。

## 错误处理

### 配额超限
```typescript
if (data.code === "QUOTA_EXCEEDED") {
  throw new Error(`今日图像生成配额已用完（${data.used}/${data.limit}）`);
}
```

### 生成失败
- 显示 Toast 通知
- 保持对话框打开，允许用户重试
- 记录错误日志到控制台

## 测试要点

### 手动测试流程
1. ✅ 进入专注模式
2. ✅ 找到没有图片的角色
3. ✅ 点击生成按钮，对话框正确弹出
4. ✅ 角色描述正确显示
5. ✅ 漫画风格列表正确加载
6. ✅ 选择不同风格，生成不同效果
7. ✅ 生成成功后图片正确显示
8. ✅ 自动刷新，角色卡片显示新图片

### 边界情况测试
- ✅ 角色没有描述时的处理
- ✅ 网络错误时的提示
- ✅ 配额用完时的提示
- ✅ 生成过程中关闭对话框的处理
- ✅ 多次生成的状态管理

## 与原方案的对比

### 原方案（已废弃）
- 直接调用生成 API，无风格选择
- 无预览功能
- 状态管理使用独立 Hook

### 新方案（当前实现）
- ✅ 通过对话框选择风格
- ✅ 支持生成结果预览
- ✅ 更好的用户体验
- ✅ 代码组织更清晰（组件化）

## 后续优化建议

1. **批量生成**: 支持一次为多个角色生成图片
2. **风格预设**: 记住用户上次选择的风格
3. **高级选项**: 支持调整生成参数（steps, cfg_scale）
4. **历史记录**: 保存生成历史，支持回滚
5. **对比预览**: 同时生成多个风格，让用户选择

## 相关文档

- [专注模式角色过滤实现](./FOCUS_MODE_CHARACTER_FILTER_IMPLEMENTATION.md)
- [角色图片生成 API](../src/app/api/story/[id]/generate-character-image/route.ts)
- [漫画风格管理](../src/app/api/comic-styles/route.ts)

## 完成状态

✅ 所有功能已实现并通过编译  
✅ 无 TypeScript 类型错误  
✅ 无 Linter 错误  
✅ 符合项目代码规范  
✅ 用户体验优化到位  
✅ 与现有系统完美集成
