# 小说转漫画功能增强文档

## 📋 需求概述

本次更新解决了小说转漫画功能的两个核心问题：

### 问题 1: 重复转换导致项目冗余
**现状**: 每次转换都创建新的 Story，导致同一小说有多个漫画项目  
**需求**: 检测是否已转换过，如果存在则追加章节到现有项目

### 问题 2: 分镜与小说内容关联不强
**现状**: 转换时只传递章节摘要，生成的分镜缺少小说原文细节  
**需求**: 传递完整小说内容、角色信息、世界观设定，确保分镜强关联原文

---

## ✅ 解决方案

### 1. 智能检测与追加机制

#### 后端 API 改进 (`convert-to-comic/route.ts`)

**核心逻辑**:
```typescript
// 检测是否已经转换过
let story = await prisma.story.findFirst({
  where: {
    source_novel_id: projectId,
    user_id: userId,
  },
  include: {
    chapters: {
      orderBy: { chapter_order: "desc" },
      take: 1,
    },
  },
});

if (!story) {
  // 创建新 Story
  isNewStory = true;
  story = await prisma.story.create({ ... });
} else {
  // 追加到现有 Story，合并 outline
  const mergedOutline = mergeStoryOutlines(existingOutline, newOutline);
  await prisma.story.update({ ... });
}

// 章节顺序从现有最大 order + 1 开始
let chapterOrder = story.chapters.length > 0 
  ? story.chapters[0].chapter_order + 1 
  : 1;
```

**新增辅助函数**:
- `mergeStoryOutlines()`: 合并现有和新增的 outline
- `buildEnhancedChapterSummary()`: 构建增强版章节摘要

#### 前端检测 API (`check-comic-story/route.ts`)

**新增接口**: `GET /api/novel/projects/[id]/check-comic-story`

**功能**:
- 检测小说是否已转换为漫画
- 返回现有 Story 的 ID、标题、章节数量

**响应示例**:
```json
{
  "exists": true,
  "story_id": "xxx",
  "story_title": "《小说名》（漫画改编）",
  "chapters_count": 5,
  "created_at": "2026-01-10T..."
}
```

---

### 2. 增强章节内容传递

#### 改进的章节摘要结构

**新函数**: `buildEnhancedChapterSummary()`

**包含内容**:
1. **章节概要**: 原有的 outline
2. **关键场景**: 选中的 keyEvents
3. **登场角色**: 角色名称、角色定位、描述、性格特点
4. **世界观**: 场景设定、规则设定（取前 2-3 条）
5. **✅ 章节原文**: 完整的小说章节内容（不截断）

**示例输出**:
```
【章节概要】
主角在学校遇到神秘转校生...

【关键场景】
1. 教室初次见面
2. 放学后的对话
3. 意外发现秘密

【登场角色】
- 李明（主角）: 高中生，性格内向 | 特点: 观察力敏锐、善良
- 王小美（转校生）: 神秘少女，来自异世界 | 特点: 冷静、强大

【世界观】
场景: 现代都市、异世界通道、魔法学院
规则: 魔法需要咒语、异世界生物不能暴露

【章节原文】
（完整的小说章节内容，2000-5000字）
...
```

---

### 3. 优化分镜生成提示词

#### 系统提示词增强 (`panel-generator.ts`)

**新增原则**:
```
【重要】分镜生成原则：
1. **强关联原文**：分镜必须忠实于原文情节、对话和场景描述
2. **保留关键对话**：重要对话必须在分镜中体现，使用原文或改编后的对白
3. **场景还原**：根据原文中的场景描述（环境、氛围、光线等）设计画面
4. **角色一致性**：严格遵循角色设定中的外貌、性格、服装描述
5. **情节连贯性**：分镜顺序要符合原文的叙事逻辑和时间线
```

**新增规则**:
```
9. ✅ 小说改编特别要求：
   - 如果提供了【章节原文】，必须严格遵循原文的情节发展
   - 对话内容优先使用原文中的对白，可适当精简但不可改变语义
   - 场景描述要参考原文中的环境细节（时间、地点、天气、光线等）
   - 角色动作和表情要符合原文描述
   - 如果提供了【登场角色】信息，visual_prompt中必须包含角色的外貌特征
```

#### 用户提示词增强

**新增提示**:
```
【重要提示】
如果上述内容中包含【章节原文】，这是小说改编项目，请：
1. 严格遵循原文的情节顺序和关键事件
2. 保留原文中的重要对话（可适当精简但不改变含义）
3. 根据原文的场景描述设计画面（环境、氛围、光线等）
4. 如果有【登场角色】信息，在 visual_prompt 中必须包含角色的外貌特征
5. 如果有【世界观】信息，确保场景设计符合世界观设定
```

---

### 4. 前端用户体验优化

#### 对话框改进 (`ConvertToComicDialog.tsx`)

**新增状态**:
```typescript
const [existingStory, setExistingStory] = useState<{ id: string; title: string } | null>(null);
const [checkingExisting, setCheckingExisting] = useState(true);
```

