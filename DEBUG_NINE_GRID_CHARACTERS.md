# 九宫格角色参考图字段丢失问题 - 诊断报告

## 问题描述

用户在九宫格生成对话框中看到提示:**"未检测到角色。如需添加角色参考图,请先在项目中创建角色"**

但用户确认项目中确实存在角色数据。

## 数据流追踪

```
用户操作 (选择9个镜头)
    ↓
ShotDetailPanel.tsx:389
    openNineGridDialog(chapterId, data.timelineId, "")
    ↓
canvas-store.ts:389-396
    设置: { chapterId, timelineId, chapterSummary }
    ↓
GenerateNineGridDialog.tsx:670-681
    接收: chapterId={nineGridDialog.chapterId}
    ↓
GenerateNineGridDialog.tsx:208-215
    条件渲染: {chapterId && timelineId && <CharacterReferenceSection />}
    ↓
CharacterReferenceSection.tsx:25
    useChapterCharacters(chapterId)
    ↓
useChapterCharacters.ts:12
    fetch(`/api/novel/chapter/${chapterId}/characters`)
    ↓
/api/novel/chapter/[chapterId]/characters/route.ts:50-65
    prisma.character.findMany({ where: { user_id } })
```

## 可能的根本原因

### 原因 1: chapterId 为 null (最可能)

**位置**: `GenerateNineGridDialog.tsx` 第208行

```typescript
{chapterId && timelineId && (
  <CharacterReferenceSection ... />
)}
```

**问题**: 如果 `chapterId` 为 `null`,整个组件不会被渲染,用户看不到任何角色。

**验证方法**: 添加日志查看 `chapterId` 的值

### 原因 2: API 查询逻辑不精确

**位置**: `/api/novel/chapter/[chapterId]/characters/route.ts` 第50行

```typescript
const characters = await prisma.character.findMany({
  where: {
    user_id: payload.userId,  // ⚠️ 只查询用户的所有角色
  },
  // ...
});
```

**问题**: 
- 查询的是用户的**所有角色**,而不是**章节关联的角色**
- 如果用户没有创建任何角色,返回空数组
- 缺少 `novel_chapter_characters` 关联表

### 原因 3: 数据库中角色表为空

**验证方法**: 查询数据库

```sql
-- 检查用户是否有角色
SELECT COUNT(*) FROM characters WHERE user_id = '<user_id>';

-- 检查角色详情
SELECT id, name, base_image_url, reference_image 
FROM characters 
WHERE user_id = '<user_id>' 
LIMIT 10;
```

## 诊断步骤

### Step 1: 添加调试日志

在以下位置添加 `console.log`:

#### 1.1 ShotDetailPanel.tsx (第389行)

```typescript
const handleGenerateGroup = useCallback((group: ShotGroup) => {
  console.log("[DEBUG 1] openNineGridDialog 调用参数:", {
    chapterId,
    timelineId: data?.timelineId,
    chapterSummary: ""
  });
  
  if (!data?.timelineId) {
    toast.error("缺少时间线信息");
    return;
  }
  
  openNineGridDialog(chapterId, data.timelineId, "");
}, [data?.timelineId, openNineGridDialog, chapterId]);
```

#### 1.2 GenerateNineGridDialog.tsx (第80行)

```typescript
export function GenerateNineGridDialog({
  open,
  onOpenChange,
  selectedShots,
  timelineId,
  chapterId,
  chapterSummary = "",
  onConfirm,
  isSubmitting = false,
}: GenerateNineGridDialogProps) {
  console.log("[DEBUG 2] GenerateNineGridDialog props:", {
    open,
    timelineId,
    chapterId,
    chapterSummary,
    shouldRenderCharacterSection: !!(chapterId && timelineId)
  });
  
  // ...
}
```

#### 1.3 CharacterReferenceSection.tsx (第25行)

```typescript
export function CharacterReferenceSection({
  chapterId,
  projectId,
  characterReferences,
  onUpdateCharacterReferences,
}: CharacterReferenceSectionProps) {
  console.log("[DEBUG 3] CharacterReferenceSection props:", {
    chapterId,
    projectId,
    characterReferencesCount: characterReferences.length
  });
  
  const { data, isLoading } = useChapterCharacters(chapterId);
  
  console.log("[DEBUG 4] useChapterCharacters 返回:", {
    data,
    isLoading,
    charactersCount: data?.characters?.length || 0
  });
  
  // ...
}
```

#### 1.4 useChapterCharacters.ts (第7行)

```typescript
queryFn: async () => {
  if (!chapterId) {
    console.error("[DEBUG 5] chapterId 为空,无法查询角色");
    throw new Error("章节ID不能为空");
  }

  const url = `/api/novel/chapter/${chapterId}/characters`;
  console.log("[DEBUG 6] 请求章节角色:", { url, chapterId });

  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    console.error("[DEBUG 7] API 返回错误:", error);
    throw new Error(error.error || "获取角色失败");
  }

  const data = await response.json();
  console.log("[DEBUG 8] API 返回数据:", {
    charactersCount: data.characters?.length || 0,
    characters: data.characters?.map((c: any) => ({ 
      id: c.id, 
      name: c.name,
      hasAvatar: !!c.avatar_url 
    }))
  });
  
  return data as Promise<ChapterCharactersResponse>;
},
```

