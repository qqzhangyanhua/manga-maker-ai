# 动态提示词模板系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现提示词模板的动态配置，支持运营人员通过后台界面管理不同专题的提示词模板

**Architecture:** 
- 数据层：新增 `genres` 表 + 扩展 `writing_prompt_templates` 表添加 `function_code` 字段
- 服务层：扩展 Python `template_service.py` 实现三层兜底匹配逻辑
- API 层：Next.js Admin API 提供 CRUD 接口
- 前端：Admin 管理界面（专题管理 + 模板管理）

**Tech Stack:** 
- Prisma ORM + PostgreSQL
- Python FastAPI (template_service.py, workflow_service.py)
- Next.js 14 App Router + React + TypeScript + shadcn/ui

---

## Phase 1: 数据层 - Prisma Schema + 迁移

### Task 1.1: 新增 Genre 模型到 Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: 在 schema.prisma 末尾添加 Genre 模型**

在 `prisma/schema.prisma` 文件末尾添加以下内容：

```prisma
// ============================================================
// 专题管理 - Genre System for Dynamic Prompt Templates
// ============================================================

// 专题类型（玄幻、都市、悬疑等）
model Genre {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code         String   @unique @db.VarChar(50) // 如 "xuanhuan", "dushi"
  display_name String   @db.VarChar(100) // 如 "玄幻", "都市"
  description  String?  @db.Text
  parent_id    String?  @db.Uuid // 预留，暂不使用
  is_active    Boolean  @default(true)
  sort_order   Int      @default(0)
  created_at   DateTime @default(now()) @db.Timestamptz(6)
  updated_at   DateTime @default(now()) @db.Timestamptz(6)

  // Self-relation for hierarchical genres (future use)
  parent   Genre?  @relation("GenreHierarchy", fields: [parent_id], references: [id], onDelete: SetNull)
  children Genre[] @relation("GenreHierarchy")

  @@index([is_active, sort_order], map: "idx_genres_active_sort")
  @@map("genres")
}
```

**Step 2: 运行 Prisma 格式化验证**

Run: `npx prisma format`
Expected: 文件格式化成功，无错误

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "$(cat <<'EOF'
feat(schema): add Genre model for dynamic prompt templates

- Add genres table for managing novel genres (xuanhuan, dushi, etc.)
- Support hierarchical structure with parent_id (reserved for future)
- Include is_active flag and sort_order for admin management
EOF
)"
```

---

### Task 1.2: 扩展 WritingPromptTemplate 模型添加 function_code 字段

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: 在 WritingPromptTemplate 模型中添加 function_code 字段**

找到 `WritingPromptTemplate` 模型（约第 1572 行），在 `genre` 字段后添加：

```prisma
  function_code String? @db.VarChar(50) // 功能代码: creative_generate_options, setting_generate_options 等
```

**Step 2: 添加复合索引**

在 `WritingPromptTemplate` 模型的 `@@index` 部分添加新索引：

```prisma
  @@index([function_code, genre, is_active], map: "idx_writing_templates_function_genre")
```

**Step 3: 运行 Prisma 格式化验证**

Run: `npx prisma format`
Expected: 文件格式化成功，无错误

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "$(cat <<'EOF'
feat(schema): add function_code to WritingPromptTemplate

- Add function_code field for workflow function mapping
- Add composite index for efficient template lookup by function + genre
EOF
)"
```

---

### Task 1.3: 生成并应用数据库迁移

**Files:**
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_genres_and_function_code/migration.sql`

**Step 1: 生成迁移文件**

Run: `npx prisma migrate dev --name add_genres_and_function_code`
Expected: 迁移文件创建成功，数据库更新完成

**Step 2: 验证迁移结果**

Run: `npx prisma studio`
Expected: 能看到新的 `genres` 表和 `writing_prompt_templates` 表的 `function_code` 字段

**Step 3: 重新生成 Prisma Client**

Run: `npx prisma generate`
Expected: Prisma Client 生成成功

**Step 4: Commit**

```bash
git add prisma/migrations/
git commit -m "$(cat <<'EOF'
chore(db): apply migration for genres and function_code

- Create genres table
- Add function_code column to writing_prompt_templates
- Add composite index for template lookup
EOF
)"
```

---

### Task 1.4: 创建种子数据脚本

**Files:**
- Create: `prisma/seeds/genres-seed.ts`
- Modify: `prisma/seed.ts`

**Step 1: 创建专题种子数据文件**

创建 `prisma/seeds/genres-seed.ts`：

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 预置专题列表
const PRESET_GENRES = [
  { code: "xuanhuan", display_name: "玄幻", description: "玄幻修仙、异世大陆类小说", sort_order: 1 },
  { code: "xiuzhen", display_name: "修真", description: "修真仙侠、道法修炼类小说", sort_order: 2 },
  { code: "dushi", display_name: "都市", description: "都市生活、现代言情类小说", sort_order: 3 },
  { code: "lishi", display_name: "历史", description: "历史穿越、架空历史类小说", sort_order: 4 },
  { code: "yanqing", display_name: "言情", description: "言情、甜宠、虐恋类小说", sort_order: 5 },
  { code: "xuanyi", display_name: "悬疑", description: "悬疑推理、惊悚恐怖类小说", sort_order: 6 },
  { code: "kehuan", display_name: "科幻", description: "科幻、未来、星际类小说", sort_order: 7 },
  { code: "youxi", display_name: "游戏", description: "游戏、电竞、虚拟现实类小说", sort_order: 8 },
];

export async function seedGenres() {
  console.log("Seeding genres...");

  for (const genre of PRESET_GENRES) {
    await prisma.genre.upsert({
      where: { code: genre.code },
      update: {
        display_name: genre.display_name,
        description: genre.description,
        sort_order: genre.sort_order,
      },
      create: genre,
    });
  }

  console.log(`Seeded ${PRESET_GENRES.length} genres`);
}

// 如果直接运行此文件
if (require.main === module) {
  seedGenres()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
```

**Step 2: 在主 seed.ts 中引入专题种子**

在 `prisma/seed.ts` 中添加导入和调用（在文件适当位置）：

```typescript
import { seedGenres } from "./seeds/genres-seed";

// 在 main 函数中调用
await seedGenres();
```

**Step 3: 运行种子脚本验证**

Run: `npx ts-node prisma/seeds/genres-seed.ts`
Expected: 输出 "Seeded 8 genres"

**Step 4: Commit**

```bash
git add prisma/seeds/genres-seed.ts prisma/seed.ts
git commit -m "$(cat <<'EOF'
feat(seed): add preset genres seed data

- Add 8 preset genres: xuanhuan, xiuzhen, dushi, lishi, yanqing, xuanyi, kehuan, youxi
- Support upsert to avoid duplicates on re-run
EOF
)"
```

---

## Phase 2: 服务层 - Python Backend 改造

### Task 2.1: 扩展 template_service.py 添加函数模板匹配

**Files:**
- Modify: `services/novel-backend/app/services/template_service.py`

**Step 1: 添加预定义变量常量**

在 `TemplateService` 类开头添加：

```python
    # 8 个 function_code 及其预定义变量
    FUNCTION_VARIABLES = {
        "creative_generate_options": ["phase_name", "phase_description", "genre", "num_options"],
        "setting_generate_options": ["phase_name", "phase_description", "genre", "num_options", "creative_output"],
        "framework_generate_options": ["phase_name", "phase_description", "genre", "num_options", "creative_output", "setting_output"],
        "writing_generate_options": ["phase_name", "phase_description", "genre", "num_options", "creative_output", "setting_output", "framework_output"],
        "optimize_result": ["phase_name", "template_name", "current_result", "optimization_instruction"],
        "generate_project_info": ["genre", "creative_summary", "setting_summary", "framework_summary"],
        "generate_style_guide": ["genre", "creative_output", "setting_output", "framework_output", "writing_output"],
        "convert_text_to_outlines": ["genre", "framework_text"],
    }
```

**Step 2: 添加 get_template_for_function 方法**

在 `TemplateService` 类中添加：

