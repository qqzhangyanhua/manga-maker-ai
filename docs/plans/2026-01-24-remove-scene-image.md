# 移除场景图功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完全移除"场景图"这个中间步骤，让漫画生成流程从四阶段简化为三阶段：剧本分析 → 镜头规划 → 最终漫画

**Architecture:** 
- 删除 `SceneImage` 数据库表及相关迁移
- 修改 `ComicPanelResult` 表，移除对 `SceneImage` 的外键依赖
- 重构最终漫画生成逻辑，直接从 `ShotDesign` 生成，不再依赖场景图
- 清理所有前端 UI 中的场景图相关组件和状态

**Tech Stack:** Next.js 14, Prisma, TypeScript, Python FastAPI

---

## 影响范围分析

### 数据库层
| 表/字段 | 变更 |
|---------|------|
| `SceneImage` | 删除整个表 |
| `ComicPanelResult.scene_image_id` | 删除字段及外键 |
| `ShotDesign.scene_images` | 删除关系 |
| `ShotDesign.shared_scene_id` | 删除字段 |
| `TimelineChapter.scene_image_count` | 删除字段 |
| `TimelineChapter.scene_status` | 删除字段 |

### API 层
| 路由 | 变更 |
|------|------|
| `/api/canvas/chapter/[id]/generate-scenes` | 删除 |
| `/api/canvas/chapter/[id]/scene` | 删除 |
| `/api/canvas/chapter/[id]/generate-finals` | 重构，直接从 ShotDesign 生成 |
| `/api/canvas/timeline/[id]` | 移除 scene_status, scene_image_count |
| `/api/novel/[id]/images` | 移除场景图查询 |
| `/api/story/[id]/generated-images` | 移除场景图查询 |

### 前端层
| 组件/文件 | 变更 |
|-----------|------|
| `ChapterRow.tsx` | 移除场景图节点 |
| `SceneDetailPanel.tsx` | 删除 |
| `GenerateSceneDialog.tsx` | 删除 |
| `TimelineContainer.tsx` | 移除场景图生成逻辑 |
| `ImageGallery/types.ts` | 移除 scene 类型 |
| `useWorkflowAutomation.ts` | 移除 scene 阶段 |

### Python 后端
| 文件 | 变更 |
|------|------|
| `canvas.py` | 删除 `/generate-scenes` 端点 |
| `scene_composer.py` | 删除 |
| `novel-backend-client.ts` | 移除 generateScenes 方法 |

---

## Task 1: 修改 Prisma Schema - 移除 SceneImage 相关定义

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: 备份当前 schema**
```bash
cp prisma/schema.prisma prisma/schema.prisma.backup
```

**Step 2: 修改 ShotDesign 模型，移除场景图关系**

在 `ShotDesign` 模型中删除:
```prisma
scene_images   SceneImage[]   @relation("ShotToSceneImages")
shared_scene   SceneImage?    @relation("SharedScene", fields: [shared_scene_id], references: [id], onDelete: SetNull)
shared_scene_id String?       @db.Uuid
```

**Step 3: 修改 TimelineChapter 模型，移除场景相关字段**

删除:
```prisma
scene_status         String  @default("pending")
scene_image_count    Int     @default(0)
```

**Step 4: 修改 ComicPanelResult 模型，移除 scene_image_id**

删除:
```prisma
scene_image_id  String   @db.Uuid
scene_image     SceneImage @relation(...)
```

以及相关索引。

**Step 5: 删除整个 SceneImage 模型**

删除 `model SceneImage { ... }` 整个块。

**Step 6: 生成 Prisma Client 验证语法**
```bash
npx prisma generate
```

Expected: 无错误

---

## Task 2: 创建数据库迁移脚本

**Files:**
- Create: `prisma/migrations/manual/20260124_remove_scene_image.sql`

**Step 1: 创建迁移 SQL**

