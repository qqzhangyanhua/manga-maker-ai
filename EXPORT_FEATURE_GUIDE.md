# 📦 导出功能使用指南

## ✅ 问题已修复

**原问题**：导出时提示"暂不支持导出格式"
**根本原因**：API 路由只支持 JSON 格式，但前端发送的是 pdf/png/zip
**解决方案**：完整实现了 PDF/PNG/ZIP 三种导出格式

---

## 🎯 支持的导出格式

### 1️⃣ PDF 格式 (推荐)
**适用场景**：印刷出版、电子书发布、专业分享

**功能特性**：
- ✅ 自动分页排版（根据"每页分镜数"设置）
- ✅ 支持自定义页面尺寸（A4/A5/B5/日漫/美漫/条漫）
- ✅ 支持自定义间距和边距
- ✅ 自动缩放图片以适应页面
- ✅ 保持图片宽高比
- ✅ 绘制分镜边框

**示例**：
```json
{
  "format": "pdf",
  "layout": {
    "pageWidth": 210,      // A4 宽度 (mm)
    "pageHeight": 297,     // A4 高度 (mm)
    "panelsPerPage": 4,    // 每页 4 个分镜
    "panelGap": 10,        // 分镜间距 (px)
    "pageMargin": 15       // 页面边距 (px)
  }
}
```

**输出文件**：`故事标题.pdf`

---

### 2️⃣ PNG 格式
**适用场景**：社交媒体发布（微博/B站）、网页展示

**功能特性**：
- ✅ 下载所有分镜原图
- ✅ 自动打包为 ZIP 压缩包
- ✅ 按顺序命名（panel-001.png, panel-002.png...）
- ✅ 保留原始图片质量

**注意**：
- PNG 导出实际返回 ZIP 包（包含所有单张 PNG 图片）
- 如需合成单张长图，建议在客户端使用 Canvas 实现

**输出文件**：`故事标题-panels.zip`

---

### 3️⃣ ZIP 格式
**适用场景**：批量下载、存档备份、二次编辑

**功能特性**：
- ✅ 包含所有分镜原图
- ✅ 包含项目元数据（metadata.json）
- ✅ 结构化目录（images/ 文件夹）
- ✅ 按顺序命名

**文件结构**：
```
故事标题-complete.zip
├── metadata.json      # 项目元数据
└── images/
    ├── panel-001.jpg
    ├── panel-002.jpg
    └── ...
```

**metadata.json 内容**：
```json
{
  "project": {
    "id": "xxx",
    "title": "我的故事",
    "description": "...",
    "exportedAt": "2026-01-03T12:00:00.000Z"
  },
  "panels": [
    {
      "order": 1,
      "description": "开场镜头",
      "dialogue": "你好，世界！",
      "filename": "panel-001.jpg"
    }
  ]
}
```

**输出文件**：`故事标题-complete.zip`

---

### 4️⃣ JSON 格式
**适用场景**：数据备份、系统集成、API 交互

**功能特性**：
- ✅ 完整项目数据
- ✅ 包含分镜、角色、场景信息
- ✅ 可用于导入其他系统

**输出文件**：`故事标题.json`

---

## 🛠️ 技术实现

### 后端 API

**路由**：`POST /api/project/[id]/export`

**请求参数**：
```typescript
{
  format: "pdf" | "png" | "zip" | "json",
  layout?: {
    pageWidth: number,      // 页面宽度 (mm)
    pageHeight: number,     // 页面高度 (mm)
    panelsPerPage: number,  // 每页分镜数
    panelGap: number,       // 分镜间距 (px)
    pageMargin: number      // 页面边距 (px)
  }
}
```

**响应**：
- Content-Type: `application/pdf` | `application/zip` | `application/json`
- Content-Disposition: `attachment; filename="xxx"`

### 依赖包

```json
{
  "pdf-lib": "^1.17.1",  // PDF 生成
  "jszip": "latest"      // ZIP 压缩
}
```

### 核心函数

1. **`exportToPDF()`** - PDF 导出
   - 使用 `pdf-lib` 创建 PDF 文档
   - 自动下载远程图片并嵌入
   - 计算网格布局（行×列）
   - 处理图片缩放和居中