```python
    async def get_template_for_function(
        self,
        function_code: str,
        genre: Optional[str] = None,
        session: Optional[AsyncSession] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        三层兜底匹配获取功能模板
        
        匹配顺序：
        1. 先查专题模板：genre=指定值 AND function_code=指定值
        2. 再查通用模板：genre IS NULL AND function_code=指定值
        3. 都没有则返回 None（由调用方使用硬编码兜底）
        
        Args:
            function_code: 功能代码，如 "creative_generate_options"
            genre: 专题类型，如 "玄幻"
            session: 可选的数据库会话
            
        Returns:
            模板字典或 None
        """
        if session is None:
            async with AsyncSessionLocal() as session:
                return await self._get_template_for_function_internal(session, function_code, genre)
        else:
            return await self._get_template_for_function_internal(session, function_code, genre)
    
    async def _get_template_for_function_internal(
        self,
        session: AsyncSession,
        function_code: str,
        genre: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        """内部方法：执行三层兜底匹配"""
        cleaned_genre = clean_genre(genre)
        
        # 第一层：查找专题模板
        if cleaned_genre:
            query = text("""
                SELECT id, code, name, description, phase, category, genre,
                       system_role, chain_of_thought, output_schema,
                       function_code, sort_order, usage_count
                FROM writing_prompt_templates
                WHERE function_code = :function_code 
                  AND genre = :genre 
                  AND is_active = true
                ORDER BY sort_order ASC, usage_count DESC
                LIMIT 1
            """)
            result = await session.execute(query, {"function_code": function_code, "genre": cleaned_genre})
            row = result.fetchone()
            if row:
                return self._row_to_template_dict(row)
        
        # 第二层：查找通用模板
        query = text("""
            SELECT id, code, name, description, phase, category, genre,
                   system_role, chain_of_thought, output_schema,
                   function_code, sort_order, usage_count
            FROM writing_prompt_templates
            WHERE function_code = :function_code 
              AND genre IS NULL 
              AND is_active = true
            ORDER BY sort_order ASC, usage_count DESC
            LIMIT 1
        """)
        result = await session.execute(query, {"function_code": function_code})
        row = result.fetchone()
        if row:
            return self._row_to_template_dict(row)
        
        # 第三层：返回 None，由调用方使用硬编码兜底
        return None
    
    def _row_to_template_dict(self, row) -> Dict[str, Any]:
        """将数据库行转换为模板字典"""
        return {
            "id": str(row.id),
            "code": row.code,
            "name": row.name,
            "description": row.description,
            "phase": row.phase,
            "category": row.category,
            "genre": row.genre,
            "system_role": row.system_role,
            "chain_of_thought": row.chain_of_thought if isinstance(row.chain_of_thought, list) else (json.loads(row.chain_of_thought) if row.chain_of_thought else []),
            "output_schema": row.output_schema if isinstance(row.output_schema, dict) else (json.loads(row.output_schema) if row.output_schema else None),
            "function_code": row.function_code,
        }
```

**Step 3: 添加 render_function_template 方法**

在 `TemplateService` 类中添加：

```python
    async def render_function_template(
        self,
        function_code: str,
        genre: Optional[str],
        variables: Dict[str, Any],
    ) -> Optional[str]:
        """
        获取功能模板并渲染为完整提示词
        
        Args:
            function_code: 功能代码
            genre: 专题类型
            variables: 变量字典
            
        Returns:
            渲染后的系统提示词，如果没有可用模板则返回 None
        """
        template = await self.get_template_for_function(function_code, genre)
        if not template:
            return None
        
        # 渲染系统角色
        system_role = template.get("system_role", "")
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value, ensure_ascii=False, indent=2)
            else:
                value_str = str(value) if value is not None else ""
            system_role = system_role.replace(placeholder, value_str)
        
        # 渲染思维链指令
        chain_of_thought = template.get("chain_of_thought", [])
        full_prompt = f"{system_role}\n\n"
        
        if chain_of_thought:
            full_prompt += "## 思维链指令\n\n"
            for level in chain_of_thought:
                if isinstance(level, dict):
                    full_prompt += f"### {level.get('title', '')}\n"
                    for i, item in enumerate(level.get("content", []), 1):
                        # 渲染变量
                        rendered_item = item
                        for key, value in variables.items():
                            placeholder = f"{{{{{key}}}}}"
                            if isinstance(value, (dict, list)):
                                value_str = json.dumps(value, ensure_ascii=False)
                            else:
                                value_str = str(value) if value is not None else ""
                            rendered_item = rendered_item.replace(placeholder, value_str)
                        full_prompt += f"{i}. {rendered_item}\n"
                    full_prompt += "\n"
        
        # 更新使用次数
        await self._increment_usage_count(template["id"])
        
        return full_prompt
```

**Step 4: 运行 Python 类型检查**

Run: `cd services/novel-backend && python -c "from app.services.template_service import template_service; print('OK')"`
Expected: 输出 "OK"

**Step 5: Commit**

```bash
git add services/novel-backend/app/services/template_service.py
git commit -m "$(cat <<'EOF'
feat(template-service): add function template matching with 3-tier fallback

- Add FUNCTION_VARIABLES constant for 8 workflow functions
- Implement get_template_for_function with genre -> general -> None fallback
- Add render_function_template for variable substitution
EOF
)"
```

---

### Task 2.2: 改造 workflow_service.py 的 generate_options 方法

**Files:**
- Modify: `services/novel-backend/app/services/workflow_service.py`

**Step 1: 添加默认提示词方法**

在 `WorkflowService` 类末尾（`_try_parse_json` 方法之后）添加：

```python
    def _get_default_generate_options_prompt(
        self,
        phase_name: str,
        phase_description: str,
        genre: str,
        num_options: int,
    ) -> str:
        """获取默认的方案生成提示词（硬编码兜底）"""
        return f"""你是一位资深网文创作顾问，正在帮助作者进行 {phase_name}。

当前任务：为用户生成 {num_options} 个不同风格/方向的方案供选择。

专题类型：{genre}

要求：
1. 每个方案必须有明显差异化（风格、基调、方向等不同）
2. 每个方案都应该完整可用，不是草稿或大纲
3. 每个方案包含：
   - id: 方案标识（opt_1, opt_2, opt_3）
   - summary: 一句话摘要（15-25 字，突出方案特色）
   - content: 详细内容
4. 内容要专业、有吸引力、符合网文读者口味
5. 输出格式为 JSON 数组

输出格式示例：
```json
[
  {{"id": "opt_1", "summary": "热血逆袭型：废材少年觉醒逆天血脉", "content": "详细内容..."}},
  {{"id": "opt_2", "summary": "稳健发展型：低调修炼厚积薄发", "content": "详细内容..."}},
  {{"id": "opt_3", "summary": "阴谋权术型：身陷阴谋步步为营", "content": "详细内容..."}}
]
```
"""
```

**Step 2: 修改 generate_options 方法使用动态模板**

找到 `generate_options` 方法（约第 531 行），将构建 `system_prompt` 的部分替换为：

