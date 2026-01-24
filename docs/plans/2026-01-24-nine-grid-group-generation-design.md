# 九宫格分组生成与角色参考图选择功能设计

**设计日期**: 2026-01-24
**功能模块**: InfiniteCanvas - 镜头详情面板 & 九宫格生成对话框
**设计目标**: 优化九宫格生成工作流，增加角色一致性参考图功能

---

## 1. 需求概述

### 1.1 核心需求

1. **分组展示**：镜头自动按9个一组进行分组展示（例如30个镜头分成4组）
2. **快速生成**：每组后面提供"生成九宫格"按钮，点击自动选中该组的9个镜头
3. **角色参考图**：在生成对话框中增加角色参考图选择功能，确保生成图片的角色一致性

### 1.2 参考图来源

- 角色库的头像图片
- 当前小说项目所有已生成的镜头图片
- 场景库图片
- Final（最终分镜）图片

---

## 2. 整体架构设计

### 2.1 核心改动点

```
ShotDetailPanel.tsx (镜头详情面板)
├─ 移除九宫格选择模式（单个选择逻辑）
├─ 改为分组展示模式
│   ├─ 第1组（镜头1-9）   [生成九宫格] 按钮
│   ├─ 第2组（镜头10-18） [生成九宫格] 按钮
│   ├─ 第3组（镜头19-27） [生成九宫格] 按钮
│   └─ 第4组（镜头28-30 + 6个占位符）[生成九宫格(禁用)]
└─ 保留"重新生成全部"按钮

GenerateNineGridDialog.tsx (九宫格生成对话框)
├─ 九宫格镜头预览（现有）
├─ [新增] 角色参考图选择区
│   ├─ 自动检测的角色列表
│   ├─ 每个角色的参考图选择器
│   └─ [+ 手动添加角色] 按钮
├─ 剧情概述（现有）
└─ 漫画风格（现有）
```

### 2.2 新增组件清单

```
src/app/(novel)/novel/components/InfiniteCanvas/
├── DetailPanel/
│   ├── ShotDetailPanel.tsx                    # [改造] 主面板
│   ├── ShotGroupSection.tsx                   # [新增] 单个9镜头分组
│   └── types.ts                               # [扩展] 类型定义
│
├── NineGrid/
│   ├── GenerateNineGridDialog.tsx             # [改造] 主对话框
│   ├── CharacterReferenceSection.tsx          # [新增] 角色参考图区域
│   ├── CharacterReferenceCard.tsx             # [新增] 单个角色的参考图卡片
│   ├── ReferenceImagePicker.tsx               # [新增] 图片选择器对话框
│   ├── hooks/
│   │   ├── useChapterCharacters.ts            # [新增] 获取章节角色
│   │   ├── useProjectReferenceImages.ts       # [新增] 获取项目参考图
│   │   └── useCharacterReferences.ts          # [新增] 角色参考图状态管理
│   └── types.ts                               # [扩展] 类型定义
│
└── utils/
    └── shot-grouping.ts                       # [新增] 分组工具函数
```

---

## 3. 数据结构设计

### 3.1 分组数据结构

```typescript
// src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/types.ts

export interface ShotGroup {
  groupIndex: number;           // 组索引：0, 1, 2, 3
  startOrder: number;           // 起始镜头序号：1, 10, 19, 28
  endOrder: number;             // 结束镜头序号：9, 18, 27, 30
  shots: ShotDesign[];          // 该组的镜头数组
  isComplete: boolean;          // 是否有完整的9个镜头
  placeholderCount: number;     // 占位符数量
}
```

### 3.2 角色参考图数据结构

