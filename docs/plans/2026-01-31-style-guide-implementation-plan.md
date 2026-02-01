# Style Guide 风格指导文档实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 ProfessionalMode 工作流生成的高质量提示词（创意方向、风格要求、爽点规划）在后续章节生成时被使用

**Architecture:** 
- 在 NovelProject 模型中新增 `style_guide` JSON 字段存储风格指导文档
- 工作流完成时通过 AI 汇总 4 个阶段输出生成 style_guide
- RAG 服务在构建上下文时将 style_guide 注入到章节生成提示词中

**Tech Stack:** 
- PostgreSQL + Prisma (数据库迁移)
- Python FastAPI (后端服务)
- SQLAlchemy (Python ORM)
- OpenAI API (AI 生成)
- TypeScript (前端类型定义)

---

## Task 1: 数据库迁移 - Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma:985-1020` (NovelProject 模型)

**Step 1: 修改 Prisma Schema**

在 `NovelProject` 模型中添加 `style_guide` 字段：

```prisma
// 在 NovelProject 模型的 outlines 字段后添加
model NovelProject {
  // ... 现有字段 ...
  
  // 章节大纲（JSON 结构化存储）
  outlines Json? // [{ chapterNumber, title, outline, keyEvents, characters, plotLines, isKeyChapter }]

  // 新增：风格指导文档（由 ProfessionalMode 工作流生成）
  style_guide Json? // { creative_direction, writing_style, quality_rules, framework_summary }

  // 项目配置
  target_words Int? // 目标字数
  // ... 其余字段 ...
}
```

**Step 2: 运行迁移命令**

Run: `npx prisma migrate dev --name add_style_guide_to_novel_project`
Expected: 迁移成功，生成新的迁移文件

**Step 3: 重新生成 Prisma Client**

Run: `npx prisma generate`
Expected: Prisma Client 更新成功

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add style_guide field to NovelProject model"
```

---

## Task 2: Python 模型同步

**Files:**
- Modify: `services/novel-backend/app/models.py:13-46` (NovelProject 类)

**Step 1: 修改 Python SQLAlchemy 模型**

在 `NovelProject` 类中添加 `style_guide` 字段：

```python
class NovelProject(Base):
    """小说项目"""
    __tablename__ = "novel_projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    genre = Column(String(50))
    
    # 世界观和角色（JSON）
    world_setting = Column(JSON)
    characters = Column(JSON)
    outlines = Column(JSON)  # 章节大纲
    
    # 新增：风格指导文档（由 ProfessionalMode 工作流生成）
    style_guide = Column(JSON)
    
    # 项目配置
    target_words = Column(Integer)
    status = Column(String(50), default="draft")
    
    # ... 其余字段保持不变 ...
```

**Step 2: 验证模型同步**

Run: `cd services/novel-backend && python -c "from app.models import NovelProject; print('Model OK')"`
Expected: 输出 "Model OK"

**Step 3: Commit**

```bash
git add services/novel-backend/app/models.py
git commit -m "feat(model): add style_guide field to NovelProject SQLAlchemy model"
```

---

## Task 3: 工作流服务 - 新增 _generate_style_guide 方法

**Files:**
- Modify: `services/novel-backend/app/services/workflow_service.py`

**Step 1: 在 WorkflowService 类中添加 _generate_style_guide 方法**

在 `_try_parse_json` 方法之前添加新方法：

```python
async def _generate_style_guide(
    self,
    phase_data: Dict[str, Any],
    genre: Optional[str],
) -> Optional[Dict[str, Any]]:
    """
    基于 4 个阶段的输出，生成项目风格指导文档
    
    Args:
        phase_data: 包含各阶段数据的字典
        genre: 小说类型
        
    Returns:
        风格指导文档字典，失败返回 None
    """
    import logging
    logger = logging.getLogger(__name__)
    
    phases = phase_data.get("phases", {})
    
    # 收集各阶段关键内容
    context_parts = []
    phase_names_map = {
        "creative": "创意阶段",
        "setting": "设定阶段", 
        "framework": "框架阶段",
        "writing": "创作阶段"
    }
    
    for phase_name in ["creative", "setting", "framework", "writing"]:
        if phase_name in phases:
            output = phases[phase_name].get("output", "")
            summary = phases[phase_name].get("selected_summary", "")
            display_name = phase_names_map.get(phase_name, phase_name)
            # 限制每个阶段的内容长度，避免 token 超限
            output_truncated = output[:2000] if output else ""
            context_parts.append(f"【{display_name}】\n摘要：{summary}\n内容：{output_truncated}")
    
    if not context_parts:
        logger.warning("No phase data available for style guide generation")
        return None
    
    # 构建 AI 生成的系统提示词
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
            logger.info(f"Successfully generated style_guide for genre: {genre}")
            return parsed
        else:
            logger.warning("Failed to parse style_guide JSON response")
            
    except Exception as e:
        logger.warning(f"Failed to generate style_guide: {e}")
    
    return None
