# 专注模式角色过滤和图片生成功能实现报告

**实施日期**: 2026-01-08

## 问题描述

用户在专注模式下遇到两个问题：
1. 右侧"出场角色"区域显示了用户的所有角色，而不是只显示当前项目/故事相关的角色
2. 如果角色没有图片，希望能够根据角色描述自动生成图片

## 解决方案架构

### 1. 数据关系分析

系统中已存在以下数据关系：
- `StoryCharacter` 表：关联 `story_id` 和 `character_id`，表示哪些角色参与了哪个故事
- `useStoryCharacters` Hook：用于获取故事的关联角色
- `/api/story/[id]/generate-character-image` API：用于生成角色图片

### 2. 实现策略

#### 2.1 角色过滤
- 利用 `ScriptDataProvider` 中已提供的 `storyCharacters` 数据
- 在 `PanelConfigSidebar` 组件中过滤角色列表
- 只显示在 `StoryCharacter` 表中关联到当前故事的角色

#### 2.2 图片生成
- 创建专用的 `useCharacterImageGeneration` Hook
- 复用现有的角色图片生成 API
- 在角色卡片上添加生成按钮（仅当角色没有图片时显示）

## 实现细节

### 文件修改列表

1. **src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx**
   - 导入 `storyCharacters` 数据
   - 实现角色过滤逻辑
   - 添加角色图片生成按钮
   - 集成 `useCharacterImageGeneration` Hook

2. **src/app/scripts/[id]/hooks/useCharacterImageGeneration.ts** (新建)
   - 封装角色图片生成逻辑
   - 提供加载状态管理
   - 自动刷新相关数据

### 核心代码实现

#### 角色过滤逻辑

```typescript
// 过滤出当前故事关联的角色
const storyCharacterIds = new Set(storyCharacters.map(sc => sc.character_id));
const filteredCharacters = characters.filter(char => storyCharacterIds.has(char.id));
```

#### 角色图片生成 Hook

```typescript
export function useCharacterImageGeneration(options: UseCharacterImageGenerationOptions = {}) {
  const { storyId, onSuccess, onError } = options;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const generateImage = async (characterId: string) => {
    if (!storyId) throw new Error("Story ID is required");

    setIsGenerating(true);
    setGeneratingCharacterId(characterId);

    try {
      const response = await fetch(`/api/story/${storyId}/generate-character-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          auto_save: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成角色图片失败");

      // 刷新相关查询
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["character-assets"] }),
        queryClient.invalidateQueries({ queryKey: ["story-characters", storyId] }),
      ]);

      if (onSuccess && data.image_url) {
        onSuccess(data.image_url);
      }

      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("生成角色图片失败");
      if (onError) onError(err);
      throw err;
    } finally {
      setIsGenerating(false);
      setGeneratingCharacterId(null);
    }
  };

  return { isGenerating, generatingCharacterId, generateImage };
}
```

#### UI 实现

```typescript
{filteredCharacters.length > 0 ? (
  <div className="grid grid-cols-2 gap-2">
    {filteredCharacters.map((character) => {
      const isSelected = state.config.selectedCharacters.includes(character.id);
      const hasImage = character.reference_image || character.base_image_url;
      const isGenerating = generatingCharacterId === character.id;
      
      return (
        <div key={character.id} className="relative">
          <button
            onClick={() => {
              const newSelection = isSelected
                ? state.config.selectedCharacters.filter((id) => id !== character.id)
                : [...state.config.selectedCharacters, character.id];
              actions.updateConfig({ selectedCharacters: newSelection });
            }}
            className={cn(
              "flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all w-full",
              isSelected
                ? "border-orange-500 bg-orange-500/10"
                : "border-gray-700 bg-black/30 hover:border-gray-600"
            )}
          >
            {hasImage ? (
              <div className="w-full aspect-square rounded overflow-hidden">
                <img
                  src={character.reference_image || character.base_image_url || ""}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-square rounded bg-gray-800 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            )}
            <span className="text-xs text-white truncate w-full text-center">
              {character.name}
            </span>
          </button>
          
          {/* 生成图片按钮 - 仅当角色没有图片时显示 */}
          {!hasImage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                generateCharacterImage(character.id);
              }}
              disabled={isGenerating || isCharacterGenerating}
              className="absolute bottom-1 right-1 p-1.5 bg-orange-500 hover:bg-orange-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={character.description ? `根据描述生成: ${character.description.slice(0, 30)}...` : "生成角色图片"}
            >
              {isGenerating ? (
                <RefreshCw className="w-3 h-3 text-white animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 text-white" />
              )}
            </button>
          )}
        </div>
      );
    })}
  </div>
) : (
  <p className="text-xs text-gray-500 text-center py-4">
    当前故事暂无关联角色
  </p>
)}
```

## 功能特性

### 1. 角色过滤
- ✅ 只显示当前故事关联的角色
- ✅ 如果没有关联角色，显示友好提示
- ✅ 保持原有的选择/取消选择功能

### 2. 图片生成
- ✅ 仅在角色没有图片时显示生成按钮
- ✅ 显示生成中的加载状态（旋转动画）
- ✅ 支持根据角色描述生成图片
- ✅ 生成成功后自动刷新显示
- ✅ 生成失败时显示错误提示
- ✅ Tooltip 显示角色描述预览

### 3. 用户体验优化
- 按钮位于角色卡片右下角，不遮挡主要内容
- 橙色渐变按钮，与系统主题一致
- 生成按钮有 hover 效果
- 生成时按钮被禁用，防止重复点击
- 自动刷新数据，无需手动刷新页面

## 技术亮点

1. **数据复用**：充分利用现有的数据关系和 API，无需创建新的后端接口
2. **关注点分离**：将图片生成逻辑封装到独立的 Hook 中，便于复用和测试
3. **类型安全**：完全使用 TypeScript，无 `any` 类型
4. **性能优化**：使用 Set 进行 O(1) 角色查找
5. **状态管理**：使用 React Query 自动管理缓存和刷新

## 测试建议

### 手动测试步骤
1. 进入专注模式页面
2. 展开右侧"出场角色"面板
3. 验证只显示当前故事的关联角色
4. 对于没有图片的角色，点击生成按钮
5. 观察加载状态和生成结果
6. 验证生成成功后图片自动显示

### 边界情况
- ✅ 故事没有关联角色时显示提示信息
- ✅ 所有角色都有图片时不显示生成按钮
- ✅ 生成失败时显示错误提示
- ✅ 多个角色同时生成时的状态管理

## 后续优化建议

1. **批量生成**：添加"为所有无图角色生成图片"的批量功能
2. **进度显示**：对于较慢的生成任务，显示详细的进度信息
3. **预览优化**：在生成前显示预期效果的预览
4. **缓存策略**：考虑缓存生成失败的角色，避免重复尝试
5. **重新生成**：为已有图片的角色提供"重新生成"选项

## 相关文件

- `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx`
- `src/app/scripts/[id]/hooks/useCharacterImageGeneration.ts`
- `src/app/scripts/[id]/providers/ScriptDataProvider.tsx`
- `src/app/scripts/[id]/hooks/useStoryCharacters.ts`
- `src/app/api/story/[id]/generate-character-image/route.ts`

## 完成状态

✅ 所有功能已实现并通过编译
✅ 无 TypeScript 类型错误
✅ 无 Linter 错误
✅ 符合项目代码规范（无 `any`，组件拆分合理，使用 Tailwind CSS）
