# Novel to Comic 工作流 - UI 集成说明

本文档说明 Phase 2-5 的新功能在界面中的集成位置和使用流程。

---

## 🎨 UI 层级结构

```
Canvas Page (@src/app/(novel)/novel/canvas/[id]/page.tsx)
    └── Header
        └── "角色库" 按钮 → CharacterLibraryDrawer (Phase 2)
    └── InfiniteCanvasView
        └── ReactFlow Canvas (章节节点、脚本段节点、分镜节点)
        └── ShotDetailPanel (点击分镜节点时弹出)
            └── ShotGroupSection (分镜分组展示)
                └── Shot Card (单个分镜卡片)
                    ├── hover → "绑定角色" / "编辑角色" 按钮 (Phase 3)
                    │   └── ShotCharacterBindingPanel (角色绑定 + Prompt 合成)
                    │
                    └── hover → "生成候选" / "查看候选" 按钮 (Phase 4)
                        └── ShotNineGridDialog (九宫格生成对话框)
                            ├── "开始生成" → SSE 流式生成 9 张候选图
                            ├── 点击选择候选图
                            ├── "微调 Prompt" 按钮 (Phase 5)
                            │   └── PromptRefineDialog (Prompt 微调对话框)
                            │       ├── 左右对比视图 (原图 vs 微调后)
                            │       ├── Prompt 编辑器
                            │       ├── 高级参数设置
                            │       └── "使用此图" 确认
                            │
                            └── "确认选择" → 保存选中的候选图
```

---

## 📍 各功能入口位置

### Phase 2: 角色身份证系统

**入口**: Canvas 页面顶部 Header 的 "角色库" 按钮

**文件**: `src/app/(novel)/novel/canvas/[id]/page.tsx`

```typescript
// 121-130 行
<Button
  variant="outline"
  size="sm"
  onClick={() => setCharacterLibraryOpen(true)}
  className="border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
>
  <Users className="w-4 h-4 mr-1.5" />
  角色库
</Button>

// 167-173 行
<CharacterLibraryDrawer
  open={characterLibraryOpen}
  onOpenChange={setCharacterLibraryOpen}
  novelProjectId={timeline.novel_project_id}
  timelineId={timelineId}
/>
```

**功能**:
- 查看项目所有角色
- 为每个角色生成 "角色身份证" (标准化 Prompt 模板)
- 生成 Base 版本和 Variant 变体版本
- AI 辅助生成或手动编辑

---

### Phase 3: 分镜 Prompt 合成

**入口**: 点击任意**分镜节点** → ShotDetailPanel → ShotGroupSection → Shot Card hover

**文件**: `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotGroupSection.tsx`

```typescript
// 161-189 行 - 绑定角色按钮
<Button
  size="sm"
  variant="secondary"
  className="text-xs w-24"
  onClick={(e) => {
    e.stopPropagation();
    handleBindCharacter(shot);
  }}
>
  <Users className="w-3 h-3 mr-1" />
  {hasBoundCharacters(shot) ? "编辑角色" : "绑定角色"}
</Button>
```

**功能**:
- 为分镜选择要出现的角色
- 绑定角色的 Prompt 模板（角色身份证）
- 设置角色位置提示 (left, center, right, foreground, background)
- 添加手动调整内容
- **一键合成最终 Prompt** (角色 + 场景 + 动作 + 相机 + 风格)

---

### Phase 4: 九宫格候选图生成

**入口**: ShotGroupSection → Shot Card hover → "生成候选" / "查看候选" 按钮

**文件**: `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotGroupSection.tsx`

```typescript
// 177-186 行 - 九宫格生成按钮
<Button
  size="sm"
  variant={hasNineGridGeneration(shot) ? "outline" : "default"}
  className="text-xs w-24"
  onClick={(e) => {
    e.stopPropagation();
    handleOpenNineGridDialog(shot);
  }}
>
  <Sparkles className="w-3 h-3 mr-1" />
  {hasNineGridGeneration(shot) ? "查看候选" : "生成候选"}
</Button>
```