```python
    async def generate_options(
        self,
        session_id: str,
        user_id: str,
        num_options: int = 3,
    ) -> Dict[str, Any]:
        """
        为当前阶段生成多个方案供用户选择
        
        Args:
            session_id: 会话ID
            user_id: 用户ID
            num_options: 生成方案数量，默认 3
            
        Returns:
            包含 options 和 phase 的字典
        """
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found or expired")
        
        current_phase = session["current_phase"]
        phase_data = session.get("phase_data", {})
        phase_info = self.PHASES.get(current_phase, {})
        
        # 构建上下文
        context = self._merge_context(phase_data, {})
        genre = phase_data.get("genre", "通用")
        
        # 构建 function_code
        function_code = f"{current_phase}_generate_options"
        
        # 构建变量
        variables = {
            "phase_name": phase_info.get("display_name", current_phase),
            "phase_description": phase_info.get("description", ""),
            "genre": genre or "通用",
            "num_options": num_options,
        }
        
        # 添加前序阶段输出
        phases = phase_data.get("phases", {})
        if "creative" in phases:
            variables["creative_output"] = phases["creative"].get("output", "")
        if "setting" in phases:
            variables["setting_output"] = phases["setting"].get("output", "")
        if "framework" in phases:
            variables["framework_output"] = phases["framework"].get("output", "")
        
        # 尝试从数据库获取模板
        system_prompt = await template_service.render_function_template(
            function_code=function_code,
            genre=genre,
            variables=variables,
        )
        
        # 兜底：数据库没有模板时使用硬编码
        if not system_prompt:
            system_prompt = self._get_default_generate_options_prompt(
                phase_name=variables["phase_name"],
                phase_description=variables["phase_description"],
                genre=variables["genre"],
                num_options=num_options,
            )
        
        # 构建用户提示词，包含已完成阶段的上下文
        user_prompt_parts = [f"## 当前阶段：{phase_info.get('display_name', current_phase)}\n"]
        user_prompt_parts.append(f"阶段描述：{phase_info.get('description', '')}\n\n")
        
        if context:
            user_prompt_parts.append("## 已有创作上下文\n")
            for key, value in context.items():
                if value and key not in ["genre"]:
                    if isinstance(value, (dict, list)):
                        import json as json_module
                        user_prompt_parts.append(f"### {key}\n```json\n{json_module.dumps(value, ensure_ascii=False, indent=2)}\n```\n")
                    else:
                        user_prompt_parts.append(f"### {key}\n{value}\n")
        
        user_prompt_parts.append(f"\n请生成 {num_options} 个不同方向的方案，直接输出 JSON 数组，不要添加其他内容。")
        user_prompt = "\n".join(user_prompt_parts)
        
        # 调用 LLM 生成
        result = await generation_service.generate_with_prompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.9,  # 高温度增加多样性
            max_tokens=8192,
        )
        
        content = result.get("content", "")
        options = self._parse_options(content, num_options)
        
        # 保存生成的选项到会话
        async with AsyncSessionLocal() as db_session:
            phase_data["current_options"] = options
            phase_data["options_generated_at"] = datetime.utcnow().isoformat()
            
            await db_session.execute(
                text("""
                    UPDATE workflow_sessions
                    SET phase_data = :phase_data, updated_at = NOW()
                    WHERE id = :session_id
                """),
                {"phase_data": json.dumps(phase_data), "session_id": session_id},
            )
            await db_session.commit()
        
        return {
            "options": options,
            "phase": current_phase,
        }
```

**Step 3: 运行 Python 语法检查**

Run: `cd services/novel-backend && python -c "from app.services.workflow_service import workflow_service; print('OK')"`
Expected: 输出 "OK"

**Step 4: Commit**

```bash
git add services/novel-backend/app/services/workflow_service.py
git commit -m "$(cat <<'EOF'
feat(workflow-service): use dynamic templates for generate_options

- Build function_code from current_phase + "_generate_options"
- Try database template first, fallback to hardcoded prompt
- Pass phase outputs as template variables
EOF
)"
```

---

### Task 2.3: 改造其他 4 个 AI 调用点

**Files:**
- Modify: `services/novel-backend/app/services/workflow_service.py`

**Step 1: 添加 _get_default_optimize_result_prompt 方法**

在 `_get_default_generate_options_prompt` 方法后添加：

```python
    def _get_default_optimize_result_prompt(
        self,
        phase_name: str,
        template_name: str,
    ) -> str:
        """获取默认的优化结果提示词（硬编码兜底）"""
        return f"""你是一位专业的小说创作顾问，擅长优化和改进创意内容。

当前阶段：{phase_name}
使用模板：{template_name}

任务：根据用户的反馈和需求，优化以下生成结果。

优化原则：
1. 保留原有内容的核心创意和优点
2. 改进表达的清晰度和专业性
3. 增强内容的创意性和吸引力
4. 确保输出格式与原内容保持一致
5. 如果原内容是 JSON 格式，优化后也要保持 JSON 格式

请直接输出优化后的完整内容，不要添加额外的解释或说明。"""

    def _get_default_generate_project_info_prompt(self, genre: str) -> str:
        """获取默认的项目信息生成提示词（硬编码兜底）"""
        return """你是一位专业的网文编辑，擅长为小说起标题和撰写简介。

任务：根据提供的创作内容，生成一个吸引人的小说标题和简短描述。

要求：
1. 标题：2-8个字，简洁有力，能体现作品核心卖点
2. 描述：50-150字，概括故事主线、主角特点和核心冲突，吸引读者点击

输出格式（严格JSON）：
{"title": "小说标题", "description": "小说描述..."}"""

    def _get_default_generate_style_guide_prompt(self) -> str:
        """获取默认的风格指导生成提示词（硬编码兜底）"""
        return """你是专业网文编辑，擅长提炼创作风格指南。

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

    def _get_default_convert_text_to_outlines_prompt(self) -> str:
        """获取默认的文本转大纲提示词（硬编码兜底）"""
        return """你是一位专业的小说编辑，擅长将故事框架转换为结构化的章节大纲。

任务：将用户提供的故事框架/大纲描述，转换为结构化的章节列表。

输出格式要求（严格 JSON 数组）：
```json
[
  {
    "title": "第一章：章节标题",
    "summary": "本章内容摘要，50-100字",
    "status": "pending"
  },
  {
    "title": "第二章：章节标题",
    "summary": "本章内容摘要，50-100字",
    "status": "pending"
  }
]
```

转换规则：
1. 根据文本中提到的章节规划（如"1-8章"、"第一卷"等）拆分章节
2. 如果没有明确章节划分，根据情节发展合理拆分为5-15章
3. 每章标题要有吸引力，体现该章核心内容
4. summary 要概括该章的主要情节和冲突
5. status 统一设为 "pending"
6. 直接输出 JSON 数组，不要添加其他内容"""
```

**Step 2: 修改 optimize_result 方法使用动态模板**

找到 `optimize_result` 方法（约第 436 行），修改构建 `system_prompt` 的部分：

```python
        # 构建变量
        variables = {
            "phase_name": self.PHASES.get(current_phase, {}).get('display_name', current_phase),
            "template_name": template_name,
            "current_result": current_result,
            "optimization_instruction": optimization_instruction or "请提升内容质量，使其更加专业、详细、有创意。",
        }
        
        # 尝试从数据库获取模板
        system_prompt = await template_service.render_function_template(
            function_code="optimize_result",
            genre=phase_data.get("genre"),
            variables=variables,
        )
        
        # 兜底：数据库没有模板时使用硬编码
        if not system_prompt:
            system_prompt = self._get_default_optimize_result_prompt(
                phase_name=variables["phase_name"],
                template_name=template_name,
            )
```

**Step 3: 修改 generate_project_info 方法使用动态模板**

找到 `generate_project_info` 方法（约第 842 行），修改构建 `system_prompt` 的部分：

```python
        # 构建变量
        variables = {
            "genre": genre or "通用",
            "creative_summary": phases.get("creative", {}).get("selected_summary", ""),
            "setting_summary": phases.get("setting", {}).get("selected_summary", ""),
            "framework_summary": phases.get("framework", {}).get("selected_summary", ""),
        }
        
        # 尝试从数据库获取模板
        system_prompt = await template_service.render_function_template(
            function_code="generate_project_info",
            genre=genre,
            variables=variables,
        )
        
        # 兜底：数据库没有模板时使用硬编码
        if not system_prompt:
            system_prompt = self._get_default_generate_project_info_prompt(genre or "通用")
```

**Step 4: 修改 _generate_style_guide 方法使用动态模板**

找到 `_generate_style_guide` 方法（约第 1267 行），修改构建 `system_prompt` 的部分：

```python
        # 构建变量
        variables = {
            "genre": genre or "通用",
            "creative_output": phases.get("creative", {}).get("output", "")[:2000],
            "setting_output": phases.get("setting", {}).get("output", "")[:2000],
            "framework_output": phases.get("framework", {}).get("output", "")[:2000],
            "writing_output": phases.get("writing", {}).get("output", "")[:2000],
        }
        
        # 尝试从数据库获取模板
        system_prompt = await template_service.render_function_template(
            function_code="generate_style_guide",
            genre=genre,
            variables=variables,
        )
        
        # 兜底：数据库没有模板时使用硬编码
        if not system_prompt:
            system_prompt = self._get_default_generate_style_guide_prompt()
```

