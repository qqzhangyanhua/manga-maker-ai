# Requirements Document - 小说编辑器增强

## Introduction

本需求文档定义了小说创作模块的核心功能增强，重点解决当前编辑体验差、导出功能缺失、转漫画流程断裂三大问题。通过实现富文本编辑器、完善导出功能、打通转漫画流程，将产品完成度从 75% 提升至 90%，达到 MVP 可用状态。

## Glossary

- **Novel_Editor**: 小说章节编辑器组件
- **Rich_Text_Editor**: 富文本编辑器（基于 Tiptap）
- **Export_Service**: 导出服务，负责将小说内容转换为不同格式
- **Comic_Converter**: 小说转漫画转换器
- **Auto_Save_Manager**: 自动保存管理器
- **Chapter**: 小说章节
- **Project**: 小说项目
- **Outline**: 章节大纲

---

## Requirements

### Requirement 1: 富文本编辑器集成

**User Story:** 作为小说作者，我想使用富文本编辑器编辑章节内容，以便我能够使用格式化功能（加粗、斜体、标题等）提升写作体验。

#### Acceptance Criteria

1. WHEN 用户打开章节编辑器 THEN THE Novel_Editor SHALL 显示基于 Tiptap 的富文本编辑器
2. WHEN 用户输入文本 THEN THE Rich_Text_Editor SHALL 支持 Markdown 快捷键（如 `**加粗**`、`# 标题`）
3. WHEN 用户选中文本 THEN THE Rich_Text_Editor SHALL 显示浮动工具栏（加粗、斜体、下划线、删除线）
4. WHEN 用户按下 Ctrl+B THEN THE Rich_Text_Editor SHALL 将选中文本设置为加粗
5. WHEN 用户按下 Ctrl+I THEN THE Rich_Text_Editor SHALL 将选中文本设置为斜体
6. WHEN 用户输入 `# ` THEN THE Rich_Text_Editor SHALL 自动转换为一级标题
7. WHEN 用户输入 `## ` THEN THE Rich_Text_Editor SHALL 自动转换为二级标题
8. WHEN 用户粘贴富文本内容 THEN THE Rich_Text_Editor SHALL 保留基本格式（加粗、斜体、标题）
9. WHEN 用户点击"字数统计"按钮 THEN THE Rich_Text_Editor SHALL 显示实时字数、段落数、字符数
10. WHEN 编辑器内容超过 10000 字 THEN THE Rich_Text_Editor SHALL 显示性能优化提示

### Requirement 2: 自动保存与状态提示

**User Story:** 作为小说作者，我想看到明确的保存状态提示，以便我知道我的内容是否已安全保存。

#### Acceptance Criteria

1. WHEN 用户编辑章节内容 THEN THE Auto_Save_Manager SHALL 在 2 秒无操作后自动保存
2. WHEN 自动保存开始 THEN THE Novel_Editor SHALL 显示"保存中..."状态
3. WHEN 自动保存成功 THEN THE Novel_Editor SHALL 显示"已保存"状态并在 2 秒后隐藏
4. WHEN 自动保存失败 THEN THE Novel_Editor SHALL 显示"保存失败"错误提示并提供重试按钮
5. WHEN 用户离开页面且有未保存内容 THEN THE Novel_Editor SHALL 显示确认对话框
6. WHEN 网络断开 THEN THE Auto_Save_Manager SHALL 将内容保存到本地存储
7. WHEN 网络恢复 THEN THE Auto_Save_Manager SHALL 自动同步本地内容到服务器
8. WHEN 保存冲突发生 THEN THE Novel_Editor SHALL 显示冲突解决对话框

### Requirement 3: TXT 格式导出

**User Story:** 作为小说作者，我想导出小说为 TXT 格式，以便我能够在其他平台发布或备份。

#### Acceptance Criteria

1. WHEN 用户点击"导出"按钮 THEN THE Export_Service SHALL 显示导出格式选择对话框
2. WHEN 用户选择 TXT 格式 THEN THE Export_Service SHALL 提供导出设置选项（编码、换行符）
3. WHEN 用户确认导出 THEN THE Export_Service SHALL 将所有章节内容合并为单个 TXT 文件
4. WHEN 导出 TXT 文件 THEN THE Export_Service SHALL 在章节之间插入分隔符（如 `\n\n---\n\n`）
5. WHEN 导出包含富文本格式 THEN THE Export_Service SHALL 移除所有格式标记，保留纯文本
6. WHEN 导出文件大小超过 10MB THEN THE Export_Service SHALL 显示进度条
7. WHEN 导出完成 THEN THE Export_Service SHALL 自动下载文件并显示成功提示
8. WHEN 导出失败 THEN THE Export_Service SHALL 显示错误信息并提供重试选项

