# 图片生成错误诊断指南

## 错误：`TypeError: terminated` / `other side closed`

### 错误信息
```
OpenAI/Gemini API error: TypeError: terminated
  at Fetch.onAborted (node:internal/deps/undici/undici:11762:53)
  ...
  [cause]: SocketError: other side closed
    code: 'UND_ERR_SOCKET'
```

### 根本原因
**连接在数据传输过程中被服务器关闭**，通常由以下原因导致：

1. **参考图过大** ⚠️ **最常见原因**
   - 你的日志显示：`参考图大小: 7417.12 KB (base64)` ≈ **7.4 MB**
   - 这远超合理大小，导致：
     - 请求体过大（> 10MB）
     - 上传时间过长
     - 服务器超时或拒绝连接

2. **网络超时**
   - AI 服务器响应时间过长
   - 网络不稳定导致连接中断

3. **服务器限制**
   - API 服务器对请求大小有限制（通常 10-20MB）
   - 超过限制后直接关闭连接

### 解决方案

#### 方案 1: 限制参考图大小（推荐）✅

**已实现**: 代码现在会自动检查参考图大小，限制为 **3MB**

```typescript
// src/lib/image-generation.ts:550
const MAX_IMAGE_SIZE_MB = 3; // 最大 3MB
```

如果参考图超过 3MB，会抛出错误：
```
参考图过大 (7.24 MB)，超过限制 3 MB。
大图片会导致请求超时或被服务器拒绝。
请使用较小的图片或压缩后再使用。
```

#### 方案 2: 压缩参考图

在上传参考图之前，先压缩图片：

**使用在线工具**:
- TinyPNG: https://tinypng.com/
- Squoosh: https://squoosh.app/

**使用命令行**:
```bash
# 使用 ImageMagick 压缩
convert input.png -quality 85 -resize 1024x1024\> output.png

# 使用 ffmpeg 压缩
ffmpeg -i input.png -vf scale=1024:-1 -q:v 5 output.png
```

**目标大小**: < 500KB（最佳）, < 1MB（可接受）, < 3MB（上限）

#### 方案 3: 不使用参考图

如果参考图不是必需的，可以：

1. **删除角色的 base_image_url**
   ```sql
   UPDATE characters SET base_image_url = NULL WHERE id = 'your_character_id';
   ```

2. **删除角色的表情图**
   ```sql
   DELETE FROM character_expressions WHERE character_id = 'your_character_id';
   ```

3. **使用纯文本描述生成**
   - 系统会自动降级到纯文本提示词
   - 日志会显示：`✗ 未找到可用的参考图，将不使用参考图生成`

#### 方案 4: 调整参考图优先级

修改 `src/app/api/character/generate-views/route.ts:148-176`，跳过大图片：

```typescript
// 第一优先级：使用角色的主图片（base_image_url）
if (character.base_image_url) {
  // 先检查图片大小
  try {
    const response = await fetch(character.base_image_url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) < 3 * 1024 * 1024) {
      referenceImageUrl = character.base_image_url;
      console.log(`✓ 使用角色主图作为参考图: ${referenceImageUrl}`);
    } else {
      console.warn(`⚠️ 角色主图过大，跳过`);
    }
  } catch (error) {
    console.warn(`⚠️ 无法检查角色主图大小，跳过`);
  }
}
```

---

## 错误：`未从响应中提取到图片数据`

### 错误信息
```
Error: 三视图生成失败（正面）: 未从响应中提取到图片数据
```

### 根本原因

1. **流式响应被中断**
   - 连接在图片数据传输前就断开了
   - 通常是上一个错误（`terminated`）的后续结果

2. **模型返回格式不匹配**
   - 模型返回的不是预期的 markdown 格式
   - 预期格式：`![image](data:image/png;base64,...)`

3. **模型不支持参考图**
   - 某些模型不支持多模态输入（图片+文本）
   - 导致模型无法处理请求

### 解决方案

#### 方案 1: 查看详细日志

**新增的日志会显示**:

```
========== 开始处理流式响应 ==========
  接收中... 数据块: 10, 已接收: 125.45 KB
  接收中... 数据块: 20, 已接收: 256.78 KB
✓ 流式响应读取完成，共 25 个数据块，总大小: 312.34 KB
✓ 提取到图片 #1，大小: 245.67 KB (base64)
======================================
```

**如果看到**:
```
========== 流式响应读取错误 ==========
错误类型: TypeError
错误消息: terminated
已接收数据块: 5
已接收字节: 7595978
已提取图片: 0
======================================
```

说明连接在接收数据时中断了（通常是参考图过大）。

#### 方案 2: 检查模型配置

确保使用的模型支持多模态输入：

**支持的模型**:
- ✅ Gemini 2.0 Flash (`gemini-2.0-flash-exp`)
- ✅ Gemini 1.5 Pro (`gemini-1.5-pro`)
- ✅ GPT-4 Vision (`gpt-4-vision-preview`)
- ✅ Claude 3 Opus/Sonnet (`claude-3-opus`, `claude-3-sonnet`)

