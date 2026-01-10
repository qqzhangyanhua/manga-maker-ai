# 九宫格图片生成功能 - 完整实施文档

## 📋 功能概述

**版本**: v2.0.0  
**类型**: 九宫格图片生成（非分镜生成）  
**日期**: 2026-01-09

### 核心功能

- 手动选择章节中的 9 个分镜
- 将 9 个分镜组合成 1 张 3×3 九宫格布局的图片
- 图片保存到 MinIO
- 图片记录保存到数据库
- 最终可在素材库中查看

---

## 🏗️ 架构设计

### 数据流

```
用户操作
  ↓
选择章节 → 加载该章节的所有分镜
  ↓
手动勾选 9 个分镜（可视化选择）
  ↓
选择漫画风格（可选）
  ↓
选择参考图（可选）
  ↓
点击【生成九宫格图片】
  ↓
API: /api/chapter/[id]/generate-nine-grid-image
  ↓
1. 验证权限和参数
2. 获取 9 个分镜的详细信息
3. 构建九宫格提示词
4. 调用图像生成 API
5. 上传图片到 MinIO
6. 保存记录到数据库
  ↓
返回图片 URL
  ↓
显示成功提示
```

### 组件架构

```
NineGridDialog
├── 章节选择器
│   └── 触发加载该章节的分镜
├── 分镜选择区域
│   ├── 分镜列表（带预览图）
│   ├── 多选 Checkbox
│   ├── 选择计数器 (已选 X/9)
│   ├── 快捷按钮
│   │   ├── 选择前9个
│   │   └── 清空选择
│   └── 位置标记（显示在九宫格中的位置）
├── 风格选择器
│   └── 从漫画风格库选择
├── 参考图选择器
│   └── 从角色素材库选择
└── 生成按钮
    └── 仅在选择恰好 9 个分镜时可用
```

---

## 📁 文件清单

### 新增文件

1. **`src/app/scripts/[id]/components/NineGridDialog.tsx`** (重构)
   - 完全重写的九宫格对话框
   - 支持手动选择 9 个分镜
   - 可视化分镜选择界面
   - 实时显示选择状态

2. **`src/app/api/chapter/[id]/panels/route.ts`** (新增)
   - GET 端点
   - 获取章节的所有分镜
   - 用于分镜选择器

3. **`src/app/api/chapter/[id]/generate-nine-grid-image/route.ts`** (新增)
   - POST 端点
   - 生成九宫格图片
   - 上传到 MinIO
   - 保存到数据库

4. **`src/lib/nine-grid-image-generator.ts`** (新增)
   - 核心图像生成逻辑
   - 构建九宫格提示词
   - 调用图像生成 API

5. **`src/lib/minio.ts`** (更新)
   - 添加 `uploadToMinIO()` 函数
   - 支持 Buffer 上传

6. **`prisma/schema.prisma`** (更新)
   - 添加 `NineGridImage` 模型
   - 记录九宫格图片信息

---

## 🗄️ 数据库 Schema

### NineGridImage 模型

```prisma
model NineGridImage {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id           String   @db.Uuid
  chapter_id        String   @db.Uuid
  panel_ids         String[] // 9个分镜ID
  image_url         String   // MinIO URL
  prompt_combined   String   @db.Text // 组合后的提示词
  comic_style_id    String?  @db.Uuid
  reference_image   String?
  
  created_at DateTime @default(now()) @db.Timestamptz(6)
  updated_at DateTime @default(now()) @db.Timestamptz(6)

  @@index([user_id], map: "idx_nine_grid_images_user")
  @@index([chapter_id], map: "idx_nine_grid_images_chapter")
  @@map("nine_grid_images")
}
```

### 迁移步骤

```bash
# 1. 生成 Prisma Client
pnpm prisma generate

# 2. 创建迁移
pnpm prisma migrate dev --name add_nine_grid_images

# 3. 应用迁移（生产环境）
pnpm prisma migrate deploy
```

---

## 🎨 UI 设计

### 对话框布局

