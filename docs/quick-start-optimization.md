# 分镜生成优化 - 快速开始指南

## 🚀 5 分钟快速上手

### 步骤 1: 检查当前质量（1 分钟）

```bash
# 检查特定章节的质量
pnpm tsx scripts/check-panel-quality.ts --chapter-id=aa6d5fa3-debe-44f6-8389-8358cc6fd236

# 生成详细报告
pnpm tsx scripts/check-panel-quality.ts --chapter-id=aa6d5fa3-debe-44f6-8389-8358cc6fd236 --report
```

**预期输出**:
```
========== 章节: 第一章：穿越江湖的意外 ==========
总体得分: 65/100 (warning)
分镜数量: 8

常见问题:
  ⚠️  未关联角色资产 (8 个分镜)
  ⚠️  prompt_used 包含增强指令 (3 个分镜)

推荐操作:
  1. 批量关联角色资产以提升一致性
  2. 修改生成逻辑，使用 description 而不是 prompt_used
```

---

### 步骤 2: 创建角色资产（2 分钟）

```sql
-- 连接数据库
psql -h your-host -U your-user -d your-database

-- 创建主要角色
INSERT INTO "Character" (id, name, reference_image, base_prompt, user_id, created_at, updated_at) 
VALUES 
  (gen_random_uuid(), '吴昊', 
   'https://your-cdn.com/characters/wuhao.jpg',
   '年轻男子，25岁，现代服饰，黑色短发，困惑表情',
   'your-user-id',
   NOW(), NOW()),
  (gen_random_uuid(), '神秘侠客',
   'https://your-cdn.com/characters/xiake.jpg',
   '中年侠客，古装打扮，手持长剑，警觉神色',
   'your-user-id',
   NOW(), NOW());

-- 验证创建成功
SELECT id, name, reference_image FROM "Character" WHERE user_id = 'your-user-id';
```

---

### 步骤 3: 自动关联分镜（1 分钟）

```bash
# 预览模式（不会实际修改）
pnpm tsx scripts/migrate-panel-characters.ts --dry-run --story-id=your-story-id

# 执行迁移
pnpm tsx scripts/migrate-panel-characters.ts --story-id=your-story-id
```

**预期输出**:
```
========== 分镜角色关联迁移 ==========
模式: 执行模式
范围: Story your-story-id
=====================================

找到 8 个未关联角色的分镜

--- 处理用户 xxx 的 8 个分镜 ---

用户有 2 个角色: 吴昊, 神秘侠客

✓ Panel 2: [吴昊] → 吴昊
✓ Panel 3: [吴昊] → 吴昊
✓ Panel 4: [吴昊] → 吴昊
✓ Panel 5: [侠客] → 神秘侠客
✓ Panel 6: [侠客] → 神秘侠客
✓ Panel 7: [吴昊] → 吴昊

========== 迁移报告 ==========
总分镜数: 8
已更新: 6
已跳过: 2
错误数: 0
============================

✓ 迁移完成！
```

---

### 步骤 4: 再次检查质量（1 分钟）

```bash
pnpm tsx scripts/check-panel-quality.ts --chapter-id=aa6d5fa3-debe-44f6-8389-8358cc6fd236
```

**预期输出**:
```
========== 章节: 第一章：穿越江湖的意外 ==========
总体得分: 85/100 (good)  ✅ 提升了 20 分！
分镜数量: 8

常见问题:
  ℹ️  部分角色没有参考图 (2 个分镜)

推荐操作:
  1. 为角色添加高质量参考图
```

---

## 🎯 现在可以生成了！

### 方式 1: 在专注模式中生成

1. 打开专注模式: `/scripts/[id]/focus`
2. 选择角色（自动使用参考图）
3. 点击"生成图片"
4. ✅ 系统会自动：
   - 使用 `description` 而不是 `prompt_used`
   - 收集角色参考图
   - 构建增强提示词
   - 保持风格一致

### 方式 2: 批量生成

1. 在章节列表点击"批量生成"
2. 选择要生成的分镜
3. 确认参数
4. ✅ 所有分镜使用统一风格

---

## 📊 效果对比

### 优化前
```json
{
  "character_id": null,  // ❌ 未关联
  "prompt_used": "吴昊...\n\nCharacters: 吴昊\n\nImportant: ...",  // ❌ 重复指令
  "generated_image": "random-style-1.png"  // ❌ 风格不一致
}
```

### 优化后
```json
{
  "character_id": "char-wuhao",  // ✅ 已关联
  "description": "吴昊睁开眼睛...",  // ✅ 干净的描述
  "generated_image": "consistent-style-1.png"  // ✅ 风格一致
}
```

---

## 🔧 高级用法

### 批量创建角色

```sql
-- 从 CSV 导入
COPY "Character" (id, name, reference_image, base_prompt, user_id, created_at, updated_at)
FROM '/path/to/characters.csv'
WITH (FORMAT csv, HEADER true);
```

### 批量关联场景

```bash
# 创建场景资产
INSERT INTO "Scene" (id, name, scene_type, description, reference_image, user_id, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '古代庭院', 'outdoor', 
   '青石铺地，木质建筑，古朴宁静',
   'https://your-cdn.com/scenes/ancient-yard.jpg',
   'your-user-id', NOW(), NOW());

# 关联分镜
UPDATE "Panel" 
SET scene_id = (SELECT id FROM "Scene" WHERE name = '古代庭院' LIMIT 1)
WHERE description LIKE '%庭院%' AND scene_id IS NULL;
```

### 定期质量检查

```bash
# 添加到 cron 或 CI/CD
0 0 * * * cd /path/to/project && pnpm tsx scripts/check-panel-quality.ts --story-id=xxx --report
```

---

## 💡 常见问题

### Q: 迁移脚本没有找到匹配的角色？

**A**: 检查角色名称是否完全匹配：

```sql
-- 查看分镜中提到的名称
SELECT DISTINCT description FROM "Panel" WHERE description LIKE '%吴昊%';

-- 查看现有角色名称
SELECT name FROM "Character" WHERE user_id = 'your-user-id';

-- 如果不匹配，更新角色名称
UPDATE "Character" SET name = '吴昊' WHERE id = 'char-id';
```

### Q: 生成的图片还是不一致？

**A**: 检查参考图质量：

```sql
-- 检查角色是否有参考图
SELECT name, reference_image, base_image_url 
FROM "Character" 
WHERE user_id = 'your-user-id';

-- 如果没有，添加参考图
UPDATE "Character" 
SET reference_image = 'https://your-cdn.com/character.jpg'
WHERE id = 'char-id';
```

### Q: 如何回滚迁移？

**A**: 清除关联：

```sql
-- 回滚特定章节
UPDATE "Panel" 
SET character_id = NULL 
WHERE chapter_id = 'chapter-id';

-- 回滚特定故事
UPDATE "Panel" p
SET character_id = NULL
FROM "Chapter" c
WHERE p.chapter_id = c.id AND c.story_id = 'story-id';
```

---

## 📚 相关文档

- [完整优化指南](./panel-generation-best-practices.md)
- [Gemini 角色一致性](./gemini-character-consistency-guide.md)
- [提示词构建器 API](../src/lib/panel-prompt-builder.ts)
- [质量检查器 API](../src/lib/panel-quality-checker.ts)

---

## 🎉 完成！

现在你的分镜生成系统已经优化完成：

- ✅ 角色外观一致
- ✅ 风格统一稳定
- ✅ 提示词干净高效
- ✅ 质量可监控

开始创作你的漫画吧！🚀

---

**更新时间**: 2026-01-09  
**版本**: v1.0
