# 剧情连贯性 - 人工修复指南

## 步骤 1: 补充章节详细内容（15分钟 / 故事）

使用 Prisma Studio 或直接写脚本：

```typescript
// 为关键章节添加详细内容
await prisma.chapter.update({
  where: { id: "chapter-id" },
  data: {
    content: `
      详细的章节内容（2000-5000字）：

      【场景描述】
      - 时间：清晨/黄昏/深夜
      - 地点：具体位置和环境细节

      【角色状态】
      - 主角：身体状况、情绪、当前目标
      - 配角：位置、状态

      【剧情详情】
      （详细的情节展开，包含对话、动作、心理描写）

      【伏笔/悬念】
      - 未解之谜
      - 待续线索
    `,
    is_key_chapter: true, // 如果是转折点
    key_chapter_reason: "主角受重伤，剧情转折"
  }
});
```

## 步骤 2: 添加角色状态追踪（5分钟 / 章）

在每章结束时记录角色状态：

```typescript
// 第3章结束时
await prisma.chapterCharacterState.create({
  data: {
    chapter_id: "chapter-3-id",
    character_id: "protagonist-id",
    location: "废弃工厂地下室",
    physical_condition: "右臂骨折，失血约500ml，意识清醒但虚弱",
    mental_state: "恐惧但坚定，对敌人产生复仇心理",
    key_items: ["神秘钥匙", "父亲的遗物"],
    relationship_changes: {
      "ally-id": "从陌生到生死之交",
      "enemy-id": "深仇大恨"
    },
    notes: "发现了敌人的真实身份"
  }
});
```

## 步骤 3: 标记关键章节

为剧情转折点、角色死亡、重要揭秘等章节标记：

```sql
UPDATE chapters
SET
  is_key_chapter = true,
  key_chapter_reason = '主角发现真相，剧情高潮'
WHERE
  title LIKE '%第五章%'
  AND story_id = 'your-story-id';
```

## 优先处理的故事

根据诊断结果，建议优先修复：

1. **镜中嫌疑人** (9章) - 悬疑类，连贯性要求最高
2. **绿眼无名的最后一瞥** (10章) - 章节最多
3. **秒针无声** (7章)
4. **铁蹄·铁体** (6章)

每个故事预计耗时：
- 补充内容：15-30分钟
- 角色状态：5分钟/章
- 标记关键章节：2分钟

总计：1-2小时可完成核心故事的修复
