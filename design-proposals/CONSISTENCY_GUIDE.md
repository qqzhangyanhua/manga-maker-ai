# 全站设计统一建议

## 现状分析

### ✅ 首页 (page.tsx) - 设计良好
- 深黑背景 `#09090b`
- 橙色强调色 `orange-500`
- 玻璃态模糊 `backdrop-blur-sm`
- 现代化 hover 效果
- **风格定位：Vercel 风格（深色极客风）**

### ❌ 内页 (scripts/page.tsx) - 需要升级
- 相同的配色，但缺乏装饰和质感
- 没有背景渐变装饰
- 按钮没有渐变效果
- hover 效果较弱

---

## 统一方案

### 方案 A：全站升级到增强版 Vercel 风格（推荐）

**优点：**
- 保持首页的优秀设计
- 内页升级到相同水平
- 品牌识别度高

**需要做的：**
1. 应用 `design-proposals/vercel-style-scripts.tsx` 到 `scripts/page.tsx`
2. 将首页按照上述建议微调（添加背景装饰、按钮渐变等）
3. 其他页面（story/page.tsx, projects, 等）也应用相同设计语言

**命令：**
```bash
# Windows
design-proposals\apply-design.bat vercel

# Mac/Linux
bash design-proposals/apply-design.sh vercel
```

---

### 方案 B：保持首页现状，仅提升内页

如果你对首页完全满意，不想改动：

1. 只升级 scripts/page.tsx（应用 Vercel 风格）
2. 确保配色、圆角、间距与首页一致
3. 添加相同的玻璃态效果和 hover 动画

---

## 设计规范建议

为了保持全站一致，建议制定设计规范：

### 配色规范
```tsx
// 主色
--background: #09090b    // 深黑背景
--card: #27272a/50       // 卡片（zinc-900/50）
--primary: #f97316       // 橙色强调（orange-500）
--foreground: #ffffff    // 主文字
--muted: #a1a1aa         // 次要文字（zinc-400）
```

### 间距规范
```tsx
// 容器
max-w-7xl mx-auto px-6 py-12

// 标题区
space-y-3 md:space-y-4

// 卡片网格
gap-4 md:gap-6

// 卡片内部
p-6 md:p-8
```

### 效果规范
```tsx
// 玻璃态卡片
bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50

// hover 效果
hover:border-orange-500/50 hover:bg-zinc-900/60 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300

// 渐变按钮
bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-lg shadow-orange-500/25
```

### 圆角规范
```tsx
// 卡片
rounded-xl md:rounded-2xl

// 按钮
rounded-lg md:rounded-xl

// 图标容器
rounded-lg
```

---

## 优先级建议

### 🔥 高优先级（立即执行）
1. **统一 scripts/page.tsx 风格** - 应用 Vercel 设计方案
2. **添加首页背景渐变装饰** - 增强氛围感

### 🌟 中优先级（本周完成）
3. **升级所有按钮为渐变效果** - 全站搜索 `bg-orange-500`
4. **统一 hover 效果** - 添加 `scale-[1.02]` 和阴影
5. **优化 story/page.tsx** - 应用相同设计语言

### 💡 低优先级（可选）
6. 制定组件库设计规范文档
7. 创建可复用的设计组件（GradientButton, GlassCard, etc.）
8. A/B 测试不同的强调色（橙色 vs 紫色 vs 蓝色）

---

## 快速检查清单

在发布前，检查以下页面是否风格一致：

- [ ] 首页 (/)
- [ ] 剧本列表 (/scripts)
- [ ] 故事创作 (/story)
- [ ] 分镜项目 (/projects)
- [ ] 图片库 (/generated)
- [ ] 管理后台 (/admin)

**一致性检查点：**
- [ ] 背景颜色相同（#09090b）
- [ ] 强调色相同（orange-500）
- [ ] 圆角大小一致（rounded-xl/2xl）
- [ ] 玻璃态效果一致（backdrop-blur-sm）
- [ ] hover 效果相似（缩放+阴影）
- [ ] 间距节奏一致（px-6 py-12）
