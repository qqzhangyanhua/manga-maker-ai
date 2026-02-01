# 风格指导文档设计方案

> 日期：2026-01-31
> 状态：待实施
> 目标：让 ProfessionalMode 生成的高质量提示词在后续章节生成时被使用

## 背景

### 问题描述

ProfessionalMode 工作流通过 4 个阶段（创意 → 设定 → 框架 → 创作）生成高质量的创作内容，但这些内容在保存到项目后：

1. **世界观/角色**：被 RAG 服务读取并作为上下文传入 ✅
2. **创意阶段的市场定位、风格要求**：❌ 没有传递
3. **框架阶段的爽点规划、节奏设计**：❌ 只保存了 outlines 数组，详细规划丢失

### 目标

- 增强上下文传递：将创意阶段的"风格/基调/目标读者"、框架阶段的"爽点规划"传入章节生成
- 生成项目级风格指令：在完成工作流时，用 AI 将 4 个阶段的输出汇总成"风格指导文档"

---

## 设计方案

### 1. 数据模型扩展

#### 1.1 NovelProject 新增字段

```python
# services/novel-backend/app/models.py

class NovelProject(Base):
    # ... 现有字段 ...

    # 新增：风格指导文档（由 ProfessionalMode 工作流生成）
    style_guide = Column(JSON)
```

#### 1.2 Prisma Schema

```prisma
// prisma/schema.prisma

model NovelProject {
  // ... 现有字段 ...

  // 新增：风格指导文档
  style_guide     Json?
}
```

#### 1.3 style_guide 数据结构

```json
{
  "version": "1.0",
  "generated_at": "2024-01-15T10:30:00Z",
  "source": "professional_workflow",

  "creative_direction": {
    "core_theme": "复仇与成长",
    "tone": "热血燃向",
    "target_audience": "18-25岁男性",
    "market_positioning": "都市修仙+系统流",
    "unique_selling_points": ["反套路金手指", "智斗型主角"]
  },

  "writing_style": {
    "pacing": "快节奏，前三章必须有爽点",
    "narrative_voice": "第三人称限知视角",
    "dialogue_style": "口语化、简洁有力",
    "description_density": "中等，重点场景详写"
  },

  "quality_rules": {
    "chapter_word_count": 6000,
    "cool_points_per_chapter": 2,
    "cliffhanger_frequency": "每章结尾",
    "forbidden_patterns": ["说教", "水字数", "过度描写"]
  },

  "framework_summary": {
    "total_arcs": 3,
    "arc_structure": "废材逆袭 → 宗门崛起 → 巅峰对决",
    "key_turning_points": ["第10章觉醒", "第50章身份揭露"]
  }
}
```

---

### 2. 工作流完成时生成 style_guide

#### 2.1 修改 complete_workflow 方法

```python
# services/novel-backend/app/services/workflow_service.py

async def complete_workflow(self, ...):
    # ... 现有逻辑：提取 world_setting、characters、outlines ...

    # 新增：生成风格指导文档
    style_guide = await self._generate_style_guide(
        phase_data=phase_data,
        genre=genre,
    )

    # 保存项目时加入 style_guide
    await db_session.execute(
        text("""
            INSERT INTO novel_projects
            (id, user_id, title, description, genre,
             world_setting, characters, outlines, style_guide, status)
            VALUES (...)
        """),
        {
            # ... 其他字段 ...
            "style_guide": json.dumps(style_guide) if style_guide else None,
        },
    )
```

#### 2.2 新增 _generate_style_guide 方法