```

**Step 2: 验证语法**

Run: `cd services/novel-backend && python -c "from app.services.workflow_service import workflow_service; print('Import OK')"`
Expected: 输出 "Import OK"

**Step 3: Commit**

```bash
git add services/novel-backend/app/services/workflow_service.py
git commit -m "feat(workflow): add _generate_style_guide method"
```

---

## Task 4: 工作流服务 - 修改 complete_workflow 调用生成逻辑

**Files:**
- Modify: `services/novel-backend/app/services/workflow_service.py:930-1058` (complete_workflow 方法)

**Step 1: 在 complete_workflow 方法中调用 _generate_style_guide**

找到 `complete_workflow` 方法，在创建项目之前生成 style_guide：

```python
async def complete_workflow(
    self,
    session_id: str,
    user_id: str,
    project_title: str,
    project_description: Optional[str] = None,
) -> Dict[str, Any]:
    """
    完成工作流，创建小说项目
    """
    session = await self.get_session(session_id, user_id)
    if not session:
        raise ValueError("Session not found or expired")

    phase_data = session.get("phase_data", {})
    phases = phase_data.get("phases", {})

    # 检查是否完成了足够的阶段
    required_phases = ["creative", "setting"]
    for phase in required_phases:
        if phase not in phases:
            raise ValueError(f"Phase '{phase}' must be completed before creating project")

    # 从各阶段提取数据（现有逻辑保持不变）
    # ... 省略现有的数据提取逻辑 ...
    
    # 提前获取 genre
    genre = phase_data.get("genre")

    # ... 省略现有的 creative_content, world_setting, characters, outlines 提取逻辑 ...

    # 新增：生成风格指导文档
    style_guide = await self._generate_style_guide(
        phase_data=phase_data,
        genre=genre,
    )

    # 创建项目（修改 INSERT 语句，加入 style_guide）
    async with AsyncSessionLocal() as db_session:
        project_id = str(uuid.uuid4())

        await db_session.execute(
            text("""
                INSERT INTO novel_projects 
                (id, user_id, title, description, genre, world_setting, characters, outlines, style_guide, status)
                VALUES (:id, :user_id, :title, :description, :genre, :world_setting, :characters, :outlines, :style_guide, :status)
            """),
            {
                "id": project_id,
                "user_id": user_id,
                "title": project_title,
                "description": project_description,
                "genre": genre,
                "world_setting": json.dumps(world_setting) if world_setting else None,
                "characters": json.dumps(characters) if characters else None,
                "outlines": json.dumps(outlines) if outlines else None,
                "style_guide": json.dumps(style_guide) if style_guide else None,
                "status": "draft",
            },
        )

        # ... 其余现有逻辑保持不变 ...