### Requirement 4: EPUB 格式导出

**User Story:** 作为小说作者，我想导出小说为 EPUB 格式，以便读者能够在电子书阅读器上阅读。

#### Acceptance Criteria

1. WHEN 用户选择 EPUB 格式 THEN THE Export_Service SHALL 提供 EPUB 元数据编辑（标题、作者、封面）
2. WHEN 用户上传封面图片 THEN THE Export_Service SHALL 验证图片格式（JPEG/PNG）和尺寸（推荐 1600x2400）
3. WHEN 用户确认导出 THEN THE Export_Service SHALL 使用 epub-gen-memory 库生成 EPUB 文件
4. WHEN 生成 EPUB 文件 THEN THE Export_Service SHALL 保留富文本格式（加粗、斜体、标题）
5. WHEN 生成 EPUB 文件 THEN THE Export_Service SHALL 为每个章节创建独立的 HTML 页面
6. WHEN 生成 EPUB 文件 THEN THE Export_Service SHALL 生成目录（TOC）
7. WHEN 导出完成 THEN THE Export_Service SHALL 验证 EPUB 文件有效性
8. WHEN EPUB 文件无效 THEN THE Export_Service SHALL 显示验证错误并阻止下载

### Requirement 5: 章节选择导出

**User Story:** 作为小说作者，我想选择部分章节导出，以便我能够导出特定卷或章节范围。

#### Acceptance Criteria

1. WHEN 用户打开导出对话框 THEN THE Export_Service SHALL 显示章节选择列表
2. WHEN 用户点击"全选"按钮 THEN THE Export_Service SHALL 选中所有章节
3. WHEN 用户点击"反选"按钮 THEN THE Export_Service SHALL 反转当前选择状态
4. WHEN 用户选择章节范围 THEN THE Export_Service SHALL 支持 Shift+点击 批量选择
5. WHEN 用户未选择任何章节 THEN THE Export_Service SHALL 禁用"导出"按钮
6. WHEN 用户选择部分章节导出 THEN THE Export_Service SHALL 仅导出选中的章节
7. WHEN 导出文件名 THEN THE Export_Service SHALL 包含章节范围（如 `小说名_第1-10章.txt`）

### Requirement 6: 小说转漫画 - 场景提取

**User Story:** 作为小说作者，我想将小说章节转换为漫画分镜，以便我能够快速生成漫画草稿。

#### Acceptance Criteria

1. WHEN 用户点击"转漫画"按钮 THEN THE Comic_Converter SHALL 显示转换设置对话框
2. WHEN 用户选择章节 THEN THE Comic_Converter SHALL 分析章节内容并提取场景
3. WHEN 提取场景 THEN THE Comic_Converter SHALL 识别场景切换标志（如"与此同时"、"场景转换"）
4. WHEN 提取场景 THEN THE Comic_Converter SHALL 为每个场景生成场景描述（地点、时间、氛围）
5. WHEN 场景描述生成 THEN THE Comic_Converter SHALL 使用 LLM 提取关键视觉元素
6. WHEN 场景包含对话 THEN THE Comic_Converter SHALL 标记对话内容和说话人
7. WHEN 场景提取完成 THEN THE Comic_Converter SHALL 显示场景列表供用户审核
8. WHEN 用户编辑场景描述 THEN THE Comic_Converter SHALL 允许手动调整场景内容

### Requirement 7: 小说转漫画 - 分镜生成

**User Story:** 作为小说作者，我想将提取的场景转换为分镜，以便我能够可视化故事内容。

#### Acceptance Criteria

1. WHEN 用户确认场景列表 THEN THE Comic_Converter SHALL 为每个场景生成分镜建议
2. WHEN 生成分镜建议 THEN THE Comic_Converter SHALL 根据场景类型选择镜头类型（特写、中景、全景）
3. WHEN 场景包含动作 THEN THE Comic_Converter SHALL 建议使用动作镜头（推进、拉远）
4. WHEN 场景包含对话 THEN THE Comic_Converter SHALL 建议使用对话镜头（正反打）
5. WHEN 场景包含多个角色 THEN THE Comic_Converter SHALL 建议使用群像镜头
6. WHEN 分镜建议生成 THEN THE Comic_Converter SHALL 估算每个场景需要的分镜数量
7. WHEN 用户调整分镜数量 THEN THE Comic_Converter SHALL 重新分配场景内容到分镜
8. WHEN 用户确认分镜 THEN THE Comic_Converter SHALL 创建分镜项目并跳转到分镜编辑器

