# 漫画风格 AI 图片生成功能

## 功能概述

为漫画风格管理页面添加了 AI 生成风格预览图片的功能,解决了批量风格数据缺少图片的问题。

## 功能特性

### 1. 单个风格 AI 生成

在新增/编辑风格对话框中:

- **位置**: 风格图片上传区域
- **按钮**: "AI 生成" (紫粉渐变,带 Sparkles 图标)
- **前置条件**:
  - 必须填写"中文名称"
  - 必须填写"AI 提示词前缀"
- **生成逻辑**:
  - 自动组合提示词: `{prompt_prefix}, high quality, professional comic book style illustration, vibrant colors, clean lines, {name_zh} art style`
  - 负面提示词: `low quality, blurry, distorted, ugly, bad anatomy, watermark, text, signature`
  - 图片尺寸: 512x512
  - 生成步数: 30
  - CFG Scale: 7

### 2. 批量 AI 生成

在风格列表页面:

- **触发条件**: 当存在缺少图片但有提示词前缀的风格时,自动显示批量生成按钮
- **按钮文案**: "批量生成图片 (N)" - N 为待生成数量
- **执行流程**:
  1. 过滤出所有 `!image_url && prompt_prefix` 的风格
  2. 弹出确认对话框,显示待生成数量
  3. 逐个调用图片生成 API
  4. 自动更新风格记录的 `image_url`
  5. 完成后显示成功/失败统计

### 3. 图片预览功能

在列表和编辑表单中:

- **列表预览**: 点击 64x64 缩略图查看大图
- **表单预览**: 点击 128x128 预览图查看大图
- **交互效果**:
  - 鼠标悬停显示蓝色高亮边框
  - 鼠标指针变为手型提示可点击
  - 点击弹出大图对话框(最大 4xl 宽度,70vh 高度)
  - 点击对话框外部或按 ESC 键关闭

### 4. 数据导出功能

在风格列表页面:

- **导出格式**: JSON / CSV 两种格式
- **触发条件**: 列表中有数据时显示导出按钮
- **JSON 导出**:
  - 完整的字段信息
  - 保留原始数据类型
  - 格式化输出(2 空格缩进)
  - 文件名: `comic-styles-YYYY-MM-DD.json`
- **CSV 导出**:
  - 支持 Excel 直接打开
  - UTF-8 BOM 编码(避免中文乱码)
  - 自动转义特殊字符
  - 时间格式本地化
  - 文件名: `comic-styles-YYYY-MM-DD.csv`

### 5. 状态管理

- **单个生成状态**: `generating` - 控制按钮 loading 状态
- **批量生成状态**: `batchGenerating` - 控制批量按钮 loading 状态
- **图片预览状态**: `previewImage` - 控制大图对话框显示
- **互斥逻辑**: 生成时禁用上传和 URL 输入

## 技术实现

### 文件修改

1. **`src/app/admin/comic-styles/page.tsx`**
   - 导入 `Sparkles` 图标
   - 添加 `batchGenerating` 状态
   - 添加 `handleBatchGenerateImages` 函数
   - 修改布局:新增批量生成按钮
   - 修改表单:新增 AI 生成按钮

2. **`src/app/admin/comic-styles/hooks/useComicStyleForm.ts`**
   - 添加 `generating` 状态
   - 添加 `handleGenerateImage` 函数
   - 返回值新增 `generating` 和 `handleGenerateImage`

### API 调用

**新建的通用图片生成接口**: `POST /api/image-generation`

请求参数:
```typescript
{
  "prompt": string,              // 必填: 组合后的提示词
  "negative_prompt"?: string,    // 可选: 负面提示词
  "width"?: number,              // 可选: 图片宽度,默认 512
  "height"?: number,             // 可选: 图片高度,默认 512
  "steps"?: number,              // 可选: 生成步数,默认 30
  "cfg_scale"?: number,          // 可选: CFG 引导强度,默认 7
  "type"?: string,               // 可选: 图片类型标识,默认 "general"
  "metadata"?: object            // 可选: 元数据,用于记录
}
```

返回结果:
```typescript
{
  "success": true,
  "image_url": string,           // MinIO 上传后的公开访问 URL
  "image_base64": string,        // Base64 编码的图片数据
  "metadata": object             // 原样返回的元数据
}
```

错误响应:
```typescript
{
  "error": string                // 错误信息
}
```

**存储路径**: `generated/{userId}/{type}/{timestamp}_{random}.png`

## 使用流程

### 场景 1: 新增风格时生成图片