```python
async def _generate_style_guide(
    self,
    phase_data: Dict[str, Any],
    genre: Optional[str],
) -> Optional[Dict[str, Any]]:
    """
    基于 4 个阶段的输出，生成项目风格指导文档
    """
    phases = phase_data.get("phases", {})

    # 收集各阶段关键内容
    context_parts = []
    for phase_name in ["creative", "setting", "framework", "writing"]:
        if phase_name in phases:
            output = phases[phase_name].get("output", "")
            summary = phases[phase_name].get("selected_summary", "")
            context_parts.append(f"【{phase_name}阶段】\n摘要：{summary}\n内容：{output[:2000]}")

    if not context_parts:
        return None

    # 调用 AI 生成汇总
    system_prompt = """你是专业网文编辑，擅长提炼创作风格指南。

任务：根据创作工作流的各阶段输出，生成结构化的风格指导文档。

输出 JSON 格式（严格遵循）：
{
  "creative_direction": {
    "core_theme": "核心主题（2-10字）",
    "tone": "作品基调（如：热血燃向、轻松搞笑、暗黑虐心）",
    "target_audience": "目标读者群体",
    "market_positioning": "市场定位（如：都市修仙+系统流）",
    "unique_selling_points": ["卖点1", "卖点2"]
  },
  "writing_style": {
    "pacing": "叙事节奏要求",
    "narrative_voice": "叙事视角",
    "dialogue_style": "对话风格要求",
    "description_density": "描写密度要求"
  },
  "quality_rules": {
    "chapter_word_count": 6000,
    "cool_points_per_chapter": 2,
    "cliffhanger_frequency": "悬念设置频率",
    "forbidden_patterns": ["禁止出现的写法1", "禁止出现的写法2"]
  },
  "framework_summary": {
    "total_arcs": 3,
    "arc_structure": "各卷/阶段概述",
    "key_turning_points": ["关键转折点1", "关键转折点2"]
  }
}

直接输出 JSON，不要添加其他内容。"""

    try:
        result = await generation_service.generate_with_prompt(
            system_prompt=system_prompt,
            user_prompt=f"专题类型：{genre or '通用'}\n\n{'\\n\\n'.join(context_parts)}",
            temperature=0.5,
            max_tokens=2048,
        )

        parsed = self._try_parse_json(result.get("content", ""))
        if parsed:
            parsed["version"] = "1.0"
            parsed["generated_at"] = datetime.utcnow().isoformat()
            parsed["source"] = "professional_workflow"
            return parsed
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to generate style_guide: {e}")

    return None
```

---

### 3. 章节生成时使用 style_guide

#### 3.1 修改 RAG 服务上下文构建

```python
# services/novel-backend/app/services/rag_service.py

async def build_context_for_generation(
    self,
    project_id: str,
    chapter_number: int,
    chapter_outline: str
) -> str:
    # ... 现有查询逻辑 ...

    # 构建上下文
    context_parts = []

    # 新增：风格指导（优先级最高，放在最前面）
    if project.style_guide:
        style_guide = project.style_guide if isinstance(project.style_guide, dict) else json.loads(project.style_guide)
        context_parts.append("【创作风格指导】")
        context_parts.append(self._format_style_guide(style_guide))
        context_parts.append("")

    # 现有：世界观
    if project.world_setting:
        context_parts.append("【世界观设定】")
        # ... 现有逻辑 ...

    # 现有：角色
    if project.characters:
        context_parts.append("【主要角色】")
        # ... 现有逻辑 ...

    # ... 其余现有逻辑 ...
```

#### 3.2 新增 _format_style_guide 方法

```python
def _format_style_guide(self, style_guide: Dict[str, Any]) -> str:
    """将 style_guide 格式化为 LLM 友好的文本"""
    parts = []

    # 创意方向
    if cd := style_guide.get("creative_direction"):
        parts.append(f"核心主题：{cd.get('core_theme', '')}")
        parts.append(f"作品基调：{cd.get('tone', '')}")
        parts.append(f"目标读者：{cd.get('target_audience', '')}")
        if usp := cd.get("unique_selling_points"):
            parts.append(f"核心卖点：{', '.join(usp)}")

    # 写作风格
    if ws := style_guide.get("writing_style"):
        parts.append(f"叙事节奏：{ws.get('pacing', '')}")
        parts.append(f"叙事视角：{ws.get('narrative_voice', '')}")
        parts.append(f"对话风格：{ws.get('dialogue_style', '')}")

    # 质量规则
    if qr := style_guide.get("quality_rules"):
        parts.append(f"章节字数：{qr.get('chapter_word_count', 6000)}字")
        parts.append(f"每章爽点：至少{qr.get('cool_points_per_chapter', 2)}个")
        if cf := qr.get("cliffhanger_frequency"):
            parts.append(f"悬念设置：{cf}")
        if forbidden := qr.get("forbidden_patterns"):
            parts.append(f"禁止出现：{', '.join(forbidden)}")

    return "\n".join(parts)
```

#### 3.3 修改提示词模板

