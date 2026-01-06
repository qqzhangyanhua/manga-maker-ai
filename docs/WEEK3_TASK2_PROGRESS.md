# Week 3 Task 2 进度报告 - Story.suggested_characters 重构

**执行时间**: 2026-01-06
**任务**: 将 Story.suggested_characters JSONB 字段迁移到独立的 SuggestedCharacter 表
**状态**: 🚧 进行中（API 重构阶段）

---

## ✅ 已完成工作

### 1. 数据库 Schema 设计

#### 新增 SuggestedCharacter 表

```prisma
model SuggestedCharacter {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  story_id    String   @db.Uuid
  name        String
  description String   @db.Text  // Chinese (50-120 chars)
  appearance  String   @db.Text  // English for AI (80-160 chars)
  role        String   @default("supporting")

  // Generation tracking
  generated         Boolean  @default(false)
  character_id      String?  @db.Uuid
  image_url         String?
  optimized_prompt  String?  @db.Text
  generated_at      DateTime? @db.Timestamptz(6)

  // Metadata
  display_order Int      @default(0)
  created_at    DateTime @default(now()) @db.Timestamptz(6)
  updated_at    DateTime @default(now()) @db.Timestamptz(6)

  story     Story      @relation(fields: [story_id], references: [id], onDelete: Cascade)
  character Character? @relation(fields: [character_id], references: [id], onDelete: SetNull)

  @@index([story_id, generated])
  @@index([character_id])
  @@map("suggested_characters")
}
```

**设计亮点**:
- ✅ 完整保留 JSONB 字段中的所有信息
- ✅ `display_order` 支持 UI 排序
- ✅ `generated` + `character_id` 双字段跟踪生成状态
- ✅ `ON DELETE CASCADE` 确保数据一致性
- ✅ 索引优化查询性能（story_id + generated 组合索引）

#### 更新关系

**Story 模型**:
```prisma
model Story {
  // ... existing fields
  suggested_characters  Json? // 保留（临时向后兼容）

  // New relation
  suggested_characters_list SuggestedCharacter[]
}
```

**Character 模型**:
```prisma
model Character {
  // ... existing relations
  suggested_characters SuggestedCharacter[] // AI-suggested before generation
}
```

---

### 2. SQL 迁移脚本

**文件**: `prisma/migrations/20260106_add_suggested_characters_table/migration.sql`

```sql
CREATE TABLE "suggested_characters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "story_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "appearance" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'supporting',
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "character_id" UUID,
    "image_url" TEXT,
    "optimized_prompt" TEXT,
    "generated_at" TIMESTAMPTZ(6),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suggested_characters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_suggested_characters_story_generated"
ON "suggested_characters"("story_id", "generated");

CREATE INDEX "idx_suggested_characters_character"
ON "suggested_characters"("character_id");

ALTER TABLE "suggested_characters"
ADD CONSTRAINT "suggested_characters_story_id_fkey"
FOREIGN KEY ("story_id") REFERENCES "stories"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suggested_characters"
ADD CONSTRAINT "suggested_characters_character_id_fkey"
FOREIGN KEY ("character_id") REFERENCES "characters"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
```

**状态**: ✅ 已创建，待执行

---

### 3. 数据迁移脚本

**文件**: `scripts/migrate-suggested-characters.ts`

**功能**:
- 读取所有 Story.suggested_characters JSONB 数据
- 解析并验证数据结构
- 批量创建 SuggestedCharacter 记录
- 保留所有字段（name, description, appearance, role, generated, character_id, image_url, etc.）
- 设置 display_order（按原数组顺序）
- 详细日志输出（成功/失败统计）
- 迁移后验证（统计总数、已生成数、已关联数）

**使用方式**:
```bash
npx tsx scripts/migrate-suggested-characters.ts
```

**状态**: ✅ 已创建，待执行

---

### 4. API 路由重构

#### ✅ 已完成

**1. `/api/story/[id]/analyze-characters` (POST) - 生成建议角色**

**主要变更**:
- ❌ 移除 JSONB 存储逻辑
- ✅ 使用 `prisma.suggestedCharacter.createMany()` 批量创建
- ✅ 使用 `story.suggested_characters_list` 关系查询
- ✅ 支持 `force_regenerate` 参数（先删除旧记录）
- ✅ 返回格式保持兼容（前端无需修改）

**关键代码**:
```typescript
// 查询现有数据
const story = await prisma.story.findUnique({
  where: { id: storyId },
  include: {
    suggested_characters_list: {
      orderBy: { display_order: "asc" },
    },
  },
});

// 缓存检查
if (story.suggested_characters_list.length > 0 && !force_regenerate) {
  return NextResponse.json({
    suggested_characters: story.suggested_characters_list.map(...),
    from_cache: true,
  });
}

// 强制重新生成时删除旧数据
if (force_regenerate) {
  await prisma.suggestedCharacter.deleteMany({
    where: { story_id: storyId },
  });
}

// 批量创建新记录
const createdCharacters = await Promise.all(
  characterDataList.map((char, index) =>
    prisma.suggestedCharacter.create({
      data: {
        story_id: storyId,
        name: char.name,
        description: char.description,
        appearance: char.appearance,
        role: char.role,
        display_order: index,
      },
    })
  )
);
```

**2. `/api/story/[id]/suggested-characters` (GET/PATCH) - 管理建议角色**

**GET 端点变更**:
- ✅ 使用 `suggested_characters_list` 关系查询
- ✅ 支持 `include: { character }` 关联查询（显示已生成角色信息）
- ✅ 返回空数组时提示用户先运行角色分析

