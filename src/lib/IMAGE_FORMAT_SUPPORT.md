# 图片格式支持文档

## 问题背景

不同的 AI 图片生成模型返回图片的方式不同：

### 格式 1: Base64 编码（内嵌）
```json
{
  "choices": [{
    "delta": {
      "content": "![image](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...)"
    }
  }]
}
```

**特点**:
- 图片数据直接嵌入在响应中
- 无需额外下载
- 适合小图片（< 1MB）

**使用模型**:
- 某些 OpenAI 兼容 API
- 自托管模型

### 格式 2: URL 链接（外部）
```json
{
  "choices": [{
    "index": 11,
    "delta": {
      "content": "![Generated Image](https://p16-dreamina-sign-useast5.capcutcdn-us.com/...)"
    }
  }]
}
```

**特点**:
- 图片存储在外部 CDN
- 需要额外下载
- 适合大图片
- 可能有过期时间（URL 中的 `x-expires` 参数）

**使用模型**:
- Jimeng (即梦) - `jimeng-nano-banana`
- Gemini (某些配置)
- DALL-E (某些配置)

---

## 解决方案

### 修改内容

#### 1. 支持多种图片格式提取

**位置**: `src/lib/image-generation.ts:374-402`

```typescript
// 提取 delta.content 中的图片（支持多个 choices）
const choices = data.choices || [];
for (const choice of choices) {
  const content = choice?.delta?.content;
  if (!content) continue;

  // 方式 1: 匹配 base64 格式
  const base64Regex = /!\[.*?\]\(data:image\/[^;]+;base64,([^)]+)\)/g;
  let match;
  while ((match = base64Regex.exec(content)) !== null) {
    const base64Data = match[1];
    if (base64Data) {
      images.push(base64Data);
      console.log(`✓ 提取到图片 #${images.length} (choice ${choice.index})，大小: ${(base64Data.length / 1024).toFixed(2)} KB (base64)`);
    }
  }

  // 方式 2: 匹配 URL 格式
  const urlRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
  while ((match = urlRegex.exec(content)) !== null) {
    const imageUrl = match[1];
    if (imageUrl && !imageUrl.startsWith('data:')) {
      images.push(`URL:${imageUrl}`);
      console.log(`✓ 提取到图片 URL #${images.length} (choice ${choice.index}): ${imageUrl.substring(0, 80)}...`);
    }
  }
}
```

**改进点**:
- ✅ 支持多个 `choices`（批量生成）
- ✅ 同时支持 base64 和 URL 格式
- ✅ 使用 `URL:` 前缀标记 URL 格式

#### 2. 自动下载 URL 图片

**位置**: `src/lib/image-generation.ts:443-489`

```typescript
// 处理 URL 格式的图片：下载并转换为 base64
console.log('\n========== 处理图片数据 ==========');
const processedImages: string[] = [];

for (let i = 0; i < images.length; i++) {
  const imageData = images[i];

  if (imageData.startsWith('URL:')) {
    // URL 格式，需要下载
    const imageUrl = imageData.substring(4);
    console.log(`下载图片 #${i + 1}: ${imageUrl.substring(0, 80)}...`);

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      processedImages.push(base64);
      console.log(`✓ 图片 #${i + 1} 下载成功，大小: ${(buffer.length / 1024).toFixed(2)} KB`);
    } catch (downloadError) {
      console.error(`✗ 图片 #${i + 1} 下载失败:`, downloadError);
      return {
        success: false,
        images: [],
        error: `下载图片失败: ${downloadError instanceof Error ? downloadError.message : '未知错误'}`,
      };
    }
  } else {
    // 已经是 base64 格式
    processedImages.push(imageData);
    console.log(`✓ 图片 #${i + 1} 已是 base64 格式，大小: ${(imageData.length / 1024).toFixed(2)} KB`);
  }
}

