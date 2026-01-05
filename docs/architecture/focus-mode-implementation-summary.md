# 专注模式实施总结

## 📋 产品需求回顾

### 业务价值
- **列表模式**：适合快速浏览、批量操作、章节管理
- **专注模式**：适合精细编辑单个分镜、实时预览、精准调参

### 设计参考
参考可灵 AI 等主流 AI 创作工具的三栏式设计：
- 左侧：章节分镜列表（可切换）
- 中央：大图预览 + 生成进度
- 右侧：配置面板（角色/场景/提示词/模型）

---

## 🏗️ 技术实现

### 1. 文件结构

已创建的新文件：

```
src/app/scripts/[id]/
├── components/FocusMode/
│   ├── index.tsx                  ✅ 主入口组件
│   ├── types.ts                   ✅ TypeScript 类型定义
│   ├── FocusModeLayout.tsx        ✅ 三栏布局容器
│   ├── ChapterPanelNav.tsx        ✅ 左侧章节导航（256px）
│   ├── PanelPreviewCenter.tsx     ✅ 中央预览区（弹性）
│   └── PanelConfigSidebar.tsx     ✅ 右侧配置面板（320px）
└── contexts/
    └── FocusModeContext.tsx       ✅ 专注模式状态管理

docs/
├── FOCUS_MODE_GUIDE.md            ✅ 用户使用指南
└── architecture/
    └── focus-mode-implementation-summary.md ✅ 技术总结
```

修改的现有文件：

```
src/app/scripts/[id]/
├── page.tsx                        ✅ 集成专注模式
└── components/
    └── ScriptPageHeader.tsx        ✅ 添加"专注编辑"按钮
```

### 2. 核心组件说明

#### FocusModeProvider (上下文)
**位置**: `src/app/scripts/[id]/contexts/FocusModeContext.tsx`

**职责**:
- 管理当前选中的分镜
- 维护配置状态（角色、提示词、模型参数）
- 提供导航操作（上一个/下一个）
- 处理生成、编辑、删除操作
- 与后端 API 交互

**关键状态**:
```typescript
interface FocusModeState {
  currentPanelId: string | null;
  currentPanel: FocusModePanel | null;
  config: FocusModeConfig;
  isGenerating: boolean;
  generationProgress: number;
  previewImageUrl: string | null;
  showOriginal: boolean;
}
```

**关键操作**:
```typescript
interface FocusModeActions {
  selectPanel: (panelId: string) => void;
  goToPreviousPanel: () => void;
  goToNextPanel: () => void;
  updateConfig: (config: Partial<FocusModeConfig>) => void;
  generateImage: () => Promise<void>;
  updatePanelDescription: (description: string) => Promise<void>;
  updatePanelPrompt: (prompt: string) => Promise<void>;
  exitFocusMode: () => void;
}
```

#### ChapterPanelNav (左侧导航)
**位置**: `src/app/scripts/[id]/components/FocusMode/ChapterPanelNav.tsx`

**功能**:
- 按章节分组显示分镜
- 缩略图 + 序号 + 描述
- 当前章节自动展开
- 显示生成状态（pending/completed）
- 点击切换分镜

**UI 特点**:
- 宽度: 256px
- 当前选中分镜: 橙色边框高亮
- 生成中分镜: 脉动动画
- 底部统计: 已生成/总数

#### PanelPreviewCenter (中央预览)
**位置**: `src/app/scripts/[id]/components/FocusMode/PanelPreviewCenter.tsx`

**功能**:
- 大图预览（最大化显示）
- 导航按钮（上一个/下一个）
- 生成进度动画
- 全屏查看、下载功能
- 底部显示描述和提示词

**状态显示**:
- 空状态: 提示用户生成图片
- 生成中: 显示进度条和动画
- 已生成: 显示图片 + 操作按钮

#### PanelConfigSidebar (右侧配置)
**位置**: `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx`

**功能**:
- 分镜描述编辑
- AI 提示词编辑
- 角色选择（多选，带缩略图）
- 模型配置（Nano-Banana-Pro/Nano-Banana/图梦4.0）
- 宽高比选择（1:1, 16:9, 9:16, 4:3, 3:4）
- 高级参数（推理步数、引导强度、负面提示词）

