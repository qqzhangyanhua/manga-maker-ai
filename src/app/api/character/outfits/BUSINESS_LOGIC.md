# `/api/character/outfits` 接口业务逻辑文档

## 接口概述
- **方法**: POST
- **路径**: `/api/character/outfits`
- **功能**: 为角色创建或更新服装，可选择性生成 AI 图片

---

## 数据流程图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 认证阶段                                                  │
├─────────────────────────────────────────────────────────────┤
│ 输入: HTTP Cookie (comicai_session)                         │
│ 处理: verifyAuthToken(token)                                │
│ 输出: userId, email, role                                   │
│ 失败: 401 "未登录" / "无效的token"                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 请求参数解析                                              │
├─────────────────────────────────────────────────────────────┤
│ 必需参数:                                                    │
│   - character_id: string                                    │
│   - outfit_name: string                                     │
│   - outfit_type: OutfitType                                 │
│ 可选参数:                                                    │
│   - description: string (服装额外描述)                       │
│   - generate_image: boolean (是否生成图片，默认 false)      │
│   - provider_type: string (图片生成 provider)               │
│   - reference_image_url: string (参考图 URL)                │
│ 失败: 400 "角色ID、服装名称和类型不能为空"                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 角色验证与数据获取                                        │
├─────────────────────────────────────────────────────────────┤
│ 查询: prisma.character.findFirst({                          │
│   where: { id: character_id, user_id: userId },            │
│   include: { views: true, expressions: true }              │
│ })                                                          │
│ 验证: 角色是否存在 + 是否属于当前用户                        │
│ 失败: 404 "角色不存在"                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 智能参考图选择（如果未提供 reference_image_url）         │
├─────────────────────────────────────────────────────────────┤
│ 优先级策略:                                                  │
│   1️⃣ character.base_image_url (角色主图)                    │
│   2️⃣ expressions[neutral].image_url (中性表情)              │
│   3️⃣ expressions[0].image_url (任意表情)                    │
│   4️⃣ views[front].image_url (正面三视图)                    │
│   5️⃣ views[0].image_url (任意三视图)                        │
│   6️⃣ null (无参考图)                                        │
│ 输出: finalReferenceImageUrl                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. LLM Provider 验证                                        │
├─────────────────────────────────────────────────────────────┤
│ 验证 1: ensureLlmProvider("storyboard")                     │
│   用途: 简化服装描述                                         │
│ 验证 2 (仅当 generate_image=true):                          │
│   ensureLlmProvider(imageProviderType)                      │
│   用途: 生成服装图片                                         │
│ 失败: 400 { error, code: "MODEL_NOT_CONFIGURED" }          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. 服装描述简化（如果提供了 description）                    │
├─────────────────────────────────────────────────────────────┤
│ 调用: callChatCompletionByType({                            │
│   providerType: "storyboard",                               │
│   messages: [                                               │
│     { role: "system", content: "翻译为3-5个英文关键词" },   │
│     { role: "user", content: description }                  │
│   ],                                                        │
│   temperature: 0.1,                                         │
│   maxTokens: 50                                             │
│ })                                                          │
│ 输出: promptModifier (简化后的英文关键词)                    │
│ 示例: "蓝白色水手服" → "blue and white, sailor style"       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. 生成 trigger_word                                        │
├─────────────────────────────────────────────────────────────┤
│ 逻辑: outfit_type === "default"                             │
│   ? "" : `${outfit_type}_outfit`                            │
│ 示例: "school" → "school_outfit"                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────┐
        │ generate_image === true?        │
        └─────────────────────────────────┘
                 ↓ YES          ↓ NO
    ┌────────────────┐          │
    │ 8. 图片生成流程 │          │ (跳到步骤 11)
    └────────────────┘          │
            ↓                   │