```sql
-- 移除场景图功能迁移脚本
-- 警告: 此操作会删除所有场景图数据，请确保已备份

BEGIN;

-- 1. 删除 comic_panel_results 对 scene_images 的外键约束
ALTER TABLE "comic_panel_results" DROP CONSTRAINT IF EXISTS "comic_panel_results_scene_image_id_fkey";

-- 2. 删除 comic_panel_results.scene_image_id 列
ALTER TABLE "comic_panel_results" DROP COLUMN IF EXISTS "scene_image_id";

-- 3. 删除 shot_designs 对 scene_images 的外键约束 (shared_scene)
ALTER TABLE "shot_designs" DROP CONSTRAINT IF EXISTS "shot_designs_shared_scene_id_fkey";

-- 4. 删除 shot_designs.shared_scene_id 列
ALTER TABLE "shot_designs" DROP COLUMN IF EXISTS "shared_scene_id";

-- 5. 删除 timeline_chapters 的场景相关字段
ALTER TABLE "timeline_chapters" DROP COLUMN IF EXISTS "scene_status";
ALTER TABLE "timeline_chapters" DROP COLUMN IF EXISTS "scene_image_count";

-- 6. 删除 scene_images 表
DROP TABLE IF EXISTS "scene_images";

-- 7. 删除相关索引 (如果存在)
DROP INDEX IF EXISTS "idx_scene_image_shot";
DROP INDEX IF EXISTS "idx_scene_image_location";
DROP INDEX IF EXISTS "idx_comic_panel_scene";

COMMIT;
```

**Step 2: 执行迁移 (开发环境)**
```bash
psql $DATABASE_URL -f prisma/migrations/manual/20260124_remove_scene_image.sql
```

**Step 3: 重新生成 Prisma Client**
```bash
npx prisma generate
```

---

## Task 3: 删除场景图生成 API 路由

**Files:**
- Delete: `src/app/api/canvas/chapter/[id]/generate-scenes/route.ts`
- Delete: `src/app/api/canvas/chapter/[id]/scene/route.ts`

**Step 1: 删除目录**
```bash
rm -rf src/app/api/canvas/chapter/\[id\]/generate-scenes
rm -rf src/app/api/canvas/chapter/\[id\]/scene
```

**Step 2: 验证类型检查**
```bash
npm run type-check
```

---

## Task 4: 重构最终漫画生成 API

**Files:**
- Modify: `src/app/api/canvas/chapter/[id]/generate-finals/helpers.ts`
- Modify: `src/app/api/canvas/chapter/[id]/generate-finals/route.ts`

**Step 1: 修改 helpers.ts - fetchChapterData**

移除 `scene_images` include，直接返回 shot_designs:
```typescript
export async function fetchChapterData(chapterId: string, userId: string) {
  const timelineChapter = await prisma.timelineChapter.findUnique({
    where: { id: chapterId },
    include: {
      timeline: true,
      script_segments: {
        include: {
          shot_designs: {
            include: {
              script_segment: true,
            },
          },
        },
      },
    },
  });
  // ... 移除 allScenes 相关逻辑
}
```

**Step 2: 修改 processComicPanels**

移除 `allScenes` 参数，直接从 shot_design 的 prompt 生成漫画图。

**Step 3: 修改 route.ts**

更新调用逻辑，不再检查场景图是否存在。

---

## Task 5: 清理前端场景图组件

**Files:**
- Delete: `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/SceneDetailPanel.tsx`
- Delete: `src/app/(novel)/novel/components/InfiniteCanvas/GenerateSceneDialog.tsx`
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/index.tsx`

**Step 1: 删除 SceneDetailPanel**
```bash
rm src/app/\(novel\)/novel/components/InfiniteCanvas/DetailPanel/SceneDetailPanel.tsx
```

**Step 2: 删除 GenerateSceneDialog**
```bash
rm src/app/\(novel\)/novel/components/InfiniteCanvas/GenerateSceneDialog.tsx
```

**Step 3: 修改 DetailPanel/index.tsx，移除 SceneDetailPanel 导出**

---

## Task 6: 修改 ChapterRow 组件

**Files:**
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/ChapterRow.tsx`

**Step 1: 移除 onGenerateScenes prop**

**Step 2: 删除场景图节点**

删除:
```tsx
{/* Scene Images Node */}
<NodeCard
  title="场景图"
  status={chapter.scene_status}
  count={chapter.scene_image_count}
  onGenerate={onGenerateScenes}
  disabled={chapter.shot_status !== "completed"}
/>
```

**Step 3: 修改漫画图节点的 disabled 条件**

从 `disabled={chapter.scene_status !== "completed"}` 改为 `disabled={chapter.shot_status !== "completed"}`

---

## Task 7: 修改 TimelineContainer 和类型定义

**Files:**
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/TimelineContainer.tsx`
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/types.ts`

**Step 1: 修改 types.ts**