**UI 组织**:
- 顶部: 配置标题 + 重置按钮
- 主体: 手风琴折叠面板（角色/模型/高级）
- 底部: 生成按钮 + 删除按钮

#### FocusModeLayout (布局容器)
**位置**: `src/app/scripts/[id]/components/FocusMode/FocusModeLayout.tsx`

**功能**:
- 全屏固定定位 (z-index: 50)
- 三栏布局（左 256px | 中间弹性 | 右 320px）
- 顶部工具栏（退出按钮 + 快捷键提示）
- 底部进度条（生成时显示）
- 键盘快捷键监听

**快捷键**:
- `ESC`: 退出专注模式
- `Ctrl/Cmd + ←`: 上一个分镜
- `Ctrl/Cmd + →`: 下一个分镜
- `Ctrl/Cmd + Enter`: 生成图片

### 3. 集成到主页面

**修改**: `src/app/scripts/[id]/page.tsx`

**添加的状态**:
```typescript
const [focusModeEnabled, setFocusModeEnabled] = useState(false);
const [focusModeInitialPanelId, setFocusModeInitialPanelId] = useState<string | null>(null);
```

**添加的处理函数**:
```typescript
const handleEnterFocusMode = useCallback((panelId?: string) => {
  setFocusModeInitialPanelId(panelId || null);
  setFocusModeEnabled(true);
}, []);

const handleExitFocusMode = useCallback(() => {
  setFocusModeEnabled(false);
  setFocusModeInitialPanelId(null);
  void refreshStoryData();
}, [refreshStoryData]);
```

**渲染逻辑**:
```typescript
// 如果启用了专注模式，渲染专注模式组件
if (focusModeEnabled) {
  return (
    <FocusMode
      storyId={storyId}
      projectId={data?.projectId || null}
      panels={data?.panels || []}
      chapters={data?.chapters || []}
      characters={characterAssets}
      initialPanelId={focusModeInitialPanelId}
      onExit={handleExitFocusMode}
      onPanelUpdate={refreshStoryData}
    />
  );
}

// 否则渲染正常的列表模式
return <div>...列表模式...</div>
```

**修改**: `src/app/scripts/[id]/components/ScriptPageHeader.tsx`

**添加的 Props**:
```typescript
interface ScriptPageHeaderProps {
  // ... 现有 props
  onEnterFocusMode?: () => void;
}
```

**添加的按钮**:
```tsx
{panels.length > 0 && onEnterFocusMode && (
  <Button
    variant="outline"
    size="sm"
    onClick={onEnterFocusMode}
    className="border-purple-500/50 hover:border-purple-500 text-purple-400"
  >
    <Maximize2 className="w-4 h-4 mr-2" />
    专注编辑
  </Button>
)}
```

### 4. 数据流设计

```
用户交互
  ↓
组件事件 (ChapterPanelNav.tsx / PanelConfigSidebar.tsx)
  ↓
Context Actions (FocusModeContext.tsx)
  ↓
API 调用 (fetch)
  ↓
后端处理 (/api/panel/generate, /api/panel/[id])
  ↓
数据库更新 (Prisma)
  ↓
响应返回
  ↓
Context 状态更新
  ↓
组件重新渲染
```

### 5. API 复用

完全复用现有 API，无需新增后端代码：

| API | 用途 | 调用位置 |
|-----|------|---------|
| `POST /api/panel/generate` | 生成分镜图片 | `FocusModeContext.generateImage()` |
| `PATCH /api/panel/[id]` | 更新分镜描述/提示词 | `FocusModeContext.updatePanelDescription/Prompt()` |
| `PATCH /api/panel/[id]` | 删除分镜图片 | `FocusModeContext.deletePanelImage()` |

---

## 🎨 UI/UX 设计

### 配色方案

