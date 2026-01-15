# 剧情连贯性优化实施总结

**实施日期**: 2026-01-15
**方案**: Solution 2 (改进大纲生成) + Solution 3 (优化 RAG 上下文构建)

## 问题背景

### 原始问题
用户反馈生成的章节内容存在严重的剧情连贯性问题:
1. **角色状态不一致**: Ch8 主角重伤 → Ch9 完全康复(无说明)
2. **剧情突兀转折**: Ch8 最终决战 → Ch9 新冒险开始(无过渡)
3. **缺少前序章节摘要**: 生成时没有详细的前文回顾

### 根本原因
- **信息丢失瓶颈**: 大纲生成仅产生简短摘要(100-200字),无法为章节生成提供足够的上下文
- **数据模型缺陷**: `NovelChapter` 表缺少 `summary_preview`(详细剧情预演) 和 `ending_state`(结束状态) 字段
- **RAG 上下文不足**: 构建上下文时仅使用简短的 `outline`,缺少详细剧情信息

---

## 实施方案

### Phase 1: 数据模型扩展

#### 1.1 数据库 Schema 修改
**文件**: `prisma/schema.prisma`

添加字段:
```prisma
model NovelChapter {
  // 剧情连贯性字段(Solution 2 & 3)
  summary_preview String? @db.Text // 详细剧情预演(200-300字,用于上下文构建)
  ending_state    Json?   @db.JsonB // 章节结束状态 {location, protagonist_status, plot_progress}
}
```

#### 1.2 数据库迁移
```sql
ALTER TABLE novel_chapters
ADD COLUMN IF NOT EXISTS summary_preview TEXT,
ADD COLUMN IF NOT EXISTS ending_state JSONB;
```

**执行结果**: ✅ 成功应用

---

### Phase 2: 提示词优化(Solution 2)

#### 2.1 修改大纲生成提示词
**文件**: `services/novel-backend/app/services/prompt_templates.py`
**方法**: `PromptTemplateManager.get_outline_system_prompt()` (lines 170-223)

**关键改进**:
1. **添加 `summary_preview` 字段要求**:
   - 长度: 200-300 字符(中文)
   - 视角: 第三人称客观叙述
   - 结构: 起-承-转-合(预演本章剧情)
   - 内容: 包含关键对话、道具、角色情绪变化
   - 连贯性: 承接上一章 `ending_state`,为下一章铺垫

2. **添加 `ending_state` 字段要求**:
   ```json
   {
     "location": "章节结束时的地点",
     "protagonist_status": "主角状态(境界、伤势、心理、持有物品)",
     "plot_progress": "剧情进展与未解之谜"
   }
   ```

#### 2.2 更新数据验证逻辑
**文件**: `services/novel-backend/app/services/generation_service.py`
**方法**: `GenerationService.generate_outline()` (lines 413-419)

添加默认值处理:
```python
# 剧情连贯性字段(Solution 2)
chapter.setdefault("summary_preview", "")
chapter.setdefault("ending_state", {
    "location": "",
    "protagonist_status": "",
    "plot_progress": ""
})
```

---

### Phase 3: RAG 上下文优化(Solution 3)

#### 3.1 优化 `get_previous_chapters`
**文件**: `services/novel-backend/app/services/rag_service.py`
**方法**: `NovelRAGService.get_previous_chapters()` (lines 221-233)

**改进**: 返回新增字段
```python
return [
    {
        # ... 原有字段
        "summary_preview": ch.summary_preview or "",
        "ending_state": ch.ending_state or {},
    }
    for ch in chapters
]
```

#### 3.2 优化 `search_relevant_chapters`
**文件**: `services/novel-backend/app/services/rag_service.py`

**改进点**:
- **向量检索分支** (lines 113-123): 添加 `summary_preview` 字段
- **关键词匹配分支** (lines 172-181): 添加 `summary_preview` 字段

#### 3.3 优化 `build_context_for_generation`
**文件**: `services/novel-backend/app/services/rag_service.py`
**方法**: `NovelRAGService.build_context_for_generation()` (lines 315-354)

**关键改进**:

1. **前序章节上下文** (lines 315-339):
   ```python
   # ✨ 优先使用 summary_preview(详细剧情描述)
   if prev_ch.get('summary_preview'):
       context_parts.append(f"剧情详情: {prev_ch['summary_preview']}")
   else:
       # 兼容旧数据
       context_parts.append(f"大纲: {prev_ch['outline'][:200]}")

   # ✨ 添加 ending_state(章节结束状态)
   if prev_ch.get('ending_state'):
       ending = prev_ch['ending_state']
       if ending.get('location'):
           context_parts.append(f"结束地点: {ending['location']}")
       if ending.get('protagonist_status'):
           context_parts.append(f"主角状态: {ending['protagonist_status']}")
       if ending.get('plot_progress'):
           context_parts.append(f"剧情进展: {ending['plot_progress']}")
   ```