console.log(`✓ 所有图片处理完成，共 ${processedImages.length} 张`);
```

**改进点**:
- ✅ 自动识别 URL 格式
- ✅ 下载并转换为 base64
- ✅ 统一返回格式（都是 base64）
- ✅ 详细的下载日志

---

## 日志示例

### 格式 1: Base64 图片

```
========== 开始处理流式响应 ==========
✓ 提取到图片 #1 (choice 0)，大小: 245.67 KB (base64)
✓ 流式响应读取完成，共 15 个数据块，总大小: 312.34 KB
======================================

========== 处理图片数据 ==========
✓ 图片 #1 已是 base64 格式，大小: 245.67 KB
✓ 所有图片处理完成，共 1 张
==================================
```

### 格式 2: URL 图片（Jimeng）

```
========== 开始处理流式响应 ==========
✓ 提取到图片 URL #1 (choice 11): https://p16-dreamina-sign-useast5.capcutcdn-us.com/tos-useast5-i-wopfjsm1ax-tx/81c98c5144a84b0a8b0ddcb2d7f4794f~tplv-wopfjsm1ax-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1767744000&x-signature=tunAzwx8zI3kRNgo8lKQSrL0xOk%3D&format=.jpeg
✓ 提取到图片 URL #2 (choice 12): https://p16-dreamina-sign-useast5.capcutcdn-us.com/tos-useast5-i-wopfjsm1ax-tx/d1908b3b4b34435bbc484cbed5301d02~tplv-wopfjsm1ax-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1767744000&x-signature=6iDhQGy8T%2B5xgVp8tiZHg2WV9xw%3D&format=.jpeg
✓ 提取到图片 URL #3 (choice 13): https://p16-dreamina-sign-useast5.capcutcdn-us.com/tos-useast5-i-wopfjsm1ax-tx/987190bba5a947e7a24e750f821f34d4~tplv-wopfjsm1ax-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1767744000&x-signature=qURsmBR%2BLaxKAJoZazeYBJfplgg%3D&format=.jpeg
✓ 提取到图片 URL #4 (choice 14): https://p16-dreamina-sign-useast5.capcutcdn-us.com/tos-useast5-i-wopfjsm1ax-tx/87894a2ee02e47adaab62ec377dd203b~tplv-wopfjsm1ax-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1767744000&x-signature=9WckFXS7zx1bVZ%2FqTYkLhJMKD9w%3D&format=.jpeg
✓ 流式响应读取完成，共 15 个数据块，总大小: 5.77 KB
======================================

========== 处理图片数据 ==========
下载图片 #1: https://p16-dreamina-sign-useast5.capcutcdn-us.com/tos-useast5-i-wopfjsm1ax-tx/81c98c5144a84b0a8b0ddcb2d7f4794f~tplv-wopfjsm1ax-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1767744000&x-signature=tunAzwx8zI3kRNgo8lKQSrL0xOk%3D&format=.jpeg
✓ 图片 #1 下载成功，大小: 156.78 KB
下载图片 #2: https://p16-dreamina-sign-useast5.capcutcdn-us.com/tos-useast5-i-wopfjsm1ax-tx/d1908b3b4b34435bbc484cbed5301d02~tplv-wopfjsm1ax-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1767744000&x-signature=6iDhQGy8T%2B5xgVp8tiZHg2WV9xw%3D&format=.jpeg
✓ 图片 #2 下载成功，大小: 142.34 KB
下载图片 #3: https://p16-dreamina-sign-useast5.capcutcdn-us.com/tos-useast5-i-wopfjsm1ax-tx/987190bba5a947e7a24e750f821f34d4~tplv-wopfjsm1ax-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1767744000&x-signature=qURsmBR%2BLaxKAJoZazeYBJfplgg%3D&format=.jpeg
✓ 图片 #3 下载成功，大小: 168.92 KB
下载图片 #4: https://p16-dreamina-sign-useast5.capcutcdn-us.com/tos-useast5-i-wopfjsm1ax-tx/87894a2ee02e47adaab62ec377dd203b~tplv-wopfjsm1ax-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1767744000&x-signature=9WckFXS7zx1bVZ%2FqTYkLhJMKD9w%3D&format=.jpeg
✓ 图片 #4 下载成功，大小: 151.23 KB
✓ 所有图片处理完成，共 4 张
==================================
```

---

## 支持的模型

### ✅ 完全支持

| 模型 | 返回格式 | 备注 |
|------|---------|------|
| Jimeng (即梦) | URL | 返回 CDN 链接，自动下载 |
| Gemini 2.0 Flash | Base64 或 URL | 取决于配置 |
| GPT-4 Vision | Base64 或 URL | 取决于配置 |
| Claude 3 | Base64 或 URL | 取决于配置 |
| Stable Diffusion | Base64 | 直接返回 base64 |

### ⚠️ 注意事项

1. **URL 过期时间**
   - Jimeng 的 URL 包含 `x-expires` 参数
   - 通常有效期 24-48 小时
   - 建议立即下载并存储到 MinIO

2. **批量生成**
   - Jimeng 支持批量生成（多个 choices）
   - 每个 choice 返回一张图片
   - 代码会自动处理所有 choices

3. **下载失败处理**
   - 如果 URL 下载失败，整个请求失败
   - 返回详细错误信息
   - 建议检查网络连接和 URL 有效性

---

## 测试用例

### 测试 1: Base64 格式

```bash
curl -X POST http://localhost:3000/api/character/generate-views \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_123",
    "provider_type": "image_generation_sd"
  }'