### Requirement 8: 小说转漫画 - 角色绑定

**User Story:** 作为小说作者，我想将小说角色绑定到漫画角色，以便转换后的分镜能够使用正确的角色形象。

#### Acceptance Criteria

1. WHEN 转换开始 THEN THE Comic_Converter SHALL 分析章节内容并提取角色列表
2. WHEN 角色列表生成 THEN THE Comic_Converter SHALL 显示角色绑定界面
3. WHEN 用户选择小说角色 THEN THE Comic_Converter SHALL 显示可用的漫画角色列表
4. WHEN 漫画角色不存在 THEN THE Comic_Converter SHALL 提供"创建新角色"选项
5. WHEN 用户创建新角色 THEN THE Comic_Converter SHALL 使用小说角色描述生成角色形象
6. WHEN 角色绑定完成 THEN THE Comic_Converter SHALL 在分镜中自动填充角色信息
7. WHEN 分镜包含未绑定角色 THEN THE Comic_Converter SHALL 显示警告提示

### Requirement 9: 导出预览

**User Story:** 作为小说作者，我想在导出前预览导出效果，以便我能够确认格式是否正确。

#### Acceptance Criteria

1. WHEN 用户点击"预览"按钮 THEN THE Export_Service SHALL 生成导出预览
2. WHEN 预览 TXT 格式 THEN THE Export_Service SHALL 显示纯文本预览窗口
3. WHEN 预览 EPUB 格式 THEN THE Export_Service SHALL 显示 EPUB 阅读器预览
4. WHEN 预览窗口打开 THEN THE Export_Service SHALL 显示前 3 章内容
5. WHEN 用户滚动预览 THEN THE Export_Service SHALL 支持查看完整内容
6. WHEN 用户关闭预览 THEN THE Export_Service SHALL 返回导出设置对话框
7. WHEN 预览满意 THEN THE Export_Service SHALL 提供"直接导出"按钮

### Requirement 10: 编辑器性能优化

**User Story:** 作为小说作者，我想在编辑长篇章节时保持流畅体验，以便我能够专注于创作而不被卡顿打断。

#### Acceptance Criteria

1. WHEN 章节内容超过 5000 字 THEN THE Rich_Text_Editor SHALL 启用虚拟滚动
2. WHEN 用户输入文本 THEN THE Rich_Text_Editor SHALL 在 16ms 内响应（60fps）
3. WHEN 用户粘贴大量文本 THEN THE Rich_Text_Editor SHALL 分批处理避免阻塞 UI
4. WHEN 编辑器初始化 THEN THE Rich_Text_Editor SHALL 在 500ms 内完成加载
5. WHEN 自动保存触发 THEN THE Auto_Save_Manager SHALL 使用防抖避免频繁请求
6. WHEN 内存使用超过 100MB THEN THE Rich_Text_Editor SHALL 显示性能警告
7. WHEN 用户切换章节 THEN THE Novel_Editor SHALL 清理前一章节的编辑器实例

---

## Special Requirements Guidance

### Parser and Serializer Requirements

#### Requirement 11: 富文本内容序列化

**User Story:** 作为系统，我需要将富文本内容序列化为 JSON 格式存储，以便能够在不同设备和会话间保持一致。

#### Acceptance Criteria

1. WHEN 保存章节内容 THEN THE Rich_Text_Editor SHALL 将内容序列化为 Tiptap JSON 格式
2. WHEN 加载章节内容 THEN THE Rich_Text_Editor SHALL 从 JSON 格式反序列化为编辑器内容
3. THE Rich_Text_Editor SHALL 提供 Pretty_Printer 将 JSON 格式化为可读格式
4. FOR ALL 有效的编辑器内容，序列化后再反序列化 SHALL 产生等价的内容（round-trip property）

---

## Non-Functional Requirements

### Performance
- 编辑器初始化时间 < 500ms
- 自动保存响应时间 < 1s
- 导出 10 万字小说 < 5s
- 转漫画分析 1 万字章节 < 10s

### Scalability
- 支持单章节最大 10 万字
- 支持项目最大 1000 章节
- 支持并发编辑 100 个用户

### Reliability
- 自动保存成功率 > 99.9%
- 导出成功率 > 99%
- 数据丢失率 < 0.01%

### Usability
- 新用户完成首次导出 < 5 分钟
- 编辑器学习曲线 < 10 分钟
- 转漫画流程完成 < 15 分钟

### Security
- 所有 API 请求需要认证
- 导出文件需要权限验证
- 敏感内容需要加密存储