| 元素 | 颜色 | 说明 |
|------|------|------|
| 背景主色 | `#0f0f13` | 深色主背景 |
| 面板背景 | `#16161a` | 侧边栏背景 |
| 边框 | `#374151` (gray-800) | 分割线 |
| 主要强调 | `#f97316` (orange-500) | 生成按钮、选中状态 |
| 次要强调 | `#a855f7` (purple-500) | 专注模式按钮 |
| 成功状态 | `#22c55e` (green-500) | 新生成标签 |
| 文本主色 | `#ffffff` | 标题、内容 |
| 文本次要 | `#9ca3af` (gray-400) | 辅助文字 |

### 布局尺寸

```
全屏布局 (fixed inset-0)
├── 顶部工具栏: 56px (h-14)
├── 三栏主体 (flex-1)
│   ├── 左侧导航: 256px (w-64)
│   ├── 中央预览: 弹性 (flex-1)
│   └── 右侧配置: 320px (w-80)
└── 底部进度条: 4px (h-1, 可选)
```

### 交互反馈

1. **悬停效果**: 所有可点击元素都有 hover 状态
2. **加载状态**: 生成中显示动画和进度条
3. **选中状态**: 当前分镜高亮边框
4. **保存提示**: 未保存修改时显示提示按钮
5. **错误提示**: 使用 toast 显示错误信息

### 响应式设计

- 最小宽度: 1280px（三栏布局需要足够空间）
- 小屏幕: 建议使用列表模式
- 快捷键提示: 在小屏幕（< 768px）自动隐藏

---

## 🧪 测试建议

### 功能测试清单

- [ ] 进入专注模式（从头部按钮）
- [ ] 退出专注模式（按钮 + ESC 键）
- [ ] 左侧导航切换分镜
- [ ] 快捷键切换分镜（Ctrl + 左右箭头）
- [ ] 编辑描述和提示词
- [ ] 保存修改
- [ ] 选择角色
- [ ] 修改模型配置
- [ ] 调整宽高比
- [ ] 修改高级参数
- [ ] 生成图片（Ctrl + Enter）
- [ ] 查看生成进度
- [ ] 下载图片
- [ ] 全屏查看图片
- [ ] 删除图片
- [ ] 重置配置
- [ ] 数据持久化（刷新后保持）

### 边界情况测试

- [ ] 只有一个分镜
- [ ] 没有章节（不应进入专注模式）
- [ ] 没有角色
- [ ] 分镜没有图片
- [ ] 分镜正在生成中
- [ ] 网络请求失败
- [ ] 生成超时
- [ ] 快速切换分镜

### 性能测试

- [ ] 100+ 分镜时的导航性能
- [ ] 大图加载性能
- [ ] 快速切换分镜时的响应速度
- [ ] 内存占用（长时间使用）

---

## 📊 代码统计

### 新增代码量

| 文件 | 行数 | 说明 |
|------|------|------|
| `types.ts` | 90 | 类型定义 |
| `FocusModeContext.tsx` | 270 | 状态管理 |
| `ChapterPanelNav.tsx` | 150 | 左侧导航 |
| `PanelPreviewCenter.tsx` | 222 | 中央预览 |
| `PanelConfigSidebar.tsx` | 340 | 右侧配置 |
| `FocusModeLayout.tsx` | 120 | 布局容器 |
| `index.tsx` | 50 | 主入口 |
| **总计** | **~1,242** | **纯新增代码** |

### 修改代码量

| 文件 | 修改行数 | 说明 |
|------|---------|------|
| `page.tsx` | +30 | 集成专注模式 |
| `ScriptPageHeader.tsx` | +20 | 添加按钮 |
| **总计** | **+50** | **修改现有代码** |

### 代码质量

- ✅ **TypeScript 严格模式**: 所有类型都明确定义，无 `any`
- ✅ **组件拆分**: 单个组件不超过 400 行
- ✅ **样式统一**: 使用 Tailwind CSS，无自定义 CSS
- ✅ **无 Lint 错误**: 所有文件通过 ESLint 检查
- ✅ **复用现有 API**: 无需修改后端代码

---

## 🚀 部署建议

### 1. 环境变量
无需新增环境变量，复用现有配置。