```typescript
// src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/types.ts

// 角色信息（从 NovelCharacter 或 Chapter 关联获取）
export interface CharacterReference {
  id: string;
  name: string;
  role?: string;               // 角色定位（主角/配角/反派等）
  avatar_url?: string;         // 默认头像
  selectedReferenceImages: ReferenceImage[];  // 用户选择的参考图
}

// 参考图片元数据
export interface ReferenceImage {
  id: string;
  url: string;
  source: 'character_avatar' | 'shot_image' | 'scene' | 'final';
  sourceId?: string;           // 来源记录的ID
  thumbnail?: string;          // 缩略图URL
  metadata?: {
    chapterNumber?: number;    // 如果是镜头图片，来自第几章
    shotOrder?: number;        // 镜头序号
    sceneName?: string;        // 场景名称
  };
}
```

### 3.3 API 请求扩展

```typescript
// 九宫格生成请求（扩展现有的 NineGridGenerateRequest）
export interface NineGridGenerateRequest {
  shotIds: string[];
  comicStyleId: string;
  plotSummary?: string;
  // [新增] 角色参考图
  characterReferences?: {
    characterId: string;
    referenceImageUrls: string[];  // 该角色的参考图URL数组
  }[];
}
```

---

## 4. 核心实现逻辑

### 4.1 分组计算函数

```typescript
// src/app/(novel)/novel/components/InfiniteCanvas/utils/shot-grouping.ts

export function groupShotsIntoNineGrids(shots: ShotDesign[]): ShotGroup[] {
  const groups: ShotGroup[] = [];
  const totalGroups = Math.ceil(shots.length / 9);

  for (let i = 0; i < totalGroups; i++) {
    const startIndex = i * 9;
    const endIndex = Math.min(startIndex + 9, shots.length);
    const groupShots = shots.slice(startIndex, endIndex);
    const placeholderCount = 9 - groupShots.length;

    groups.push({
      groupIndex: i,
      startOrder: groupShots[0]?.shot_order || (i * 9 + 1),
      endOrder: groupShots[groupShots.length - 1]?.shot_order || (i * 9 + 9),
      shots: groupShots,
      isComplete: groupShots.length === 9,
      placeholderCount,
    });
  }

  return groups;
}
```

### 4.2 角色检测逻辑（混合方案）

```typescript
// src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useChapterCharacters.ts

export function useChapterCharacters(chapterId: string) {
  return useQuery({
    queryKey: ['chapter-characters', chapterId],
    queryFn: async () => {
      // 1. 优先从章节关联角色获取
      const response = await fetch(`/api/canvas/chapter/${chapterId}/characters`);
      if (!response.ok) throw new Error('获取角色失败');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// 检测流程：
// 1. 优先从章节关联角色获取（NovelChapter 关联表）
// 2. 如果没有，返回空数组，显示"未检测到角色"
// 3. 提供 [+ 手动添加角色] 按钮让用户补充
```

### 4.3 参考图获取逻辑

```typescript
// src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useProjectReferenceImages.ts

export function useProjectReferenceImages(projectId: string, characterId?: string) {
  return useQuery({
    queryKey: ['project-reference-images', projectId, characterId],
    queryFn: async () => {
      const params = new URLSearchParams({
        types: 'shot,scene,final',
        ...(characterId && { characterId }),
      });

      const response = await fetch(
        `/api/canvas/project/${projectId}/reference-images?${params}`
      );
      if (!response.ok) throw new Error('获取参考图失败');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
```

---

## 5. 组件设计详情

### 5.1 ShotGroupSection 组件

**职责**:
- 显示一组9个镜头的卡片网格
- 显示占位符（如果不足9个）
- 显示组标题（第1组、第2组等）
- 提供"生成九宫格"按钮
- 处理分组按钮点击事件