```

**Step 2: 验证语法**

Run: `cd services/novel-backend && python -c "from app.services.workflow_service import workflow_service; print('Import OK')"`
Expected: 输出 "Import OK"

**Step 3: Commit**

```bash
git add services/novel-backend/app/services/workflow_service.py
git commit -m "feat(workflow): integrate style_guide generation in complete_workflow"
```

---

## Task 5: RAG 服务 - 新增 _format_style_guide 方法

**Files:**
- Modify: `services/novel-backend/app/services/rag_service.py`

**Step 1: 在 NovelRAGService 类中添加 _format_style_guide 方法**

在 `_get_pending_foreshadowings` 方法之后添加：

```python
def _format_style_guide(self, style_guide: Dict) -> str:
    """
    将 style_guide 格式化为 LLM 友好的文本
    
    Args:
        style_guide: 风格指导文档字典
        
    Returns:
        格式化的文本字符串
    """
    parts = []
    
    # 创意方向
    if cd := style_guide.get("creative_direction"):
        if cd.get("core_theme"):
            parts.append(f"核心主题：{cd['core_theme']}")
        if cd.get("tone"):
            parts.append(f"作品基调：{cd['tone']}")
        if cd.get("target_audience"):
            parts.append(f"目标读者：{cd['target_audience']}")
        if cd.get("market_positioning"):
            parts.append(f"市场定位：{cd['market_positioning']}")
        if usp := cd.get("unique_selling_points"):
            if isinstance(usp, list) and usp:
                parts.append(f"核心卖点：{', '.join(usp)}")
    
    # 写作风格
    if ws := style_guide.get("writing_style"):
        if ws.get("pacing"):
            parts.append(f"叙事节奏：{ws['pacing']}")
        if ws.get("narrative_voice"):
            parts.append(f"叙事视角：{ws['narrative_voice']}")
        if ws.get("dialogue_style"):
            parts.append(f"对话风格：{ws['dialogue_style']}")
        if ws.get("description_density"):
            parts.append(f"描写密度：{ws['description_density']}")
    
    # 质量规则
    if qr := style_guide.get("quality_rules"):
        word_count = qr.get("chapter_word_count", 6000)
        parts.append(f"章节字数：{word_count}字")
        cool_points = qr.get("cool_points_per_chapter", 2)
        parts.append(f"每章爽点：至少{cool_points}个")
        if cf := qr.get("cliffhanger_frequency"):
            parts.append(f"悬念设置：{cf}")
        if forbidden := qr.get("forbidden_patterns"):
            if isinstance(forbidden, list) and forbidden:
                parts.append(f"禁止出现：{', '.join(forbidden)}")
    
    # 框架摘要
    if fs := style_guide.get("framework_summary"):
        if fs.get("arc_structure"):
            parts.append(f"故事结构：{fs['arc_structure']}")
        if ktp := fs.get("key_turning_points"):
            if isinstance(ktp, list) and ktp:
                parts.append(f"关键转折：{', '.join(ktp)}")
    
    return "\n".join(parts)
```

**Step 2: 验证语法**

Run: `cd services/novel-backend && python -c "from app.services.rag_service import NovelRAGService; print('Import OK')"`
Expected: 输出 "Import OK"

**Step 3: Commit**

```bash
git add services/novel-backend/app/services/rag_service.py
git commit -m "feat(rag): add _format_style_guide method"
```

---

## Task 6: RAG 服务 - 修改 build_context_for_generation 注入 style_guide

**Files:**
- Modify: `services/novel-backend/app/services/rag_service.py:417-680` (build_context_for_generation 方法)

**Step 1: 在 build_context_for_generation 方法中注入 style_guide**

找到构建上下文的部分，在世界观设定之前添加风格指导：

```python
async def build_context_for_generation(
    self,
    project_id: str,
    chapter_number: int,
    chapter_outline: str
) -> str:
    """
    构建章节生成的完整上下文
    """
    try:
        # 1. 获取项目信息
        project_stmt = select(NovelProject).where(NovelProject.id == project_id)
        project_result = await self.db.execute(project_stmt)
        project = project_result.scalar_one_or_none()

        if not project:
            return ""

        # 2-5. 并行执行所有独立查询
        previous_chapters, relevant_chapters, world_entries, pending_foreshadowings = (
            await asyncio.gather(
                self.get_previous_chapters(project_id, chapter_number, count=2),
                self.search_relevant_chapters(project_id, chapter_outline, chapter_number, k=3),
                self._get_relevant_world_entries(project_id, chapter_outline, max_entries=10),
                self._get_pending_foreshadowings(project_id, chapter_number, lookahead=5),
            )
        )

        # 6. 构建上下文
        context_parts = []

        # 新增：风格指导（优先级最高，放在最前面）
        if project.style_guide:
            style_guide = project.style_guide
            # 处理可能的 JSON 字符串
            if isinstance(style_guide, str):
                import json
                try:
                    style_guide = json.loads(style_guide)
                except json.JSONDecodeError:
                    style_guide = None
            
            if style_guide and isinstance(style_guide, dict):
                context_parts.append("【创作风格指导】")
                context_parts.append(self._format_style_guide(style_guide))
                context_parts.append("")

        # 世界观设定（现有逻辑保持不变）
        if project.world_setting:
            context_parts.append("【世界观设定】")
            # ... 现有的世界观处理逻辑 ...