**Step 5: 修改 _convert_text_to_outlines 方法使用动态模板**

找到 `_convert_text_to_outlines` 方法（约第 1187 行），修改构建 `system_prompt` 的部分：

```python
        # 构建变量
        variables = {
            "genre": genre or "通用",
            "framework_text": framework_text,
        }
        
        # 尝试从数据库获取模板
        system_prompt = await template_service.render_function_template(
            function_code="convert_text_to_outlines",
            genre=genre,
            variables=variables,
        )
        
        # 兜底：数据库没有模板时使用硬编码
        if not system_prompt:
            system_prompt = self._get_default_convert_text_to_outlines_prompt()
```

**Step 6: 运行 Python 语法检查**

Run: `cd services/novel-backend && python -c "from app.services.workflow_service import workflow_service; print('OK')"`
Expected: 输出 "OK"

**Step 7: Commit**

```bash
git add services/novel-backend/app/services/workflow_service.py
git commit -m "$(cat <<'EOF'
feat(workflow-service): apply dynamic templates to all 5 AI call points

- optimize_result: use optimize_result function_code
- generate_project_info: use generate_project_info function_code
- _generate_style_guide: use generate_style_guide function_code
- _convert_text_to_outlines: use convert_text_to_outlines function_code
- All methods fallback to hardcoded prompts when no template found
EOF
)"
```

---

## Phase 3: API 层 - Admin API 接口

### Task 3.1: 创建专题管理 API

**Files:**
- Create: `src/app/api/admin/genres/route.ts`
- Create: `src/app/api/admin/genres/[id]/route.ts`

**Step 1: 创建专题列表和创建 API**

创建 `src/app/api/admin/genres/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createGenreSchema = z.object({
  code: z
    .string()
    .min(2, "专题代码至少需要2个字符")
    .max(50, "专题代码最多50个字符")
    .regex(/^[a-z0-9_-]+$/, "专题代码只能包含小写字母、数字、下划线和连字符"),
  display_name: z
    .string()
    .min(1, "显示名称不能为空")
    .max(100, "显示名称最多100个字符"),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

// 验证管理员权限
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authorized: false, error: "未登录" };
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return { authorized: false, error: "无效的 token" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { authorized: false, error: "权限不足，需要管理员权限" };
  }

  return { authorized: true };
}

// GET /api/admin/genres - 获取专题列表
export async function GET() {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const genres = await prisma.genre.findMany({
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    });

    return NextResponse.json({ data: genres, total: genres.length });
  } catch (error) {
    console.error("[GET /api/admin/genres]", error);
    return NextResponse.json({ error: "获取专题列表失败" }, { status: 500 });
  }
}

// POST /api/admin/genres - 创建新专题
export async function POST(req: NextRequest) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createGenreSchema.parse(body);

    // 检查 code 是否已存在
    const existing = await prisma.genre.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "专题代码已存在，请使用其他代码" },
        { status: 400 }
      );
    }

    const genre = await prisma.genre.create({
      data: {
        code: validated.code,
        display_name: validated.display_name,
        description: validated.description,
        parent_id: validated.parent_id,
        is_active: validated.is_active,
        sort_order: validated.sort_order,
      },
    });

    return NextResponse.json(genre, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[POST /api/admin/genres]", error);
    return NextResponse.json({ error: "创建专题失败" }, { status: 500 });
  }
}
```

**Step 2: 创建专题详情、更新、删除 API**

创建 `src/app/api/admin/genres/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateGenreSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/).optional(),
  display_name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// 验证管理员权限
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authorized: false, error: "未登录" };
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return { authorized: false, error: "无效的 token" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { authorized: false, error: "权限不足，需要管理员权限" };
  }

  return { authorized: true };
}

// GET /api/admin/genres/:id - 获取专题详情
export async function GET(req: NextRequest, context: RouteContext) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const genre = await prisma.genre.findUnique({
      where: { id },
    });

    if (!genre) {
      return NextResponse.json({ error: "专题不存在" }, { status: 404 });
    }

    return NextResponse.json(genre);
  } catch (error) {
    console.error("[GET /api/admin/genres/:id]", error);
    return NextResponse.json({ error: "获取专题详情失败" }, { status: 500 });
  }
}

// PATCH /api/admin/genres/:id - 更新专题
export async function PATCH(req: NextRequest, context: RouteContext) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const validated = updateGenreSchema.parse(body);

    // 检查专题是否存在
    const existing = await prisma.genre.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "专题不存在" }, { status: 404 });
    }

    // 如果更新 code，检查是否与其他记录冲突
    if (validated.code && validated.code !== existing.code) {
      const conflict = await prisma.genre.findUnique({
        where: { code: validated.code },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "专题代码已被使用" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.genre.update({
      where: { id },
      data: {
        ...validated,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/admin/genres/:id]", error);
    return NextResponse.json({ error: "更新专题失败" }, { status: 500 });
  }
}

// DELETE /api/admin/genres/:id - 删除专题
export async function DELETE(req: NextRequest, context: RouteContext) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    // 检查专题是否存在
    const existing = await prisma.genre.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "专题不存在" }, { status: 404 });
    }

    await prisma.genre.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("[DELETE /api/admin/genres/:id]", error);
    return NextResponse.json({ error: "删除专题失败" }, { status: 500 });
  }
}
```

**Step 3: 运行 TypeScript 类型检查**

Run: `npm run type-check`
Expected: 无类型错误

**Step 4: Commit**

```bash
git add src/app/api/admin/genres/
git commit -m "$(cat <<'EOF'
feat(api): add admin genres CRUD endpoints

- GET /api/admin/genres - list all genres
- POST /api/admin/genres - create new genre
- GET /api/admin/genres/:id - get genre details
- PATCH /api/admin/genres/:id - update genre
- DELETE /api/admin/genres/:id - delete genre
EOF
)"
```

---

### Task 3.2: 创建提示词模板管理 API

**Files:**
- Create: `src/app/api/admin/prompt-templates/route.ts`
- Create: `src/app/api/admin/prompt-templates/[id]/route.ts`
- Create: `src/app/api/admin/prompt-templates/[id]/duplicate/route.ts`
- Create: `src/app/api/admin/prompt-templates/preview/route.ts`

**Step 1: 创建模板列表和创建 API**

创建 `src/app/api/admin/prompt-templates/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createTemplateSchema = z.object({
  code: z
    .string()
    .min(2, "模板代码至少需要2个字符")
    .max(100, "模板代码最多100个字符"),
  name: z
    .string()
    .min(1, "模板名称不能为空")
    .max(200, "模板名称最多200个字符"),
  description: z.string().optional().nullable(),
  phase: z.string().min(1, "阶段不能为空").max(50),
  category: z.string().min(1, "分类不能为空").max(50),
  genre: z.string().max(50).optional().nullable(),
  function_code: z.string().max(50).optional().nullable(),
  system_role: z.string().min(1, "系统角色不能为空"),
  chain_of_thought: z.array(z.object({
    level: z.string(),
    title: z.string(),
    content: z.array(z.string()),
  })).default([]),
  output_schema: z.record(z.unknown()).optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

// 验证管理员权限
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authorized: false, error: "未登录" };
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return { authorized: false, error: "无效的 token" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { authorized: false, error: "权限不足，需要管理员权限" };
  }

  return { authorized: true };
}

// GET /api/admin/prompt-templates - 获取模板列表
export async function GET(req: NextRequest) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const phase = searchParams.get("phase");
    const genre = searchParams.get("genre");
    const function_code = searchParams.get("function_code");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 构建查询条件
    const where: Prisma.WritingPromptTemplateWhereInput = {};

    if (phase) {
      where.phase = phase;
    }

    if (genre === "null") {
      where.genre = null;
    } else if (genre) {
      where.genre = genre;
    }

    if (function_code) {
      where.function_code = function_code;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.writingPromptTemplate.findMany({
        where,
        orderBy: [{ sort_order: "asc" }, { usage_count: "desc" }],
        take: limit,
        skip: offset,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          phase: true,
          category: true,
          genre: true,
          function_code: true,
          sort_order: true,
          is_active: true,
          usage_count: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.writingPromptTemplate.count({ where }),
    ]);

    return NextResponse.json({ data: templates, total, limit, offset });
  } catch (error) {
    console.error("[GET /api/admin/prompt-templates]", error);
    return NextResponse.json({ error: "获取模板列表失败" }, { status: 500 });
  }
}

// POST /api/admin/prompt-templates - 创建新模板
export async function POST(req: NextRequest) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = createTemplateSchema.parse(body);

    // 检查 code 是否已存在
    const existing = await prisma.writingPromptTemplate.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "模板代码已存在，请使用其他代码" },
        { status: 400 }
      );
    }

    const template = await prisma.writingPromptTemplate.create({
      data: {
        code: validated.code,
        name: validated.name,
        description: validated.description,
        phase: validated.phase,
        category: validated.category,
        genre: validated.genre,
        function_code: validated.function_code,
        system_role: validated.system_role,
        chain_of_thought: validated.chain_of_thought as Prisma.InputJsonValue,
        output_schema: validated.output_schema as Prisma.InputJsonValue,
        sort_order: validated.sort_order,
        is_active: validated.is_active,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[POST /api/admin/prompt-templates]", error);
    return NextResponse.json({ error: "创建模板失败" }, { status: 500 });
  }
}
```