**UI 布局**:
```
┌─────────────────────────────────────────────┐
│ 第1组  [镜头1-9]  [不足9个]  [生成九宫格]   │
├─────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐                     │
│ │镜头1│ │镜头2│ │镜头3│                     │
│ └─────┘ └─────┘ └─────┘                     │
│ ┌─────┐ ┌─────┐ ┌─────┐                     │
│ │镜头4│ │镜头5│ │镜头6│                     │
│ └─────┘ └─────┘ └─────┘                     │
│ ┌─────┐ ┌─────┐ ┌─────┐                     │
│ │镜头7│ │镜头8│ │占位符│                    │
│ └─────┘ └─────┘ └─────┘                     │
└─────────────────────────────────────────────┘
```

**Props**:
```typescript
interface ShotGroupSectionProps {
  group: ShotGroup;
  onGenerate: (group: ShotGroup) => void;
  onShotClick?: (shot: ShotDesign) => void;
}
```

### 5.2 CharacterReferenceSection 组件

**职责**:
- 显示角色列表（自动检测 + 手动添加）
- 管理每个角色的参考图状态
- 提供"添加角色"按钮
- 显示无角色提示

**UI 布局**:
```
┌─────────────────────────────────────────────┐
│ 角色参考图（可选）                           │
├─────────────────────────────────────────────┤
│ ┌─ 角色卡片: 李明 (主角) ──────────────────┐│
│ │ [头像] 李明                [选择参考图]  ││
│ │ 已选参考图: [图1] [图2] [图3]           ││
│ └──────────────────────────────────────────┘│
│ ┌─ 角色卡片: 王芳 (女主) ──────────────────┐│
│ │ [头像] 王芳                [选择参考图]  ││
│ │ 已选参考图: 无                          ││
│ └──────────────────────────────────────────┘│
│ [+ 手动添加角色]                            │
└─────────────────────────────────────────────┘
```

### 5.3 CharacterReferenceCard 组件

**职责**:
- 显示单个角色信息（头像、姓名、角色定位）
- 显示该角色已选的参考图（横向滚动）
- 提供"选择参考图"按钮
- 提供删除参考图功能

**Props**:
```typescript
interface CharacterReferenceCardProps {
  character: CharacterReference;
  selectedImages: ReferenceImage[];
  onSelectImages: (images: ReferenceImage[]) => void;
  onRemoveImage: (imageId: string) => void;
}
```

### 5.4 ReferenceImagePicker 组件

**职责**:
- 分类标签页（角色头像/镜头图片/场景/Final）
- 图片网格展示（支持多选）
- 搜索/筛选功能（可选）
- 确认/取消按钮

**UI 布局**:
```
┌─────────────────────────────────────────────┐
│ 选择参考图 - 李明                  [关闭]   │
├─────────────────────────────────────────────┤
│ [角色头像] [镜头图片] [场景库] [最终分镜]   │
├─────────────────────────────────────────────┤
│ 角色头像标签页:                             │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │
│ │头像 │ │三视 │ │表情 │ │全身 │             │
│ │[✓] │ │[ ] │ │[ ] │ │[ ] │             │
│ └─────┘ └─────┘ └─────┘ └─────┘             │
├─────────────────────────────────────────────┤
│ 镜头图片标签页:                             │
│ 按章节分组显示:                             │
│ ▼ 第1章                                     │
│   ┌─────┐ ┌─────┐ ┌─────┐                  │
│   │镜头1│ │镜头2│ │镜头3│                  │
│   │[ ] │ │[✓] │ │[ ] │                  │
│   └─────┘ └─────┘ └─────┘                  │
├─────────────────────────────────────────────┤
│               [取消]  [确定(已选3张)]        │
└─────────────────────────────────────────────┘
```

**Props**:
```typescript
interface ReferenceImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterId: string;
  selectedImages: ReferenceImage[];
  onConfirm: (images: ReferenceImage[]) => void;
}
```

---

## 6. API 端点设计

### 6.1 获取章节关联角色

```
GET /api/canvas/chapter/:chapterId/characters

Response:
{
  characters: [
    {
      id: string;
      name: string;
      role?: string;
      avatar_url?: string;
      reference_image_url?: string;
    }
  ]
}

实现逻辑:
1. 查询 NovelChapter 的 chapter_id
2. 通过关联表（如果存在）获取角色列表
3. 如果没有关联，返回空数组
```

