"""
专业创作工作流服务
管理用户的创作会话状态，支持向导式流程
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.services.template_service import template_service
from app.services.generation_service import NovelGenerationService
from app.config import settings
from app.utils.genre_utils import clean_genre

# 创建生成服务实例
generation_service = NovelGenerationService()


class WorkflowService:
    """专业创作工作流服务"""

    # 工作流阶段及其显示名称
    PHASES = {
        "creative": {"order": 1, "display_name": "创意阶段", "description": "确定创意方向和市场定位"},
        "setting": {"order": 2, "display_name": "设定阶段", "description": "构建世界观和角色设定"},
        "framework": {"order": 3, "display_name": "框架阶段", "description": "制作故事大纲和章节规划"},
        "writing": {"order": 4, "display_name": "创作阶段", "description": "生成章节内容"},
    }

    # 会话过期时间（24小时）
    SESSION_EXPIRE_HOURS = 24

    async def create_session(
        self, user_id: str, genre: Optional[str] = None, session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        创建新的工作流会话

        Args:
            user_id: 用户ID
            genre: 可选的专题类型
            session: 可选的数据库会话，如果不提供则创建新会话

        Returns:
            包含 session_id 和初始状态的字典
        """
        if session is None:
            async with AsyncSessionLocal() as session:
                return await self._create_session_internal(session, user_id, genre)
        else:
            return await self._create_session_internal(session, user_id, genre)
    
    async def _create_session_internal(
        self, session: AsyncSession, user_id: str, genre: Optional[str]
    ) -> Dict[str, Any]:
        """内部方法：执行实际的会话创建逻辑"""
        session_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=self.SESSION_EXPIRE_HOURS)

        # 初始化阶段数据
        phase_data = {
            "genre": genre,
            "phases": {},
            "current_template_id": None,
        }

        await session.execute(
            text("""
            INSERT INTO workflow_sessions 
            (id, user_id, current_phase, completed_phases, phase_data, status, expires_at)
            VALUES (:session_id, :user_id, :current_phase, :completed_phases, :phase_data, :status, :expires_at)
            """),
            {
                "session_id": session_id,
                "user_id": user_id,
                "current_phase": "creative",
                "completed_phases": json.dumps([]),
                "phase_data": json.dumps(phase_data),
                "status": "active",
                "expires_at": expires_at,
            },
        )
        await session.commit()

        # 获取推荐模板（清理 genre 参数）
        cleaned_genre = clean_genre(genre)
        workflow_templates = await template_service.get_workflow_templates(
            genre=cleaned_genre, session=session
        )

        return {
            "session_id": session_id,
            "current_phase": "creative",
            "completed_phases": [],
            "phase_info": self.PHASES["creative"],
            "available_templates": workflow_templates.get("creative", {}).get("templates", []),
            "workflow_phases": [
                {"phase": k, **v} for k, v in self.PHASES.items()
            ],
            "expires_at": expires_at.isoformat(),
        }

    async def get_pending_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        获取用户未完成的工作流会话
        
        查找最近的活跃且未过期的会话，用于会话恢复
        
        Args:
            user_id: 用户ID
            
        Returns:
            会话状态字典，如果不存在则返回 None
        """
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT id, user_id, current_phase, completed_phases, phase_data,
                           status, project_id, created_at, updated_at, expires_at
                    FROM workflow_sessions
                    WHERE user_id = :user_id AND status = 'active' AND expires_at > NOW()
                    ORDER BY updated_at DESC
                    LIMIT 1
                """),
                {"user_id": user_id},
            )
            row = result.fetchone()

            if not row:
                return None

            # JSONB fields may already be parsed by asyncpg
            completed_phases = row.completed_phases if isinstance(row.completed_phases, list) else (json.loads(row.completed_phases) if row.completed_phases else [])
            phase_data = row.phase_data if isinstance(row.phase_data, dict) else (json.loads(row.phase_data) if row.phase_data else {})

            # 获取当前阶段的推荐模板
            genre = phase_data.get("genre")
            cleaned_genre = clean_genre(genre)
            workflow_templates = await template_service.get_workflow_templates(genre=cleaned_genre)
            current_templates = workflow_templates.get(row.current_phase, {}).get("templates", [])

            return {
                "session_id": str(row.id),
                "current_phase": row.current_phase,
                "completed_phases": completed_phases,
                "phase_info": self.PHASES.get(row.current_phase, {}),
                "phase_data": phase_data,
                "available_templates": current_templates,
                "project_id": str(row.project_id) if row.project_id else None,
                "status": row.status,
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
                "workflow_phases": [
                    {
                        "phase": k,
                        **v,
                        "completed": k in completed_phases,
                        "current": k == row.current_phase,
                    }
                    for k, v in self.PHASES.items()
                ],
            }

    async def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        获取工作流会话状态

        Args:
            session_id: 会话ID
            user_id: 用户ID（用于权限验证）

        Returns:
            会话状态字典，如果不存在或已过期则返回 None
        """
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT id, user_id, current_phase, completed_phases, phase_data,
                           status, project_id, created_at, updated_at, expires_at
                    FROM workflow_sessions
                    WHERE id = :session_id AND user_id = :user_id AND status = 'active' AND expires_at > NOW()
                """),
                {"session_id": session_id, "user_id": user_id},
            )
            row = result.fetchone()

            if not row:
                return None

            # JSONB fields may already be parsed by asyncpg
            completed_phases = row.completed_phases if isinstance(row.completed_phases, list) else (json.loads(row.completed_phases) if row.completed_phases else [])
            phase_data = row.phase_data if isinstance(row.phase_data, dict) else (json.loads(row.phase_data) if row.phase_data else {})

            # 获取当前阶段的推荐模板（清理 genre 参数）
            genre = phase_data.get("genre")
            cleaned_genre = clean_genre(genre)
            workflow_templates = await template_service.get_workflow_templates(genre=cleaned_genre)
            current_templates = workflow_templates.get(row.current_phase, {}).get("templates", [])

            return {
                "session_id": str(row.id),
                "current_phase": row.current_phase,
                "completed_phases": completed_phases,
                "phase_info": self.PHASES.get(row.current_phase, {}),
                "phase_data": phase_data,
                "available_templates": current_templates,
                "project_id": str(row.project_id) if row.project_id else None,
                "status": row.status,
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
                "workflow_phases": [
                    {
                        "phase": k,
                        **v,
                        "completed": k in completed_phases,
                        "current": k == row.current_phase,
                    }
                    for k, v in self.PHASES.items()
                ],
            }

    async def execute_phase(
        self,
        session_id: str,
        user_id: str,
        template_id: str,
        input_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        执行当前阶段的模板生成

        Args:
            session_id: 会话ID
            user_id: 用户ID
            template_id: 选择的模板ID
            input_data: 输入变量

        Returns:
            LLM 生成结果
        """
        # 获取会话
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found or expired")

        current_phase = session["current_phase"]
        phase_data = session.get("phase_data", {})

        # 合并之前阶段的输出作为当前阶段的上下文
        merged_input = self._merge_context(phase_data, input_data)

        # 渲染模板
        rendered = await template_service.render_template(template_id, merged_input)

        # 构建用户提示词，包含用户输入的具体内容
        user_prompt = self._build_user_prompt(input_data, current_phase)
        
        # 调用 LLM 生成
        result = await generation_service.generate_with_prompt(
            system_prompt=rendered["system_prompt"],
            user_prompt=user_prompt,
            output_schema=rendered.get("output_schema"),
        )

        # 保存结果到会话
        async with AsyncSessionLocal() as db_session:
            # 更新阶段数据
            if "phases" not in phase_data:
                phase_data["phases"] = {}

            phase_data["phases"][current_phase] = {
                "template_id": template_id,
                "template_name": rendered["template_name"],
                "input_data": input_data,
                "output": result.get("content", ""),
                "generated_at": datetime.utcnow().isoformat(),
            }
            phase_data["current_template_id"] = template_id

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
            "phase": current_phase,
            "template_id": template_id,
            "template_name": rendered["template_name"],
            "result": result.get("content", ""),
            "parsed_result": self._try_parse_json(result.get("content", "")),
        }

    async def next_phase(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """
        进入下一阶段

        Args:
            session_id: 会话ID
            user_id: 用户ID

        Returns:
            下一阶段的信息
        """
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found or expired")

        current_phase = session["current_phase"]
        completed_phases = session["completed_phases"]
        phase_data = session.get("phase_data", {})

        # 检查当前阶段是否已执行
        if current_phase not in phase_data.get("phases", {}):
            raise ValueError(f"Current phase '{current_phase}' has not been executed yet")

        # 确定下一阶段
        phase_order = list(self.PHASES.keys())
        current_index = phase_order.index(current_phase)

        if current_index >= len(phase_order) - 1:
            # 已是最后阶段
            return {
                "is_final": True,
                "message": "All phases completed. Ready to create project.",
                "session_id": session_id,
            }

        next_phase = phase_order[current_index + 1]

        # 更新会话
        async with AsyncSessionLocal() as db_session:
            completed_phases.append(current_phase)

            await db_session.execute(
                text("""
                    UPDATE workflow_sessions
                    SET current_phase = :current_phase, completed_phases = :completed_phases, updated_at = NOW()
                    WHERE id = :session_id
                """),
                {
                    "current_phase": next_phase,
                    "completed_phases": json.dumps(completed_phases),
                    "session_id": session_id,
                },
            )
            await db_session.commit()

        # 获取下一阶段的模板（清理 genre 参数）
        genre = phase_data.get("genre")
        cleaned_genre = clean_genre(genre)
        workflow_templates = await template_service.get_workflow_templates(genre=cleaned_genre)
        next_templates = workflow_templates.get(next_phase, {}).get("templates", [])

        return {
            "is_final": False,
            "current_phase": next_phase,
            "phase_info": self.PHASES[next_phase],
            "completed_phases": completed_phases,
            "available_templates": next_templates,
            "context_from_previous": self._get_context_for_phase(phase_data, next_phase),
        }

    async def previous_phase(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """
        返回上一阶段

        Args:
            session_id: 会话ID
            user_id: 用户ID

        Returns:
            上一阶段的信息
        """
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found or expired")

        current_phase = session["current_phase"]
        completed_phases = session["completed_phases"]
        phase_data = session.get("phase_data", {})

        # 确定上一阶段
        phase_order = list(self.PHASES.keys())
        current_index = phase_order.index(current_phase)

        if current_index <= 0:
            raise ValueError("Already at the first phase")

        previous_phase = phase_order[current_index - 1]

        # 更新会话
        async with AsyncSessionLocal() as db_session:
            # 从已完成列表中移除上一阶段（因为要重新编辑）
            if previous_phase in completed_phases:
                completed_phases.remove(previous_phase)

            await db_session.execute(
                text("""
                    UPDATE workflow_sessions
                    SET current_phase = :current_phase, completed_phases = :completed_phases, updated_at = NOW()
                    WHERE id = :session_id
                """),
                {
                    "current_phase": previous_phase,
                    "completed_phases": json.dumps(completed_phases),
                    "session_id": session_id,
                },
            )
            await db_session.commit()

        # 获取上一阶段的数据
        previous_data = phase_data.get("phases", {}).get(previous_phase, {})

        # 获取模板列表（清理 genre 参数）
        genre = phase_data.get("genre")
        cleaned_genre = clean_genre(genre)
        workflow_templates = await template_service.get_workflow_templates(genre=cleaned_genre)
        templates = workflow_templates.get(previous_phase, {}).get("templates", [])

        return {
            "current_phase": previous_phase,
            "phase_info": self.PHASES[previous_phase],
            "completed_phases": completed_phases,
            "available_templates": templates,
            "previous_input": previous_data.get("input_data", {}),
            "previous_output": previous_data.get("output", ""),
        }

    async def optimize_result(
        self,
        session_id: str,
        user_id: str,
        current_result: str,
        optimization_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        优化当前阶段的生成结果
        
        Args:
            session_id: 会话ID
            user_id: 用户ID
            current_result: 当前生成的结果
            optimization_instruction: 用户的优化指令（可选）
            
        Returns:
            优化后的结果
        """
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found or expired")
        
        current_phase = session["current_phase"]
        phase_data = session.get("phase_data", {})
        phase_info = phase_data.get("phases", {}).get(current_phase, {})
        genre = phase_data.get("genre")
        
        # 获取模板信息
        template_id = phase_info.get("template_id")
        template_name = phase_info.get("template_name", "未知模板")
        input_data = phase_info.get("input_data", {})
        
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
            genre=genre,
            variables=variables,
        )
        
        # 兜底：数据库没有模板时使用硬编码
        if not system_prompt:
            system_prompt = self._get_default_optimize_result_prompt(
                phase_name=variables["phase_name"],
                template_name=template_name,
            )

        # 构建用户提示词
        user_parts = ["## 原始生成结果\n", current_result, "\n\n## 用户原始输入\n"]
        
        for key, value in input_data.items():
            if value:
                user_parts.append(f"- {key}: {value}\n")
        
        if optimization_instruction:
            user_parts.append(f"\n## 用户优化指令\n{optimization_instruction}")
        else:
            user_parts.append("\n## 优化要求\n请提升内容质量，使其更加专业、详细、有创意。")
        
        user_prompt = "".join(user_parts)
        
        # 调用 LLM 优化
        result = await generation_service.generate_with_prompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7,
            max_tokens=4096,
        )
        
        optimized_content = result.get("content", "")
        
        # 更新会话中的结果
        async with AsyncSessionLocal() as db_session:
            phase_data["phases"][current_phase]["output"] = optimized_content
            phase_data["phases"][current_phase]["optimized_at"] = datetime.utcnow().isoformat()
            
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
            "phase": current_phase,
            "original_result": current_result,
            "optimized_result": optimized_content,
            "parsed_result": self._try_parse_json(optimized_content),
        }

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

    async def select_option(
        self,
        session_id: str,
        user_id: str,
        option_id: str,
        edited_content: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        选择并保存某个方案
        
        Args:
            session_id: 会话ID
            user_id: 用户ID
            option_id: 选中的方案 ID
            edited_content: 用户编辑后的内容（可选）
            
        Returns:
            保存结果
        """
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found or expired")
        
        current_phase = session["current_phase"]
        phase_data = session.get("phase_data", {})
        completed_phases = session.get("completed_phases", [])
        
        # 获取选中的方案
        options = phase_data.get("current_options", [])
        selected_option = next((o for o in options if o.get("id") == option_id), None)
        
        if not selected_option:
            raise ValueError(f"Option {option_id} not found")
        
        # 使用编辑后的内容或原始内容
        final_content = edited_content if edited_content else selected_option.get("content", "")
        
        # 保存到阶段数据
        async with AsyncSessionLocal() as db_session:
            if "phases" not in phase_data:
                phase_data["phases"] = {}
            
            phase_data["phases"][current_phase] = {
                "selected_option_id": option_id,
                "selected_summary": selected_option.get("summary", ""),
                "output": final_content,
                "edited": edited_content is not None,
                "completed_at": datetime.utcnow().isoformat(),
            }
            
            # 清理临时选项数据
            phase_data.pop("current_options", None)
            phase_data.pop("options_generated_at", None)
            
            # 将当前阶段加入已完成列表
            if current_phase not in completed_phases:
                completed_phases.append(current_phase)
            
            # 确定下一阶段
            phase_order = list(self.PHASES.keys())
            current_index = phase_order.index(current_phase)
            is_final = current_index >= len(phase_order) - 1
            
            if not is_final:
                next_phase = phase_order[current_index + 1]
                await db_session.execute(
                    text("""
                        UPDATE workflow_sessions
                        SET phase_data = :phase_data, 
                            current_phase = :current_phase,
                            completed_phases = :completed_phases,
                            updated_at = NOW()
                        WHERE id = :session_id
                    """),
                    {
                        "phase_data": json.dumps(phase_data),
                        "current_phase": next_phase,
                        "completed_phases": json.dumps(completed_phases),
                        "session_id": session_id,
                    },
                )
            else:
                # 最后阶段，不改变 current_phase
                await db_session.execute(
                    text("""
                        UPDATE workflow_sessions
                        SET phase_data = :phase_data, 
                            completed_phases = :completed_phases,
                            updated_at = NOW()
                        WHERE id = :session_id
                    """),
                    {
                        "phase_data": json.dumps(phase_data),
                        "completed_phases": json.dumps(completed_phases),
                        "session_id": session_id,
                    },
                )
            
            await db_session.commit()
        
        return {
            "saved": True,
            "current_phase": current_phase,
            "completed_phases": completed_phases,
            "is_final": is_final,
        }

    async def redo_phase(
        self,
        session_id: str,
        user_id: str,
        phase: str,
    ) -> Dict[str, Any]:
        """
        回退到指定阶段重做
        
        Args:
            session_id: 会话ID
            user_id: 用户ID
            phase: 要重做的阶段
            
        Returns:
            重做结果
        """
        if phase not in self.PHASES:
            raise ValueError(f"Invalid phase: {phase}")
        
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found or expired")
        
        phase_data = session.get("phase_data", {})
        completed_phases = session.get("completed_phases", [])
        
        # 获取要重做阶段的顺序
        phase_order = list(self.PHASES.keys())
        redo_index = phase_order.index(phase)
        
        # 移除该阶段及之后所有阶段的数据
        phases_to_remove = phase_order[redo_index:]
        for p in phases_to_remove:
            if p in completed_phases:
                completed_phases.remove(p)
            if "phases" in phase_data and p in phase_data["phases"]:
                del phase_data["phases"][p]
        
        # 清理临时数据
        phase_data.pop("current_options", None)
        phase_data.pop("options_generated_at", None)
        
        # 更新会话
        async with AsyncSessionLocal() as db_session:
            await db_session.execute(
                text("""
                    UPDATE workflow_sessions
                    SET phase_data = :phase_data, 
                        current_phase = :current_phase,
                        completed_phases = :completed_phases,
                        updated_at = NOW()
                    WHERE id = :session_id
                """),
                {
                    "phase_data": json.dumps(phase_data),
                    "current_phase": phase,
                    "completed_phases": json.dumps(completed_phases),
                    "session_id": session_id,
                },
            )
            await db_session.commit()
        
        return {
            "current_phase": phase,
            "completed_phases": completed_phases,
        }

    def _parse_options(self, content: str, expected_count: int = 3) -> List[Dict[str, Any]]:
        """解析 LLM 返回的选项"""
        import re
        
        # 尝试直接解析 JSON
        try:
            options = json.loads(content)
            if isinstance(options, list):
                return options[:expected_count]
        except json.JSONDecodeError:
            pass
        
        # 尝试提取 JSON 代码块
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
        if json_match:
            try:
                options = json.loads(json_match.group(1))
                if isinstance(options, list):
                    return options[:expected_count]
            except json.JSONDecodeError:
                pass
        
        # 如果解析失败，返回默认结构
        return [
            {
                "id": f"opt_{i+1}",
                "summary": f"方案 {i+1}",
                "content": content if i == 0 else f"方案 {i+1} 内容待生成",
            }
            for i in range(expected_count)
        ]

    async def generate_project_info(
        self,
        session_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        基于已完成阶段内容自动生成项目标题和描述

        Args:
            session_id: 会话ID
            user_id: 用户ID

        Returns:
            包含 title 和 description 的字典
        """
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError("Session not found or expired")

        phase_data = session.get("phase_data", {})
        phases = phase_data.get("phases", {})
        genre = phase_data.get("genre", "通用")

        # 收集各阶段内容作为上下文
        context_parts = []

        if "creative" in phases:
            creative_content = phases["creative"].get("output", "")
            creative_summary = phases["creative"].get("selected_summary", "")
            if creative_summary:
                context_parts.append(f"创意方向：{creative_summary}")
            if creative_content:
                context_parts.append(f"创意内容：{creative_content[:500]}")

        if "setting" in phases:
            setting_summary = phases["setting"].get("selected_summary", "")
            if setting_summary:
                context_parts.append(f"设定方向：{setting_summary}")

        if "framework" in phases:
            framework_summary = phases["framework"].get("selected_summary", "")
            if framework_summary:
                context_parts.append(f"框架方向：{framework_summary}")

        context = "\n".join(context_parts)

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

        user_prompt = f"""专题类型：{genre}

{context}

请根据以上内容，生成一个合适的小说标题和描述。直接输出 JSON，不要添加其他内容。"""

        # 调用 LLM
        result = await generation_service.generate_with_prompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7,
            max_tokens=512,
        )

        content = result.get("content", "")
        parsed = self._try_parse_json(content)

        if parsed and "title" in parsed:
            return {
                "title": parsed.get("title", ""),
                "description": parsed.get("description", ""),
            }

        # 解析失败时返回默认值
        return {
            "title": f"我的{genre}小说",
            "description": "一个精彩的故事即将展开...",
        }

    async def complete_workflow(
        self,
        session_id: str,
        user_id: str,
        project_title: str,
        project_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        完成工作流，创建小说项目

        Args:
            session_id: 会话ID
            user_id: 用户ID
            project_title: 项目标题
            project_description: 项目描述

        Returns:
            创建的项目信息
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

        # 从各阶段提取数据
        # 新流程：output 可能是纯文本或 JSON
        creative_content = None
        world_setting = None
        characters = None
        outlines = None
        writing_content = None

        # 提前获取 genre，后续 AI 转换需要使用
        genre = phase_data.get("genre")

        # 创意阶段
        if "creative" in phases:
            creative_raw = phases["creative"].get("output", "")
            creative_parsed = self._try_parse_json(creative_raw)
            creative_content = creative_parsed if creative_parsed else creative_raw

        # 设定阶段
        if "setting" in phases:
            setting_raw = phases["setting"].get("output", "")
            setting_parsed = self._try_parse_json(setting_raw)
            if setting_parsed:
                # 旧格式：JSON 结构
                world_setting = setting_parsed.get("world_setting") or setting_parsed
                characters = setting_parsed.get("characters") or setting_parsed.get("protagonist")
            else:
                # 新格式：纯文本，整体作为世界设定
                world_setting = setting_raw

        # 框架阶段
        # 注意：outlines 必须是数组格式，纯文本需要通过 AI 转换
        framework_text = None
        if "framework" in phases:
            framework_raw = phases["framework"].get("output", "")
            framework_parsed = self._try_parse_json(framework_raw)
            if framework_parsed:
                # JSON 格式：提取章节计划数组
                if isinstance(framework_parsed, list):
                    outlines = framework_parsed
                elif isinstance(framework_parsed, dict):
                    outlines = framework_parsed.get("chapterPlans") or framework_parsed.get("chapters")
                    # 如果还不是数组，尝试 AI 转换
                    if not isinstance(outlines, list):
                        outlines = await self._convert_text_to_outlines(framework_raw, genre)
            else:
                # 纯文本：通过 AI 转换为章节数组
                outlines = await self._convert_text_to_outlines(framework_raw, genre)

        # 创作阶段
        if "writing" in phases:
            writing_raw = phases["writing"].get("output", "")
            writing_parsed = self._try_parse_json(writing_raw)
            writing_content = writing_parsed if writing_parsed else writing_raw

        # 新增：生成风格指导文档
        style_guide = await self._generate_style_guide(
            phase_data=phase_data,
            genre=genre,
        )

        # 创建项目
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

            # 更新会话状态
            await db_session.execute(
                text("""
                    UPDATE workflow_sessions
                    SET status = 'completed', project_id = :project_id, updated_at = NOW()
                    WHERE id = :session_id
                """),
                {"project_id": project_id, "session_id": session_id},
            )
            await db_session.commit()

        return {
            "project_id": project_id,
            "title": project_title,
            "description": project_description,
            "genre": genre,
            "phases_completed": list(phases.keys()),
            "message": "Project created successfully",
        }

    def _merge_context(
        self, phase_data: Dict[str, Any], input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """合并之前阶段的输出作为上下文"""
        merged = dict(input_data)
        phases = phase_data.get("phases", {})

        # 添加之前阶段的输出
        for phase_name, phase_info in phases.items():
            output = phase_info.get("output", "")
            parsed = self._try_parse_json(output)

            # 根据阶段名称映射到标准变量名
            if phase_name == "creative":
                if parsed:
                    merged["inspiration_pool"] = parsed.get("inspiration_pool", parsed)
                    merged["top_recommendations"] = parsed.get("top_recommendations", [])
                    merged["project_brief"] = parsed
                else:
                    merged["project_brief"] = output

            elif phase_name == "setting":
                if parsed:
                    merged["world_setting"] = parsed.get("world_setting", parsed)
                    merged["character_sheet"] = parsed.get("protagonist", parsed)
                    merged["characters"] = parsed.get("supporting_characters", [])
                else:
                    merged["world_setting"] = output

            elif phase_name == "framework":
                if parsed:
                    merged["chapter_outline"] = parsed.get("chapterPlans", parsed)
                    merged["outline_overview"] = parsed.get("outlineOverview", parsed)
                else:
                    merged["chapter_outline"] = output

        return merged

    def _get_context_for_phase(
        self, phase_data: Dict[str, Any], next_phase: str
    ) -> Dict[str, Any]:
        """获取下一阶段需要的上下文"""
        return self._merge_context(phase_data, {})

    def _build_user_prompt(self, input_data: Dict[str, Any], phase: str) -> str:
        """
        构建用户提示词，将用户输入的具体内容传递给 LLM

        Args:
            input_data: 用户填写的表单数据
            phase: 当前阶段

        Returns:
            格式化的用户提示词
        """
        phase_display = self.PHASES.get(phase, {}).get('display_name', phase)

        # 过滤掉空值
        valid_input = {k: v for k, v in input_data.items() if v} if input_data else {}

        if not valid_input:
            # 空表单时，指示 LLM 主动生成示例内容，而不是反问用户
            return f"""## 任务要求

当前阶段：{phase_display}

用户尚未提供具体信息，请根据系统提示词中的思维链指令，**主动生成一个完整的示例内容**。

要求：
1. 直接输出结果，不要反问用户要更多信息
2. 生成的内容应该是一个完整的、有创意的、可直接使用的示例
3. 用户可以在此基础上进行编辑和调整
4. 如果有 JSON 格式要求，严格按照格式输出
5. 内容要专业、详细、有吸引力

请直接开始生成："""

        # 构建用户输入部分
        prompt_parts = ["## 用户提供的创作信息\n"]

        # 常见字段的友好名称映射
        field_names = {
            "title": "作品标题",
            "genre": "作品类型",
            "length": "作品长度",
            "platform": "目标平台",
            "target_audience": "目标读者",
            "core_theme": "核心主题",
            "creative_direction": "创意方向",
            "premise": "故事前提",
            "description": "描述",
            "world_setting": "世界观设定",
            "characters": "角色设定",
            "protagonist": "主角设定",
            "outline": "大纲",
            "chapter_outline": "章节大纲",
            "style": "风格",
            "tone": "基调",
            "keywords": "关键词",
            "inspiration": "灵感来源",
            "reference": "参考作品",
            "requirements": "特殊要求",
            "constraints": "约束条件",
        }

        for key, value in valid_input.items():
            display_name = field_names.get(key, key)
            if isinstance(value, (dict, list)):
                import json
                value_str = json.dumps(value, ensure_ascii=False, indent=2)
                prompt_parts.append(f"### {display_name}\n```json\n{value_str}\n```\n")
            else:
                prompt_parts.append(f"### {display_name}\n{value}\n")

        prompt_parts.append("\n## 任务要求\n")
        prompt_parts.append("请根据上述用户提供的信息，结合系统提示词中的思维链指令，生成完整、详细、高质量的输出结果。")
        prompt_parts.append("直接输出结果，不要反问用户要更多信息。")
        prompt_parts.append(f"\n\n当前阶段：{phase_display}")

        return "\n".join(prompt_parts)

    async def _convert_text_to_outlines(
        self, framework_text: str, genre: Optional[str] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        将纯文本框架转换为章节大纲数组

        Args:
            framework_text: 纯文本框架描述
            genre: 小说类型

        Returns:
            章节大纲数组，转换失败返回 None
        """
        if not framework_text or len(framework_text.strip()) < 20:
            return None

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

        user_prompt = f"""小说类型：{genre or '通用'}

故事框架：
{framework_text}

请将以上框架转换为章节大纲数组，直接输出 JSON。"""

        try:
            result = await generation_service.generate_with_prompt(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.5,
                max_tokens=4096,
            )

            content = result.get("content", "")
            parsed = self._try_parse_json(content)

            if parsed and isinstance(parsed, list) and len(parsed) > 0:
                # 确保每个章节都有必要字段
                normalized = []
                for i, chapter in enumerate(parsed):
                    if isinstance(chapter, dict):
                        normalized.append({
                            "title": chapter.get("title", f"第{i+1}章"),
                            "summary": chapter.get("summary", ""),
                            "status": chapter.get("status", "pending"),
                        })
                return normalized if normalized else None

        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to convert framework to outlines: {e}")

        return None

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

        try:
            # 构建 user_prompt（避免 f-string 内嵌套 join 的转义问题）
            context_text = "\n\n".join(context_parts)
            user_prompt = f"专题类型：{genre or '通用'}\n\n{context_text}"

            result = await generation_service.generate_with_prompt(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
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

    def _try_parse_json(self, content: str) -> Optional[Dict[str, Any]]:
        """尝试解析 JSON 内容"""
        if not content:
            return None

        # 尝试直接解析
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # 尝试提取 JSON 代码块
        import re
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        return None

    # ============================================================
    # 默认提示词方法（硬编码兜底）
    # ============================================================

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


# 单例服务实例
workflow_service = WorkflowService()