**Step 2: 创建模板详情、更新、删除 API**

创建 `src/app/api/admin/prompt-templates/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateTemplateSchema = z.object({
  code: z.string().min(2).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  phase: z.string().min(1).max(50).optional(),
  category: z.string().min(1).max(50).optional(),
  genre: z.string().max(50).optional().nullable(),
  function_code: z.string().max(50).optional().nullable(),
  system_role: z.string().optional(),
  chain_of_thought: z.array(z.object({
    level: z.string(),
    title: z.string(),
    content: z.array(z.string()),
  })).optional(),
  output_schema: z.record(z.unknown()).optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

// 验证管理员权限
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authorized: false, error: "未登录" };
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return { authorized: false, error: "无效的 token" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { authorized: false, error: "权限不足，需要管理员权限" };
  }

  return { authorized: true };
}

// GET /api/admin/prompt-templates/:id - 获取模板详情
export async function GET(req: NextRequest, context: RouteContext) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const template = await prisma.writingPromptTemplate.findUnique({
      where: { id },
      include: {
        slots: {
          orderBy: [{ slot_type: "asc" }, { required: "desc" }],
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("[GET /api/admin/prompt-templates/:id]", error);
    return NextResponse.json({ error: "获取模板详情失败" }, { status: 500 });
  }
}

// PATCH /api/admin/prompt-templates/:id - 更新模板
export async function PATCH(req: NextRequest, context: RouteContext) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const validated = updateTemplateSchema.parse(body);

    // 检查模板是否存在
    const existing = await prisma.writingPromptTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }

    // 如果更新 code，检查是否与其他记录冲突
    if (validated.code && validated.code !== existing.code) {
      const conflict = await prisma.writingPromptTemplate.findUnique({
        where: { code: validated.code },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "模板代码已被使用" },
          { status: 400 }
        );
      }
    }

    // 构建更新数据
    const updateData: Prisma.WritingPromptTemplateUpdateInput = {
      ...validated,
      updated_at: new Date(),
    };

    // 处理 JSON 字段
    if (validated.chain_of_thought !== undefined) {
      updateData.chain_of_thought = validated.chain_of_thought as Prisma.InputJsonValue;
    }
    if (validated.output_schema !== undefined) {
      updateData.output_schema = validated.output_schema as Prisma.InputJsonValue;
    }

    const updated = await prisma.writingPromptTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/admin/prompt-templates/:id]", error);
    return NextResponse.json({ error: "更新模板失败" }, { status: 500 });
  }
}

// DELETE /api/admin/prompt-templates/:id - 删除模板
export async function DELETE(req: NextRequest, context: RouteContext) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    // 检查模板是否存在
    const existing = await prisma.writingPromptTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }

    // 删除关联的 slots
    await prisma.templateSlot.deleteMany({
      where: { template_id: id },
    });

    // 删除模板
    await prisma.writingPromptTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("[DELETE /api/admin/prompt-templates/:id]", error);
    return NextResponse.json({ error: "删除模板失败" }, { status: 500 });
  }
}
```

**Step 3: 创建模板复制 API**

创建 `src/app/api/admin/prompt-templates/[id]/duplicate/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// 验证管理员权限
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authorized: false, error: "未登录" };
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return { authorized: false, error: "无效的 token" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { authorized: false, error: "权限不足，需要管理员权限" };
  }

  return { authorized: true };
}

// POST /api/admin/prompt-templates/:id/duplicate - 复制模板
export async function POST(req: NextRequest, context: RouteContext) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    // 获取原模板
    const original = await prisma.writingPromptTemplate.findUnique({
      where: { id },
      include: {
        slots: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }

    // 生成新的 code
    const timestamp = Date.now();
    const newCode = `${original.code}_copy_${timestamp}`;

    // 创建副本
    const duplicate = await prisma.writingPromptTemplate.create({
      data: {
        code: newCode,
        name: `${original.name} (副本)`,
        description: original.description,
        phase: original.phase,
        category: original.category,
        genre: original.genre,
        function_code: original.function_code,
        system_role: original.system_role,
        chain_of_thought: original.chain_of_thought as Prisma.InputJsonValue,
        output_schema: original.output_schema as Prisma.InputJsonValue,
        sort_order: original.sort_order + 1,
        is_active: false, // 副本默认禁用
        usage_count: 0,
      },
    });

    // 复制 slots
    if (original.slots.length > 0) {
      await prisma.templateSlot.createMany({
        data: original.slots.map((slot) => ({
          template_id: duplicate.id,
          name: slot.name,
          display_name: slot.display_name,
          description: slot.description,
          slot_type: slot.slot_type,
          data_type: slot.data_type,
          required: slot.required,
          default_value: slot.default_value,
          options: slot.options as Prisma.InputJsonValue,
        })),
      });
    }

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/prompt-templates/:id/duplicate]", error);
    return NextResponse.json({ error: "复制模板失败" }, { status: 500 });
  }
}
```

**Step 4: 创建模板预览 API**

创建 `src/app/api/admin/prompt-templates/preview/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const previewSchema = z.object({
  template_id: z.string().uuid().optional(),
  system_role: z.string().optional(),
  chain_of_thought: z.array(z.object({
    level: z.string(),
    title: z.string(),
    content: z.array(z.string()),
  })).optional(),
  variables: z.record(z.unknown()).default({}),
});

// 验证管理员权限
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { authorized: false, error: "未登录" };
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return { authorized: false, error: "无效的 token" };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { authorized: false, error: "权限不足，需要管理员权限" };
  }

  return { authorized: true };
}

// POST /api/admin/prompt-templates/preview - 预览渲染结果
export async function POST(req: NextRequest) {
  const authCheck = await checkAdmin();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = previewSchema.parse(body);

    let systemRole = validated.system_role || "";
    let chainOfThought = validated.chain_of_thought || [];

    // 如果提供了 template_id，从数据库获取模板
    if (validated.template_id) {
      const template = await prisma.writingPromptTemplate.findUnique({
        where: { id: validated.template_id },
      });

      if (!template) {
        return NextResponse.json({ error: "模板不存在" }, { status: 404 });
      }

      systemRole = template.system_role;
      chainOfThought = (template.chain_of_thought as Array<{
        level: string;
        title: string;
        content: string[];
      }>) || [];
    }

    // 渲染变量
    const variables = validated.variables as Record<string, unknown>;

    // 渲染系统角色
    let renderedSystemRole = systemRole;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const valueStr = typeof value === "object" 
        ? JSON.stringify(value, null, 2) 
        : String(value ?? "");
      renderedSystemRole = renderedSystemRole.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), valueStr);
    }

    // 渲染思维链
    const renderedChain = chainOfThought.map((level) => ({
      ...level,
      content: level.content.map((item) => {
        let rendered = item;
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = `{{${key}}}`;
          const valueStr = typeof value === "object" 
            ? JSON.stringify(value) 
            : String(value ?? "");
          rendered = rendered.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), valueStr);
        }
        return rendered;
      }),
    }));

    // 构建完整提示词
    let fullPrompt = `${renderedSystemRole}\n\n`;
    if (renderedChain.length > 0) {
      fullPrompt += "## 思维链指令\n\n";
      for (const level of renderedChain) {
        fullPrompt += `### ${level.title}\n`;
        level.content.forEach((item, i) => {
          fullPrompt += `${i + 1}. ${item}\n`;
        });
        fullPrompt += "\n";
      }
    }

    return NextResponse.json({
      rendered_system_role: renderedSystemRole,
      rendered_chain_of_thought: renderedChain,
      full_prompt: fullPrompt,
      variables_used: Object.keys(variables),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[POST /api/admin/prompt-templates/preview]", error);
    return NextResponse.json({ error: "预览失败" }, { status: 500 });
  }
}
```

**Step 5: 运行 TypeScript 类型检查**

Run: `npm run type-check`
Expected: 无类型错误

**Step 6: Commit**

```bash
git add src/app/api/admin/prompt-templates/
git commit -m "$(cat <<'EOF'
feat(api): add admin prompt-templates CRUD endpoints

