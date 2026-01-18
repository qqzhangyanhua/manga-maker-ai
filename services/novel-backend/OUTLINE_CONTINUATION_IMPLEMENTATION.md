# 大纲续写功能完整实现文档

## 概述

本次修复完整实现了大纲续写功能，解决了前端参数被忽略、未使用 RAG 增强上下文等问题。

---

## 修复内容

### 1. 请求模型扩展 (project_models.py)

**修改文件**: `app/routers/project_models.py`

**变更**:
```python
class GenerateOutlineRequest(BaseModel):
    """生成大纲请求 - 支持 full 和 continue 模式"""
    chapter_count: int = Field(..., ge=1, le=100, description="章节数量")
    style_prompt: Optional[str] = Field(None, alias="style", description="风格提示")
    mode: str = Field("full", description="生成模式: full | continue")
    existing_outlines: Optional[List[dict]] = Field(None, description="现有章节大纲（续写模式使用）")
    start_chapter: int = Field(1, ge=1, description="起始章节号（续写模式使用）")

    class Config:
        populate_by_name = True  # 允许同时使用字段名和 alias
```

**新增字段**:
- `mode`: 生成模式 (full/continue)
- `existing_outlines`: 前端传入的现有章节大纲
- `start_chapter`: 续写起始章节号

---

### 2. 路由层 RAG 集成 (project_generation.py)

**修改文件**: `app/routers/project_generation.py`

**核心逻辑**:
1. 导入 `NovelRAGService`
2. 在 `continue` 模式下调用 RAG 服务
3. 基于最后一章大纲检索相关历史章节
4. 将 RAG 上下文传递给生成服务

```python
# 续写模式下使用 RAG 增强上下文
rag_context = None
if request_body.mode == "continue":
    try:
        rag_service = NovelRAGService(db)

        if request_body.existing_outlines and len(request_body.existing_outlines) > 0:
            last_outline = request_body.existing_outlines[-1].get("outline", "")

            # 使用 RAG 服务检索语义相关章节
            rag_context = await rag_service.search_relevant_chapters(
                project_id=project_id,
                query=last_outline,
                current_chapter_number=request_body.start_chapter - 1,
                k=3  # Top-3 相关章节
            )
    except Exception as rag_error:
        # RAG 失败不阻塞流程，降级到基础续写
        logger.warning(f"⚠️ RAG 检索失败，降级到基础续写: {str(rag_error)}")
```

**容错机制**:
- RAG 检索失败时降级到基础续写，不阻塞流程
- 详细日志记录 RAG 使用情况

---

### 3. 服务层增强 (generation_service.py)

**修改文件**: `app/services/generation_service.py`

**新增参数**:
```python
async def generate_outline(
    # ... 现有参数 ...
    rag_context: Optional[list] = None  # ✨ 新增: RAG 检索上下文
) -> dict:
```

**Prompt 增强**:
```python
# 续写模式下构建增强 Prompt
if mode == "continue" and existing_outlines:
    user_prompt = f"""故事背景：
{premise}

现有章节（需要衔接的剧情）：
[现有章节列表]

相关历史章节（RAG 语义检索，剧情参考）：
[RAG 检索的相关章节内容]

续写要求：
- 承接现有章节的剧情线索、角色状态、未解决冲突
- 延续已埋下的伏笔，推进故事发展
- 避免重复已有内容，引入新的转折或挑战
"""
```

**RAG 上下文格式**:
- 章节号、标题
- 大纲摘要
- 内容摘要（前 500 字）
- 剧情状态（ending_state）

---

### 4. Prompt 模板优化 (prompt_templates.py)

**修改文件**: `app/services/prompt_templates.py`

**优化内容**:
```python
【剧情衔接核心原则】
1. 延续性：
   - 继承前文的角色状态（位置、情绪、能力等级、受伤情况）
   - 推进未解决的冲突和悬念
   - 回收已埋下的伏笔和线索
   - 如果 RAG 检索提供了相关历史章节，需要参考其中的剧情细节

2. 一致性：
   - 保持角色性格和行为逻辑
   - 遵循已建立的世界观规则
   - 时间线和空间位置要连贯

3. 发展性：
   - 引入新的挑战或转折
   - 推动角色成长或变化
   - 每章设置至少一个爽点

4. 结构性：
   - 每章大纲 200-300 字，具体细致
   - 明确章节核心事件和冲突
   - 标注关键章节（高潮、转折点）

5. RAG 上下文利用（如果提供）：
   - 参考相关历史章节的剧情状态
   - 延续或呼应历史章节中的重要细节
   - 避免与历史剧情产生矛盾
```

