"""
写作提示词模板服务
提供模板查询、渲染和工作流管理功能
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json
import re

from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.utils.genre_utils import clean_genre


class TemplateService:
    """写作提示词模板服务"""

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

    # 阶段显示名称映射
    PHASE_DISPLAY_NAMES = {
        "creative": "创意阶段",
        "setting": "设定阶段",
        "framework": "框架阶段",
        "writing": "创作阶段",
        "advanced": "进阶技巧",
        "analysis": "数据分析",
        "commercial": "商业化",
        "auxiliary": "辅助工具",
        "extra": "额外功能",
        "other": "其他",
    }

    # 推荐的工作流阶段顺序
    WORKFLOW_PHASES = ["creative", "setting", "framework", "writing"]

    async def get_templates(
        self,
        phase: Optional[str] = None,
        category: Optional[str] = None,
        genre: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        session: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """
        获取模板列表
        支持按阶段、分类、专题过滤，以及关键词搜索
        
        Args:
            session: 可选的数据库会话，如果不提供则创建新会话
        """
        if session is None:
            async with AsyncSessionLocal() as session:
                return await self._get_templates_internal(
                    session, phase, category, genre, search, limit, offset
                )
        else:
            return await self._get_templates_internal(
                session, phase, category, genre, search, limit, offset
            )
    
    async def _get_templates_internal(
        self,
        session: AsyncSession,
        phase: Optional[str],
        category: Optional[str],
        genre: Optional[str],
        search: Optional[str],
        limit: int,
        offset: int,
    ) -> Dict[str, Any]:
        """内部方法：执行实际的查询逻辑"""
        # 构建查询条件
        conditions = ["is_active = true"]
        params = {}

        if phase:
            conditions.append("phase = :phase")
            params["phase"] = phase

        if category:
            conditions.append("category = :category")
            params["category"] = category

        if genre:
            # 清理 genre：使用统一工具函数
            cleaned_genre = clean_genre(genre)
            if cleaned_genre is None:
                conditions.append("genre IS NULL")
            else:
                conditions.append("genre = :genre")
                params["genre"] = cleaned_genre

        if search:
            conditions.append("(name ILIKE :search OR description ILIKE :search)")
            params["search"] = f"%{search}%"

        where_clause = " AND ".join(conditions)

        # 查询总数
        count_query = text(f"""
            SELECT COUNT(*) FROM writing_prompt_templates
            WHERE {where_clause}
        """)
        result = await session.execute(count_query, params)
        total = result.scalar()

        # 查询模板列表
        list_query = text(f"""
            SELECT id, code, name, description, phase, category, genre,
                   sort_order, usage_count, created_at, updated_at
            FROM writing_prompt_templates
            WHERE {where_clause}
            ORDER BY sort_order ASC, usage_count DESC
            LIMIT :limit OFFSET :offset
        """)
        params["limit"] = limit
        params["offset"] = offset
        result = await session.execute(list_query, params)
        rows = result.fetchall()

        templates = [
            {
                "id": str(row.id),
                "code": row.code,
                "name": row.name,
                "description": row.description,
                "phase": row.phase,
                "phase_display": self.PHASE_DISPLAY_NAMES.get(
                    row.phase, row.phase
                ),
                "category": row.category,
                "genre": row.genre,
                "sort_order": row.sort_order,
                "usage_count": row.usage_count,
            }
            for row in rows
        ]

        return {
            "templates": templates,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    async def get_template_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        """获取单个模板详情，包含插槽信息"""
        async with AsyncSessionLocal() as session:
            # 查询模板
            template_query = text("""
                SELECT id, code, name, description, phase, category, genre,
                       system_role, chain_of_thought, output_schema,
                       sort_order, usage_count, created_at, updated_at
                FROM writing_prompt_templates
                WHERE id = :template_id AND is_active = true
            """)
            result = await session.execute(template_query, {"template_id": template_id})
            row = result.fetchone()
            if not row:
                return None

            # 查询插槽
            slots_query = text("""
                SELECT id, name, display_name, description, slot_type,
                       data_type, required, default_value, options
                FROM template_slots
                WHERE template_id = :template_id
                ORDER BY slot_type, required DESC
            """)
            result = await session.execute(slots_query, {"template_id": template_id})
            slot_rows = result.fetchall()

            input_slots = []
            output_slots = []
            for slot in slot_rows:
                slot_data = {
                    "id": str(slot.id),
                    "name": slot.name,
                    "display_name": slot.display_name,
                    "description": slot.description,
                    "data_type": slot.data_type,
                    "required": slot.required,
                    "default_value": slot.default_value,
                    "options": slot.options,
                }
                if slot.slot_type == "input":
                    input_slots.append(slot_data)
                else:
                    output_slots.append(slot_data)

            return {
                "id": str(row.id),
                "code": row.code,
                "name": row.name,
                "description": row.description,
                "phase": row.phase,
                "phase_display": self.PHASE_DISPLAY_NAMES.get(
                    row.phase, row.phase
                ),
                "category": row.category,
                "genre": row.genre,
                "system_role": row.system_role,
                "chain_of_thought": row.chain_of_thought,
                "output_schema": row.output_schema,
                "input_slots": input_slots,
                "output_slots": output_slots,
                "sort_order": row.sort_order,
                "usage_count": row.usage_count,
            }

    async def get_phases_with_templates(
        self, genre: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        获取所有阶段及其模板数量
        用于前端展示阶段导航
        """
        async with AsyncSessionLocal() as session:
            # 构建查询（清理 genre 参数）
            cleaned_genre = clean_genre(genre)
            
            if cleaned_genre:
                query = text("""
                    SELECT phase, COUNT(*) as count
                    FROM writing_prompt_templates
                    WHERE is_active = true AND (genre = :genre OR genre IS NULL)
                    GROUP BY phase
                    ORDER BY MIN(sort_order)
                """)
                result = await session.execute(query, {"genre": cleaned_genre})
            else:
                query = text("""
                    SELECT phase, COUNT(*) as count
                    FROM writing_prompt_templates
                    WHERE is_active = true AND genre IS NULL
                    GROUP BY phase
                    ORDER BY MIN(sort_order)
                """)
                result = await session.execute(query)

            rows = result.fetchall()

            phases = [
                {
                    "phase": row.phase,
                    "display_name": self.PHASE_DISPLAY_NAMES.get(
                        row.phase, row.phase
                    ),
                    "count": row.count,
                    "is_workflow_phase": row.phase in self.WORKFLOW_PHASES,
                }
                for row in rows
            ]

            return phases

    async def get_genres(self, session: Optional[AsyncSession] = None) -> List[Dict[str, Any]]:
        """
        获取所有可用的专题类型
        
        Args:
            session: 可选的数据库会话，如果不提供则创建新会话
        """
        if session is None:
            async with AsyncSessionLocal() as session:
                return await self._get_genres_internal(session)
        else:
            return await self._get_genres_internal(session)
    
    async def _get_genres_internal(self, session: AsyncSession) -> List[Dict[str, Any]]:
        """内部方法：执行实际的查询逻辑"""
        query = text("""
            SELECT genre, COUNT(*) as count
            FROM writing_prompt_templates
            WHERE is_active = true AND genre IS NOT NULL
            GROUP BY genre
            ORDER BY count DESC
        """)
        result = await session.execute(query)
        rows = result.fetchall()

        genres = [
            {"genre": "general", "display_name": "通用模板", "count": 0}
        ]  # 通用模板始终在前
        genres.extend(
            [
                {"genre": row.genre, "display_name": row.genre, "count": row.count}
                for row in rows
            ]
        )

        return genres

    async def render_template(
        self, template_id: str, variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        渲染模板：将变量填充到系统角色和思维链中
        返回可直接用于 LLM 调用的提示词
        """
        template = await self.get_template_by_id(template_id)
        if not template:
            raise ValueError(f"Template not found: {template_id}")

        # 渲染系统角色
        system_role = template["system_role"]
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value, ensure_ascii=False, indent=2)
            else:
                value_str = str(value)
            system_role = system_role.replace(placeholder, value_str)

        # 渲染思维链指令
        chain_of_thought = template["chain_of_thought"]
        if isinstance(chain_of_thought, list):
            rendered_chain = []
            for level in chain_of_thought:
                rendered_level = {
                    "level": level.get("level", ""),
                    "title": level.get("title", ""),
                    "content": [],
                }
                for item in level.get("content", []):
                    rendered_item = item
                    for key, value in variables.items():
                        placeholder = f"{{{{{key}}}}}"
                        if isinstance(value, (dict, list)):
                            value_str = json.dumps(value, ensure_ascii=False)
                        else:
                            value_str = str(value)
                        rendered_item = rendered_item.replace(placeholder, value_str)
                    rendered_level["content"].append(rendered_item)
                rendered_chain.append(rendered_level)
            chain_of_thought = rendered_chain

        # 构建完整的系统提示词
        full_prompt = f"{system_role}\n\n"
        if chain_of_thought:
            full_prompt += "## 思维链指令\n\n"
            for level in chain_of_thought:
                full_prompt += f"### {level['title']}\n"
                for i, item in enumerate(level["content"], 1):
                    full_prompt += f"{i}. {item}\n"
                full_prompt += "\n"

        # 更新使用次数
        await self._increment_usage_count(template_id)

        return {
            "template_id": template_id,
            "template_name": template["name"],
            "system_prompt": full_prompt,
            "output_schema": template["output_schema"],
            "variables_used": list(variables.keys()),
        }

    async def _increment_usage_count(self, template_id: str) -> None:
        """增加模板使用次数"""
        async with AsyncSessionLocal() as session:
            await session.execute(
                text("""
                    UPDATE writing_prompt_templates
                    SET usage_count = usage_count + 1, updated_at = NOW()
                    WHERE id = :template_id
                """),
                {"template_id": template_id},
            )
            await session.commit()

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

    async def get_workflow_templates(
        self, genre: Optional[str] = None, session: Optional[AsyncSession] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        获取工作流推荐模板
        按 4 个核心阶段返回推荐的模板
        
        优化：使用单次查询获取所有阶段的模板，避免 N+1 查询问题
        
        Args:
            genre: 专题类型
            session: 可选的数据库会话，如果不提供则创建新会话
        """
        # 清理 genre 参数
        cleaned_genre = clean_genre(genre)
        
        if session is None:
            async with AsyncSessionLocal() as session:
                return await self._get_workflow_templates_internal(session, cleaned_genre)
        else:
            return await self._get_workflow_templates_internal(session, cleaned_genre)
    
    async def _get_workflow_templates_internal(
        self, session: AsyncSession, cleaned_genre: Optional[str]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """内部方法：执行实际的查询逻辑"""
        # 构建查询条件
        conditions = ["is_active = true"]
        params = {}
        
        # 阶段过滤：只查询工作流阶段的模板
        phase_placeholders = ", ".join([f"'{phase}'" for phase in self.WORKFLOW_PHASES])
        conditions.append(f"phase IN ({phase_placeholders})")
        
        # 专题过滤
        if cleaned_genre:
            conditions.append("genre = :genre")
            params["genre"] = cleaned_genre
        else:
            conditions.append("genre IS NULL")
        
        where_clause = " AND ".join(conditions)
        
        # 单次查询获取所有阶段的模板
        query = text(f"""
            SELECT id, code, name, description, phase, category, genre,
                   sort_order, usage_count, created_at, updated_at
            FROM writing_prompt_templates
            WHERE {where_clause}
            ORDER BY phase, sort_order ASC, usage_count DESC
        """)
        result = await session.execute(query, params)
        rows = result.fetchall()
        
        # 按阶段分组，每个阶段最多取10个
        phase_templates = {phase: [] for phase in self.WORKFLOW_PHASES}
        phase_counts = {phase: 0 for phase in self.WORKFLOW_PHASES}
        
        for row in rows:
            phase = row.phase
            if phase_counts[phase] < 10:
                phase_templates[phase].append({
                    "id": str(row.id),
                    "code": row.code,
                    "name": row.name,
                    "description": row.description,
                    "phase": row.phase,
                    "phase_display": self.PHASE_DISPLAY_NAMES.get(
                        row.phase, row.phase
                    ),
                    "category": row.category,
                    "genre": row.genre,
                    "sort_order": row.sort_order,
                    "usage_count": row.usage_count,
                })
                phase_counts[phase] += 1
        
        # 构建返回结果
        result_dict = {}
        for phase in self.WORKFLOW_PHASES:
            result_dict[phase] = {
                "phase": phase,
                "display_name": self.PHASE_DISPLAY_NAMES[phase],
                "templates": phase_templates[phase],
            }
        
        return result_dict


# 单例服务实例
template_service = TemplateService()