- GET /api/admin/prompt-templates - list templates with filters
- POST /api/admin/prompt-templates - create new template
- GET /api/admin/prompt-templates/:id - get template details
- PATCH /api/admin/prompt-templates/:id - update template
- DELETE /api/admin/prompt-templates/:id - delete template
- POST /api/admin/prompt-templates/:id/duplicate - duplicate template
- POST /api/admin/prompt-templates/preview - preview rendered prompt
EOF
)"
```

---

## Phase 4: 前端 - Admin 管理界面

### Task 4.1: 创建专题管理页面

**Files:**
- Create: `src/app/admin/genres/page.tsx`
- Create: `src/app/admin/genres/types.ts`
- Create: `src/app/admin/genres/hooks/useGenres.ts`

**Step 1: 创建类型定义**

创建 `src/app/admin/genres/types.ts`：

```typescript
export interface Genre {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GenreFormData {
  code: string;
  display_name: string;
  description?: string;
  parent_id?: string | null;
  is_active: boolean;
  sort_order: number;
}
```

**Step 2: 创建数据获取 Hook**

创建 `src/app/admin/genres/hooks/useGenres.ts`：

```typescript
import { useState, useCallback } from "react";
import type { Genre, GenreFormData } from "../types";

export function useGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchGenres = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/genres");
      if (!res.ok) throw new Error("获取专题列表失败");
      const data = await res.json();
      setGenres(data.data || []);
    } catch (error) {
      console.error("fetchGenres error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveGenre = useCallback(
    async (form: GenreFormData, editingId: string | null) => {
      setSaving(true);
      try {
        const url = editingId
          ? `/api/admin/genres/${editingId}`
          : "/api/admin/genres";
        const method = editingId ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "保存失败");
        }

        await fetchGenres();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "保存失败",
        };
      } finally {
        setSaving(false);
      }
    },
    [fetchGenres]
  );

  const deleteGenre = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/admin/genres/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "删除失败");
        }

        await fetchGenres();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "删除失败",
        };
      }
    },
    [fetchGenres]
  );

  return {
    genres,
    loading,
    saving,
    fetchGenres,
    saveGenre,
    deleteGenre,
  };
}
```

**Step 3: 创建专题管理页面**

创建 `src/app/admin/genres/page.tsx`：

```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { useGenres } from "./hooks/useGenres";
import type { Genre, GenreFormData } from "./types";

export default function AdminGenresPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const { genres, loading, saving, fetchGenres, saveGenre, deleteGenre } =
    useGenres();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGenre, setDeletingGenre] = useState<Genre | null>(null);

  const [form, setForm] = useState<GenreFormData>({
    code: "",
    display_name: "",
    description: "",
    is_active: true,
    sort_order: 0,
  });

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchGenres();
    }
  }, [isAdmin, fetchGenres]);

  const handleEdit = (genre: Genre) => {
    setEditingGenre(genre);
    setForm({
      code: genre.code,
      display_name: genre.display_name,
      description: genre.description || "",
      is_active: genre.is_active,
      sort_order: genre.sort_order,
    });
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingGenre(null);
    setForm({
      code: "",
      display_name: "",
      description: "",
      is_active: true,
      sort_order: genres.length,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const result = await saveGenre(form, editingGenre?.id || null);
    if (result.success) {
      toast({ title: editingGenre ? "更新成功" : "创建成功" });
      setDialogOpen(false);
    } else {
      toast({ title: "操作失败", description: result.error, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingGenre) return;
    const result = await deleteGenre(deletingGenre.id);
    if (result.success) {
      toast({ title: "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingGenre(null);
    } else {
      toast({ title: "删除失败", description: result.error, variant: "destructive" });
    }
  };

  if (userLoading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-500">权限不足</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags className="h-6 w-6" />
          <h1 className="text-2xl font-bold">专题管理</h1>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          新增专题
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>代码</TableHead>
              <TableHead>显示名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : genres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  暂无专题数据
                </TableCell>
              </TableRow>
            ) : (
              genres.map((genre) => (
                <TableRow key={genre.id}>
                  <TableCell className="font-mono">{genre.code}</TableCell>
                  <TableCell className="font-medium">{genre.display_name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {genre.description || "-"}
                  </TableCell>
                  <TableCell>{genre.sort_order}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        genre.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {genre.is_active ? "启用" : "禁用"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(genre)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingGenre(genre);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 编辑/新增对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGenre ? "编辑专题" : "新增专题"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">专题代码</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="如: xuanhuan, dushi"
                disabled={!!editingGenre}
              />
              <p className="text-xs text-muted-foreground">
                只能包含小写字母、数字、下划线和连字符
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">显示名称</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) =>
                  setForm({ ...form, display_name: e.target.value })
                }
                placeholder="如: 玄幻, 都市"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="专题描述..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">排序</Label>
              <Input
                id="sort_order"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_active: checked })
                }
              />
              <Label htmlFor="is_active">启用</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>
            确定要删除专题 "{deletingGenre?.display_name}" 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
```

**Step 4: 运行 TypeScript 类型检查**

Run: `npm run type-check`
Expected: 无类型错误

**Step 5: Commit**

```bash
git add src/app/admin/genres/
git commit -m "$(cat <<'EOF'
feat(admin): add genres management page

- Create genres list with table view
- Add/edit/delete genre dialogs
- Support code, display_name, description, sort_order, is_active fields
EOF
)"
```

---

### Task 4.2: 创建提示词模板管理页面

**Files:**
- Create: `src/app/admin/prompt-templates/page.tsx`
- Create: `src/app/admin/prompt-templates/types.ts`
- Create: `src/app/admin/prompt-templates/hooks/usePromptTemplates.ts`
- Create: `src/app/admin/prompt-templates/[id]/page.tsx`

**Step 1: 创建类型定义**

创建 `src/app/admin/prompt-templates/types.ts`：

```typescript
export interface PromptTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  phase: string;
  category: string;
  genre: string | null;
  function_code: string | null;
  system_role: string;
  chain_of_thought: ChainOfThoughtLevel[];
  output_schema: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  slots?: TemplateSlot[];
}

export interface ChainOfThoughtLevel {
  level: string;
  title: string;
  content: string[];
}

export interface TemplateSlot {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  slot_type: "input" | "output";
  data_type: string;
  required: boolean;
  default_value: string | null;
  options: Record<string, unknown> | null;
}

export interface PromptTemplateFormData {
  code: string;
  name: string;
  description?: string;
  phase: string;
  category: string;
  genre?: string | null;
  function_code?: string | null;
  system_role: string;
  chain_of_thought: ChainOfThoughtLevel[];
  output_schema?: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
}

// 8 个 function_code 选项
export const FUNCTION_CODES = [
  { value: "creative_generate_options", label: "创意阶段方案生成" },
  { value: "setting_generate_options", label: "设定阶段方案生成" },
  { value: "framework_generate_options", label: "框架阶段方案生成" },
  { value: "writing_generate_options", label: "创作阶段方案生成" },
  { value: "optimize_result", label: "优化结果" },
  { value: "generate_project_info", label: "生成项目标题描述" },
  { value: "generate_style_guide", label: "生成风格指导" },
  { value: "convert_text_to_outlines", label: "文本转大纲" },
];

// 阶段选项
export const PHASE_OPTIONS = [
  { value: "creative", label: "创意阶段" },
  { value: "setting", label: "设定阶段" },
  { value: "framework", label: "框架阶段" },
  { value: "writing", label: "创作阶段" },
  { value: "advanced", label: "进阶技巧" },
  { value: "analysis", label: "数据分析" },
  { value: "commercial", label: "商业化" },
  { value: "auxiliary", label: "辅助工具" },
];
```

**Step 2: 创建数据获取 Hook**

创建 `src/app/admin/prompt-templates/hooks/usePromptTemplates.ts`：

```typescript
import { useState, useCallback } from "react";
import type { PromptTemplate, PromptTemplateFormData } from "../types";

interface FetchParams {
  phase?: string;
  genre?: string | null;
  function_code?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function usePromptTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async (params: FetchParams = {}) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params.phase) searchParams.set("phase", params.phase);
      if (params.genre !== undefined) {
        searchParams.set("genre", params.genre === null ? "null" : params.genre);
      }
      if (params.function_code) searchParams.set("function_code", params.function_code);
      if (params.search) searchParams.set("search", params.search);
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.offset) searchParams.set("offset", String(params.offset));

      const res = await fetch(`/api/admin/prompt-templates?${searchParams}`);
      if (!res.ok) throw new Error("获取模板列表失败");
      const data = await res.json();
      setTemplates(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("fetchTemplates error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getTemplate = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/prompt-templates/${id}`);
      if (!res.ok) throw new Error("获取模板详情失败");
      return await res.json();
    } catch (error) {
      console.error("getTemplate error:", error);
      return null;
    }
  }, []);

  const saveTemplate = useCallback(
    async (form: PromptTemplateFormData, editingId: string | null) => {
      setSaving(true);
      try {
        const url = editingId
          ? `/api/admin/prompt-templates/${editingId}`
          : "/api/admin/prompt-templates";
        const method = editingId ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "保存失败");
        }

        return { success: true, data: await res.json() };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "保存失败",
        };
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/prompt-templates/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "删除失败",
      };
    }
  }, []);

  const duplicateTemplate = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/prompt-templates/${id}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "复制失败");
      }

      return { success: true, data: await res.json() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "复制失败",
      };
    }
  }, []);

  const previewTemplate = useCallback(
    async (params: {
      template_id?: string;
      system_role?: string;
      chain_of_thought?: Array<{ level: string; title: string; content: string[] }>;
      variables: Record<string, unknown>;
    }) => {
      try {
        const res = await fetch("/api/admin/prompt-templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "预览失败");
        }

        return { success: true, data: await res.json() };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "预览失败",
        };
      }
    },
    []
  );

  return {
    templates,
    total,
    loading,
    saving,
    fetchTemplates,
    getTemplate,
    saveTemplate,
    deleteTemplate,
    duplicateTemplate,
    previewTemplate,
  };
}
```

**Step 3: 创建模板列表页面**

创建 `src/app/admin/prompt-templates/page.tsx`：

```typescript
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  FileText,
} from "lucide-react";
import { usePromptTemplates } from "./hooks/usePromptTemplates";
import { useGenres } from "../genres/hooks/useGenres";
import { PHASE_OPTIONS, FUNCTION_CODES } from "./types";
import type { PromptTemplate } from "./types";