---

## 数据流

```
前端 ContinueOutlineDialog
    │ { mode: "continue", existing_outlines: [...], start_chapter: 4 }
    ▼
Next.js API Route (代理层)
    │ POST /api/novel/projects/{id}/generate-outline
    ▼
Python Backend - project_generation.py
    │ 1. 接收完整请求参数
    │ 2. RAG 服务检索相关章节
    │ 3. 构建增强上下文
    ▼
generation_service.py
    │ 1. 使用优化 Prompt
    │ 2. 包含 RAG 检索的历史章节
    │ 3. 生成续写大纲（章节号正确）
    ▼
返回前端
```

---

## 测试

### 运行测试脚本

```bash
cd services/novel-backend
source .venv/bin/activate
python test_outline_continuation.py
```

### 预期输出

```
📋 续写大纲功能测试
================================================================================
测试 1: 基础续写模式（不使用 RAG）
✅ 基础续写成功!
生成章节数: 3
  - 第 4 章: [章节标题]
  - 第 5 章: [章节标题]
  - 第 6 章: [章节标题]

测试 2: RAG 增强续写模式
✅ RAG 增强续写成功!
生成章节数: 3

第 4 章: [章节标题]
  大纲: [大纲内容]...
  关键事件: [事件1, 事件2, 事件3]
```

---

## 前端无需修改

前端 `ContinueOutlineDialog` 已经正确发送所有参数，无需任何修改：

```typescript
// src/app/(novel)/novel/[id]/components/ContinueOutlineDialog.tsx
const response = await fetch(`/api/novel/projects/${projectId}/generate-outline`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chapter_count: chapterCount,
    style: projectGenre || undefined,
    mode: "continue",                  // ✅ 现在会被正确处理
    existing_outlines: existingOulinesBackend,  // ✅ 现在会被正确处理
    start_chapter: nextChapterNumber,  // ✅ 现在会被正确处理
  }),
});
```

---

## 功能改进

### 修复前

| 问题 | 影响 |
|------|------|
| `mode`, `existing_outlines`, `start_chapter` 被忽略 | 续写功能无效 |
| 章节编号从 1 开始 | 与现有章节冲突 |
| 无 RAG 上下文 | 剧情可能不连贯 |
| 仅依赖前端传入的 3 章 outline | 上下文深度不足 |

### 修复后

| 改进 | 效果 |
|------|------|
| 正确接收和处理续写参数 | 续写功能正常工作 |
| 章节编号从 `start_chapter` 起 | 正确续写编号 |
| 集成 RAG 语义检索 | 利用历史章节提升连贯性 |
| 增强 Prompt 模板 | 更清晰的续写指导 |
| 完善日志记录 | 便于调试和监控 |

---

## 后续优化建议

### 可选增强

1. **RAG 检索策略优化**:
   - 当前: 仅基于最后一章 outline 检索
   - 改进: 综合多章关键信息检索

2. **章节状态追踪**:
   - 新增 `ending_state` 字段记录章节结束状态
   - 续写时自动承接上一章的结束状态

3. **剧情线索分析**:
   - 自动识别未解决的剧情线索
   - 提示 AI 优先处理这些线索

4. **质量评估**:
   - 生成后自动评估续写质量
   - 检查是否与前文矛盾

---

## 兼容性

- ✅ 向后兼容：`mode` 默认值为 `"full"`，不影响现有功能
- ✅ 降级机制：RAG 失败时自动降级到基础续写
- ✅ 前端无需修改：已有的 API 调用直接生效

---

## 总结

本次修复完整实现了大纲续写功能，包括：
1. 修复 Python 请求模型（P0 优先级）
2. 集成 RAG 服务增强上下文（P1 优先级）
3. 优化 Prompt 模板（P2 优先级）
4. 完善日志和容错机制

续写功能现已完全可用，能够正确衔接现有章节并利用 RAG 提升剧情连贯性。
