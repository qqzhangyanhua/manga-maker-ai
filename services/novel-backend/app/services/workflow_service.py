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
        
        # 获取模板信息
        template_id = phase_info.get("template_id")
        template_name = phase_info.get("template_name", "未知模板")
        input_data = phase_info.get("input_data", {})
        
        # 构建优化提示词
        system_prompt = f"""你是一位专业的小说创作顾问，擅长优化和改进创意内容。

当前阶段：{self.PHASES.get(current_phase, {}).get('display_name', current_phase)}
使用模板：{template_name}

任务：根据用户的反馈和需求，优化以下生成结果。

优化原则：
1. 保留原有内容的核心创意和优点
2. 改进表达的清晰度和专业性
3. 增强内容的创意性和吸引力
4. 确保输出格式与原内容保持一致
5. 如果原内容是 JSON 格式，优化后也要保持 JSON 格式

请直接输出优化后的完整内容，不要添加额外的解释或说明。"""

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
        
        # 构建系统提示词
        system_prompt = f"""你是一位资深网文创作顾问，正在帮助作者进行 {phase_info.get('display_name', current_phase)}。

当前任务：为用户生成 {num_options} 个不同风格/方向的方案供选择。

专题类型：{genre or '通用'}

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
        world_setting = None
        characters = None
        outlines = None

        if "setting" in phases:
            setting_output = self._try_parse_json(phases["setting"].get("output", ""))
            if setting_output:
                world_setting = setting_output.get("world_setting") or setting_output
                characters = setting_output.get("characters") or setting_output.get("protagonist")

        if "framework" in phases:
            framework_output = self._try_parse_json(phases["framework"].get("output", ""))
            if framework_output:
                outlines = framework_output.get("chapterPlans") or framework_output

        # 创建项目
        async with AsyncSessionLocal() as db_session:
            project_id = str(uuid.uuid4())
            genre = phase_data.get("genre")

            await db_session.execute(
                text("""
                    INSERT INTO novel_projects 
                    (id, user_id, title, description, genre, world_setting, characters, outlines, status)
                    VALUES (:id, :user_id, :title, :description, :genre, :world_setting, :characters, :outlines, :status)
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


# 单例服务实例
workflow_service = WorkflowService()