```

**Step 2: 更新日志记录**

在方法末尾的日志中添加 style_guide 状态：

```python
logger.info(
    f"📋 上下文构建成功 - "
    f"项目ID: {project_id}, "
    f"章节号: {chapter_number}, "
    f"上下文长度: {len(final_context)} 字符, "
    f"包含组件: "
    f"风格指导={'✅' if project.style_guide else '❌'}, "  # 新增
    f"世界观={'✅' if project.world_setting else '❌'}, "
    f"角色={'✅' if project.characters else '❌'}, "
    f"前序章节={len(previous_chapters)}, "
    f"相关章节={len(relevant_chapters)}, "
    f"记忆库条目={sum(len(g['entries']) for g in world_entries)}, "
    f"伏笔提醒={len(pending_foreshadowings)}, "
    f"检索模式={'🔍向量' if self.vector_service.enabled else '📝关键词'}"
)
```

**Step 3: 验证语法**

Run: `cd services/novel-backend && python -c "from app.services.rag_service import NovelRAGService; print('Import OK')"`
Expected: 输出 "Import OK"

**Step 4: Commit**

```bash
git add services/novel-backend/app/services/rag_service.py
git commit -m "feat(rag): inject style_guide into chapter generation context"
```

---

## Task 7: 提示词模板 - 修改 get_chapter_generation_prompt 支持 style_guide

**Files:**
- Modify: `services/novel-backend/app/services/prompt_templates.py:249-358` (get_chapter_generation_prompt 方法)

**Step 1: 修改方法签名和实现**

```python
@classmethod
def get_chapter_generation_prompt(
    cls,
    chapter_number: int,
    style_prompt: Optional[str] = None,
    has_style_guide: bool = False,  # 新增参数
) -> str:
    """
    获取章节内容生成的系统提示词

    Args:
        chapter_number: 章节号
        style_prompt: 自定义风格提示
        has_style_guide: 项目是否有风格指导文档
    """
    prompt = cls.BASE_PERSONA + "\n\n"

    # 新增：如果项目有 style_guide，强调遵循
    if has_style_guide:
        prompt += """【重要】本项目有专属风格指导，请严格遵循上下文中的【创作风格指导】部分：
- 保持指定的叙事基调和节奏
- 按要求设置爽点密度和悬念
- 严格避免禁止出现的写法
- 章节字数按指定要求控制

"""

    prompt += """【核心目标】
基于提供的大纲写作本章正文，保持轻松、搞笑、轻度爽文风格，但剧情必须清晰、连贯、不过度夸张。

【章节要求】
1. ⚠️ 本章正文不少于 6000 字中文（不含符号）
2. 严格按大纲事件顺序推进，关键事件一个不漏，不新增主线或关键反转
3. 连续性一致：角色性格/能力/关系、时间线、地点与上下文一致
4. 节奏明确：开篇进入目标或冲突，中段升级，高点充分展开，结尾留钩子
5. 反对灌水：每段必须推进剧情、信息或关系，避免无意义闲聊与重复描写
"""
    # ... 其余现有逻辑保持不变 ...
