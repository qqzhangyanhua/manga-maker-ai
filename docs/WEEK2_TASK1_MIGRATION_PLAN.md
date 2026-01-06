# Week 2 Task 1: 清理 Deprecated 字段 - 迁移计划

## 执行摘要

**状态**: 🔴 **阻塞 - 需要代码重构**
**风险级别**: **HIGH** (高)
**预计工时**: 2-3 天
**执行人**: Development Team

---

## 问题分析

### 1. Panel.character_name - **重度依赖，无法直接删除**

#### 现状
- **Schema状态**: 标记为 DEPRECATED (line 195)
- **实际使用**: **50+ 处引用**，深度集成在整个系统中
- **新字段**: `character_id` (line 216) 已存在但未充分使用

#### 使用分布
```
src/lib/workflow-engine.ts              - 1处
src/types/storyboard.ts                 - 1处 (类型定义)
src/types/template.ts                   - 1处 (类型定义)
src/app/storyboard/types.ts             - 1处 (类型定义)
src/app/storyboard/utils.ts             - 2处
src/app/scripts/[id]/hooks/useUIState.ts - 1处
src/app/scripts/[id]/components/PanelEditor/PanelCard.tsx - 1处
src/app/api/chapter/[id]/analyze-character-states/route.ts - 6处
src/app/api/templates/[id]/apply/route.ts - 2处
src/app/api/storyboard/route.ts         - 2处
src/app/api/projects/[id]/versions/*    - 7处 (版本控制)
src/app/api/panel/generate-multi/route.ts - 5处
src/app/api/panel/[id]/route.ts         - 2处
src/app/api/panel/route.ts              - 2处
src/app/api/panel/merge/route.ts        - 4处
src/app/api/panel/insert/route.ts       - 3处
src/app/api/panel/split/route.ts        - 5处
src/components/Storyboard/EditablePanelCard.tsx - 4处
```

#### 关键风险点

**1. LLM生成逻辑依赖字符串名称**
```typescript
// src/app/api/panel/generate-multi/route.ts:121
if (panel.character_name) {
  characters.add(panel.character_name);
}
```
- 所有 LLM 提示词使用 `character_name` 构建
- 无法简单替换为 `character_id` (UUID)
- 需要引入 Character 表 JOIN 查询

**2. 版本控制系统依赖**
```typescript
// src/app/api/projects/[id]/versions/restore/route.ts:159
character_name: p.character_name,
```
- ProjectVersion 的 JSON snapshot 包含 `character_name`
- 历史版本数据无法回滚到新结构
- 需要版本数据迁移脚本

**3. 类型定义分散**
```typescript
// src/types/storyboard.ts:20
character_name: string | null;
```
- 3个独立的类型定义文件
- 类型变更需要同步更新所有引用

---

### 2. Story.characters - **低依赖，可安全删除**

#### 现状
- **实际使用**: 仅 1 处引用 (StoryGenerator.tsx)
- **新关系**: `story_characters` 表已存在并正常工作
- **风险级别**: **LOW**

#### 使用位置
```typescript
// src/components/Story/StoryGenerator.tsx:300
characters: generatedStory.characters || [],
```

---

### 3. User 字段 - **零依赖，可立即删除**

#### Schema 检查
需要确认以下字段是否存在：
- `User.password` (可能已改为 `password_hash`)
- `User.email_verified` (可能已改为 `verified`)
- `User.verified`

**当前发现**: Grep 未找到任何引用，可能已清理或字段名不同。

---

## 迁移策略

### 阶段 1: Story.characters (立即执行)

#### Step 1.1: 代码清理
```typescript
// src/components/Story/StoryGenerator.tsx
// 删除或注释掉:
characters: generatedStory.characters || [],

// 替换为:
// characters 数据从 story_characters 关系表获取，无需从 LLM 返回值中读取
```

#### Step 1.2: Schema 迁移
```prisma
// prisma/schema.prisma
model Story {
  // 删除:
  // characters Json?
}
```

```bash
npx prisma migrate dev --name remove_story_characters_field
```

#### Step 1.3: 验证
```bash
# 1. 类型检查
pnpm type-check

# 2. 搜索残留引用
grep -r "\.characters" src/

# 3. 测试 Story 生成流程
pnpm test src/components/Story/
```

---

### 阶段 2: User 重复字段 (立即执行)

#### Step 2.1: Schema 审计
```bash
# 查看 User 表当前结构
npx prisma studio
# 或
psql -d manga_maker_ai -c "\d users"
```

#### Step 2.2: 确认字段存在性
检查以下字段是否实际存在于数据库：
- `password` (vs `password_hash`)
- `email_verified` (vs `verified`)
- `verified`

#### Step 2.3: 创建迁移 (如果字段存在)
```sql
-- 仅删除确认存在的重复字段
ALTER TABLE users DROP COLUMN IF EXISTS password;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
```

```bash
npx prisma migrate dev --name remove_user_duplicate_fields
```

---