#### 1.5 API Route (第48行)

```typescript
// 4. 查询用户的所有角色
console.log("[DEBUG 9] 开始查询角色:", {
  userId: payload.userId,
  chapterId,
  chapterProjectId: chapter.project_id
});

const characters = await prisma.character.findMany({
  where: {
    user_id: payload.userId,
  },
  select: {
    id: true,
    name: true,
    description: true,
    base_image_url: true,
    reference_image: true,
  },
  orderBy: {
    created_at: "asc",
  },
  take: 20,
});

console.log("[DEBUG 10] 数据库查询结果:", {
  userId: payload.userId,
  characterCount: characters.length,
  characters: characters.map(c => ({ 
    id: c.id, 
    name: c.name,
    hasAvatar: !!c.base_image_url,
    hasReference: !!c.reference_image
  }))
});
```

### Step 2: 重现问题并查看日志

1. 打开浏览器开发者工具 (F12)
2. 切换到 Console 标签
3. 选择9个镜头
4. 点击"生成九宫格"按钮
5. 查看控制台输出的 `[DEBUG 1]` 到 `[DEBUG 10]` 日志

### Step 3: 分析日志输出

根据日志输出,判断问题发生在哪个环节:

#### 场景 A: DEBUG 1 显示 chapterId 为 null

**原因**: `ShotDetailPanel` 的 `chapterId` prop 未正确传递

**解决方案**: 检查父组件如何调用 `<ShotDetailPanel chapterId={...} />`

#### 场景 B: DEBUG 2 显示 chapterId 为 null

**原因**: `canvas-store` 的状态管理有问题

**解决方案**: 检查 `openNineGridDialog` 的调用参数

#### 场景 C: DEBUG 3 未输出 (组件未渲染)

**原因**: 条件渲染失败 (`chapterId && timelineId` 为 false)

**解决方案**: 移除条件渲染,让组件始终显示

#### 场景 D: DEBUG 10 显示 characterCount 为 0

**原因**: 数据库中没有角色数据

**解决方案**: 
1. 检查用户是否真的创建了角色
2. 检查角色是否属于该用户
3. 检查角色是否被软删除

## 快速修复方案

### 方案 1: 移除条件渲染 (推荐)

**文件**: `GenerateNineGridDialog.tsx` 第208行

**修改前**:
```typescript
{chapterId && timelineId && (
  <CharacterReferenceSection
    chapterId={chapterId}
    projectId={timelineId}
    characterReferences={characterReferences}
    onUpdateCharacterReferences={setCharacterReferences}
  />
)}
```

**修改后**:
```typescript
<CharacterReferenceSection
  chapterId={chapterId || ""}
  projectId={timelineId || ""}
  characterReferences={characterReferences}
  onUpdateCharacterReferences={setCharacterReferences}
/>
```

### 方案 2: 改进错误提示

**文件**: `GenerateNineGridDialog.tsx` 第208行

**修改后**:
```typescript
{!chapterId ? (
  <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-300">
          缺少章节信息
        </p>
        <p className="text-xs text-amber-400/80 mt-1">
          无法加载角色参考图,请刷新页面后重试
        </p>
      </div>
    </div>
  </div>
) : !timelineId ? (
  <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-300">
          缺少时间线信息
        </p>
        <p className="text-xs text-amber-400/80 mt-1">
          无法加载角色参考图,请刷新页面后重试
        </p>
      </div>
    </div>
  </div>
) : (
  <CharacterReferenceSection
    chapterId={chapterId}
    projectId={timelineId}
    characterReferences={characterReferences}
    onUpdateCharacterReferences={setCharacterReferences}
  />
)}
```

### 方案 3: 修改 Hook 逻辑

**文件**: `useChapterCharacters.ts` 第4行

**修改前**:
```typescript
export function useChapterCharacters(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-characters", chapterId],
    queryFn: async () => {
      if (!chapterId) {
        throw new Error("章节ID不能为空");
      }
      // ...
    },
    enabled: !!chapterId,
    // ...
  });
}
```

**修改后**:
```typescript
export function useChapterCharacters(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-characters", chapterId],
    queryFn: async () => {
      if (!chapterId) {
        // 返回空数据而不是抛出错误
        console.warn("[useChapterCharacters] chapterId 为空,返回空数据");
        return { characters: [] };
      }
      // ...
    },
    enabled: true, // 始终启用查询
    // ...
  });
}
```

## 根本修复方案 (长期)

### 1. 创建章节-角色关联表