2. **`exportToPNG()`** - PNG 导出
   - 下载所有分镜原图
   - 打包为 ZIP 文件
   - 服务端暂不支持 Canvas 合成

3. **`exportToZIP()`** - ZIP 导出
   - 下载所有分镜原图
   - 生成 metadata.json
   - 创建结构化目录

4. **`exportToJSON()`** - JSON 导出
   - 序列化项目数据
   - 包含完整关联信息

---

## 🧪 测试步骤

### 前置条件
1. 用户已登录
2. 项目存在且有分镜
3. 至少有 1 个分镜已生成图片

### 测试用例

#### ✅ 测试 1：PDF 导出
1. 进入"排版导出"Tab
2. 设置页面尺寸为 A4
3. 设置每页分镜数为 4
4. 选择导出格式为 PDF
5. 点击"导出 PDF"按钮
6. **预期结果**：自动下载 `故事标题.pdf` 文件，包含 4 格分镜排版

#### ✅ 测试 2：PNG 导出
1. 选择导出格式为 PNG
2. 点击"导出 PNG"按钮
3. **预期结果**：自动下载 `故事标题-panels.zip` 文件，解压后包含所有单张 PNG 图片

#### ✅ 测试 3：ZIP 导出
1. 选择导出格式为 ZIP
2. 点击"导出 ZIP"按钮
3. **预期结果**：自动下载 `故事标题-complete.zip` 文件，包含 `images/` 文件夹和 `metadata.json`

#### ✅ 测试 4：空状态处理
1. 删除所有分镜图片（保留分镜但无图片）
2. 点击导出按钮
3. **预期结果**：显示错误提示"没有可导出的图片，请先生成分镜图片"

#### ✅ 测试 5：权限验证
1. 退出登录
2. 直接访问 `/api/project/xxx/export`
3. **预期结果**：返回 401 错误"未登录"

---

## 🐛 已知问题

### 问题 1：PNG 导出不是单张合成图
**现状**：PNG 导出返回 ZIP 包（包含所有单张图片）
**原因**：服务端无法使用 Canvas 合成图片
**解决方案（可选）**：
- 方案A：在客户端使用 Canvas 合成长图
- 方案B：使用 Puppeteer 在服务端渲染 HTML 生成 PNG

### 问题 2：远程图片下载可能失败
**现状**：如果 MinIO 不可访问，导出会失败
**影响**：部分分镜可能被跳过或显示占位符
**改进建议**：
- 添加重试机制
- 使用本地缓存

---

## 📝 后续优化建议

### Phase 2.1：客户端 PNG 合成
```typescript
// 在客户端使用 Canvas 合成长图
async function exportToPNGClient(panels, layout) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // 计算画布尺寸
  const totalHeight = panels.length * (panelHeight + gap);
  canvas.width = pageWidth;
  canvas.height = totalHeight;

  // 绘制每个分镜
  for (let i = 0; i < panels.length; i++) {
    const img = await loadImage(panels[i].generated_image);
    ctx.drawImage(img, 0, i * (panelHeight + gap), panelWidth, panelHeight);
  }

  // 下载
  canvas.toBlob(blob => {
    downloadBlob(blob, '故事标题.png');
  });
}
```

### Phase 2.2：导出预览
在导出前显示预览弹窗，让用户确认布局。

### Phase 2.3：批量导出
支持一次导出多个项目。

### Phase 2.4：导出设置保存
保存常用的导出配置为预设（已在 Phase 2 规划中）。

---

## 📞 技术支持

如遇到问题，请检查：
1. ✅ 浏览器控制台错误信息
2. ✅ 服务端日志（`console.error`）
3. ✅ MinIO 服务是否正常运行
4. ✅ 分镜图片 URL 是否可访问

**调试命令**：
```bash
# 查看 API 路由是否正常
curl -X POST http://localhost:3000/api/project/xxx/export \
  -H "Content-Type: application/json" \
  -d '{"format":"json"}' \
  -b "comicai_session=your_token"
```

---

## 🎉 总结

✅ **问题已完全修复**
✅ **支持 4 种导出格式（PDF/PNG/ZIP/JSON）**
✅ **类型安全（TypeScript 检查通过）**
✅ **代码规范（遵循项目约定）**

现在可以正常使用导出功能了！🚀