### 阶段 3: Panel.character_name (需要重构)

#### ⚠️ **前置条件**
1. **所有 Panel 操作必须迁移到 character_id**
2. **LLM 生成逻辑必须支持 Character 表 JOIN**
3. **版本控制系统必须支持新数据结构**

#### Step 3.1: 数据迁移 (先行执行)
```sql
-- 将 character_name 映射到 character_id
UPDATE panels p
SET character_id = (
  SELECT c.id
  FROM characters c
  WHERE c.name = p.character_name
  LIMIT 1
)
WHERE p.character_name IS NOT NULL
  AND p.character_id IS NULL;
```

#### Step 3.2: 代码重构 (按优先级)

**优先级 1: API 路由 (关键路径)**
1. `/api/panel/generate-multi` - 批量生成
2. `/api/panel/[id]` - CRUD
3. `/api/panel/split` - 拆分
4. `/api/panel/merge` - 合并
5. `/api/panel/insert` - 插入

**重构模式**:
```typescript
// ❌ 旧代码
if (panel.character_name) {
  characters.add(panel.character_name);
}

// ✅ 新代码
if (panel.character_id) {
  const character = await prisma.character.findUnique({
    where: { id: panel.character_id },
    select: { name: true }
  });
  if (character) {
    characters.add(character.name);
  }
}
```

**优先级 2: 类型定义**
```typescript
// src/types/storyboard.ts
export interface PanelData {
  // character_name: string | null; // REMOVE
  character_id: string | null; // REQUIRED
}
```

**优先级 3: UI 组件**
```typescript
// src/components/Storyboard/EditablePanelCard.tsx
// 需要从 character_id 获取 character.name 显示
const characterName = panel.character?.name || "未选择角色";
```

**优先级 4: 版本控制**
```typescript
// src/app/api/projects/[id]/versions/restore/route.ts
// 版本快照需要包含 character_id 而非 character_name
version_data: {
  panels: panels.map(p => ({
    ...p,
    character_id: p.character_id,
    // character_name: p.character_name, // REMOVE
  }))
}
```

#### Step 3.3: 测试策略
```bash
# 1. 单元测试
pnpm test src/lib/workflow-engine.test.ts
pnpm test src/app/api/panel/

# 2. 集成测试
# 测试完整的 Panel 生成 → 修改 → 版本控制流程

# 3. 回归测试
# 确保所有现有 Panel 数据可正常读取和显示
```

#### Step 3.4: Schema 迁移 (最后执行)
```prisma
// prisma/schema.prisma
model Panel {
  // 删除:
  // character_name  String?

  // 保留:
  character_id    String? @db.Uuid
  character       Character? @relation(fields: [character_id], references: [id])
}
```

```bash
npx prisma migrate dev --name remove_panel_character_name
```

---

## 执行顺序

```
Phase 1: Story.characters (1小时)
  ├─ 代码清理
  ├─ Schema 迁移
  └─ 验证测试

Phase 2: User 重复字段 (30分钟)
  ├─ Schema 审计
  ├─ 确认字段存在性
  └─ 创建迁移

Phase 3: Panel.character_name (2-3天)
  ├─ 数据迁移脚本 (1小时)
  ├─ API 路由重构 (1天)
  ├─ 类型定义更新 (2小时)
  ├─ UI 组件更新 (4小时)
  ├─ 版本控制适配 (4小时)
  ├─ 测试 (1天)
  └─ Schema 迁移 (1小时)
```

---

## 风险矩阵

| 任务 | 风险 | 影响范围 | 回滚难度 | 建议 |
|------|------|---------|---------|------|
| Story.characters | 🟢 LOW | 1 文件 | 易 | ✅ 立即执行 |
| User 字段 | 🟢 LOW | 0 文件 | 易 | ✅ 立即执行 |
| Panel.character_name | 🔴 HIGH | 50+ 文件 | 难 | ⏸️ 需要专项规划 |

---

## 回滚方案

### Phase 1 & 2 回滚
```bash
# 回滚到上一个迁移
npx prisma migrate rollback
```

### Phase 3 回滚
```sql
-- 紧急回滚：重新添加 character_name 字段
ALTER TABLE panels ADD COLUMN character_name VARCHAR(255);

-- 从 character_id 反向同步
UPDATE panels p
SET character_name = (
  SELECT c.name
  FROM characters c
  WHERE c.id = p.character_id
)
WHERE p.character_id IS NOT NULL;
```

---

## 建议行动

### 立即可执行 (Week 2)
✅ **Phase 1**: 清理 `Story.characters`
✅ **Phase 2**: 清理 User 重复字段

### 需要独立规划 (Week 3+)
🔴 **Phase 3**: 重构 `Panel.character_name` → `character_id`
- 建议作为独立的 **Sprint 任务**
- 需要 QA 全面测试
- 需要生产环境灰度发布

---

**文档创建时间**: 2026-01-06
**最后更新**: 2026-01-06
**责任人**: Development Coordinator