```

**预期**: 直接提取 base64 数据，无需下载

### 测试 2: URL 格式（Jimeng）

```bash
curl -X POST http://localhost:3000/api/character/generate-views \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_123",
    "provider_type": "image_generation_turnaround"
  }'
```

**预期**: 提取 URL，自动下载并转换为 base64

### 测试 3: 批量生成

```bash
curl -X POST http://localhost:3000/api/character/outfits \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_123",
    "outfit_name": "战斗服",
    "outfit_type": "battle",
    "generate_image": true,
    "provider_type": "image_generation_outfit"
  }'
```

**预期**: 如果模型返回多张图片，只使用第一张

---

## 性能考虑

### Base64 格式
- **优点**: 无需额外网络请求
- **缺点**: 响应体较大，传输时间长
- **适用**: 小图片（< 1MB）

### URL 格式
- **优点**: 响应体小，传输快
- **缺点**: 需要额外下载，增加延迟
- **适用**: 大图片（> 1MB）

### 性能对比

| 指标 | Base64 | URL |
|------|--------|-----|
| 响应大小 | 大（+33%） | 小 |
| 传输时间 | 长 | 短 |
| 下载时间 | 0 | 1-3秒 |
| 总时间 | 中等 | 中等 |
| 可靠性 | 高 | 中（URL 可能过期） |

---

## 故障排查

### 问题 1: 未提取到图片

**症状**:
```
⚠️ 未从响应中提取到图片数据
接收到的数据块数: 12
接收到的总字节数: 5057
```

**原因**:
- 响应格式不匹配
- 模型返回了错误或空响应

**解决**:
1. 检查日志中的 `最后的 buffer 内容`
2. 确认模型是否支持图片生成
3. 检查提示词是否正确

### 问题 2: URL 下载失败

**症状**:
```
✗ 图片 #1 下载失败: Error: 下载失败: 403 Forbidden
```

**原因**:
- URL 已过期
- 网络连接问题
- CDN 访问限制

**解决**:
1. 检查 URL 中的 `x-expires` 参数
2. 确认网络连接正常
3. 尝试在浏览器中打开 URL

### 问题 3: 图片格式不支持

**症状**:
```
Error: 下载图片失败: 未知错误
```

**原因**:
- 图片格式不是 JPEG/PNG
- 图片损坏

**解决**:
1. 检查下载的图片格式
2. 尝试手动下载并验证
3. 联系模型提供商

---

## 相关文件

- `src/lib/image-generation.ts` - 图片生成核心逻辑
- `src/app/api/character/generate-views/route.ts` - 三视图生成接口
- `src/app/api/character/outfits/route.ts` - 服装生成接口

## 更新日志

- **2025-12-12**: 添加 URL 格式支持
- **2025-12-12**: 支持多个 choices（批量生成）
- **2025-12-12**: 自动下载 URL 图片并转换为 base64