┌─────────────────────────────────────────────────────────────┐
│ 8.1 配额检查与扣减                                           │
├─────────────────────────────────────────────────────────────┤
│ 调用: assertAndIncrementUsage({                             │
│   userId,                                                   │
│   action: "image_generation",                               │
│   providerType: imageProviderType,                          │
│   amount: 1                                                 │
│ })                                                          │
│ 输出: usageSnapshot { count, limit }                        │
│ 失败: 429 { error, code: "QUOTA_EXCEEDED", limit, used }   │
└─────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8.2 确保 MinIO Bucket 存在                                  │
├─────────────────────────────────────────────────────────────┤
│ 调用: ensureBucketExists()                                  │
│ 作用: 确保 MINIO_BUCKET 存在并可访问                        │
└─────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8.3 调用 AI 生成服装图片                                     │
├─────────────────────────────────────────────────────────────┤
│ 调用: generateOutfit(                                       │
│   characterDesc,        // 角色描述                         │
│   outfit_type,          // 服装类型                         │
│   promptModifier,       // 简化后的服装描述                 │
│   imageProviderType,    // Provider 类型                    │
│   finalReferenceImageUrl // 参考图 URL                      │
│ )                                                           │
│ 策略:                                                        │
│   - 有参考图: 提示词极简，依赖参考图                        │
│   - 无参考图: 使用完整角色描述                              │
│ 输出: base64Image (Base64 编码的 PNG 图片)                  │
└─────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8.4 图片上传到 MinIO                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. base64ToBuffer(base64Image) → imageBuffer               │
│ 2. 生成对象路径:                                            │
│    users/{userId}/characters/{character_id}/outfits/        │
│    {safeOutfitName}_{timestamp}.png                         │
│ 3. minioClient.putObject(                                   │
│      MINIO_BUCKET, objectName, imageBuffer,                 │
│      { "Content-Type": "image/png" }                        │
│    )                                                        │
│ 4. getPublicUrl(objectName) → imageUrl                     │
│ 输出: imageUrl (公开访问 URL)                               │
└─────────────────────────────────────────────────────────────┘
            ↓                   │
            └───────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. 处理默认服装逻辑                                          │
├─────────────────────────────────────────────────────────────┤
│ 如果 outfit_type === "default":                             │
│   prisma.characterOutfit.updateMany({                       │
│     where: { character_id, is_default: true },             │
│     data: { is_default: false }                            │
│   })                                                        │
│ 作用: 取消该角色的其他默认服装                               │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. 检查服装是否已存在                                       │
├─────────────────────────────────────────────────────────────┤
│ 查询: prisma.characterOutfit.findFirst({                    │
│   where: { character_id, outfit_type }                     │
│ })                                                          │
│ 输出: existingOutfit (可能为 null)                          │
└─────────────────────────────────────────────────────────────┘
                    ↓
        ┌───────────────────────────┐
        │ existingOutfit 存在?       │
        └───────────────────────────┘
             ↓ YES        ↓ NO
    ┌────────────┐   ┌────────────┐
    │ 11.1 更新  │   │ 11.2 创建  │
    └────────────┘   └────────────┘
            ↓                ↓
┌─────────────────────────────────────────────────────────────┐
│ 11.1 更新现有服装                                            │
├─────────────────────────────────────────────────────────────┤
│ prisma.characterOutfit.update({                             │
│   where: { id: existingOutfit.id },                        │
│   data: {                                                   │
│     outfit_name,                                            │
│     image_url,                                              │
│     prompt_modifier,                                        │
│     trigger_word                                            │
│   }                                                         │
│ })                                                          │
│ 返回状态: 200                                                │
└─────────────────────────────────────────────────────────────┘
            ↓                ↓
┌─────────────────────────────────────────────────────────────┐
│ 11.2 创建新服装                                              │
├─────────────────────────────────────────────────────────────┤
│ prisma.characterOutfit.create({                             │
│   data: {                                                   │
│     character_id,                                           │
│     outfit_name,                                            │
│     outfit_type,                                            │
│     prompt_modifier,                                        │
│     trigger_word,                                           │
│     is_default: outfit_type === "default",                  │
│     image_url                                               │
│   }                                                         │
│ })                                                          │
│ 返回状态: 201                                                │
└─────────────────────────────────────────────────────────────┘
            ↓                ↓
            └────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 12. 记录生成日志（如果生成了图片）                           │
