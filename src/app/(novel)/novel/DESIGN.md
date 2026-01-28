# 小说项目列表页面 - 设计文档

## 设计系统

### 核心设计理念
- **Soft UI Evolution**: 现代企业应用风格，改进的对比度，微妙的深度感
- **Swiss Modernism 2.0**: 网格系统，数学化间距，清晰的视觉层次

### 配色方案 (Purple Elegance)

```css
/* 主色调 - 紫色系 */
Primary: #9333EA (purple-600 - 优雅、创意)
Secondary: #A855F7 (purple-500 - 亮紫)
Accent: #C084FC (purple-400 - 行动号召)

/* 背景与文本 */
Background: radial-gradient from-purple-900/40 via-zinc-900 to-black (深色渐变)
Card: #18181B/40 (zinc-900/40 - 半透明卡片)
Border: #9333EA/10 (purple-500/10 - 紫色边框)
Text Primary: #C4B5FD (purple-300 - 主要文本)
Text Secondary: #D8B4FE (purple-200 - 次要文本)
Text Muted: #A1A1AA (zinc-400 - 弱化文本)

/* 状态配色 */
Draft: Zinc-800 (灰色 - 草稿)
Writing: Purple-600 (紫色 - 创作中)
Completed: Green-600 (绿色 - 已完成)
Key Chapter: Purple-500/50 (紫色 - 关键章节标识)

/* 交互状态 */
Hover Border: #9333EA/30 (purple-500/30)
Focus Ring: #9333EA/50 (purple-500/50)
Shadow: #9333EA/20 (purple-500/20 - 阴影效果)

/* 装饰性光晕 */
Glow Primary: #A855F7/30 (purple-500/30)
Glow Secondary: #D946EF/20 (fuchsia-500/20)
```

### 字体系统

```css
/* Google Fonts */
Heading: 'Poppins' (几何感、现代)
Body: 'Open Sans' (人性化、易读)

/* Tailwind 使用 */
className="font-heading"  /* 标题 */
className="font-body"     /* 正文 */
```

## 视觉层次

### 1. 页头区域 (Sticky Header)
- **背景**: 深色半透明 + 毛玻璃效果 (`bg-zinc-900/80 backdrop-blur-sm`)
- **装饰**: 左侧紫色渐变竖条 (`h-10 w-1 bg-gradient-to-b from-purple-600 to-purple-400`)
- **统计信息**: 实时显示项目/章节/字数统计

### 2. 操作按钮
- **灵感模式**: 紫色边框 outline 按钮
  - Border: `border-2 border-purple-200`
  - Hover: `hover:border-purple-400 hover:bg-purple-50`
  - Icon: Sparkles with scale animation

- **新建项目**: 紫色渐变按钮 (CTA)
  - Background: `bg-purple-600 hover:bg-purple-700`
  - Shadow: `shadow-lg shadow-purple-500/20`

### 3. 项目卡片

#### 布局结构
```
[顶部装饰条] - 仅 hover 显示
[CardHeader]
  - Title + Status Badge
  - Genre Badge
[CardContent]
  - Description (2行截断)
  - Stats Grid (章节 + 字数)
    - 带图标的统计卡片
[CardFooter]
  - 更新时间
```

#### 交互状态
- **Default**: 深色背景，紫色半透明边框 (`bg-zinc-900/60 border-purple-500/10`)
- **Hover**:
  - 边框增强 (`hover:border-purple-500/30`)
  - 阴影增强 (`hover:shadow-2xl hover:shadow-purple-500/20`)
  - 顶部紫色渐变条显示
  - 标题变紫色
  - 统计图标背景加深

#### 微动效
- 所有过渡: `transition-all duration-300`
- Icon hover: `group-hover:scale-110 transition-transform duration-200`
- Shadow: `transition-shadow duration-200`