从 `TimelineChapter` 和 `ChapterSummary` 接口中移除:
```typescript
scene_status: GenerationStatus;
scene_image_count: number;
```

**Step 2: 修改 TimelineContainer.tsx**

- 移除 `sceneDialogChapter` 状态
- 移除 `generateChapterStep(chapter.id, "generate-scenes")` 调用
- 移除 `onGenerateScenes` prop 传递
- 移除 `GenerateSceneDialog` 组件引用

---

## Task 8: 修改工作流自动化 Hook

**Files:**
- Modify: `src/hooks/useWorkflowAutomation.ts`

**Step 1: 从 STAGE_CONFIG 移除 scene 阶段**

删除:
```typescript
{ key: 'scene_status', nextStage: 'final', label: '场景' },
```

**Step 2: 更新 STAGE_API_MAP**

删除:
```typescript
scene: 'generate-scenes',
```

**Step 3: 更新 STAGE_LABELS**

删除:
```typescript
scene: '场景图',
```

---

## Task 9: 清理 novel-backend-client

**Files:**
- Modify: `src/lib/novel-backend-client.ts`

**Step 1: 删除 SceneImageOutput 接口**

**Step 2: 删除 GenerateScenesRequest/Response 接口**

**Step 3: 删除 generateScenes 方法**

---

## Task 10: 清理 Python 后端

**Files:**
- Delete: `services/novel-backend/app/services/canvas/scene_composer.py`
- Modify: `services/novel-backend/app/routers/canvas.py`
- Modify: `services/novel-backend/app/services/canvas/__init__.py`

**Step 1: 删除 scene_composer.py**
```bash
rm services/novel-backend/app/services/canvas/scene_composer.py
```

**Step 2: 从 canvas.py 移除 /generate-scenes 端点**

**Step 3: 从 __init__.py 移除 SceneComposer 导出**

---

## Task 11: 清理其他引用

**Files:**
- Modify: `src/app/(novel)/novel/components/ImageGallery/types.ts` - 移除 scene 类型
- Modify: `src/app/api/novel/[id]/images/route.ts` - 移除场景图查询
- Modify: `src/app/api/story/[id]/generated-images/route.ts` - 移除场景图查询
- Modify: `src/app/api/canvas/timeline/[id]/route.ts` - 移除 scene_status, scene_image_count
- Modify: `src/app/api/canvas/timeline/[id]/chapters/route.ts` - 移除 scene_images include

---

## Task 12: 清理 transformData 和进度组件

**Files:**
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/utils/transformData.ts`
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/GenerationProgress.tsx`
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/ChapterNavigator.tsx`

**Step 1: 从 transformData.ts 移除 scene_status 相关逻辑**

**Step 2: 从 GenerationProgress.tsx 移除场景生成进度显示**

**Step 3: 从 ChapterNavigator.tsx 移除 scene_status 检查**

---

## Task 13: 清理旧版章节组件

**Files:**
- Modify: `src/components/SerialChapterList/ChapterCard.tsx`
- Delete: `src/components/SerialChapterList/GenerateChapterScenesDialog.tsx`
- Modify: `src/app/api/chapter/[id]/batch-generate-scenes/route.ts` - 删除

**Step 1: 删除 GenerateChapterScenesDialog**

**Step 2: 从 ChapterCard 移除场景生成相关逻辑**

**Step 3: 删除 batch-generate-scenes API**

---

## Task 14: 更新文档

**Files:**
- Modify: `src/app/(novel)/novel/canvas/[id]/DESIGN.md`
- Modify: `src/app/(novel)/novel/README.md`

**Step 1: 更新 DESIGN.md 流程图，移除场景图阶段**

**Step 2: 更新 README.md API 列表**

---

## Task 15: 验证与清理

**Step 1: 运行类型检查**
```bash
npm run type-check
```

**Step 2: 运行 lint**
```bash
npm run lint
```

**Step 3: 运行构建**
```bash
npm run build
```

**Step 4: 运行测试**
```bash
npm test
```

---

## 执行顺序建议

1. **先备份数据库** - 生产环境操作前必须
2. Tasks 1-2: 数据库变更
3. Tasks 3-4: API 层重构
4. Tasks 5-8: 前端组件清理
5. Tasks 9-10: 后端服务清理
6. Tasks 11-13: 其他引用清理
7. Task 14: 文档更新
8. Task 15: 最终验证

**预计工作量:** 4-6 小时