1. 点击"新增风格"
2. 填写必填字段:
   - 风格标识: `cyberpunk`
   - 中文名称: `赛博朋克`
   - 英文名称: `CYBERPUNK`
   - AI 提示词前缀: `cyberpunk style, neon lights, futuristic cityscape`
3. 点击"AI 生成"按钮
4. 等待生成完成(按钮显示"生成中...")
5. 图片自动填充到预览区和 URL 输入框
6. 点击"创建"保存

### 场景 2: 编辑已有风格补充图片

1. 点击风格行的"编辑"按钮
2. 确认"AI 提示词前缀"已填写(若未填写,先补充)
3. 点击"AI 生成"
4. 等待生成完成
5. 点击"保存"

### 场景 3: 批量为缺图风格生成

1. 进入漫画风格管理页面
2. 若有风格缺少图片但有提示词前缀,会显示批量生成按钮
3. 点击"批量生成图片 (N)"
4. 确认对话框点击"确定"
5. 等待批量生成完成(按钮显示进度)
6. 查看成功/失败统计 Toast 提示
7. 页面自动刷新,查看生成结果

## 注意事项

1. **必填字段依赖**:
   - AI 生成功能依赖"中文名称"和"AI 提示词前缀"
   - 若未填写,按钮会被禁用,点击时会显示提示

2. **提示词质量**:
   - 提示词前缀应准确描述风格特征
   - 建议格式: `{风格关键词}, {视觉特征}, {艺术风格}`
   - 示例:
     - `japanese manga style, black and white, screentone shading`
     - `watercolor painting, soft colors, delicate brushstrokes`
     - `pixel art, retro gaming, 8-bit style`

3. **批量生成性能**:
   - 批量生成是串行执行,避免 API 过载
   - 大量风格(>10)可能需要较长时间
   - 生成失败会继续下一个,不会中断整个流程

4. **错误处理**:
   - 单个生成失败:显示错误 Toast,不影响表单其他操作
   - 批量生成失败:记录失败数量,最终显示统计信息

5. **成本考虑**:
   - 每次生成调用图片生成 API,会消耗用户算力
   - 建议在批量生成前预览提示词质量
   - 可考虑添加管理员免费额度

## 未来优化方向

1. **提示词优化器**:
   - 集成 LLM 优化提示词
   - 自动扩展简单描述为详细提示词

2. **图片质量控制**:
   - 生成多个候选,允许管理员选择
   - 添加图片质量评分

3. **风格迁移**:
   - 支持上传参考图片
   - 使用 ControlNet/IP-Adapter 保持风格一致性

4. **缓存机制**:
   - 相同提示词缓存生成结果
   - 避免重复生成浪费资源

5. **预览功能**:
   - 生成前预览最终提示词
   - 调整参数(尺寸、步数、CFG)

## 相关文件

- `src/app/admin/comic-styles/page.tsx` - 主页面组件
- `src/app/admin/comic-styles/hooks/useComicStyleForm.ts` - 表单逻辑 Hook
- `src/app/admin/comic-styles/hooks/useComicStyleList.ts` - 列表逻辑 Hook
- `src/app/admin/comic-styles/types.ts` - 类型定义
- **`src/app/api/image-generation/route.ts`** - **通用图片生成 API(新建)**
- `src/lib/image-generation.ts` - 图片生成核心服务
- `src/lib/unified-image-generation.ts` - 统一图片生成队列
- `docs/COMIC_STYLE_IMAGE_PREVIEW.md` - 图片预览功能文档
- `docs/COMIC_STYLE_EXPORT.md` - 数据导出功能文档

## 测试检查清单

- [ ] 单个生成:新增风格时生成图片
- [ ] 单个生成:编辑风格时生成图片
- [ ] 批量生成:多个缺图风格一键生成
- [ ] 错误处理:缺少必填字段时禁用按钮
- [ ] 错误处理:API 失败时显示错误信息
- [ ] 状态管理:生成中禁用其他操作
- [ ] UI 反馈:Loading 状态正确显示
- [ ] 数据更新:生成后自动填充 URL
- [ ] 批量统计:正确显示成功/失败数量
- [ ] 性能:批量生成不阻塞 UI
- [ ] 图片预览:列表缩略图点击查看大图
- [ ] 图片预览:表单预览图点击查看大图
- [ ] 图片预览:悬停效果正常显示
- [ ] 图片预览:对话框关闭功能正常
- [ ] 导出功能:JSON 格式正确
- [ ] 导出功能:CSV 格式正确且无乱码
- [ ] 导出功能:文件名包含日期
- [ ] 导出功能:Toast 提示正常

---

**最后更新**: 2026-01-17  
**维护者**: AI Coding Assistant