### 4. 空状态设计
- **布局**: 居中垂直布局
- **图标**: 紫色圆形背景 + BookOpen 图标 (`bg-zinc-900 ring-1 ring-white/10 text-purple-600/50`)
- **行动引导**: 双按钮（灵感模式 + 新建项目）
- **边框**: 深色边框 (`border border-purple-500/10`)

### 5. 加载骨架屏
- **风格**: 深色主题脉动动画
- **效果**: `bg-zinc-900/50 border-zinc-800 animate-pulse`

## 响应式设计

```css
/* 网格布局 */
grid-cols-1           /* 移动端: 1列 */
md:grid-cols-2        /* 平板: 2列 */
lg:grid-cols-3        /* 桌面: 3列 */

/* 页头按钮 */
flex-col              /* 移动端: 垂直堆叠 */
sm:flex-row           /* 小屏: 水平排列 */

/* 统计信息 */
flex-col              /* 移动端: 垂直 */
lg:flex-row           /* 大屏: 水平 */
```

## 无障碍性 (Accessibility)

### 符合标准
- ✅ WCAG AA 对比度标准
- ✅ 所有可点击元素添加 `cursor-pointer`
- ✅ Hover 状态清晰可见
- ✅ 平滑过渡 (200-300ms)
- ✅ 语义化 HTML 结构

### 动效考量
```css
/* 尊重用户动效偏好 */
@media (prefers-reduced-motion: reduce) {
  /* 禁用所有动画 */
  .transition-all { transition: none; }
  .animate-pulse { animation: none; }
}
```

## 性能优化

### 图标使用
- ✅ 使用 lucide-react SVG 图标（而非 emoji）
- ✅ 统一图标尺寸 (`h-4 w-4`, `h-5 w-5`)

### 加载策略
- ✅ 骨架屏提供即时反馈
- ✅ 数据获取失败静默处理
- ✅ 最小化重渲染

## UI/UX 检查清单

根据 UI/UX Pro Max 标准：

### ✅ 已实现
- [x] 无 emoji 图标，全部使用 Lucide SVG
- [x] 所有可点击元素添加 `cursor-pointer`
- [x] Hover 状态不引起布局偏移
- ✅ 光模式文本对比度充足 (zinc-100, zinc-300 on dark background)
- ✅ 边框在暗模式下可见 (border-purple-500/10)
- [x] 平滑过渡 (150-300ms)
- [x] 一致的 max-width 容器 (max-w-7xl)
- [x] 语义化 HTML (Card, Header, Content, Footer)
- [x] 响应式网格布局

### 设计亮点
1. **视觉层次清晰**: 通过颜色、大小、间距建立信息层级
2. **交互反馈丰富**: Hover、Focus、Active 状态完整
3. **品牌一致性**: 紫色主色调贯穿全局，营造优雅创意氛围
4. **信息密度合理**: 统计信息直观展示，避免信息过载
5. **愉悦的微动效**: 图标缩放、阴影变化、颜色过渡
6. **玻璃态设计**: backdrop-blur 效果营造层次感和现代感

## 技术栈

- **框架**: Next.js 14 (App Router)
- **UI库**: shadcn/ui (Radix UI primitives)
- **样式**: Tailwind CSS
- **图标**: lucide-react
- **字体**: Google Fonts (Poppins + Open Sans)

## 维护指南

### 新增项目卡片样式
1. 保持 `group` class 用于子元素 hover 响应
2. 使用 `cursor-pointer` 确保可点击性
3. 遵循 200-300ms 过渡时长
4. 使用 `transition-all` 而非单一属性

### 修改配色
所有颜色定义在顶部注释中，修改时：
1. 更新 Tailwind 类名
2. 确保对比度符合 WCAG AA 标准
3. 测试光模式和暗模式

### 添加新统计项
```tsx
<div className="flex items-center gap-2 text-sm text-slate-600">
  <IconName className="h-4 w-4 text-blue-600" />
  <span className="font-medium">{value}</span>
  <span>单位</span>
</div>
```