2. **相关章节上下文** (lines 341-354):
   ```python
   # ✨ 优先使用 summary_preview
   if rel_ch.get('summary_preview'):
       context_parts.append(f"剧情详情: {rel_ch['summary_preview'][:200]}...")
   else:
       context_parts.append(f"大纲: {rel_ch['outline'][:150]}")
   ```

---

## 修改文件清单

| 文件 | 修改内容 | 状态 |
|------|---------|------|
| `prisma/schema.prisma` | 添加 `summary_preview` 和 `ending_state` 字段 | ✅ |
| 数据库 `novel_chapters` 表 | 应用 SQL 迁移 | ✅ |
| `services/novel-backend/app/services/prompt_templates.py` | 优化大纲生成提示词 | ✅ |
| `services/novel-backend/app/services/generation_service.py` | 添加字段默认值处理 | ✅ |
| `services/novel-backend/app/services/rag_service.py` | 优化 RAG 上下文构建(3 处方法) | ✅ |
| `services/novel-backend/test_plot_continuity.py` | 创建测试脚本 | ✅ |

---

## 预期效果

### Before(修改前)
```
【前序章节】
第8章 - 最终决战
大纲: 主角与反派终极对决...
内容摘要: 激战中主角身受重伤,但最终击败反派...
```

### After(修改后)
```
【前序章节内容摘要】
第8章 - 最终决战
剧情详情: 激战在城主府大殿展开。主角苏轩以筑基后期修为对战金丹期反派林峰,
初期完全被压制,肋骨断裂三根,左臂脱臼。关键时刻领悟《天雷诀》第三层,
召唤九霄神雷,一举击溃林峰,但自身也陷入昏迷。师姐林月冲入大殿,
用最后一颗"回天丹"保住苏轩性命。章末苏轩在床榻上醒来,
发现修为因祸得福突破至金丹初期,但林月为救他耗尽真元,境界跌落。
结束地点: 青云门疗养院(主角卧室)
主角状态: 刚突破金丹初期,伤势恢复七成,持有林峰遗物"黑龙令",内疚林月为自己牺牲
剧情进展: 反派已除,但"黑龙令"预示着更大阴谋,林月境界跌落需寻找"续脉灵草"

【当前章节大纲】
第9章 - 寻药之旅
主角得知"续脉灵草"位于死亡沼泽,决定冒险前往...
```

### 对比分析
| 维度 | 修改前 | 修改后 | 改进 |
|------|-------|-------|------|
| **上下文长度** | ~150 字 | ~300 字 | +100% |
| **角色状态连贯性** | ❌ 无状态追踪 | ✅ 明确伤势、修为、持有物 | 显著提升 |
| **剧情逻辑桥梁** | ❌ 无过渡说明 | ✅ 明确动机(救林月) | 解决跳跃问题 |
| **场景衔接** | ❌ 地点模糊 | ✅ 精确地点(疗养院 → 死亡沼泽) | 空间连贯 |
| **悬念铺垫** | ❌ 无 | ✅ "黑龙令"伏笔 | 增强吸引力 |

---

## 测试验证

### 测试脚本
**文件**: `services/novel-backend/test_plot_continuity.py`

**测试内容**:
1. ✅ 大纲生成验证(`summary_preview` 长度 ≥ 200 字)
2. ✅ `ending_state` 结构完整性验证
3. ✅ RAG 上下文构建使用新字段验证
4. ✅ 提示词模板包含新要求验证

**运行方式**:
```bash
cd services/novel-backend
python test_plot_continuity.py
```

---

## 后续建议

1. **真实项目测试**: 使用实际项目数据生成章节,观察效果
2. **监控 LLM 输出**: 检查 AI 是否按要求填充 `summary_preview` (200-300 字)
3. **边界情况处理**: 第一章无前序章节时的特殊处理
4. **用户反馈收集**: 观察剧情连贯性是否显著改善
5. **性能监控**: `summary_preview` 字段增加上下文长度,关注 token 消耗

---

## 技术债务 & 注意事项

⚠️ **兼容性处理**:
- 代码已做旧数据兼容(`summary_preview or ""`),旧章节不受影响
- 建议逐步迁移旧数据:运行脚本为历史章节生成 `summary_preview`

⚠️ **Prompt Engineering**:
- LLM 可能仍输出过短的 `summary_preview`,需监控并调整提示词
- 建议在 `generation_service.py` 中添加长度验证,不足 200 字时警告

⚠️ **数据库索引**:
- 如果 `summary_preview` 需要全文搜索,考虑添加 GIN 索引:
  ```sql
  CREATE INDEX idx_novel_chapters_summary_gin ON novel_chapters USING gin(to_tsvector('simple', summary_preview));
  ```

---

## 实施人员
- **架构设计**: Claude (Linus Torvalds 模式)
- **代码实现**: Claude
- **数据库迁移**: Claude
- **测试验证**: Claude

## 审核状态
- [ ] 用户验收测试
- [ ] 代码审查(Code Review)
- [ ] 性能测试(Token 消耗分析)
- [ ] 生产环境部署

---

**文档版本**: v1.0
**最后更新**: 2026-01-15
