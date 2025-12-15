# ComicAI 设计系统规范（基于首页设计）

## 核心设计元素提取

### 🎨 配色方案

```tsx
// 背景色
--bg-primary: #09090b         // 主背景（深黑）
--bg-secondary: zinc-900/50   // 次级背景（带透明度）

// 强调色
--accent: orange-500          // 主强调色（橙色）
--accent-hover: orange-600    // hover 状态

// 文字色
--text-primary: white         // 主标题
--text-secondary: zinc-400    // 次要文字/描述
--text-muted: zinc-500        // 更弱的文字
--text-accent: orange-500     // 强调文字

// 边框色
--border: zinc-800            // 默认边框
--border-hover: orange-500/50 // hover 边框
```

---

### 🎴 组件样式规范

#### 1. 卡片 (Card)

**默认状态：**
```tsx
className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8"
```

**hover 状态：**
```tsx
className="hover:border-orange-500/50 hover:bg-zinc-900 transition-all"
```

**完整示例：**
```tsx
<div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 hover:border-orange-500/50 hover:bg-zinc-900 transition-all">
  {/* 卡片内容 */}
</div>
```

---

#### 2. 按钮 (Button)

**主按钮：**
```tsx
<Button className="bg-orange-500 hover:bg-orange-600 text-white border-0">
  立即体验
</Button>
```

**次要按钮：**
```tsx
<Button variant="outline" className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white">
  了解更多
</Button>
```

---

#### 3. 图标容器

**标准样式：**
```tsx
<div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
  <Icon className="w-5 h-5" />
</div>
```

**大尺寸：**
```tsx
<div className="w-16 h-16 rounded-full bg-orange-500/10 mb-6">
  <Icon className="w-8 h-8 text-orange-500" />
</div>
```

---

#### 4. 标题层级

```tsx
// H1 - 主标题
<h1 className="text-3xl font-bold text-white">

// H2 - 次级标题
<h2 className="text-3xl font-bold text-white">

// H3 - 卡片标题
<h3 className="font-semibold text-white">

// 描述文字
<p className="text-zinc-400">
```

---

#### 5. 链接卡片 (Link Card)

**完整样式：**
```tsx
<Link
  href="/path"
  className="group rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-orange-500/50 hover:bg-zinc-900 transition-all p-4 flex flex-col gap-3"
>
  <div className="flex items-center gap-2">
    <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <span className="font-semibold text-white group-hover:text-orange-500 transition-colors">
      标题
    </span>
  </div>
  <p className="text-sm text-zinc-400 leading-relaxed">
    描述文字
  </p>
  <span className="text-sm text-orange-500 font-medium">
    立即进入
    <ArrowRight className="w-4 h-4 inline ml-1" />
  </span>
</Link>
```

---

### 📏 间距规范

```tsx
// 页面容器
<div className="max-w-7xl mx-auto px-4 py-16">

// 标题区域间距
<div className="mb-8">  // 标题与内容的间距

// 卡片网格间距
<div className="grid gap-4">  // 小间距
<div className="grid gap-6">  // 默认间距

// 内容区间距
<div className="space-y-3">  // 紧凑
<div className="space-y-4">  // 标准
```

---

### 🎭 圆角规范

```tsx
rounded-xl   // 卡片、链接
rounded-2xl  // 大卡片、区块
rounded-lg   // 图标容器、小元素
rounded-full // 圆形图标容器
```

---

### ✨ 效果规范

#### 1. 玻璃态模糊
```tsx
backdrop-blur-sm
```

#### 2. 过渡动画
```tsx
transition-all       // 所有属性
transition-colors    // 仅颜色
```

#### 3. hover 状态组合
```tsx
// 卡片 hover
hover:border-orange-500/50 hover:bg-zinc-900 transition-all

// 文字 hover
group-hover:text-orange-500 transition-colors

// 按钮 hover
hover:bg-orange-600 transition-all
```

---

### 📱 响应式规范

```tsx
// 网格布局
grid-cols-1 md:grid-cols-2 lg:grid-cols-5

// 间距
px-4 py-16  // 移动端
md:px-6     // 平板
lg:px-8     // 桌面

// 容器宽度
max-w-4xl   // 窄容器（试用区块）
max-w-7xl   // 宽容器（快速入口）
```

---

## 🔄 统一应用示例

### 标准页面结构

```tsx
export default function SomePage() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* 标题区 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">页面标题</h1>
          <p className="text-zinc-400">页面描述</p>
        </div>

        {/* 内容区 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 卡片 */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 hover:border-orange-500/50 hover:bg-zinc-900 transition-all">
            {/* 卡片内容 */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 设计检查清单

应用到新页面时，确保：

- [ ] 背景色为 `bg-[#09090b]`
- [ ] 强调色使用 orange-500
- [ ] 卡片使用 `bg-zinc-900/50 backdrop-blur-sm`
- [ ] 边框为 `border-zinc-800`
- [ ] hover 时边框变为 `border-orange-500/50`
- [ ] 图标容器使用 `bg-orange-500/10`
- [ ] 主标题为白色，描述为 zinc-400
- [ ] 圆角使用 rounded-xl 或 rounded-2xl
- [ ] 所有 hover 效果都有 transition-all
- [ ] 响应式布局使用 grid-cols-1 md:grid-cols-2 lg:grid-cols-3

---

## 🎯 禁止事项

❌ **不要使用：**
- 其他背景色（如 #0a0a0a）
- 其他强调色（如 blue, purple）
- 过度装饰的渐变背景
- 不一致的圆角大小
- 不同的间距规范
- 其他字体粗细（除 font-bold, font-semibold）

✅ **始终使用：**
- #09090b 作为主背景
- orange-500 作为唯一强调色
- zinc 色系作为灰度
- 统一的 hover 效果
- 统一的间距和圆角

---

## 📝 快速复制模板

### 空状态

```tsx
<div className="text-center py-12 border border-zinc-800 rounded-2xl bg-zinc-900/50">
  <Icon className="w-12 h-12 mx-auto text-zinc-500 mb-4" />
  <h3 className="text-lg font-medium text-white">暂无内容</h3>
  <p className="text-zinc-400 mb-6">描述文字</p>
  <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0">
    去创建
  </Button>
</div>
```

### 加载状态

```tsx
<div className="flex justify-center py-12">
  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
</div>
```

### 错误状态

```tsx
<div className="text-center py-12 text-red-400">
  {error}
  <Button variant="outline" className="ml-4 border-zinc-800 text-zinc-400" onClick={retry}>
    重试
  </Button>
</div>
```

---

## 🌟 总结

这套设计系统的核心理念是：

1. **简洁但不简陋** - 使用玻璃态和细腻的 hover 效果
2. **一致性优先** - 所有页面使用相同的颜色、间距、圆角
3. **性能友好** - 避免过度动画和复杂渐变
4. **可扩展性** - 设计规范足够灵活，支持各种内容

遵循这套规范，你的整个应用将保持统一的高品质设计。