```python
# services/novel-backend/app/services/prompt_templates.py

@classmethod
def get_chapter_generation_prompt(
    cls,
    chapter_number: int,
    style_prompt: Optional[str] = None,
    has_style_guide: bool = False,  # 新增参数
) -> str:
    """获取章节生成的系统提示词"""

    # 如果项目有 style_guide，强调遵循
    if has_style_guide:
        style_guide_instruction = """
【重要】本项目有专属风格指导，请严格遵循上下文中的【创作风格指导】部分：
- 保持指定的叙事基调和节奏
- 按要求设置爽点密度和悬念
- 严格避免禁止出现的写法
- 章节字数按指定要求控制
"""
    else:
        style_guide_instruction = ""

    # 组合完整提示词
    prompt = f"""{cls.BASE_PERSONA}
{style_guide_instruction}
{cls.ANTI_AI_RULES}
"""

    # 前三章特殊规则
    if chapter_number <= 3:
        prompt += f"\n{cls.GOLDEN_THREE_RULES}"

    # ... 其余现有逻辑 ...

    return prompt
```

#### 3.4 修改章节生成路由

```python
# services/novel-backend/app/routers/chapters.py

# 在调用 generate_chapter_stream 之前，检查项目是否有 style_guide
has_style_guide = project.style_guide is not None

# 生成内容
async for chunk in generation_service.generate_chapter_stream(
    context=context,
    chapter_outline=chapter.outline or "",
    chapter_number=chapter.chapter_number,
    style_prompt=request.style_prompt,
    temperature=request.temperature,
    has_style_guide=has_style_guide,  # 新增参数
):
    # ...
```

---

### 4. 前端类型定义

```typescript
// src/app/(novel)/novel/[id]/types.ts

export interface StyleGuide {
  version: string;
  generated_at: string;
  source: "professional_workflow" | "manual";

  creative_direction: {
    core_theme: string;
    tone: string;
    target_audience: string;
    market_positioning?: string;
    unique_selling_points?: string[];
  };

  writing_style: {
    pacing: string;
    narrative_voice: string;
    dialogue_style: string;
    description_density?: string;
  };

  quality_rules: {
    chapter_word_count: number;
    cool_points_per_chapter: number;
    cliffhanger_frequency?: string;
    forbidden_patterns?: string[];
  };

  framework_summary?: {
    total_arcs: number;
    arc_structure: string;
    key_turning_points?: string[];
  };
}

// 扩展现有 NovelProject 接口
export interface NovelProject {
  // ... 现有字段 ...
  style_guide?: StyleGuide;
}
```

---

## 实施步骤

| 步骤 | 任务 | 涉及文件 |
|------|------|----------|
| 1 | 数据库迁移：新增 `style_guide` 字段 | `prisma/schema.prisma` |
| 2 | Python 模型同步 | `services/novel-backend/app/models.py` |
| 3 | 工作流服务：新增 `_generate_style_guide` 方法 | `services/novel-backend/app/services/workflow_service.py` |
| 4 | 工作流服务：修改 `complete_workflow` 调用生成逻辑 | `services/novel-backend/app/services/workflow_service.py` |
| 5 | RAG 服务：新增 `_format_style_guide` 方法 | `services/novel-backend/app/services/rag_service.py` |
| 6 | RAG 服务：修改 `build_context_for_generation` 注入 style_guide | `services/novel-backend/app/services/rag_service.py` |
| 7 | 提示词模板：修改 `get_chapter_generation_prompt` 支持 style_guide | `services/novel-backend/app/services/prompt_templates.py` |
| 8 | 章节生成路由：传递 `has_style_guide` 参数 | `services/novel-backend/app/routers/chapters.py` |
| 9 | 生成服务：`generate_chapter_stream` 接收 `has_style_guide` | `services/novel-backend/app/services/generation_service.py` |
| 10 | 前端类型定义 | `src/app/(novel)/novel/[id]/types.ts` |
| 11 | （可选）前端展示风格指导卡片 | `src/app/(novel)/novel/[id]/components/ProjectSettings.tsx` |

---

## 风险与注意事项

1. **向后兼容**：现有项目 `style_guide` 为 `null`，RAG 服务需判空处理
2. **AI 生成失败**：`_generate_style_guide` 需要 try-catch，失败时返回 `None` 而非阻塞项目创建
3. **性能考虑**：生成 style_guide 会增加一次 LLM 调用，`complete_workflow` 耗时增加约 3-5 秒
4. **数据迁移**：新字段可选，无需回填历史数据

---

## 测试要点

1. ProfessionalMode 完成 4 个阶段后，确认 `style_guide` 正确保存到数据库
2. 生成章节时，确认上下文包含【创作风格指导】部分
3. 现有项目（无 style_guide）章节生成不受影响
4. `_generate_style_guide` 失败时，项目创建流程正常完成
5. 前端能正确显示和解析 `style_guide` 数据