### 6.2 获取项目所有已生成图片

```
GET /api/canvas/project/:projectId/reference-images?types=shot,scene,final&characterId=xxx

Query Params:
- types: 图片类型，逗号分隔（shot, scene, final）
- characterId: 可选，用于过滤特定角色的图片

Response:
{
  shots: [
    {
      id: string;
      url: string;
      chapterNumber: number;
      shotOrder: number;
      description: string;
    }
  ],
  scenes: [
    {
      id: string;
      url: string;
      name: string;
    }
  ],
  finals: [
    {
      id: string;
      url: string;
      chapterNumber: number;
      description: string;
    }
  ]
}

实现逻辑:
1. 查询 ShotDesign 中 generated_image_url 不为空的记录
2. 查询 Scene 表关联的图片
3. 查询 Final 节点的图片
4. 按章节和类型分组返回
```

### 6.3 九宫格生成 API 扩展

```
POST /api/canvas/nine-grid/generate

Request Body:
{
  shotIds: string[];
  comicStyleId: string;
  plotSummary?: string;
  // [新增] 角色参考图
  characterReferences?: [
    {
      characterId: string;
      referenceImageUrls: string[];
    }
  ]
}

Response: (保持不变)
{
  success: boolean;
  taskId: string;
  status: string;
}

实现逻辑:
1. 验证请求参数
2. 将 characterReferences 传递给后端生成服务
3. 在生成 prompt 时融入角色参考图信息
4. 调用图像生成 API（传递参考图 URL）
```

---

## 7. 实现步骤建议

### Phase 1: 基础分组功能（核心）
1. 创建 `shot-grouping.ts` 工具函数
2. 创建 `ShotGroupSection.tsx` 组件
3. 改造 `ShotDetailPanel.tsx`：
   - 移除九宫格选择模式相关代码
   - 替换为分组展示逻辑
   - 处理分组生成按钮点击

### Phase 2: 角色检测与基础 UI（核心）
4. 创建 API 端点：`GET /api/canvas/chapter/:chapterId/characters`
5. 创建 `useChapterCharacters.ts` hook
6. 创建 `CharacterReferenceSection.tsx` 组件
7. 创建 `CharacterReferenceCard.tsx` 组件
8. 集成到 `GenerateNineGridDialog.tsx`

### Phase 3: 参考图选择器（核心）
9. 创建 API 端点：`GET /api/canvas/project/:projectId/reference-images`
10. 创建 `useProjectReferenceImages.ts` hook
11. 创建 `ReferenceImagePicker.tsx` 组件
    - 实现分类标签页
    - 实现图片网格（多选）
    - 实现按章节分组（镜头图片）
12. 创建 `useCharacterReferences.ts` 状态管理 hook

### Phase 4: 后端集成（核心）
13. 扩展 `POST /api/canvas/nine-grid/generate` 请求体
14. 修改后端生成逻辑：
    - 接收 characterReferences 参数
    - 在 prompt 构建中融入角色参考图
    - 传递参考图 URL 到图像生成服务

### Phase 5: 测试与优化（可选增强）
15. 添加占位符动画效果
16. 添加参考图预览功能
17. 添加图片搜索/筛选功能
18. 性能优化：图片懒加载、虚拟滚动

---

## 8. 技术约束与注意事项

### 8.1 代码规范遵守

- **NO `any` types**: 所有新代码必须显式类型声明
- **文件长度限制**: 单文件不超过 500 行，超过需拆分
- **类型定义分离**: 类型定义统一放在 `types.ts` 文件
- **路径别名**: 使用 `@/` 导入路径
- **图标使用**: 使用 lucide-react，禁止使用 emoji

### 8.2 数据库考量