### 2. 依赖检查
无新增外部依赖，使用现有的 `lucide-react`、`@/components/ui` 等。

### 3. 构建测试

```bash
# 开发环境测试
pnpm run dev

# 访问剧本详情页
http://localhost:3000/scripts/[your-story-id]

# 点击"专注编辑"按钮测试
```

### 4. 生产构建

```bash
# 构建
pnpm run build

# 启动
pnpm run start
```

### 5. 性能优化建议

- 中央预览区的图片可以添加懒加载
- 左侧导航可以使用虚拟滚动（如果分镜数量 > 100）
- 考虑预加载相邻分镜的图片

---

## 🎯 后续优化方向

### Phase 2: 功能增强

1. **从分镜卡片进入**
   - 在 `EditablePanelCard` 添加"专注编辑"按钮
   - 传递 `panelId` 到专注模式

2. **历史版本**
   - 底部时间轴组件
   - 显示历史生成的图片
   - 对比不同版本

3. **实时进度**
   - WebSocket 或 SSE 推送生成进度
   - 流式更新预览图

4. **图片编辑**
   - 集成简单的图片编辑工具
   - 裁剪、旋转、滤镜

5. **配置复制**
   - 复制当前配置到其他分镜
   - 批量应用配置

### Phase 3: 性能优化

1. **预加载**
   - 预加载相邻 3 个分镜的图片
   - 智能预测用户将要查看的分镜

2. **虚拟滚动**
   - 左侧导航使用虚拟滚动
   - 支持 1000+ 分镜

3. **自动保存**
   - 每 30 秒自动保存修改
   - 本地草稿缓存（localStorage）

4. **离线支持**
   - PWA 支持
   - 离线缓存已生成的图片

### Phase 4: 协作功能

1. **多人协作**
   - 实时同步其他用户的编辑
   - 锁定机制防止冲突

2. **评论系统**
   - 在分镜上添加评论
   - @提及其他用户

3. **版本管理**
   - Git 式的分支管理
   - 回滚到历史版本

---

## ✅ 完成情况

### 已完成任务

- [x] 创建专注模式基础结构和类型定义
- [x] 实现专注模式上下文和状态管理
- [x] 开发左侧章节分镜导航组件
- [x] 开发中央大图预览组件
- [x] 开发右侧配置面板组件
- [x] 实现三栏布局容器组件
- [x] 集成到主页面并添加切换按钮
- [x] 添加键盘快捷键和交互优化
- [x] 编写用户使用指南
- [x] 编写技术实施总结

### 交付物清单

✅ **代码文件** (7 个新文件 + 2 个修改)
- `src/app/scripts/[id]/components/FocusMode/index.tsx`
- `src/app/scripts/[id]/components/FocusMode/types.ts`
- `src/app/scripts/[id]/components/FocusMode/FocusModeLayout.tsx`
- `src/app/scripts/[id]/components/FocusMode/ChapterPanelNav.tsx`
- `src/app/scripts/[id]/components/FocusMode/PanelPreviewCenter.tsx`
- `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx`
- `src/app/scripts/[id]/contexts/FocusModeContext.tsx`
- `src/app/scripts/[id]/page.tsx` (修改)
- `src/app/scripts/[id]/components/ScriptPageHeader.tsx` (修改)

✅ **文档** (2 个)
- `docs/FOCUS_MODE_GUIDE.md` - 用户使用指南
- `docs/architecture/focus-mode-implementation-summary.md` - 技术总结

✅ **质量保证**
- 无 TypeScript 错误
- 无 ESLint 错误
- 遵循项目代码规范
- 完整的类型定义

---

## 👥 贡献者

- **产品设计**: 参考可灵 AI 三栏式设计
- **技术实现**: AI Assistant (Claude Sonnet 4.5)
- **代码审查**: 待用户验证

---

## 📞 联系与支持

如有问题或建议，请：
1. 查看 `docs/FOCUS_MODE_GUIDE.md` 用户指南
2. 在项目中提交 Issue
3. 联系项目维护者

---

**最后更新**: 2025-01-05  
**版本**: v1.0.0  
**状态**: ✅ 开发完成，待测试验证

