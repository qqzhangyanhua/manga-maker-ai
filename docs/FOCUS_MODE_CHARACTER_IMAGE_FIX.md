# 专注模式角色图片生成 - API 修复

**修复日期**: 2026-01-08  
**问题**: 接口返回 `{"error":"id 不能为空"}`  
**状态**: ✅ 已修复

## 问题分析

### 原始问题
用户在专注模式中点击生成角色图片按钮时，调用 `/api/story/[id]/generate-character-image` 接口失败，返回错误：
```json
{"error":"id 不能为空"}
```

### 根本原因
1. **API 用途不匹配**: `/api/story/[id]/generate-character-image` 是用于 `SuggestedCharacter`（建议角色，即 AI 分析故事后建议的角色）生成图片的接口
2. **参数不兼容**: 该接口期望的是 `id` 参数（SuggestedCharacter ID），但对话框传递的是 `character_id`（Character ID）
3. **数据模型差异**: 
   - `SuggestedCharacter`: AI 分析故事后建议的临时角色，存储在 `suggested_characters` 表
   - `Character`: 用户创建的正式角色，存储在 `characters` 表

## 解决方案

### 方案选择
创建新的 API 端点 `/api/character/[id]/generate-image`，专门用于为已存在的角色生成图片。

**为什么不直接使用现有的 `/api/character/[id]/regenerate-image`？**
- ❌ 该接口不支持漫画风格选择（`comic_style_id`）
- ❌ 需要指定 `mode`（fast/variation），不适合首次生成场景
- ❌ API 设计更偏向"重新生成"而非"首次生成"

### 实现细节

#### 1. 新建 API 端点

**文件**: `src/app/api/character/[id]/generate-image/route.ts`

**功能特性**:
- ✅ 支持漫画风格选择（`comic_style_id`）
- ✅ 支持自定义提示词（`custom_prompt`）
- ✅ 自动构建合适的生成提示词
- ✅ 图片自动上传到 MinIO
- ✅ 自动更新角色的图片字段
- ✅ 配额超限错误处理

**请求格式**:
```typescript
POST /api/character/[id]/generate-image
{
  "comic_style_id": "uuid" | null,  // 可选，漫画风格ID
  "custom_prompt": "string"         // 可选，自定义提示词
}
```

**响应格式**:
```typescript
{
  "success": true,
  "image_url": "https://minio.../image.png",
  "image_base64": "data:image/png;base64,...",
  "optimized_prompt": "实际使用的提示词"
}
```

**提示词构建逻辑**:
```typescript
function buildImagePrompt(
  characterDescription: string,
  comicStylePrompt: string | null,
  customPrompt?: string
): string {
  // 1. 如果提供自定义提示词，使用自定义提示词 + 风格
  if (customPrompt) {
    return `${customPrompt}${comicStylePrompt ? ', ' + comicStylePrompt : ''}`;
  }
  
  // 2. 否则使用角色描述 + 基础模板 + 风格
  const basePrompt = `${characterDescription}, character portrait, manga style, ...`;
  return `${basePrompt}${comicStylePrompt ? ', ' + comicStylePrompt : ''}`;
}
```

**图片更新策略**:
- 如果角色没有任何图片（`base_image_url` 和 `reference_image` 都为空）：设置 `base_image_url`
- 总是更新 `reference_image`（用于后续的 IP-Adapter 参考）

#### 2. 更新对话框组件

**文件**: `src/app/scripts/[id]/components/GenerateCharacterImageDialog.tsx`

**变更**:
```diff
- const response = await fetch(`/api/story/${storyId}/generate-character-image`, {
+ const response = await fetch(`/api/character/${character.id}/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
-     character_id: character.id,
-     comic_style_id: selectedStyleId !== "__none__" ? selectedStyleId : null,
-     auto_save: true,
+     comic_style_id: selectedStyleId !== "__none__" ? selectedStyleId : null,
    }),
  });
```

**组件接口变更**:
```diff
  interface GenerateCharacterImageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    character: Character | null;
-   storyId: string;
    onSuccess: () => void;
  }