**功能**:
- **SSE 流式生成** 9 张不同 seed 的候选图
- 实时显示生成进度 (1/9 → 9/9)
- 3x3 网格展示候选图
- 点击选择最佳候选图
- "确认选择" 保存到分镜

**前置条件**: 需要先完成 Phase 3 的 Prompt 合成（或分镜有 prompt 字段）

---

### Phase 5: Prompt 微调与重绘

**入口**: ShotNineGridDialog (九宫格对话框) → 选中候选图后 → "微调 Prompt" 按钮

**文件**: `src/app/(novel)/novel/components/InfiniteCanvas/ShotNineGridDialog.tsx`

```typescript
// 398-407 行 - 微调按钮
{images.length > 0 && !isGenerating && selected && (
  <Button
    variant="outline"
    onClick={handleOpenRefineDialog}
    className="flex-1 sm:flex-none"
  >
    <Wand2 className="w-4 h-4 mr-2" />
    微调 Prompt
  </Button>
)}
```

**功能**:
- 左右对比视图（原图 vs 微调后）
- 编辑正向/负向 Prompt
- 高级参数设置（width, height, steps, cfg_scale, seed）
- 实时生成预览
- "使用此图" 确认替换原图

---

## 🎯 完整使用流程示例

### 场景：为一个分镜生成最终图片

1. **打开角色库** (Canvas 顶部)
   - 点击 "角色库" 按钮
   - 为每个角色生成 "角色身份证"（AI 生成外貌、服装描述）
   - 关闭角色库

2. **点击分镜节点**
   - 右侧弹出 `ShotDetailPanel`
   - 查看分镜的分组和详情

3. **绑定角色** (Phase 3)
   - hover 到目标分镜卡片
   - 点击 "绑定角色" 按钮
   - 选择要出现的角色（多选）
   - 设置角色位置（可选）
   - 添加手动调整内容（可选）
   - 点击 "合成 Prompt" → 生成最终 Prompt

4. **生成九宫格候选图** (Phase 4)
   - hover 到分镜卡片
   - 点击 "生成候选" 按钮
   - 弹出 `ShotNineGridDialog`
   - 点击 "开始生成"
   - 等待 SSE 流式生成 9 张图片（实时显示进度）
   - 浏览 3x3 网格，点击选择最满意的一张

5. **微调 Prompt**（可选，Phase 5）
   - 选中候选图后，点击 "微调 Prompt" 按钮
   - 弹出 `PromptRefineDialog`
   - 编辑 Prompt（例如：添加 "sunset lighting" 等）
   - 调整高级参数（可选）
   - 点击 "生成" 查看微调后的效果
   - 对比原图 vs 微调后
   - 满意后点击 "使用此图"

6. **确认选择**
   - 回到九宫格对话框
   - 点击 "确认选择" 保存图片到分镜
   - 分镜卡片显示 "已选" 标识

---

## 🔑 关键状态标识

在 `ShotGroupSection` 的分镜卡片上会显示各种状态标识：

| Badge | 颜色 | 含义 |
|-------|------|------|
| 👥 + 数字 | 紫色 | 已绑定 N 个角色 Prompt |
| ✓ + 数字 | 绿色 | 已合成最终 Prompt + 绑定 N 个角色 |
| 🖼️ 已选 | 蓝色 | 已从九宫格选择图片 |
| 九宫格 待选 | 橙色 | 已生成九宫格候选图，等待选择 |

---

## 📂 核心文件清单

### 页面入口
- `src/app/(novel)/novel/canvas/[id]/page.tsx` - Canvas 主页面

### Phase 2: 角色身份证
- `src/app/(novel)/novel/components/InfiniteCanvas/CharacterLibraryDrawer.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/CharacterPromptEditorDialog.tsx`
- `src/app/api/canvas/character-prompt/generate/route.ts`
- `src/app/api/canvas/character-prompt/[id]/route.ts`
- `src/lib/character-prompt-generator.ts`