```

**Step 2: 验证语法**

Run: `cd services/novel-backend && python -c "from app.services.prompt_templates import NovelPromptTemplates; print('Import OK')"`
Expected: 输出 "Import OK"

**Step 3: Commit**

```bash
git add services/novel-backend/app/services/prompt_templates.py
git commit -m "feat(prompt): add has_style_guide parameter to chapter generation prompt"
```

---

## Task 8: 章节生成路由 - 传递 has_style_guide 参数

**Files:**
- Modify: `services/novel-backend/app/routers/chapters.py:380-482` (generate_chapter_stream 函数)

**Step 1: 修改 generate_chapter_stream 函数**

在构建上下文之前检查项目是否有 style_guide，并传递给生成服务：

```python
@router.post("/generate/stream")
async def generate_chapter_stream(
    request: GenerateChapterRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """流式生成章节内容"""
    
    # 查询章节
    chapter_query = select(NovelChapter).where(NovelChapter.id == request.chapter_id)
    chapter_result = await db.execute(chapter_query)
    chapter = chapter_result.scalar_one_or_none()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    
    # 验证项目所有权并获取项目信息
    project_query = select(NovelProject).where(
        NovelProject.id == chapter.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此章节"
        )
    
    # 新增：检查项目是否有 style_guide
    has_style_guide = project.style_guide is not None
    
    # 构建上下文
    context = ""
    if request.use_rag:
        rag_service = NovelRAGService(db)
        context = await rag_service.build_context_for_generation(
            str(chapter.project_id),
            chapter.chapter_number,
            chapter.outline or ""
        )
    else:
        context = chapter.outline or ""
    
    # 生成内容
    generation_service = NovelGenerationService()
    
    async def event_generator():
        """SSE 事件生成器"""
        accumulated_content = ""
        
        try:
            async for chunk in generation_service.generate_chapter_stream(
                context=context,
                chapter_outline=chapter.outline or "",
                chapter_number=chapter.chapter_number,
                style_prompt=request.style_prompt,
                temperature=request.temperature,
                has_style_guide=has_style_guide,  # 新增参数
            ):
                accumulated_content += chunk
                yield f"data: {chunk}\n\n"
            # ... 其余现有逻辑保持不变 ...
```

**Step 2: 验证语法**

Run: `cd services/novel-backend && python -c "from app.routers.chapters import router; print('Import OK')"`
Expected: 输出 "Import OK"

**Step 3: Commit**

```bash
git add services/novel-backend/app/routers/chapters.py
git commit -m "feat(api): pass has_style_guide to chapter generation"
```

---

## Task 9: 生成服务 - generate_chapter_stream 接收 has_style_guide

**Files:**
- Modify: `services/novel-backend/app/services/generation_service.py:23-115` (generate_chapter_stream 方法)

**Step 1: 修改方法签名**

```python
async def generate_chapter_stream(
    self,
    context: str,
    chapter_outline: str,
    chapter_number: int = 1,
    style_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 12000,
    has_style_guide: bool = False,  # 新增参数
) -> AsyncGenerator[str, None]:
    """
    流式生成章节内容

    Args:
        context: 上下文（世界观、角色、前序章节等）
        chapter_outline: 当前章节大纲
        chapter_number: 章节号（用于判断是否前三章）
        style_prompt: 风格提示（可选）
        temperature: 温度参数
        max_tokens: 最大 token 数
        has_style_guide: 项目是否有风格指导文档
    """
    try:
        # 使用新的提示词模板，传递 has_style_guide
        system_prompt = NovelPromptTemplates.get_chapter_generation_prompt(
            chapter_number=chapter_number,
            style_prompt=style_prompt,
            has_style_guide=has_style_guide,  # 新增参数
        )
        # ... 其余现有逻辑保持不变 ...
```

**Step 2: 更新日志记录**

```python
logger.info(
    f"🤖 准备调用 LLM 生成章节 - "
    f"章节号: {chapter_number}, "
    f"has_style_guide: {has_style_guide}, "  # 新增
    f"system_prompt 长度: {len(system_prompt)} 字符, "
    f"user_prompt 长度: {len(user_prompt)} 字符, "
    f"context 长度: {len(context)} 字符, "
    f"max_tokens: {max_tokens}, "
    f"temperature: {temperature}"
)
```

**Step 3: 验证语法**

Run: `cd services/novel-backend && python -c "from app.services.generation_service import NovelGenerationService; print('Import OK')"`
Expected: 输出 "Import OK"

**Step 4: Commit**

```bash
git add services/novel-backend/app/services/generation_service.py
git commit -m "feat(generation): add has_style_guide parameter to generate_chapter_stream"
```

---

## Task 10: 前端类型定义

**Files:**
- Create: `src/app/(novel)/novel/[id]/types.ts` (如果不存在则创建)
- 或 Modify: 现有的类型定义文件

**Step 1: 查找或创建类型定义文件**

首先检查是否存在相关类型定义文件。如果不存在，创建新文件：

```typescript
// src/app/(novel)/novel/[id]/types.ts

/**
 * 风格指导文档类型定义
 * 由 ProfessionalMode 工作流生成
 */
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

/**
 * 小说项目类型（扩展）
 */
export interface NovelProject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  genre?: string;
  world_setting?: Record<string, unknown>;
  characters?: Array<Record<string, unknown>>;
  outlines?: Array<Record<string, unknown>>;
  style_guide?: StyleGuide;  // 新增字段
  target_words?: number;
  status: string;
  total_words: number;
  chapter_count: number;
  created_at: string;
  updated_at: string;
}
```

**Step 2: 验证 TypeScript 语法**

Run: `npm run type-check`
Expected: 无类型错误

**Step 3: Commit**

```bash
git add src/app/\(novel\)/novel/\[id\]/types.ts
git commit -m "feat(types): add StyleGuide interface and extend NovelProject type"
```

---

## Task 11: 集成测试

**Files:**
- 无需创建新文件，通过手动测试验证

**Step 1: 启动后端服务**

Run: `cd services/novel-backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000`
Expected: 服务启动成功

**Step 2: 启动前端服务**

Run: `npm run dev`
Expected: 前端启动成功

**Step 3: 手动测试流程**

1. 通过 ProfessionalMode 完成 4 个阶段的工作流
2. 完成工作流创建项目
3. 检查数据库中 `novel_projects` 表的 `style_guide` 字段是否有值
4. 生成章节时，检查后端日志是否显示 `风格指导=✅`
5. 验证生成的章节内容是否符合风格指导要求

**Step 4: 验证数据库**

Run: `npx prisma studio`
Expected: 能在 NovelProject 表中看到 style_guide 字段

**Step 5: Final Commit**

```bash
git add .
git commit -m "feat: complete style guide integration for novel generation"
```

---

## 风险与注意事项

1. **向后兼容**：现有项目 `style_guide` 为 `null`，RAG 服务已做判空处理
2. **AI 生成失败**：`_generate_style_guide` 有 try-catch，失败时返回 `None` 不阻塞项目创建
3. **性能考虑**：生成 style_guide 会增加一次 LLM 调用，`complete_workflow` 耗时增加约 3-5 秒
4. **数据迁移**：新字段可选，无需回填历史数据

---

## 验收标准

- [ ] Prisma 迁移成功，`style_guide` 字段已添加到数据库
- [ ] Python 模型同步完成
- [ ] ProfessionalMode 完成 4 个阶段后，`style_guide` 正确保存到数据库
- [ ] 生成章节时，上下文包含【创作风格指导】部分
- [ ] 现有项目（无 style_guide）章节生成不受影响
- [ ] `_generate_style_guide` 失败时，项目创建流程正常完成
- [ ] 前端类型定义完整
- [ ] 所有代码通过语法检查

---

**计划创建时间**: 2026-01-31
**预计完成任务数**: 11 个
