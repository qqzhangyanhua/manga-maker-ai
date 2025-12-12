# 三视图生成接口修改日志

## 修改日期
2025-12-12

## 修改原因
原接口在生成三视图时不支持参考图，导致某些 AI 模型（如 Gemini）无法正确生成图片，返回错误：
```
Error: 三视图生成失败（正面）: 未从响应中提取到图片数据
```

## 修改内容

### 1. 修改 `src/lib/image-generation.ts`

#### 1.1 更新 `generateThreeViews()` 函数签名
**位置**: Line 424-427

**修改前**:
```typescript
export async function generateThreeViews(
  characterDescription: string,
  providerType: string = "image_generation"
): Promise<...>
```

**修改后**:
```typescript
export async function generateThreeViews(
  characterDescription: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string  // 新增参数
): Promise<...>
```

#### 1.2 传递参考图到图片生成调用
**位置**: Line 451-480

在三个 `callImageGenerationByType()` 调用中都添加了 `referenceImageUrl` 参数：
```typescript
callImageGenerationByType({
  providerType,
  prompt: prompts.front,
  // ... 其他参数
  referenceImageUrl,  // 新增
})
```

### 2. 修改 `src/app/api/character/generate-views/route.ts`

#### 2.1 查询角色时包含关联数据
**位置**: Line 90-99

**修改前**:
```typescript
const character = await prisma.character.findFirst({
  where: {
    id: character_id,
    user_id: payload.userId,
  },
});
```

**修改后**:
```typescript
const character = await prisma.character.findFirst({
  where: {
    id: character_id,
    user_id: payload.userId,
  },
  include: {
    views: true,        // 新增
    expressions: true,  // 新增
  },
});
```

#### 2.2 添加智能参考图查找逻辑
**位置**: Line 132-183

新增完整的参考图查找逻辑，优先级如下：
1. **角色主图** (`character.base_image_url`)
2. **中性表情** (`expressions[neutral].image_url`)
3. **任意表情** (`expressions[0].image_url`)
4. **正面三视图** (`views[front].image_url`) - 仅在重新生成时有效
5. **任意三视图** (`views[0].image_url`) - 仅在重新生成时有效

包含详细的日志输出，方便调试。

#### 2.3 传递参考图到生成函数
**位置**: Line 191-195

**修改前**:
```typescript
const { front, side, back, prompts } = await generateThreeViews(
  optimizedDescription,
  imageProviderType
);
```

**修改后**:
```typescript
const { front, side, back, prompts } = await generateThreeViews(
  optimizedDescription,
  imageProviderType,
  referenceImageUrl  // 新增
);
```

## 修改效果

### 修改前
- 日志显示：`是否包含参考图: 否`
- 某些模型（如 Gemini）无法生成图片
- 错误：`未从响应中提取到图片数据`

### 修改后
- 自动查找并使用角色的参考图
- 日志显示：`是否包含参考图: 是`
- 支持所有需要参考图的 AI 模型
- 提高生成质量和一致性

## 兼容性

- ✅ **向后兼容**: `referenceImageUrl` 是可选参数，不影响现有调用
- ✅ **Stable Diffusion**: 会忽略参考图参数（有警告日志）
- ✅ **OpenAI/Gemini**: 完全支持参考图功能
- ✅ **无参考图场景**: 如果找不到参考图，会正常降级到纯文本提示词

## 测试建议

### 测试场景 1: 有 base_image_url 的角色
```bash
curl -X POST http://localhost:3000/api/character/generate-views \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_with_base_image",
    "provider_type": "image_generation_turnaround"
  }'
```

**预期**: 使用 `base_image_url` 作为参考图

### 测试场景 2: 有表情图的角色
```bash
curl -X POST http://localhost:3000/api/character/generate-views \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_with_expressions",
    "provider_type": "image_generation_turnaround"
  }'
```

**预期**: 使用 neutral 表情或第一张表情图作为参考图

### 测试场景 3: 新创建的角色（无任何图片）
```bash
curl -X POST http://localhost:3000/api/character/generate-views \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "new_character",
    "description": "a cute anime girl with blue hair",
    "provider_type": "image_generation_turnaround"
  }'
```

**预期**: 不使用参考图，纯文本生成（日志会显示警告）

## 日志示例

### 有参考图时
```
========== 查找角色参考图 ==========
角色ID: char_123
角色名称: 小明
base_image_url: http://localhost:9000/manga-assets/users/user_123/characters/char_123/base.png
表情数量: 5
  - 表情类型: neutral, happy, sad, angry, surprised
三视图数量: 0
✓ 使用角色主图作为参考图: http://localhost:9000/manga-assets/users/user_123/characters/char_123/base.png
====================================

开始生成三视图，角色描述: anime style, 8k, ultra-detailed...
使用参考图: http://localhost:9000/manga-assets/users/user_123/characters/char_123/base.png

========== OpenAI/DALL-E API 调用详情 ==========
Endpoint: https://api.openai.com/v1/chat/completions
Model: gemini-2.0-flash-exp
API Key: sk-JdGsho...
是否包含参考图: 是
参考图大小: 245.67 KB (base64)
Prompt: anime style, 8k, ultra-detailed...
Size: 512x768
Batch Size: 1
================================================
```

### 无参考图时
```
========== 查找角色参考图 ==========
角色ID: char_456
角色名称: 新角色
base_image_url: 无
表情数量: 0
三视图数量: 0
✗ 未找到可用的参考图，将不使用参考图生成
提示：请确保角色有 base_image_url、表情图或三视图
====================================

开始生成三视图，角色描述: anime style, 8k, ultra-detailed...

========== OpenAI/DALL-E API 调用详情 ==========
Endpoint: https://api.openai.com/v1/chat/completions
Model: gemini-2.0-flash-exp
API Key: sk-JdGsho...
是否包含参考图: 否
Prompt: anime style, 8k, ultra-detailed...
Size: 512x768
Batch Size: 1
================================================
```

## 相关文件

- `src/lib/image-generation.ts` - 图片生成核心逻辑
- `src/app/api/character/generate-views/route.ts` - 三视图生成接口
- `src/app/api/character/outfits/route.ts` - 服装生成接口（参考实现）

## 注意事项

1. **循环依赖风险**: 如果角色没有 `base_image_url` 和表情图，只有三视图，那么重新生成三视图时会使用旧的三视图作为参考图。这是合理的行为（用于重新生成/优化）。

2. **参考图下载**: 参考图会被下载并转换为 base64 发送给 AI 模型，可能增加请求大小和延迟。

3. **Stable Diffusion**: 当前实现中，SD 不支持参考图，会在日志中显示警告并忽略参考图参数。

4. **模型兼容性**: 确保使用的 AI 模型支持多模态输入（图片+文本），否则可能导致错误。