export default function AdminPromptTemplatesPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const {
    templates,
    total,
    loading,
    fetchTemplates,
    deleteTemplate,
    duplicateTemplate,
  } = usePromptTemplates();
  const { genres, fetchGenres } = useGenres();

  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [functionFilter, setFunctionFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<PromptTemplate | null>(null);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
      fetchGenres();
    }
  }, [isAdmin, fetchTemplates, fetchGenres]);

  const handleSearch = () => {
    fetchTemplates({
      phase: phaseFilter !== "all" ? phaseFilter : undefined,
      genre: genreFilter === "null" ? null : genreFilter !== "all" ? genreFilter : undefined,
      function_code: functionFilter !== "all" ? functionFilter : undefined,
      search: searchQuery || undefined,
    });
  };

  const handleEdit = (template: PromptTemplate) => {
    router.push(`/admin/prompt-templates/${template.id}`);
  };

  const handleAddNew = () => {
    router.push("/admin/prompt-templates/new");
  };

  const handleDuplicate = async (template: PromptTemplate) => {
    const result = await duplicateTemplate(template.id);
    if (result.success) {
      toast({ title: "复制成功" });
      fetchTemplates();
    } else {
      toast({ title: "复制失败", description: result.error, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    const result = await deleteTemplate(deletingTemplate.id);
    if (result.success) {
      toast({ title: "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } else {
      toast({ title: "删除失败", description: result.error, variant: "destructive" });
    }
  };

  const getPhaseLabel = (phase: string) => {
    return PHASE_OPTIONS.find((p) => p.value === phase)?.label || phase;
  };

  const getFunctionLabel = (code: string | null) => {
    if (!code) return "-";
    return FUNCTION_CODES.find((f) => f.value === code)?.label || code;
  };

  if (userLoading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-500">权限不足</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">提示词模板管理</h1>
          <span className="text-muted-foreground">({total} 个模板)</span>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          新增模板
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板名称或代码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="阶段" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部阶段</SelectItem>
            {PHASE_OPTIONS.map((phase) => (
              <SelectItem key={phase.value} value={phase.value}>
                {phase.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={genreFilter} onValueChange={setGenreFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="专题" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部专题</SelectItem>
            <SelectItem value="null">通用模板</SelectItem>
            {genres.filter((g) => g.is_active).map((genre) => (
              <SelectItem key={genre.code} value={genre.code}>
                {genre.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={functionFilter} onValueChange={setFunctionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="功能" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部功能</SelectItem>
            {FUNCTION_CODES.map((func) => (
              <SelectItem key={func.value} value={func.value}>
                {func.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>搜索</Button>
      </div>

      {/* 模板列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>阶段</TableHead>
              <TableHead>专题</TableHead>
              <TableHead>功能代码</TableHead>
              <TableHead>使用次数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  暂无模板数据
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {template.code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getPhaseLabel(template.phase)}</TableCell>
                  <TableCell>
                    {template.genre ? (
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                        {template.genre}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">通用</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getFunctionLabel(template.function_code)}
                  </TableCell>
                  <TableCell>{template.usage_count}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        template.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {template.is_active ? "启用" : "禁用"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(template)}
                      title="复制"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingTemplate(template);
                        setDeleteDialogOpen(true);
                      }}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>
            确定要删除模板 "{deletingTemplate?.name}" 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
```

**Step 4: 创建模板编辑页面**

创建 `src/app/admin/prompt-templates/[id]/page.tsx`：

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { usePromptTemplates } from "../hooks/usePromptTemplates";
import { useGenres } from "../../genres/hooks/useGenres";
import {
  PHASE_OPTIONS,
  FUNCTION_CODES,
  type PromptTemplateFormData,
  type ChainOfThoughtLevel,
} from "../types";

export default function PromptTemplateEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const { getTemplate, saveTemplate, previewTemplate, saving } =
    usePromptTemplates();
  const { genres, fetchGenres } = useGenres();

  const [loading, setLoading] = useState(!isNew);
  const [previewResult, setPreviewResult] = useState<string>("");
  const [previewVariables, setPreviewVariables] = useState<string>("{}");

  const [form, setForm] = useState<PromptTemplateFormData>({
    code: "",
    name: "",
    description: "",
    phase: "creative",
    category: "general",
    genre: null,
    function_code: null,
    system_role: "",
    chain_of_thought: [],
    output_schema: null,
    sort_order: 0,
    is_active: true,
  });

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchGenres();
      if (!isNew) {
        loadTemplate();
      }
    }
  }, [isAdmin, isNew]);

  const loadTemplate = async () => {
    setLoading(true);
    const template = await getTemplate(id);
    if (template) {
      setForm({
        code: template.code,
        name: template.name,
        description: template.description || "",
        phase: template.phase,
        category: template.category,
        genre: template.genre,
        function_code: template.function_code,
        system_role: template.system_role,
        chain_of_thought: template.chain_of_thought || [],
        output_schema: template.output_schema,
        sort_order: template.sort_order,
        is_active: template.is_active,
      });
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    const result = await saveTemplate(form, isNew ? null : id);
    if (result.success) {
      toast({ title: isNew ? "创建成功" : "更新成功" });
      if (isNew && result.data?.id) {
        router.push(`/admin/prompt-templates/${result.data.id}`);
      }
    } else {
      toast({
        title: "保存失败",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handlePreview = async () => {
    try {
      const variables = JSON.parse(previewVariables);
      const result = await previewTemplate({
        system_role: form.system_role,
        chain_of_thought: form.chain_of_thought,
        variables,
      });
      if (result.success) {
        setPreviewResult(result.data.full_prompt);
      } else {
        toast({
          title: "预览失败",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "变量格式错误",
        description: "请输入有效的 JSON 格式",
        variant: "destructive",
      });
    }
  };

  const updateChainOfThought = (
    index: number,
    field: keyof ChainOfThoughtLevel,
    value: string | string[]
  ) => {
    const newChain = [...form.chain_of_thought];
    newChain[index] = { ...newChain[index], [field]: value };
    setForm({ ...form, chain_of_thought: newChain });
  };

  const addChainLevel = () => {
    setForm({
      ...form,
      chain_of_thought: [
        ...form.chain_of_thought,
        { level: `L${form.chain_of_thought.length + 1}`, title: "", content: [] },
      ],
    });
  };

  const removeChainLevel = (index: number) => {
    const newChain = form.chain_of_thought.filter((_, i) => i !== index);
    setForm({ ...form, chain_of_thought: newChain });
  };

  if (userLoading || loading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-500">权限不足</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isNew ? "新增模板" : "编辑模板"}
        </h1>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="prompt">提示词内容</TabsTrigger>
          <TabsTrigger value="preview">预览</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>设置模板的基本属性和分类</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">模板代码</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="如: creative_xuanhuan_001"
                    disabled={!isNew}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">模板名称</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="如: 玄幻创意生成模板"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="模板描述..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>阶段</Label>
                  <Select
                    value={form.phase}
                    onValueChange={(v) => setForm({ ...form, phase: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHASE_OPTIONS.map((phase) => (
                        <SelectItem key={phase.value} value={phase.value}>
                          {phase.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>专题</Label>
                  <Select
                    value={form.genre || "null"}
                    onValueChange={(v) =>
                      setForm({ ...form, genre: v === "null" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">通用（无专题）</SelectItem>
                      {genres
                        .filter((g) => g.is_active)
                        .map((genre) => (
                          <SelectItem key={genre.code} value={genre.code}>
                            {genre.display_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>功能代码</Label>
                  <Select
                    value={form.function_code || "null"}
                    onValueChange={(v) =>
                      setForm({ ...form, function_code: v === "null" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">无（手动调用）</SelectItem>
                      {FUNCTION_CODES.map((func) => (
                        <SelectItem key={func.value} value={func.value}>
                          {func.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">排序</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">启用</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle>提示词内容</CardTitle>
              <CardDescription>
                编辑系统角色和思维链指令，使用 {"{{variable}}"} 语法插入变量
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="system_role">系统角色</Label>
                <Textarea
                  id="system_role"
                  value={form.system_role}
                  onChange={(e) =>
                    setForm({ ...form, system_role: e.target.value })
                  }
                  placeholder="你是一位专业的网文创作顾问..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>思维链指令</Label>
                  <Button variant="outline" size="sm" onClick={addChainLevel}>
                    添加层级
                  </Button>
                </div>

                {form.chain_of_thought.map((level, index) => (
                  <Card key={index}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <Input
                          value={level.title}
                          onChange={(e) =>
                            updateChainOfThought(index, "title", e.target.value)
                          }
                          placeholder="层级标题"
                          className="max-w-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChainLevel(index)}
                        >
                          删除
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={level.content.join("\n")}
                        onChange={(e) =>
                          updateChainOfThought(
                            index,
                            "content",
                            e.target.value.split("\n")
                          )
                        }
                        placeholder="每行一条指令..."
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>预览渲染结果</CardTitle>
              <CardDescription>
                输入测试变量查看渲染后的完整提示词
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>测试变量 (JSON)</Label>
                <Textarea
                  value={previewVariables}
                  onChange={(e) => setPreviewVariables(e.target.value)}
                  placeholder='{"genre": "玄幻", "num_options": 3}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                预览
              </Button>
              {previewResult && (
                <div className="space-y-2">
                  <Label>渲染结果</Label>
                  <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[400px] overflow-auto">
                    {previewResult}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>

      <Toaster />
    </div>
  );
}
```

**Step 5: 运行 TypeScript 类型检查**

Run: `npm run type-check`
Expected: 无类型错误

**Step 6: Commit**

```bash
git add src/app/admin/prompt-templates/
git commit -m "$(cat <<'EOF'
feat(admin): add prompt-templates management pages

- List page with filters (phase, genre, function_code, search)
- Edit page with tabs (basic info, prompt content, preview)
- Support chain_of_thought editing with add/remove levels
- Live preview with variable substitution
EOF
)"
```

---

## Phase 5: 测试验证

### Task 5.1: 端到端功能验证

**Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 服务器启动成功，监听 3000 端口

**Step 2: 启动 Python 后端**

Run: `cd services/novel-backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000`
Expected: FastAPI 服务启动成功

**Step 3: 验证专题管理功能**

1. 访问 `http://localhost:3000/admin/genres`
2. 点击"新增专题"，填写表单，保存
3. 编辑已有专题
4. 删除测试专题

Expected: 所有 CRUD 操作正常工作

**Step 4: 验证模板管理功能**

1. 访问 `http://localhost:3000/admin/prompt-templates`
2. 使用筛选器过滤模板
3. 点击"新增模板"，填写基本信息和提示词内容
4. 使用预览功能测试变量替换
5. 保存模板
6. 复制模板
7. 删除测试模板

Expected: 所有功能正常工作

**Step 5: 验证动态模板匹配**

1. 在数据库中为 `creative_generate_options` 功能创建一个专题模板（如 genre="玄幻"）
2. 通过专业创作模式发起创作，选择"玄幻"专题
3. 观察生成的方案是否使用了专题模板

Expected: 系统优先使用专题模板，无专题模板时使用通用模板或硬编码兜底

**Step 6: Commit 最终验证结果**

```bash
git add .
git commit -m "$(cat <<'EOF'
test: verify dynamic prompt templates system e2e

- Genres CRUD working
- Templates CRUD working with filters
- Preview with variable substitution working
- 3-tier fallback matching verified
EOF
)"
```

---

## 总结

本实施计划包含 5 个阶段、共 11 个任务：

| 阶段 | 任务数 | 主要内容 |
|------|--------|----------|
| Phase 1 | 4 | 数据层：Prisma Schema + 迁移 + 种子数据 |
| Phase 2 | 3 | 服务层：Python template_service + workflow_service 改造 |
| Phase 3 | 2 | API 层：Admin API 接口（genres + templates） |
| Phase 4 | 2 | 前端：Admin 管理界面（专题 + 模板） |
| Phase 5 | 1 | 测试验证：端到端功能验证 |

每个任务都遵循 TDD 原则，包含：
- 明确的文件路径
- 完整的代码示例
- 运行验证命令
- 独立的 Git 提交

执行完成后，系统将支持：
1. 运营人员通过后台界面管理专题和提示词模板
2. 不同专题使用差异化的提示词策略
3. 三层兜底机制确保系统稳定性
4. 实时预览模板渲染结果
