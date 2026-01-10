# 九宫格图片生成 userId 问题修复

## 问题描述

在调用九宫格图片生成接口时，出现错误：

```json
{"error":"需要消耗算力的操作必须提供 userId"}
```

## 问题原因

在 `src/lib/nine-grid-image-generator.ts` 中，调用 `callImageGenerationByType` 函数时，参数传递方式不正确：

### 错误的调用方式

```typescript
const result = await callImageGenerationByType({
  prompt: nineGridPrompt,
  negativePrompt: buildNegativePrompt(),
  width: 1536,
  height: 1536,
  steps: 30,
  cfgScale: 7,
  seed: -1,
}, userId);  // ❌ userId 作为第二个参数传递
```

### 问题分析

根据 `src/lib/image-generation/core.ts` 的定义，`callImageGenerationByType` 函数签名为：

```typescript
export async function callImageGenerationByType(
  params: {
    providerType: string;
    options?: ImageGenerationOptions;
  } & ImageGenerationParams
): Promise<ImageGenerationResult>
```

**关键点**：
1. 函数只接受一个参数对象
2. `userId` 必须通过 `options.userId` 传递
3. 必须包含 `providerType` 字段
4. 参数名称需要使用下划线命名（如 `negative_prompt` 而不是 `negativePrompt`）

## 修复方案

### 修改文件

`src/lib/nine-grid-image-generator.ts`

### 修改内容

#### 1. 修正 API 调用参数

```typescript
// ✅ 正确的调用方式
const result = await callImageGenerationByType({
  providerType: "image_generation",  // 必需：指定提供商类型
  prompt: nineGridPrompt,
  negative_prompt: buildNegativePrompt(),  // 使用下划线命名
  width: 1536,
  height: 1536,
  steps: 30,
  cfg_scale: 7,  // 使用下划线命名
  options: { userId },  // 必需：通过 options 传递 userId
});
```

#### 2. 修正返回值处理

```typescript
// ✅ 正确的返回值处理
// 检查生成结果
if (!result.success || !result.images || result.images.length === 0) {
  throw new Error(result.error || "图像生成失败：未返回图片数据");
}

// 将 base64 转换为 Buffer
const base64Image = result.images[0];
// 移除 base64 前缀（如果有）
const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
return Buffer.from(base64Data, "base64");
```

## 修复后的完整代码

```typescript
export async function generateNineGridImage(
  params: NineGridImageParams,
  userId?: string
): Promise<Buffer> {
  const { panels, stylePrompt, referenceImage, storyTitle, genre } = params;

  if (panels.length !== 9) {
    throw new Error(`必须提供恰好 9 个分镜，当前提供了 ${panels.length} 个`);
  }

  // 构建九宫格提示词
  const nineGridPrompt = buildNineGridPrompt(panels, {
    stylePrompt,
    referenceImage,
    storyTitle,
    genre,
  });

  console.log("九宫格提示词:", nineGridPrompt);

  // 调用图像生成 API
  try {
    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: nineGridPrompt,
      negative_prompt: buildNegativePrompt(),
      width: 1536,  // 3×3 布局，每格 512px
      height: 1536,
      steps: 30,
      cfg_scale: 7,
      options: { userId },
    });

    // 检查生成结果
    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || "图像生成失败：未返回图片数据");
    }

    // 将 base64 转换为 Buffer
    const base64Image = result.images[0];
    // 移除 base64 前缀（如果有）
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  } catch (error) {
    console.error("九宫格图片生成失败:", error);
    throw error;
  }
}
```

## 验证

### 1. Lint 检查

```bash
pnpm run lint
```

✅ 无错误

### 2. 类型检查

```bash
pnpm run type-check
```

✅ 无错误

### 3. 功能测试

1. 登录系统
2. 打开九宫格对话框
3. 选择章节和 9 个分镜
4. 点击生成
5. 验证图片生成成功

## 参考其他接口

### 正确的调用示例 1：分镜生成

```typescript
// src/app/api/panel/generate-image/route.ts
const result = await callImageGenerationByType({
  providerType: "image_generation",
  prompt: fullPrompt,
  negative_prompt: negative_prompt,
  width: dimensions.width,
  height: dimensions.height,
  steps: num_inference_steps,
  cfg_scale: guidance_scale,
  referenceImageUrls: referenceImages,
  options: { userId },  // ✅ 通过 options 传递
});
```

### 正确的调用示例 2：角色生成

```typescript
// src/app/api/character/[id]/generate-image/route.ts
const imageResult = await callImageGenerationByType({
  providerType: "image_generation",
  prompt: finalPrompt,
  negative_prompt: "blurry, low quality...",
  width: 512,
  height: 768,
  steps: 25,
  cfg_scale: 7.5,
  options: { userId: payload.userId },  // ✅ 通过 options 传递
});
```

## 关键要点总结

1. ✅ **必须包含 `providerType`**：指定图片生成提供商类型
2. ✅ **userId 通过 `options` 传递**：`options: { userId }`
3. ✅ **使用下划线命名**：`negative_prompt`、`cfg_scale` 等
4. ✅ **检查返回结果**：验证 `result.success` 和 `result.images`
5. ✅ **正确处理 base64**：移除前缀后转换为 Buffer

## 影响范围

- ✅ 修复九宫格图片生成功能
- ✅ 不影响其他功能
- ✅ 向后兼容
- ✅ 无需数据库迁移

## 测试清单

- [x] 代码修改完成
- [x] Lint 检查通过
- [x] 类型检查通过
- [ ] 功能测试通过（需要用户验证）
- [ ] 算力扣除正确（需要用户验证）

## 后续建议

1. **统一 API 调用方式**：确保所有图片生成相关代码都使用相同的调用模式
2. **添加类型检查**：使用 TypeScript 严格模式避免参数传递错误
3. **完善错误处理**：提供更友好的错误提示
4. **添加单元测试**：覆盖图片生成核心逻辑