├─────────────────────────────────────────────────────────────┤
│ recordGenerationLog({                                       │
│   userId,                                                   │
│   action: "image_generation",                               │
│   providerType: imageProviderType,                          │
│   status: "success",                                        │
│   durationMs: Date.now() - startedAt,                      │
│   requestPayload: { character_id, outfit_name, ... },      │
│   responsePayload: { image_generated: true, image_url }    │
│ })                                                          │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 13. 返回成功响应                                             │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   success: true,                                            │
│   outfit: { id, character_id, outfit_name, ... },          │
│   usage: { count, limit },                                 │
│   message: "服装创建/更新成功，图片已生成"                   │
│ }                                                           │
│ 状态码: 200 (更新) / 201 (创建)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 关键数据结构

### 请求体 (Request Body)
```typescript
{
  character_id: string;           // 必需
  outfit_name: string;            // 必需，如 "校服"
  outfit_type: OutfitType;        // 必需，如 "school"
  description?: string;           // 可选，如 "蓝白色水手服，有蝴蝶结"
  generate_image?: boolean;       // 可选，默认 false
  provider_type?: string;         // 可选，默认 "image_generation_outfit"
  reference_image_url?: string;   // 可选，参考图 URL
}
```

### 响应体 (Response)
```typescript
// 成功
{
  success: true,
  outfit: {
    id: string,
    character_id: string,
    outfit_name: string,
    outfit_type: string,
    image_url: string,
    prompt_modifier: string,
    trigger_word: string,
    is_default: boolean,
    created_at: Date,
    updated_at: Date
  },
  usage?: { count: number, limit: number },
  message: string
}

// 失败
{
  error: string,
  code?: "MODEL_NOT_CONFIGURED" | "QUOTA_EXCEEDED",
  provider_type?: string,
  limit?: number,
  used?: number
}
```

---

## 错误处理流程

| 错误类型 | 状态码 | 响应 |
|---------|--------|------|
| 未登录 | 401 | `{ error: "未登录" }` |
| 无效 token | 401 | `{ error: "无效的token" }` |
| 缺少必需参数 | 400 | `{ error: "角色ID、服装名称和类型不能为空" }` |
| 角色不存在/无权限 | 404 | `{ error: "角色不存在" }` |
| Provider 未配置 | 400 | `{ error: "...", code: "MODEL_NOT_CONFIGURED" }` |
| 配额超限 | 429 | `{ error: "...", code: "QUOTA_EXCEEDED", limit, used }` |
| 服务器错误 | 500 | `{ error: "创建服装失败" }` |

---

## 核心业务规则

### 1. 幂等性
同一角色的同一 `outfit_type` 只能有一条记录
- **如果已存在** → 更新（主要更新 `image_url`）
- **如果不存在** → 创建

### 2. 默认服装唯一性
每个角色只能有一个 `is_default=true` 的服装
- 创建新的 `default` 类型时，自动取消其他默认服装

### 3. 参考图智能选择
优先级从高到低：
1. 用户指定的 `reference_image_url`
2. 角色主图 `base_image_url`
3. 中性表情图 `expressions[neutral].image_url`
4. 任意表情图 `expressions[0].image_url`
5. 正面三视图 `views[front].image_url`
6. 任意三视图 `views[0].image_url`

### 4. 提示词策略
- **有参考图**: 提示词极简，依赖参考图主导生成
- **无参考图**: 使用完整角色描述

### 5. 配额管理
仅在 `generate_image=true` 时扣减配额
- **扣减时机**: 图片生成前
- **扣减数量**: 1 次

---

## 依赖的外部服务