- 章节角色关联：需确认 `NovelChapter` 是否有角色关联表
  - 如果没有，可能需要创建 `NovelChapterCharacter` 中间表
  - 或者从 `NovelCharacter` 表中通过 `novel_project_id` 过滤

- 参考图存储：
  - Character 表：`reference_image_url`, `avatar_url`
  - CharacterView 表：三视图
  - CharacterExpression 表：表情矩阵
  - ShotDesign 表：`generated_image_url`
  - Scene 表：场景图片
  - Final 节点：需确认存储位置

### 8.3 性能优化建议

- 参考图列表使用虚拟滚动（如果图片数量超过100张）
- 图片缩略图优先加载，原图按需加载
- 使用 React Query 缓存策略：
  - `staleTime: 5min` 避免频繁请求
  - `refetchOnWindowFocus: false` 避免切换标签重新请求

### 8.4 用户体验细节

- 不足9个镜头的组：按钮禁用 + 提示文案
- 占位符显示镜头序号（如：镜头31、镜头32）
- 分组标题显示镜头范围（如：镜头1-9）
- 参考图最多限制（建议每个角色最多5张）
- 加载状态占位符（Skeleton）

---

## 9. 后续扩展方向（可选）

### 9.1 智能推荐参考图
- 基于角色名称自动匹配头像
- 基于镜头描述推荐相似风格的历史图片
- AI 分析参考图质量（清晰度、角度等）

### 9.2 参考图权重调节
- 允许用户为每张参考图设置权重（弱参考/强参考）
- 在生成时传递权重参数给 AI

### 9.3 批量操作
- 一键为所有角色设置默认参考图（使用角色库头像）
- 参考图模板保存与复用

### 9.4 历史记录
- 保存上次生成时使用的参考图配置
- 快速恢复之前的参考图选择

---

## 10. 风险评估

### 10.1 技术风险
- **中等风险**: 章节角色关联表可能不存在，需要创建数据库迁移
- **低风险**: 参考图数量过多导致加载缓慢（可通过分页解决）
- **低风险**: 图像生成 API 是否支持多参考图输入（需确认）

### 10.2 用户体验风险
- **中等风险**: 如果大部分章节没有角色关联，用户需要频繁手动添加
  - **缓解方案**: 提供"应用到所有分组"快捷操作
- **低风险**: 参考图选择器界面复杂，用户学习成本高
  - **缓解方案**: 增加引导提示、默认推荐

---

## 11. 成功指标

### 11.1 功能完整性
- ✅ 镜头按9个一组正确分组
- ✅ 点击分组生成按钮自动选中该组镜头
- ✅ 角色列表自动检测 + 手动添加
- ✅ 参考图选择器支持4类图片源
- ✅ 生成请求正确携带角色参考图数据

### 11.2 用户体验
- ✅ 分组展示比选择模式更直观
- ✅ 参考图选择流程不超过3步
- ✅ 加载状态友好（Skeleton + 进度提示）
- ✅ 错误提示清晰（如：不足9个镜头）

### 11.3 性能指标
- ✅ 参考图列表加载时间 < 1s
- ✅ 分组计算时间 < 100ms（即使1000+镜头）
- ✅ 图片选择器渲染流畅（60fps）

---

## 12. 总结

本设计方案通过**分组展示 + 角色参考图选择**两大核心功能，显著优化九宫格生成工作流：

1. **效率提升**: 从"手动选择9个镜头"变为"点击分组生成"
2. **质量提升**: 通过角色参考图确保生成图片的角色一致性
3. **灵活性**: 支持自动检测 + 手动添加角色，适应不同场景

设计遵循 **YAGNI 原则**，第一版聚焦核心功能（Phase 1-4），高级功能（权重调节、智能推荐）作为后续迭代。

---

**设计文档版本**: v1.0
**审核状态**: 待审核
**预计工作量**: 2-3天（前端 + 后端 + 测试）