```

#### 3. 更新调用代码

**文件**: `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx`

**变更**:
```diff
- {storyId && (
-   <GenerateCharacterImageDialog
-     open={generateImageDialogOpen}
-     onOpenChange={setGenerateImageDialogOpen}
-     character={selectedCharacterForGeneration}
-     storyId={storyId}
-     onSuccess={handleGenerationSuccess}
-   />
- )}
+ <GenerateCharacterImageDialog
+   open={generateImageDialogOpen}
+   onOpenChange={setGenerateImageDialogOpen}
+   character={selectedCharacterForGeneration}
+   onSuccess={handleGenerationSuccess}
+ />
```

## API 对比

### 旧接口（错误使用）
```
POST /api/story/[id]/generate-character-image
用途: 为 SuggestedCharacter 生成图片
参数: { id: SuggestedCharacter.id, auto_save, comic_style_id }
```

### 新接口（正确）
```
POST /api/character/[id]/generate-image
用途: 为 Character 生成图片
参数: { comic_style_id, custom_prompt }
```

### 现有的重新生成接口（不适用）
```
POST /api/character/[id]/regenerate-image
用途: 为已有图片的角色重新生成
参数: { mode: "fast" | "variation", variation_prompt, update_base_image }
限制: 不支持漫画风格选择
```

## 测试验证

### 测试步骤
1. ✅ 进入专注模式
2. ✅ 找到没有图片的角色
3. ✅ 点击生成按钮
4. ✅ 选择漫画风格
5. ✅ 点击"开始生成"
6. ✅ 验证 API 调用成功
7. ✅ 验证图片生成成功
8. ✅ 验证图片上传到 MinIO
9. ✅ 验证角色数据更新
10. ✅ 验证 UI 自动刷新

### 预期结果
- ✅ 不再出现 "id 不能为空" 错误
- ✅ 图片成功生成并显示
- ✅ 角色卡片自动更新显示新图片
- ✅ Toast 通知显示成功消息

## 相关数据模型

### Character（角色表）
```prisma
model Character {
  id                String   @id @default(dbgenerated("gen_random_uuid()"))
  user_id           String
  name              String
  description       String?
  base_image_url    String?         // 基础图片
  reference_image   String?         // 参考图片（用于 IP-Adapter）
  comic_style_id    String?         // 关联的漫画风格
  // ...
}
```

### SuggestedCharacter（建议角色表）
```prisma
model SuggestedCharacter {
  id          String   @id
  story_id    String
  name        String
  description String
  appearance  String
  generated   Boolean  @default(false)
  // ...
}
```

### ComicStyle（漫画风格表）
```prisma
model ComicStyle {
  id            String   @id
  style_key     String   @unique
  name_zh       String
  name_en       String
  prompt_prefix String?  // 风格提示词前缀
  // ...
}
```

## 文件变更总结

### 新增文件
- `src/app/api/character/[id]/generate-image/route.ts` - 新的 API 端点

### 修改文件
- `src/app/scripts/[id]/components/GenerateCharacterImageDialog.tsx` - 更新 API 调用
- `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx` - 更新组件调用

### 文档文件
- `docs/FOCUS_MODE_CHARACTER_IMAGE_FIX.md` - 本文档

## 完成状态

✅ API 端点已创建  
✅ 对话框组件已更新  
✅ 调用代码已更新  
✅ 代码已通过编译  
✅ 无 TypeScript 错误  
✅ 无 Linter 错误  
✅ 功能已可用

## 注意事项

1. **配额管理**: API 会消耗图片生成配额，需确保用户有足够额度
2. **图片存储**: 图片存储在 MinIO，路径格式为 `users/{userId}/characters/{characterId}/generated_{timestamp}_{random}.png`
3. **数据更新**: 生成成功后会自动更新角色的 `reference_image` 字段，如果是首次生成还会设置 `base_image_url`
4. **风格优先级**: 
   - 用户选择的风格 > 角色关联的风格 > 无风格
   - 自定义提示词 > 角色描述 > 角色名称

## 后续优化建议

1. **批量生成**: 支持为多个角色批量生成图片
2. **生成历史**: 保存生成历史，支持回滚到之前的版本
3. **高级参数**: 暴露更多生成参数（steps, cfg_scale, size）
4. **预览对比**: 生成前显示预期效果预览
5. **智能推荐**: 根据故事类型自动推荐合适的漫画风格