**Prisma Schema**:
```prisma
model NovelChapterCharacter {
  id           String   @id @default(uuid()) @db.Uuid
  chapter_id   String   @db.Uuid
  character_id String   @db.Uuid
  created_at   DateTime @default(now()) @db.Timestamptz(6)
  
  chapter   NovelChapter @relation(fields: [chapter_id], references: [id], onDelete: Cascade)
  character Character    @relation(fields: [character_id], references: [id], onDelete: Cascade)
  
  @@unique([chapter_id, character_id])
  @@index([chapter_id])
  @@index([character_id])
  @@map("novel_chapter_characters")
}
```

**Migration SQL**:
```sql
CREATE TABLE novel_chapter_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES novel_chapters(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, character_id)
);

CREATE INDEX idx_chapter_characters_chapter ON novel_chapter_characters(chapter_id);
CREATE INDEX idx_chapter_characters_character ON novel_chapter_characters(character_id);
```

### 2. 修改 API 查询逻辑

**文件**: `/api/novel/chapter/[chapterId]/characters/route.ts` 第50行

**修改后**:
```typescript
// 4. 查询章节关联的角色
const characters = await prisma.character.findMany({
  where: {
    user_id: payload.userId,
    novel_chapters: {
      some: {
        chapter_id: chapterId
      }
    }
  },
  select: {
    id: true,
    name: true,
    description: true,
    base_image_url: true,
    reference_image: true,
  },
  orderBy: {
    created_at: "asc",
  },
});

// 如果章节没有关联角色,降级为返回用户所有角色
if (characters.length === 0) {
  console.warn(`章节 ${chapterId} 没有关联角色,返回用户所有角色`);
  
  const allCharacters = await prisma.character.findMany({
    where: { user_id: payload.userId },
    select: {
      id: true,
      name: true,
      description: true,
      base_image_url: true,
      reference_image: true,
    },
    orderBy: { created_at: "asc" },
    take: 20,
  });
  
  return NextResponse.json({
    characters: allCharacters.map((char) => ({
      id: char.id,
      name: char.name,
      role: char.description || undefined,
      avatar_url: char.base_image_url || undefined,
      reference_image_url: char.reference_image || undefined,
    })),
  });
}
```

### 3. 自动关联角色到章节

**文件**: 创建新文件 `src/lib/novel/chapter-character-linker.ts`

```typescript
import { prisma } from "@/lib/db";

/**
 * 从章节内容中提取角色名称并创建关联
 */
export async function linkCharactersToChapter(
  chapterId: string,
  chapterContent: string
): Promise<void> {
  // 1. 从章节内容中提取可能的角色名称
  // (这里需要根据实际的章节内容格式进行解析)
  const characterNames = extractCharacterNames(chapterContent);
  
  if (characterNames.length === 0) {
    console.log(`章节 ${chapterId} 未检测到角色`);
    return;
  }
  
  // 2. 查询匹配的角色
  const characters = await prisma.character.findMany({
    where: {
      name: { in: characterNames }
    },
    select: { id: true, name: true }
  });
  
  if (characters.length === 0) {
    console.log(`章节 ${chapterId} 的角色未在数据库中找到`);
    return;
  }
  
  // 3. 创建关联
  await prisma.novelChapterCharacter.createMany({
    data: characters.map(char => ({
      chapter_id: chapterId,
      character_id: char.id
    })),
    skipDuplicates: true
  });
  
  console.log(`章节 ${chapterId} 关联了 ${characters.length} 个角色:`, 
    characters.map(c => c.name).join(", ")
  );
}

/**
 * 从文本中提取角色名称 (简单实现)
 */
function extractCharacterNames(content: string): string[] {
  // TODO: 实现更智能的角色名称提取
  // 可以使用正则表达式或 NLP 工具
  
  // 示例: 提取引号中的名称
  const matches = content.match(/"([^"]+)"/g);
  if (!matches) return [];
  
  return [...new Set(matches.map(m => m.replace(/"/g, "")))];
}
```

## 验证修复

### 测试步骤

1. ✅ 添加调试日志
2. ✅ 重现问题并查看日志
3. ✅ 根据日志定位问题
4. ✅ 应用快速修复方案
5. ✅ 验证角色能正常显示
6. ✅ 测试选择参考图功能
7. ✅ 测试生成九宫格功能

### 预期结果

- 对话框打开时,能看到角色列表
- 每个角色显示名称和头像
- 可以点击"选择参考图"按钮
- 参考图选择器能正常工作
- 生成九宫格时,角色参考图被正确传递

## 相关文件

### 核心文件
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/GenerateNineGridDialog.tsx`
- `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useChapterCharacters.ts`
- `src/app/api/novel/chapter/[chapterId]/characters/route.ts`
- `src/stores/canvas-store.ts`

### 调用链
- `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx`

### 数据库
- `prisma/schema.prisma` (Character, NovelChapter 模型)

---

**最后更新**: 2026-01-24
**状态**: 待诊断