**自动检测逻辑**:
```typescript
useEffect(() => {
  if (!isOpen) return;
  
  async function checkExistingStory() {
    const response = await fetch(`/api/novel/projects/${projectId}/check-comic-story`);
    if (response.ok) {
      const data = await response.json();
      if (data.exists) {
        setExistingStory({ id: data.story_id, title: data.story_title });
      }
    }
  }
  
  checkExistingStory();
}, [isOpen, projectId]);
```

**UI 提示**:
- 检测中: "正在检测现有漫画项目..."
- 已存在: "检测到已转换的漫画项目《xxx》，将追加新章节到该项目"
- 不存在: "选择要可视化的场景和角色，系统将创建漫画项目并生成分镜"

---

## 🎯 功能流程

### 首次转换流程

1. 用户在小说项目中点击"转换为漫画"
2. 前端检测：未发现现有漫画项目
3. 用户选择场景和角色
4. 后端创建新 Story，包含：
   - 完整的章节原文
   - 角色信息
   - 世界观设定
5. 生成分镜时，LLM 接收到完整上下文
6. 分镜严格遵循小说原文

### 追加转换流程

1. 用户再次点击"转换为漫画"
2. 前端检测：发现现有漫画项目《xxx》
3. 显示提示："将追加新章节到该项目"
4. 用户选择新的场景
5. 后端追加 Chapters 到现有 Story
6. 章节顺序自动递增（order = 现有最大 order + 1）
7. 合并 outline 信息

---

## 📊 数据库变更

### 无需 Schema 变更

本次更新充分利用了现有字段：
- `Story.source_novel_id`: 用于关联小说项目
- `Story.outline`: 支持动态合并
- `Chapter.content`: 存储完整章节原文
- `Chapter.summary`: 存储增强版摘要（包含角色、世界观）
- `Chapter.chapter_order`: 支持追加模式的顺序递增

---

## 🧪 测试要点

### 1. 首次转换测试
- [ ] 创建新 Story
- [ ] Chapter 包含完整原文
- [ ] Chapter.summary 包含角色和世界观信息
- [ ] 生成的分镜对话来自原文
- [ ] 生成的分镜场景符合原文描述

### 2. 追加转换测试
- [ ] 检测到现有 Story
- [ ] 新 Chapters 追加到现有 Story
- [ ] chapter_order 正确递增
- [ ] outline 正确合并
- [ ] 不创建重复的 Story

### 3. 分镜生成测试
- [ ] 分镜对话引用原文
- [ ] 分镜场景描述符合原文
- [ ] visual_prompt 包含角色外貌特征
- [ ] 分镜顺序符合原文情节

### 4. 边界情况测试
- [ ] 小说无 content 时的处理
- [ ] 小说无 characters 时的处理
- [ ] 小说无 world_setting 时的处理
- [ ] 多次追加转换

---

## 🚀 部署注意事项

### 环境变量
无需新增环境变量

### 数据库迁移
无需执行迁移

### 依赖更新
无需更新依赖

### 回滚方案
如需回滚，恢复以下文件的 Git 版本：
- `src/app/api/novel/projects/[id]/convert-to-comic/route.ts`
- `src/app/(novel)/novel/[id]/components/ConvertToComicDialog.tsx`
- `src/lib/panel-generator.ts`

删除新增文件：
- `src/app/api/novel/projects/[id]/check-comic-story/route.ts`

---

## 📝 代码变更清单

### 新增文件
- `src/app/api/novel/projects/[id]/check-comic-story/route.ts` (67 行)

### 修改文件
1. `src/app/api/novel/projects/[id]/convert-to-comic/route.ts`
   - 新增检测逻辑 (30 行)
   - 新增 `buildEnhancedChapterSummary()` (50 行)
   - 新增 `mergeStoryOutlines()` (10 行)
   - 修改返回消息 (5 行)

2. `src/app/(novel)/novel/[id]/components/ConvertToComicDialog.tsx`
   - 新增状态管理 (5 行)
   - 新增检测逻辑 (20 行)
   - 修改 UI 提示 (10 行)

3. `src/lib/panel-generator.ts`
   - 增强系统提示词 (15 行)
   - 增强用户提示词 (10 行)

### 总计
- 新增代码: ~220 行
- 修改代码: ~50 行
- 删除代码: 0 行

---

## 🎉 预期效果

### 用户体验提升
1. **避免重复项目**: 同一小说只有一个漫画项目，章节按需追加
2. **更准确的分镜**: 分镜内容严格遵循小说原文
3. **更好的对话**: 分镜对话来自原文，保持小说风格
4. **更精准的场景**: 场景描述符合小说设定

### 技术优势
1. **数据一致性**: 通过 `source_novel_id` 关联，避免数据冗余
2. **上下文完整**: 传递完整章节内容，LLM 有足够信息生成高质量分镜
3. **可扩展性**: 未来可继续增强 `buildEnhancedChapterSummary()` 添加更多上下文
4. **向后兼容**: 不影响现有的原创漫画项目流程

---

## 📚 相关文档

- [AGENTS.md](./AGENTS.md) - 项目开发规范
- [README.md](./README.md) - 项目整体说明
- [prisma/schema.prisma](./prisma/schema.prisma) - 数据模型定义

---

**更新日期**: 2026-01-10  
**版本**: v1.0  
**作者**: AI Assistant (Claude Sonnet 4.5)