```
┌────────────────────────────────────────────┐
│ 九宫格图片生成                             │
├────────────────────────────────────────────┤
│                                            │
│ 📢 提示：选择 9 个分镜，生成 3×3 布局图片  │
│                                            │
│ 选择章节 *                                 │
│ ┌────────────────────────────────────┐    │
│ │ 第 1 章 - 初次交锋                ▼│    │
│ └────────────────────────────────────┘    │
│                                            │
│ ☑ 选择 9 个分镜 * (已选 3/9)              │
│    [选择前9个] [清空选择]                  │
│ ┌────────────────────────────────────┐    │
│ │ ☑ [图] 分镜 1: 竹林远景... [位置1] │    │
│ │ ☐ [图] 分镜 2: 李明站立... │    │
│ │ ☑ [图] 分镜 3: 张狂现身... [位置2] │    │
│ │ ☑ [图] 分镜 4: 两人对视... [位置3] │    │
│ │ ☐ [图] 分镜 5: 剑光闪烁...         │    │
│ │ ...                                │    │
│ └────────────────────────────────────┘    │
│                                            │
│ 🎨 漫画风格（可选）                       │
│ ┌────────────────────────────────────┐    │
│ │ 日式漫画 (Japanese Manga)         ▼│    │
│ └────────────────────────────────────┘    │
│                                            │
│ 🖼️ 参考图（可选）                         │
│ ┌────────────────────────────────────┐    │
│ │ 李明 - 日式漫画                   ▼│    │
│ └────────────────────────────────────┘    │
│ [预览图]                                   │
│                                            │
│  [取消]  [生成九宫格图片]                 │
└────────────────────────────────────────────┘
```

### 分镜卡片设计

```
┌─────────────────────────────────────┐
│ ☑ [缩略图] 分镜 3 [位置 2]         │
│            两人对视，紧张气氛...    │
└─────────────────────────────────────┘
  ↑      ↑        ↑         ↑
  复选框  预览图   分镜号    位置标记
```

---

## 🔌 API 文档

### 1. 获取章节分镜

**端点**: `GET /api/chapter/[id]/panels`

**权限**: 需要登录，章节所有者

**响应**:
```json
{
  "success": true,
  "panels": [
    {
      "id": "uuid",
      "panel_order": 1,
      "description": "竹林远景，月光洒下",
      "visual_prompt": "bamboo forest, moonlight...",
      "image_url": "https://..."
    }
  ],
  "total": 12
}
```

### 2. 生成九宫格图片

**端点**: `POST /api/chapter/[id]/generate-nine-grid-image`

**权限**: 需要登录，章节所有者，消耗配额

**请求体**:
```json
{
  "project_id": "uuid",
  "panel_ids": ["uuid1", "uuid2", ..., "uuid9"],
  "comic_style_id": "uuid (optional)",
  "style_prompt": "string (optional)",
  "reference_image": "url (optional)"
}
```

**响应**:
```json
{
  "success": true,
  "image_url": "https://minio.../nine-grid-xxx.png",
  "nine_grid_id": "uuid",
  "message": "成功生成九宫格图片"
}
```

**错误响应**:
```json
{
  "error": "必须选择恰好 9 个分镜",
  "code": "INVALID_PANEL_COUNT"
}
```

---

## 🎯 核心逻辑

### 九宫格提示词构建

```typescript
// 基础布局指令
3x3 grid layout, 9 panels storyboard, manga panels, 
sequential art, comic book style, continuous narrative

// 风格指令
+ [style_prompt]

// 每个分镜的描述
Panel 1 (top-left): [visual_prompt_1]
Panel 2 (top-center): [visual_prompt_2]
...
Panel 9 (bottom-right): [visual_prompt_9]

// 一致性要求
same characters throughout all panels,
consistent art style,
same color palette,
same lighting conditions,
continuous action flow,
professional storyboard quality
```

### 图像生成参数

```typescript
{
  width: 1536,   // 3×3 布局，每格 512px
  height: 1536,
  steps: 30,
  cfgScale: 7,
  seed: -1
}
```

---

## ✅ 测试清单

### 功能测试

- [ ] **章节选择**
  - [ ] 选择章节后加载分镜列表
  - [ ] 切换章节清空已选分镜
  - [ ] 无分镜章节显示提示

- [ ] **分镜选择**
  - [ ] 点击卡片勾选/取消分镜
  - [ ] 最多选择 9 个
  - [ ] 超过 9 个时禁用其他分镜
  - [ ] 显示选择计数 (X/9)
  - [ ] 显示位置标记 (位置 1-9)

- [ ] **快捷按钮**
  - [ ] "选择前9个"按钮功能
  - [ ] "清空选择"按钮功能
  - [ ] 分镜不足9个时禁用

- [ ] **风格和参考图**
  - [ ] 漫画风格选择正常
  - [ ] 参考图选择正常
  - [ ] 参考图预览显示

