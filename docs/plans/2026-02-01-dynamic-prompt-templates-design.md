# 动态提示词模板系统设计

> **日期**: 2026-02-01
> **状态**: 已确认
> **范围**: 专业创作模式工作流提示词动态配置

---

## 一、背景与目标

### 现状问题

专业创作模式的 8 个 AI 调用点的提示词全部硬编码在 `workflow_service.py` 中：
- 修改提示词需要改代码重新部署
- 不同专题（玄幻、都市、悬疑等）使用相同提示词
- 运营人员无法参与提示词优化

### 改造目标

1. **运营人员可配置**：通过后台界面添加、修改提示词模板
2. **专题差异化**：不同小说类型使用完全不同的提示词策略
3. **快速迭代优化**：无需重新部署即可调整提示词、进行 AB 测试

---

## 二、设计决策

| 决策点 | 选择 |
|--------|------|
| 改造范围 | 全部 8 个 AI 调用点 + 硬编码兜底 |
| 模板粒度 | 细粒度（每功能一个模板） |
| 专题管理 | 新建 `genres` 表 |
| 匹配策略 | 严格匹配 + 通用兜底（三层） |
| 管理界面 | 复用现有 Admin 模块 |
| 模板结构 | 文本 + 变量 + 思维链 |
| 变量管理 | 预定义变量列表 |

---

## 三、数据库结构

### 1. 新建 `genres` 表

```sql
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- 如 "xuanhuan", "dushi"
    display_name VARCHAR(100) NOT NULL, -- 如 "玄幻", "都市"
    description TEXT,
    parent_id UUID REFERENCES genres(id), -- 预留，暂不使用
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_genres_active_sort ON genres(is_active, sort_order);
```

### 2. 扩展 `writing_prompt_templates` 表

```sql
ALTER TABLE writing_prompt_templates
ADD COLUMN IF NOT EXISTS function_code VARCHAR(50);

CREATE INDEX idx_templates_function_genre
ON writing_prompt_templates(function_code, genre, is_active);
```

### 3. 8 个 function_code 值

| function_code | 说明 |
|---------------|------|
| `creative_generate_options` | 创意阶段方案生成 |
| `setting_generate_options` | 设定阶段方案生成 |
| `framework_generate_options` | 框架阶段方案生成 |
| `writing_generate_options` | 创作阶段方案生成 |
| `optimize_result` | 优化结果 |
| `generate_project_info` | 生成项目标题描述 |
| `generate_style_guide` | 生成风格指导 |
| `convert_text_to_outlines` | 文本转大纲 |

---

## 四、模板匹配服务

### 三层兜底匹配逻辑

```
1. 先查专题模板：genre="玄幻" AND function_code="creative_generate_options"
2. 再查通用模板：genre=NULL AND function_code="creative_generate_options"
3. 都没有则用代码硬编码的默认提示词
```

### 预定义变量列表

```python
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

### 核心方法

```python
async def get_template_for_function(
    self,
    function_code: str,
    genre: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """三层兜底匹配"""
    ...

async def render_function_template(
    self,
    function_code: str,
    genre: Optional[str],
    variables: Dict[str, Any]
) -> Optional[str]:
    """获取模板并渲染为完整提示词，返回 None 表示没有可用模板"""
    ...
```

---

## 五、workflow_service 改造

### 改造模式

```python
async def generate_options(self, session_id: str, user_id: str, num_options: int = 3):
    ...
    function_code = f"{current_phase}_generate_options"

    # 构建变量
    variables = {
        "phase_name": phase_info.get("display_name"),
        "phase_description": phase_info.get("description"),
        "genre": genre or "通用",
        "num_options": num_options,
        # + 前序阶段输出
    }

    # 尝试从数据库获取模板
    system_prompt = await template_service.render_function_template(
        function_code=function_code,
        genre=genre,
        variables=variables,
    )

    # 兜底：数据库没有模板时使用硬编码
    if not system_prompt:
        system_prompt = self._get_default_generate_options_prompt(...)

    # 调用 LLM
    ...
```

### 需新增的兜底方法

- `_get_default_generate_options_prompt()`
- `_get_default_optimize_result_prompt()`
- `_get_default_generate_project_info_prompt()`
- `_get_default_generate_style_guide_prompt()`
- `_get_default_convert_text_to_outlines_prompt()`

---

## 六、Admin 管理界面

### 路由结构

```
src/app/admin/
├── genres/              # 专题管理
│   └── page.tsx
├── prompt-templates/    # 提示词模板管理
│   ├── page.tsx         # 模板列表
│   └── [id]/
│       └── page.tsx     # 模板编辑
```

### API 接口

#### 专题管理

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/genres` | 获取专题列表 |
| POST | `/api/admin/genres` | 新建专题 |
| GET | `/api/admin/genres/[id]` | 获取专题详情 |
| PUT | `/api/admin/genres/[id]` | 更新专题 |
| DELETE | `/api/admin/genres/[id]` | 删除专题 |
| PUT | `/api/admin/genres/reorder` | 批量更新排序 |

#### 模板管理

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/prompt-templates` | 获取模板列表 |
| POST | `/api/admin/prompt-templates` | 新建模板 |
| GET | `/api/admin/prompt-templates/[id]` | 获取模板详情 |
| PUT | `/api/admin/prompt-templates/[id]` | 更新模板 |
| DELETE | `/api/admin/prompt-templates/[id]` | 删除模板 |
| POST | `/api/admin/prompt-templates/[id]/duplicate` | 复制模板 |
| POST | `/api/admin/prompt-templates/preview` | 预览渲染结果 |

---

## 七、种子数据

### 预置专题

| code | display_name |
|------|--------------|
| xuanhuan | 玄幻 |
| xiuzhen | 修真 |
| dushi | 都市 |
| lishi | 历史 |
| yanqing | 言情 |
| xuanyi | 悬疑 |
| kehuan | 科幻 |
| youxi | 游戏 |

### 预置模板

8 个通用模板（genre=NULL），内容从现有硬编码提示词迁移。

---

## 八、实施计划

| 阶段 | 任务 | 预估文件数 |
|------|------|-----------|
| Phase 1 | 数据层：Prisma schema + 迁移 + 种子数据 | 4 个文件 |
| Phase 2 | 服务层：扩展 template_service + 改造 workflow_service | 2 个文件 |
| Phase 3 | API 层：Admin API 接口（genres + templates） | 6 个文件 |
| Phase 4 | 前端：Admin 管理界面（列表 + 编辑） | 4-6 个文件 |
| Phase 5 | 测试验证：端到端测试 + 种子数据验证 | - |

---

## 九、风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 迁移影响现有数据 | 只新增字段，不修改现有字段，向后兼容 |
| 模板为空导致生成失败 | 三层兜底机制，硬编码保底 |
| 变量缺失导致渲染异常 | 预定义变量列表，只替换已知变量 |
| 性能问题（每次生成查库） | 可后续加 Redis 缓存，MVP 先不加 |