**PATCH 端点变更**:
- ❌ 移除 JSONB 操作逻辑（查找/修改/写回）
- ✅ 使用数据库 CRUD 操作（`update` / `delete`）
- ✅ 参数从 `temp_id` 改为 `id`（UUID 主键）
- ✅ 添加所有权验证（`story_id` 匹配检查）

**关键代码**:
```typescript
// GET - 查询带关联数据
const story = await prisma.story.findUnique({
  where: { id: storyId },
  select: {
    suggested_characters_list: {
      orderBy: { display_order: "asc" },
      include: {
        character: {
          select: { id: true, name: true, base_image_url: true },
        },
      },
    },
  },
});

// PATCH - 删除
await prisma.suggestedCharacter.delete({ where: { id } });

// PATCH - 更新
await prisma.suggestedCharacter.update({
  where: { id },
  data: { ...updates, updated_at: new Date() },
});
```

---

## 🚧 进行中工作

### 5. 剩余 API 路由重构

**待重构文件** (2 个):

1. **`/api/story/[id]/batch-generate-images` (POST)** - 批量生成角色图片
   - 需要查询 SuggestedCharacter 表
   - 更新 `generated`, `character_id`, `image_url`, `generated_at` 字段

2. **`/api/story/[id]/generate-character-image` (POST)** - 单个生成角色图片
   - 同上，单记录更新

**复杂度**: 低（类似的数据库操作模式）

---

### 6. 类型定义更新

**待更新文件**: `src/types/suggested-characters.types.ts`

**计划变更**:
```typescript
// ❌ 移除（不再需要）
export interface SuggestedCharactersData {
  version: string;
  generated_at: string;
  characters: SuggestedCharacter[];
  comic_style_id: string | null;
  settings: { count: number; temperature: number; };
}

// ✅ 简化（直接使用 Prisma 类型）
import type { SuggestedCharacter } from "@prisma/client";

export type SuggestedCharacterWithRelations = SuggestedCharacter & {
  character?: {
    id: string;
    name: string;
    base_image_url: string | null;
  } | null;
};
```

---

### 7. 前端 Hook 更新

**待更新文件**: `src/app/scripts/[id]/hooks/useGenerateStoryCharacters.ts`

**预期变更**:
- API 响应格式已保持兼容
- 可能需要调整 `temp_id` → `id` 的引用
- 验证错误处理逻辑

---

## 📊 影响范围统计

| 类别 | 已完成 | 进行中 | 待完成 | 总计 |
|------|--------|--------|--------|------|
| 数据库 Schema | ✅ 1 | - | - | 1 |
| SQL 迁移 | ✅ 1 | - | - | 1 |
| 数据迁移脚本 | ✅ 1 | - | - | 1 |
| API 路由 | ✅ 2 | 🚧 2 | - | 4 |
| 类型定义 | - | - | ⏳ 1 | 1 |
| 前端 Hook | - | - | ⏳ 1 | 1 |
| **总计** | **5** | **2** | **2** | **9** |

**完成度**: 55% (5/9)

---

## ⚠️ 重要决策

### 1. 向后兼容策略

**保留 Story.suggested_characters JSONB 字段**（临时）:
- ✅ 避免破坏现有 API 调用者
- ✅ 允许渐进式迁移
- ⚠️ 计划在 Week 4 彻底移除

### 2. ID 字段变更

**从 `temp_id` 改为 `id` (UUID)**:
- ✅ 使用数据库主键（更规范）
- ✅ 避免客户端生成 ID 的复杂性
- ⚠️ 需要更新前端调用（从 temp_id → id）

### 3. 数据迁移时机

**在代码部署后、JSONB 字段删除前执行**:
1. 部署新代码（使用新表结构）
2. 执行数据迁移脚本
3. 验证新旧数据一致性
4. 逐步停用 JSONB 字段
5. 最终删除 JSONB 字段

---

## 🎯 下一步行动

### 立即执行

1. **完成剩余 2 个 API 路由重构** (~30分钟)
   - batch-generate-images
   - generate-character-image

2. **更新类型定义** (~10分钟)
   - suggested-characters.types.ts

3. **运行类型检查** (~5分钟)
   ```bash
   npx prisma generate
   pnpm type-check
   ```

4. **执行数据库迁移** (~10分钟)
   ```bash
   # 1. Apply SQL migration
   psql ... < prisma/migrations/20260106_add_suggested_characters_table/migration.sql

   # 2. Run data migration
   npx tsx scripts/migrate-suggested-characters.ts

   # 3. Verify
   npx prisma studio
   ```

5. **测试 API 端点** (~20分钟)
   - analyze-characters (Step 1)
   - suggested-characters GET/PATCH
   - batch-generate-images (Step 2)

### 待确认

- [ ] 前端是否需要调整（temp_id → id）？
- [ ] 是否需要添加单元测试？
- [ ] 何时删除 Story.suggested_characters JSONB 字段？

---

## 📈 性能对比（预期）

| 操作 | JSONB 方式 | 新表方式 | 改进 |
|------|-----------|----------|------|
| 查询建议角色 | 1 次查询 + JSON 解析 | 1 次关系查询 | ✅ 索引优化 |
| 更新单个角色 | 读取 → 修改 → 写回整个 JSON | 单行 UPDATE | ✅ 减少锁定 |
| 删除单个角色 | 读取 → 过滤 → 写回整个 JSON | 单行 DELETE | ✅ 原子操作 |
| 批量生成图片 | 读取 → 循环修改 → 写回 | 批量 UPDATE | ✅ 事务支持 |
| 关联查询（Character） | 不支持 | JOIN 查询 | ✅ 数据一致性 |

**总体评估**: ⬆️ 性能提升 + 🔒 数据完整性增强

---

**最后更新**: 2026-01-06
**执行人**: Development Coordinator
**预计完成时间**: 2026-01-06 晚
