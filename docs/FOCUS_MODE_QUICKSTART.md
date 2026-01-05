# 专注模式快速启动指南

## 🚀 5 分钟上手

### 1️⃣ 启动开发服务器

```bash
# 安装依赖（如果还没有）
pnpm install

# 启动开发服务器
pnpm run dev
```

### 2️⃣ 访问剧本详情页

```
http://localhost:3000/scripts/[your-story-id]
```

确保你的剧本已经有至少一个章节和分镜。

### 3️⃣ 进入专注模式

在页面顶部找到紫色的 **"专注编辑"** 按钮，点击即可进入。

### 4️⃣ 开始编辑

1. **左侧** - 点击分镜缩略图切换
2. **中央** - 查看大图预览
3. **右侧** - 编辑配置并生成

### 5️⃣ 快捷键

- `ESC` - 退出
- `Ctrl + ←/→` - 切换分镜
- `Ctrl + Enter` - 生成图片

---

## 📁 项目文件结构

```
专注模式核心文件：
├── src/app/scripts/[id]/
│   ├── page.tsx                           ← 主页面（已集成）
│   ├── components/
│   │   ├── FocusMode/
│   │   │   ├── index.tsx                  ← 入口组件
│   │   │   ├── types.ts                   ← 类型定义
│   │   │   ├── FocusModeLayout.tsx        ← 布局容器
│   │   │   ├── ChapterPanelNav.tsx        ← 左侧导航
│   │   │   ├── PanelPreviewCenter.tsx     ← 中央预览
│   │   │   └── PanelConfigSidebar.tsx     ← 右侧配置
│   │   └── ScriptPageHeader.tsx           ← 头部（已添加按钮）
│   └── contexts/
│       └── FocusModeContext.tsx           ← 状态管理

文档：
├── docs/
│   ├── FOCUS_MODE_GUIDE.md                ← 完整使用指南
│   ├── FOCUS_MODE_QUICKSTART.md           ← 本文件
│   └── architecture/
│       └── focus-mode-implementation-summary.md  ← 技术总结
```

---

## ✅ 验证清单

运行以下检查确保功能正常：

- [ ] 页面顶部显示"专注编辑"按钮（紫色）
- [ ] 点击按钮进入全屏三栏布局
- [ ] 左侧显示章节和分镜列表
- [ ] 中央显示当前分镜（如果有图片）
- [ ] 右侧显示配置面板
- [ ] 可以在左侧点击切换分镜
- [ ] 可以使用 ESC 退出专注模式
- [ ] 可以使用快捷键切换分镜
- [ ] 可以编辑描述和提示词
- [ ] 可以选择角色
- [ ] 可以修改模型配置
- [ ] 点击"生成图片"可以生成新图片

---

## 🐛 常见问题排查

### 问题 1: 找不到"专注编辑"按钮

**原因**: 剧本没有分镜

**解决**: 先创建章节并生成分镜，专注模式按钮才会显示

### 问题 2: 点击按钮无反应

**原因**: JavaScript 错误

**解决**: 
1. 打开浏览器控制台（F12）
2. 查看是否有错误信息
3. 确保所有文件都已创建并正确导入

### 问题 3: 左侧导航是空的

**原因**: 数据加载问题

**解决**: 
1. 检查 Network 面板确认 API 调用成功
2. 刷新页面重新加载数据
3. 检查数据库中是否有 panels 数据

### 问题 4: 快捷键不工作

**原因**: 焦点在输入框中

**解决**: 点击输入框外的任意区域，使焦点离开输入框

### 问题 5: 生成按钮点击无反应

**原因**: 缺少必要的配置

**解决**: 
1. 确保有提示词（prompt_used）
2. 检查环境变量是否配置正确
3. 查看控制台错误信息

---

## 📚 更多资源

- **完整使用指南**: [FOCUS_MODE_GUIDE.md](./FOCUS_MODE_GUIDE.md)
- **技术实现总结**: [focus-mode-implementation-summary.md](./architecture/focus-mode-implementation-summary.md)
- **项目主文档**: [../README.md](../README.md)

---

## 🎉 开始使用

现在你已经准备好使用专注模式了！

1. 启动开发服务器
2. 打开剧本详情页
3. 点击"专注编辑"
4. 开始创作！

**祝创作愉快！** 🎨✨