### Phase 3: Prompt 合成
- `src/app/(novel)/novel/components/InfiniteCanvas/ShotCharacterBindingPanel.tsx`
- `src/app/api/canvas/shot/[shotId]/compose-prompt/route.ts`
- `src/lib/shot-prompt-composer.ts`

### Phase 4: 九宫格生成
- `src/app/(novel)/novel/components/InfiniteCanvas/ShotNineGridDialog.tsx`
- `src/app/api/canvas/shot/[shotId]/generate-nine-grid/route.ts`
- `src/app/api/canvas/nine-grid-selection/[id]/route.ts`

### Phase 5: Prompt 微调
- `src/app/(novel)/novel/components/InfiniteCanvas/PromptRefineDialog.tsx`
- `src/app/api/canvas/shot/[shotId]/refine-prompt/route.ts`
- `src/app/api/canvas/shot/[shotId]/confirm-refined/route.ts`

### 分镜展示组件
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotGroupSection.tsx` - **主要集成点**
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx`

---

## ⚠️ 重要提示

1. **数据库迁移**: 使用前必须先执行数据库迁移
   ```bash
   npx prisma db push
   # 或
   npx prisma migrate deploy
   ```

2. **功能依赖链**:
   - Phase 4 (九宫格) 依赖 Phase 3 (Prompt 合成)
   - Phase 5 (微调) 依赖 Phase 4 (九宫格)

3. **LLM 配置**: 确保 `llm_providers` 表中配置了可用的 LLM 服务

4. **图片生成**: 需要配置图片生成 API (Stable Diffusion / DALL-E)

5. **MinIO 存储**: 生成的图片会上传到 MinIO，确保 MinIO 服务正常运行

---

## 🎨 UI 预览

### 角色库抽屉 (Phase 2)
```
┌─────────────────────────────────┐
│ 角色库                          │
├─────────────────────────────────┤
│ 📦 小明                         │
│   ├── Base (默认)   [生成]     │
│   └── Variant 1     [生成]     │
│                                 │
│ 📦 小红                         │
│   └── [生成角色身份证]          │
└─────────────────────────────────┘
```

### 分镜卡片 (Phase 3-4)
```
┌─────────────────┐
│ 分镜预览图      │
│                 │
│  👥2  🖼️已选    │ ← 状态标识
│                 │
│  [hover 显示]   │
│  绑定角色       │
│  生成候选       │
│                 │
│ #镜头序号       │
└─────────────────┘
```

### 九宫格对话框 (Phase 4)
```
┌────────────────────────────────┐
│ 九宫格候选图                   │
├────────────────────────────────┤
│ 进度: ████████░░ 88%           │
│                                │
│ ┌──┬──┬──┐                    │
│ │✓ │  │  │                    │
│ ├──┼──┼──┤                    │
│ │  │  │  │                    │
│ ├──┼──┼──┤                    │
│ │  │  │  │                    │
│ └──┴──┴──┘                    │
│                                │
│ [重新生成] [微调Prompt] [确认] │
└────────────────────────────────┘
```

### Prompt 微调对话框 (Phase 5)
```
┌────────────────────────────────┐
│ Prompt 微调                    │
├────────────────────────────────┤
│ 原图        │  微调后           │
│ ┌────────┐  │  ┌────────┐     │
│ │ [img]  │  │  │ [img]  │     │
│ └────────┘  │  └────────┘     │
├─────────────┴─────────────────┤
│ Prompt:                        │
│ ┌──────────────────────────┐  │
│ │ a girl, sunset lighting  │  │
│ └──────────────────────────┘  │
│                                │
│ ▼ 高级参数                     │
│   Width: 1024  Height: 768    │
│                                │
│ [重置] [生成] [使用此图]       │
└────────────────────────────────┘
```

---

**总结**: 所有新功能都已完整集成到 Canvas 页面中，无需额外集成。用户只需在 Canvas 页面上操作分镜节点，即可使用完整的 Novel to Comic 工作流。