| 服务 | 用途 | 失败影响 |
|------|------|----------|
| **PostgreSQL** | 存储角色、服装数据 | 致命错误 500 |
| **LLM Provider (storyboard)** | 简化服装描述 | 使用原始描述继续 |
| **LLM Provider (image_generation)** | 生成服装图片 | 返回 400 或 500 |
| **MinIO** | 存储生成的图片 | 返回 500 |

---

## 性能特征

### 平均响应时间
- **不生成图片**: ~100-300ms (仅数据库操作)
- **生成图片**: ~5-30s (取决于 AI 生成速度)

### 并发安全性
- ✅ 同一角色的不同 `outfit_type` 可并发创建
- ⚠️ 同一角色的相同 `outfit_type` 并发创建可能导致竞态条件（最后一个请求胜出）

### 资源消耗
- **数据库查询**: 3-5 次
- **LLM 调用**: 1-2 次（描述简化 + 图片生成）
- **MinIO 上传**: 1 次（如果生成图片）

---

## 使用示例

### 示例 1: 创建服装（不生成图片）
```bash
curl -X POST http://localhost:3000/api/character/outfits \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_123",
    "outfit_name": "校服",
    "outfit_type": "school",
    "description": "蓝白色水手服，有蝴蝶结"
  }'
```

**响应**:
```json
{
  "success": true,
  "outfit": {
    "id": "outfit_456",
    "character_id": "char_123",
    "outfit_name": "校服",
    "outfit_type": "school",
    "image_url": "/placeholder-outfit.jpg",
    "prompt_modifier": "blue and white, sailor style, bow tie",
    "trigger_word": "school_outfit",
    "is_default": false
  },
  "message": "服装创建成功"
}
```

### 示例 2: 创建服装并生成图片
```bash
curl -X POST http://localhost:3000/api/character/outfits \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_123",
    "outfit_name": "战斗服",
    "outfit_type": "battle",
    "description": "黑色紧身战斗服，带护甲",
    "generate_image": true,
    "provider_type": "image_generation_outfit"
  }'
```

**响应**:
```json
{
  "success": true,
  "outfit": {
    "id": "outfit_789",
    "character_id": "char_123",
    "outfit_name": "战斗服",
    "outfit_type": "battle",
    "image_url": "http://localhost:9000/manga-assets/users/user_123/characters/char_123/outfits/battle_1702345678.png",
    "prompt_modifier": "black, tight-fitting, combat suit, armor",
    "trigger_word": "battle_outfit",
    "is_default": false
  },
  "usage": {
    "count": 15,
    "limit": 100
  },
  "message": "服装创建成功，图片已生成"
}
```

### 示例 3: 使用参考图生成服装
```bash
curl -X POST http://localhost:3000/api/character/outfits \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_123",
    "outfit_name": "休闲装",
    "outfit_type": "casual",
    "generate_image": true,
    "reference_image_url": "http://example.com/reference.jpg"
  }'
```

---

## 注意事项

1. **参考图的重要性**: 有参考图时，生成质量显著提高，提示词会自动简化
2. **配额管理**: 确保用户有足够的配额，否则会返回 429 错误
3. **幂等性**: 重复创建相同 `outfit_type` 会更新而不是创建新记录
4. **默认服装**: 每个角色只能有一个默认服装，创建新默认服装会自动取消旧的
5. **Provider 配置**: 确保在 `/admin/llm-providers` 中配置了所需的 provider

---

## 相关文件

- **接口实现**: `src/app/api/character/outfits/route.ts`
- **服装生成逻辑**: `src/lib/outfit-generation.ts`
- **LLM Provider**: `src/lib/llm-provider.ts`
- **配额管理**: `src/lib/usage.ts`
- **MinIO 配置**: `src/lib/minio.ts`
- **数据库 Schema**: `prisma/schema.prisma` (CharacterOutfit 模型)

---

## 更新日志

- **2025-12-12**: 初始文档创建，基于当前代码实现
