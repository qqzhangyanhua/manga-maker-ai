/**
 * 小说模块主题样式常量
 *
 * 统一管理紫色主题样式，避免重复的类名字符串
 * 配合 DESIGN.md 中的 Purple Elegance 配色方案
 */

export const novelTheme = {
  /**
   * 按钮样式
   */
  button: {
    /** 主按钮 - 紫色实心按钮 */
    primary: "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20",

    /** Outline 按钮 - 紫色边框 */
    outline: "border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/50",

    /** Ghost 按钮 - 无边框，仅文字和背景变化 */
    ghost: "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10",

    /** 次级按钮 - 半透明背景 */
    secondary: "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20",
  },

  /**
   * 卡片/容器样式
   */
  card: {
    /** 基础卡片 - 玻璃态效果 */
    base: "bg-zinc-900/40 backdrop-blur-sm border-purple-500/10",

    /** 高亮卡片 - 更明显的背景 */
    highlight: "bg-zinc-900/60 backdrop-blur-xl border-purple-500/10",

    /** 关键章节卡片 - 紫色高亮标识 */
    keyChapter: "border-purple-500/50 bg-purple-900/10 backdrop-blur-sm",

    /** 骨架屏 */
    skeleton: "bg-zinc-900/50 border-zinc-800 animate-pulse",

    /** Alert Dialog */
    dialog: "bg-zinc-900 border-zinc-800 text-zinc-200",
  },

  /**
   * 输入框样式
   */
  input: {
    /** 基础输入框 */
    base: "bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50",

    /** Textarea */
    textarea: "bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50",

    /** 编辑器容器 */
    editor: "border border-purple-500/10 rounded-md p-4 min-h-[400px] bg-zinc-900/40",
  },

  /**
   * Tab 组件样式
   */
  tabs: {
    /** TabsList 容器 */
    list: "bg-zinc-900/40 backdrop-blur-md border border-purple-500/10 p-1 h-auto rounded-xl",

    /** TabsTrigger - 激活状态 */
    trigger: "rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all py-2 px-4",
  },

  /**
   * Badge 徽章样式
   */
  badge: {
    /** 紫色 Badge */
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/20",

    /** 状态 Badge - 草稿 */
    draft: "bg-zinc-800 text-zinc-400 border-zinc-700",

    /** 状态 Badge - 创作中 */
    writing: "bg-purple-500/10 text-purple-400 border-purple-500/20",

    /** 状态 Badge - 已完成 */
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
  },

  /**
   * 页面布局样式
   */
  layout: {
    /** 页面背景 - 径向渐变 */
    background: "min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-zinc-900 to-black",

    /** 容器 */
    container: "container mx-auto py-8 px-4 max-w-7xl space-y-8 relative z-10",

    /** 容器（列表页） */
    containerList: "container mx-auto py-12 px-4 max-w-7xl relative",

    /** 装饰性光晕 - 主光晕 */
    glowPrimary: "fixed top-20 left-1/4 w-96 h-96 bg-purple-500/30 blur-[100px] rounded-full pointer-events-none mix-blend-screen",

    /** 装饰性光晕 - 次光晕 */
    glowSecondary: "fixed bottom-20 right-1/4 w-96 h-96 bg-fuchsia-500/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen",
  },

  /**
   * 文本样式
   */
  text: {
    /** 主标题 */
    heading: "text-4xl font-bold tracking-tight text-white",

    /** 副标题 */
    subheading: "text-zinc-300 text-lg",

    /** 卡片标题 */
    cardTitle: "text-lg font-bold text-white line-clamp-1 group-hover:text-purple-400 transition-colors",

    /** 静音文本 */
    muted: "text-sm text-zinc-300",

    /** 小号文本 */
    small: "text-xs text-zinc-500",
  },

  /**
   * 交互效果
   */
  interaction: {
    /** 卡片悬停 */
    cardHover: "cursor-pointer hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 border-purple-500/10",

    /** 图片缩放 */
    imageScale: "transition-transform duration-700 group-hover:scale-105",

    /** 按钮平移 */
    buttonSlide: "opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0",

    /** 平滑过渡 */
    smooth: "transition-all duration-300",
  },

  /**
   * 空状态样式
   */
  empty: {
    /** 空状态容器 */
    container: "text-center py-20 relative z-10 flex flex-col items-center",

    /** 空状态图标容器 */
    iconWrapper: "w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10 shadow-xl",

    /** 空状态图标 */
    icon: "h-10 w-10 text-purple-600/50",

    /** 空状态标题 */
    title: "text-xl font-semibold text-white mb-2",

    /** 空状态描述 */
    description: "text-zinc-300 mb-8 max-w-sm",
  },

  /**
   * 快捷键提示样式
   */
  kbd: "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-purple-500/30 bg-purple-500/5 px-1.5 font-mono text-[10px] font-medium text-purple-400",

  /**
   * 聚光灯效果
   */
  spotlight: {
    /** 聚光灯覆盖层 */
    overlay: "pointer-events-none absolute inset-0 z-30 transition-opacity duration-500",
  },

  /**
   * 对话框样式
   */
  dialog: {
    /** 对话框内容 - 玻璃态效果 */
    content: "bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl",

    /** 对话框标题图标 */
    titleIcon: "h-5 w-5 text-purple-500",

    /** 对话框提示框 */
    infoBox: "rounded-lg bg-purple-900/20 border border-purple-500/10 p-3 text-sm text-purple-200",
  },

  /**
   * 加载状态
   */
  loading: {
    /** 加载图标 */
    spinner: "animate-spin text-purple-500",

    /** 加载边框 */
    border: "border-purple-500/20 animate-pulse",
  },

  /**
   * Select 下拉框样式
   */
  select: {
    /** Select 内容 */
    content: "bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl",

    /** Select 触发器 */
    trigger: "bg-zinc-900/40 border-purple-500/10 focus:ring-purple-500/50",
  },

  /**
   * Popover 弹出框样式
   */
  popover: {
    /** Popover 内容 */
    content: "bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl",
  },

  /**
   * 渐变效果
   */
  gradient: {
    /** 紫粉渐变 */
    purplePink: "bg-gradient-to-br from-purple-500 to-pink-500",

    /** 紫粉渐变（半透明） */
    purplePinkSoft: "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
  },

  /**
   * 图标颜色
   */
  icon: {
    /** 紫色图标 */
    purple: "text-purple-500",

    /** 紫色图标（浅色） */
    purpleLight: "text-purple-400",

    /** 紫色图标（深色） */
    purpleDark: "text-purple-600",
  },
} as const;

/**
 * 类型推导辅助
 *
 * 使用示例：
 * import { novelTheme } from './theme';
 *
 * <Button className={novelTheme.button.primary}>保存</Button>
 * <Card className={novelTheme.card.base}>...</Card>
 */
export type NovelTheme = typeof novelTheme;