**不支持的模型**:
- ❌ GPT-3.5 Turbo
- ❌ 纯文本模型

**检查配置**:
```sql
SELECT * FROM llm_providers WHERE provider_type = 'image_generation_turnaround';
```

#### 方案 3: 测试不使用参考图

临时禁用参考图，测试模型是否正常工作：

```typescript
// 在 route.ts:191 强制设置为 undefined
const { front, side, back, prompts } = await generateThreeViews(
  optimizedDescription,
  imageProviderType,
  undefined  // 强制不使用参考图
);
```

如果不使用参考图能成功，说明问题确实是参考图导致的。

---

## 错误：`参考图过大`

### 错误信息
```
参考图过大 (7.24 MB)，超过限制 3 MB。
大图片会导致请求超时或被服务器拒绝。
请使用较小的图片或压缩后再使用。
```

### 根本原因
参考图文件大小超过 3MB 限制。

### 解决方案

#### 方案 1: 压缩现有图片

**使用 ImageMagick**:
```bash
# 压缩到 1024x1024，质量 85%
convert large_image.png -quality 85 -resize 1024x1024\> compressed.png

# 批量压缩
for img in *.png; do
  convert "$img" -quality 85 -resize 1024x1024\> "compressed_$img"
done
```

**使用 Node.js (Sharp)**:
```javascript
const sharp = require('sharp');

await sharp('large_image.png')
  .resize(1024, 1024, { fit: 'inside' })
  .png({ quality: 85 })
  .toFile('compressed.png');
```

#### 方案 2: 调整限制（不推荐）

如果确实需要使用大图片，可以调整限制：

```typescript
// src/lib/image-generation.ts:550
const MAX_IMAGE_SIZE_MB = 5; // 增加到 5MB（风险：可能超时）
```

**警告**: 增加限制可能导致：
- 请求超时
- 服务器拒绝连接
- 内存占用过高

#### 方案 3: 使用缩略图

在数据库中存储两个版本：
- `base_image_url`: 原图（用于展示）
- `thumbnail_url`: 缩略图（用于 AI 参考）

```sql
ALTER TABLE characters ADD COLUMN thumbnail_url TEXT;

-- 更新现有数据
UPDATE characters
SET thumbnail_url = base_image_url
WHERE base_image_url IS NOT NULL;
```

然后修改参考图查找逻辑，优先使用 `thumbnail_url`。

---

## 调试技巧

### 1. 查看完整日志

新增的日志会显示：

```
========== 下载参考图 ==========
URL: http://localhost:9000/manga-assets/...
Content-Length: 7595978 KB (7.24 MB)
⚠️ 参考图过大 (7.24 MB)，超过限制 3 MB
================================

========== 流式响应读取错误 ==========
错误类型: TypeError
错误消息: terminated
已接收数据块: 5
已接收字节: 7595978
已提取图片: 0
错误堆栈: ...
======================================
```

### 2. 测试参考图大小

```bash
# 检查图片大小
curl -I http://localhost:9000/manga-assets/your-image.png | grep Content-Length

# 下载并检查
curl -o test.png http://localhost:9000/manga-assets/your-image.png
ls -lh test.png
```

### 3. 测试不使用参考图

```bash
curl -X POST http://localhost:3000/api/character/generate-views \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{
    "character_id": "char_123",
    "description": "a cute anime girl with blue hair",
    "provider_type": "image_generation_turnaround"
  }'
```

如果成功，说明问题是参考图导致的。

### 4. 检查网络连接

```bash
# 测试 API 连接
curl -v https://api.67.si/v1/models

# 测试超时时间
time curl -X POST https://api.67.si/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"jimeng-nano-banana","messages":[{"role":"user","content":"test"}]}'
```

---

## 最佳实践

### 1. 参考图规范

- **分辨率**: 512x512 ~ 1024x1024
- **文件大小**: < 500KB（最佳）, < 1MB（推荐）, < 3MB（上限）
- **格式**: PNG（推荐）或 JPEG
- **压缩**: 使用 85% 质量压缩

### 2. 上传流程

```
用户上传 → 前端压缩 → 后端验证 → MinIO 存储
           ↓
        生成缩略图（用于 AI 参考）
```

### 3. 错误处理

- ✅ 在下载参考图前检查大小
- ✅ 设置合理的超时时间（30-60秒）
- ✅ 提供降级方案（不使用参考图）
- ✅ 记录详细日志便于调试

### 4. 监控指标

- 参考图平均大小
- 请求成功率
- 平均响应时间
- 超时错误频率

---

## 相关文件

- `src/lib/image-generation.ts` - 图片生成核心逻辑
- `src/app/api/character/generate-views/route.ts` - 三视图生成接口
- `src/app/api/character/outfits/route.ts` - 服装生成接口

## 更新日志

- **2025-12-12**: 添加参考图大小限制（3MB）
- **2025-12-12**: 添加详细的流式响应日志
- **2025-12-12**: 优化错误提示信息