- [ ] **生成功能**
  - [ ] 未选满 9 个时按钮禁用
  - [ ] 选满 9 个后可生成
  - [ ] 生成中显示加载状态
  - [ ] 生成成功显示提示
  - [ ] 生成失败显示错误

### API 测试

- [ ] **权限验证**
  - [ ] 未登录返回 401
  - [ ] 非所有者返回 403

- [ ] **参数验证**
  - [ ] 缺少 project_id 返回 400
  - [ ] panel_ids 不是 9 个返回 400
  - [ ] 无效的 panel_ids 返回 400

- [ ] **生成测试**
  - [ ] 成功生成九宫格图片
  - [ ] 图片上传到 MinIO
  - [ ] 记录保存到数据库
  - [ ] 返回正确的 image_url

### 边界测试

- [ ] **数据边界**
  - [ ] 章节无分镜
  - [ ] 章节分镜少于 9 个
  - [ ] 章节分镜恰好 9 个
  - [ ] 章节分镜超过 9 个

- [ ] **性能测试**
  - [ ] 大量分镜时列表性能
  - [ ] 图像生成时间（预期 30-60秒）
  - [ ] 并发生成测试

---

## 🚀 部署步骤

### 1. 数据库迁移

```bash
# 开发环境
pnpm prisma migrate dev --name add_nine_grid_images

# 生产环境
pnpm prisma migrate deploy
```

### 2. 环境变量检查

确保以下环境变量已配置：

```env
# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=input-image
MINIO_USE_SSL=false

# 图像生成
# (根据您的图像生成服务配置)
```

### 3. 构建和启动

```bash
# 安装依赖
pnpm install

# 生成 Prisma Client
pnpm prisma generate

# 运行 lint
pnpm run lint

# 构建
pnpm run build

# 启动
pnpm run start
```

### 4. 验证功能

1. 访问剧本详情页
2. 点击【九宫格】按钮
3. 选择章节
4. 勾选 9 个分镜
5. 点击生成
6. 验证图片生成成功
7. 验证图片已上传到 MinIO
8. 验证记录已保存到数据库

---

## 📊 性能指标

### 预期性能

| 指标 | 目标值 | 说明 |
|------|--------|------|
| API 响应时间 | 30-60s | 取决于图像生成服务 |
| 图像大小 | 2-5 MB | 1536×1536 PNG |
| 数据库操作 | < 500ms | 保存记录 |
| MinIO 上传 | < 2s | 取决于网络 |

### 资源消耗

- **算力配额**: 1次图像生成配额
- **存储空间**: 约 3-5 MB/张
- **数据库**: 1条 NineGridImage 记录

---

## 🔒 安全性

### 已实现

- ✅ JWT Token 认证
- ✅ 章节所有权验证
- ✅ 项目所有权验证
- ✅ 配额检查与扣除
- ✅ 输入参数验证
- ✅ SQL 注入防护（Prisma）

### 待加强

- ⏳ 图片大小限制
- ⏳ 频率限制（Rate Limiting）
- ⏳ 图片内容审核
- ⏳ MinIO 访问控制

---

## 🐛 故障排除

### 问题 1：生成失败，提示"图像生成服务不可用"

**原因**: 图像生成服务未配置或不可用

**解决**:
1. 检查图像生成服务配置
2. 确保服务正常运行
3. 查看服务日志

### 问题 2：图片上传失败

**原因**: MinIO 配置错误或不可用

**解决**:
1. 检查 MinIO 环境变量
2. 确保 MinIO 服务运行
3. 测试 MinIO 连接

### 问题 3：选择分镜后无法生成

**原因**: 未选满 9 个分镜

**解决**:
1. 确保选择了恰好 9 个分镜
2. 查看选择计数器 (X/9)

---

## 📈 未来优化

### 短期（1-2周）

- [ ] 添加九宫格预览功能
- [ ] 支持自定义布局（2×2, 4×4等）
- [ ] 添加生成进度显示

### 中期（1-2月）

- [ ] 支持拖拽调整分镜顺序
- [ ] 添加九宫格模板
- [ ] 支持导出为 PDF

### 长期（3-6月）

- [ ] AI 智能推荐分镜组合
- [ ] 支持视频生成
- [ ] 多语言支持

---

## 📞 支持

如有任何问题：
- 📖 查看文档：本文档
- 🐛 提交 Issue：GitHub Issues
- 💬 技术支持：开发团队

---

**版本**: v2.0.0  
**发布日期**: 2026-01-09  
**开发者**: AI Assistant  
**状态**: ✅ 已完成，待测试和部署
