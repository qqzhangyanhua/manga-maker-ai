"""
灵感模式服务 - AI 对话式故事构建
支持 AI 动态生成问题，根据用户回答智能调整后续问题
"""
from openai import AsyncOpenAI
from typing import Optional, Dict
from uuid import uuid4
from datetime import datetime, timedelta
from ..config import settings
from ..schemas.inspiration import StoryDraft
import logging
import json
import re
import threading

logger = logging.getLogger(__name__)


# ========== OpenAI Client 单例 ==========
_openai_client: Optional[AsyncOpenAI] = None
_client_lock = threading.Lock()


def get_openai_client() -> AsyncOpenAI:
    """获取 OpenAI Client 单例，避免重复初始化"""
    global _openai_client
    if _openai_client is None:
        with _client_lock:
            if _openai_client is None:
                _openai_client = AsyncOpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    base_url=settings.OPENAI_API_BASE,
                )
    return _openai_client


# ========== Session 存储与管理 ==========
_sessions: Dict[str, Dict] = {}
_sessions_lock = threading.Lock()

# Session 配置
SESSION_TTL_MINUTES = 30  # Session 过期时间（分钟）
MAX_SESSIONS = 1000  # 最大会话数


class InspirationService:
    """灵感模式服务 - AI 动态问题生成版本"""

    # 第一个问题（固定，用于启动对话）
    FIRST_QUESTION = {
        "step": 1,
        "question": "你想写什么类型的故事？",
        "type": "choice",
        "options": ["玄幻", "科幻", "现代", "历史", "悬疑", "言情", "武侠", "奇幻", "都市", "其他"],
        "hint": "选择一个最符合你想法的类型",
        "suggestions": []
    }

    # 最大问题数（防止无限循环）
    MAX_QUESTIONS = 8
    # 最小问题数（确保收集足够信息）
    MIN_QUESTIONS = 4

    def __init__(self):
        # 使用模块级单例 client
        self.client = get_openai_client()
        self.model = settings.OPENAI_MODEL

    def _cleanup_expired_sessions(self):
        """清理过期会话，并在超出最大数量时按最老淘汰"""
        now = datetime.now()
        expired_ids = []
        
        with _sessions_lock:
            # 1. 清理过期会话
            for sid, session in list(_sessions.items()):
                expires_at = session.get("expires_at")
                if expires_at and now > expires_at:
                    expired_ids.append(sid)
            
            for sid in expired_ids:
                del _sessions[sid]
            
            if expired_ids:
                logger.info(f"清理了 {len(expired_ids)} 个过期会话")
            
            # 2. 超出最大数量时，按创建时间淘汰最老的
            if len(_sessions) > MAX_SESSIONS:
                sorted_sessions = sorted(
                    _sessions.items(),
                    key=lambda x: x[1].get("created_at", ""),
                )
                excess_count = len(_sessions) - MAX_SESSIONS
                for sid, _ in sorted_sessions[:excess_count]:
                    del _sessions[sid]
                logger.info(f"淘汰了 {excess_count} 个最老会话")

    def _get_session(self, session_id: str) -> Optional[Dict]:
        """获取会话，同时检查是否过期"""
        self._cleanup_expired_sessions()
        
        with _sessions_lock:
            session = _sessions.get(session_id)
            if session:
                # 检查是否过期
                expires_at = session.get("expires_at")
                if expires_at and datetime.now() > expires_at:
                    del _sessions[session_id]
                    return None
                # 续期：每次访问延长过期时间
                session["expires_at"] = datetime.now() + timedelta(minutes=SESSION_TTL_MINUTES)
            return session

    def _set_session(self, session_id: str, session: Dict):
        """设置会话"""
        with _sessions_lock:
            _sessions[session_id] = session

    def start_session(self, user_id: str) -> dict:
        """
        开始新的灵感会话

        Returns:
            第一个问题的数据
        """
        # 先清理过期会话
        self._cleanup_expired_sessions()
        
        session_id = str(uuid4())
        now = datetime.now()

        # 创建会话（带过期时间）
        session = {
            "user_id": user_id,
            "current_step": 1,
            "answers": {},
            "questions_history": [self.FIRST_QUESTION],
            "is_complete": False,
            "created_at": now.isoformat(),
            "expires_at": now + timedelta(minutes=SESSION_TTL_MINUTES),
        }
        self._set_session(session_id, session)

        # 返回第一个问题
        return {
            "session_id": session_id,
            "step": 1,
            "question": self.FIRST_QUESTION["question"],
            "type": self.FIRST_QUESTION["type"],
            "options": self.FIRST_QUESTION.get("options"),
            "hint": self.FIRST_QUESTION["hint"],
            "suggestions": self.FIRST_QUESTION.get("suggestions", []),
            "total_steps": self.MAX_QUESTIONS,
            "progress": 0.0
        }

    async def submit_answer_and_next(self, session_id: str, answer: str) -> dict:
        """
        提交答案并获取 AI 生成的下一个问题
        
        优化：合并 LLM 调用，一次请求同时判断是否结束 + 生成下一个问题

        Args:
            session_id: 会话 ID
            answer: 用户答案

        Returns:
            NextQuestionData (is_last=False) 或 CompletedData (is_last=True)
        """
        # 验证会话（使用带过期检查的方法）
        session = self._get_session(session_id)
        if session is None:
            raise ValueError("会话不存在或已过期")

        current_step = session["current_step"]

        # 保存答案
        session["answers"][current_step] = answer

        # 达到最大问题数，强制结束
        if current_step >= self.MAX_QUESTIONS:
            session["is_complete"] = True
            return {
                "step": current_step,
                "is_last": True,
                "total_steps": current_step,
                "progress": 1.0,
                "completed_message": "信息收集完成，可以生成故事雏形了"
            }

        # 未达到最小问题数，直接生成下一个问题（不需要判断是否结束）
        if current_step < self.MIN_QUESTIONS:
            next_question = await self._generate_next_question_only(session)
            session["current_step"] = current_step + 1
            session["questions_history"].append(next_question)
            progress = round(current_step / self.MAX_QUESTIONS, 2)
            
            return {
                "step": current_step + 1,
                "question": next_question["question"],
                "type": next_question["type"],
                "options": next_question.get("options"),
                "hint": next_question["hint"],
                "suggestions": next_question.get("suggestions", []),
                "is_last": False,
                "total_steps": self.MAX_QUESTIONS,
                "progress": progress
            }

        # 达到最小问题数后，合并调用：判断是否结束 + 生成下一个问题
        result = await self._check_and_generate_next(session)

        if result["should_complete"]:
            session["is_complete"] = True
            return {
                "step": current_step,
                "is_last": True,
                "total_steps": current_step,
                "progress": 1.0,
                "completed_message": "信息收集完成，可以生成故事雏形了"
            }

        # 使用返回的下一个问题
        next_question = result["next_question"]
        session["current_step"] = current_step + 1
        session["questions_history"].append(next_question)
        progress = round(current_step / self.MAX_QUESTIONS, 2)

        return {
            "step": current_step + 1,
            "question": next_question["question"],
            "type": next_question["type"],
            "options": next_question.get("options"),
            "hint": next_question["hint"],
            "suggestions": next_question.get("suggestions", []),
            "is_last": False,
            "total_steps": self.MAX_QUESTIONS,
            "progress": progress
        }

    async def _check_and_generate_next(self, session: dict) -> dict:
        """
        合并 LLM 调用：同时判断是否结束 + 生成下一个问题
        
        Returns:
            {
                "should_complete": bool,
                "next_question": {...}  # 当 should_complete=False 时有效
            }
        """
        answers = session["answers"]
        questions_history = session["questions_history"]
        current_step = session["current_step"]

        # 构建对话历史
        qa_pairs = []
        for i, q in enumerate(questions_history, 1):
            if i in answers:
                qa_pairs.append(f"问题{i}: {q['question']}\n回答{i}: {answers[i]}")

        system_prompt = """你是一个专业的故事创作引导助手。你需要完成两个任务：

1. 判断当前收集的信息是否足够生成故事框架
2. 如果信息不足，生成下一个问题

判断信息充足的标准：
- 是否明确了故事类型/风格
- 是否有主角的基本设定
- 是否有故事的核心冲突或主题
- 是否有基本的背景设定

生成问题的原则：
- 问题要有针对性，基于用户之前的回答深入挖掘
- 避免重复已经问过的内容
- 优先收集：故事类型、主角设定、核心冲突、背景设定、情节走向
- 问题要简洁明了，易于回答
- 提供 4-6 个推荐选项

**重要：必须输出纯 JSON 格式，不要包含任何其他文字。**

JSON 格式：
{
  "should_complete": true/false,
  "reason": "判断理由（简短）",
  "next_question": {
    "question": "问题内容",
    "type": "choice" 或 "text",
    "options": ["选项1", "选项2", ...],
    "hint": "简短提示",
    "suggestions": ["推荐1", "推荐2", ...]
  }
}

说明：
- should_complete=true 时，next_question 可以为 null
- type="choice": 用户必须从 options 中选择
- type="text": 用户可以自由输入，suggestions 提供快捷选项"""

        user_prompt = f"""当前是第 {current_step} 个问题，最多 {self.MAX_QUESTIONS} 个。

已有的对话：
{chr(10).join(qa_pairs)}

请判断信息是否充足，如果不充足则生成下一个问题。"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("LLM 返回空响应")

            # 清理并解析 JSON
            content = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', content)
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)

            data = json.loads(content)
            should_complete = data.get("should_complete", False)

            if should_complete:
                return {"should_complete": True, "next_question": None}

            # 解析下一个问题
            next_q = data.get("next_question", {})
            next_question = {
                "question": next_q.get("question", "请继续描述你的故事想法"),
                "type": next_q.get("type", "text"),
                "options": next_q.get("options", []),
                "hint": next_q.get("hint", "请根据你的想法回答"),
                "suggestions": next_q.get("suggestions", [])
            }

            return {"should_complete": False, "next_question": next_question}

        except Exception as e:
            logger.error(f"合并 LLM 调用失败: {e}")
            # 降级：默认继续提问，使用备用问题
            fallback = self._get_fallback_question(current_step + 1, answers)
            return {"should_complete": False, "next_question": fallback}

    async def _generate_next_question_only(self, session: dict) -> dict:
        """
        仅生成下一个问题（用于未达到 MIN_QUESTIONS 时）
        
        与原 _generate_next_question 逻辑相同，但不判断是否结束
        """
        return await self._generate_next_question(session)

    async def _generate_next_question(self, session: dict) -> dict:
        """
        AI 动态生成下一个问题

        Returns:
            {
                "question": "问题内容",
                "type": "choice" | "text",
                "options": [...],  # choice 类型时提供
                "hint": "提示",
                "suggestions": [...]  # text 类型时提供推荐选项
            }
        """
        answers = session["answers"]
        questions_history = session["questions_history"]
        current_step = session["current_step"]

        # 构建对话历史
        qa_pairs = []
        for i, q in enumerate(questions_history, 1):
            if i in answers:
                qa_pairs.append(f"问题{i}: {q['question']}\n回答{i}: {answers[i]}")

        system_prompt = """你是一个专业的故事创作引导助手。你的任务是根据用户之前的回答，生成下一个最有价值的问题来帮助构建故事框架。

生成问题的原则：
1. 问题要有针对性，基于用户之前的回答深入挖掘
2. 避免重复已经问过的内容
3. 优先收集：故事类型、主角设定、核心冲突、背景设定、情节走向
4. 问题要简洁明了，易于回答
5. 提供 4-6 个推荐选项，让用户可以快速选择或自定义

**重要：必须输出纯 JSON 格式，不要包含任何其他文字。**

JSON 格式：
{
  "question": "问题内容",
  "type": "choice" 或 "text",
  "options": ["选项1", "选项2", ...],
  "hint": "简短提示",
  "suggestions": ["推荐1", "推荐2", ...]
}

说明：
- type="choice": 用户必须从 options 中选择，适合明确的分类问题
- type="text": 用户可以自由输入，suggestions 提供快捷选项参考"""

        user_prompt = f"""当前是第 {current_step + 1} 个问题（最多 {self.MAX_QUESTIONS} 个）。

已有的对话：
{chr(10).join(qa_pairs)}

请生成下一个问题，帮助进一步完善故事框架。记住：
1. 不要重复已问过的内容
2. 根据用户的回答方向深入挖掘
3. 提供 4-6 个有创意的推荐选项

只输出 JSON，不要有任何其他文字。"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("LLM 返回空响应")

            # 解析 JSON
            question_data = json.loads(content)

            # 验证必要字段
            if "question" not in question_data:
                raise ValueError("缺少 question 字段")

            # 规范化数据
            return {
                "question": question_data["question"],
                "type": question_data.get("type", "text"),
                "options": question_data.get("options", []),
                "hint": question_data.get("hint", "请根据你的想法回答"),
                "suggestions": question_data.get("suggestions", [])
            }

        except Exception as e:
            logger.error(f"AI 生成问题失败: {e}")
            # 降级到备用问题
            return self._get_fallback_question(current_step + 1, answers)

    def _get_fallback_question(self, step: int, answers: dict) -> dict:
        """
        备用问题池（当 AI 生成失败时使用）

        根据当前步骤和已收集的信息返回合适的备用问题
        """
        # 分析已收集的信息，选择未覆盖的主题
        has_genre = any("类型" in str(v) or "玄幻" in str(v) or "科幻" in str(v)
                        for v in answers.values())
        has_theme = any("主题" in str(v) or "复仇" in str(v) or "成长" in str(v)
                        for v in answers.values())
        has_protagonist = any("主角" in str(v) or "男" in str(v) or "女" in str(v)
                              for v in answers.values())
        has_background = any("背景" in str(v) or "时代" in str(v) or "地点" in str(v)
                             for v in answers.values())
        has_conflict = any("冲突" in str(v) or "挑战" in str(v) or "危机" in str(v)
                           for v in answers.values())
        has_development = any("发展" in str(v) or "走向" in str(v)
                              for v in answers.values())

        # 根据缺失信息选择问题
        if not has_theme:
            return {
                "question": "这个故事的核心主题是什么？",
                "type": "text",
                "options": [],
                "hint": "可以选择下方快捷选项，或自定义输入",
                "suggestions": ["复仇", "成长", "爱情", "探索", "正义", "自由", "救赎", "友情"]
            }
        elif not has_protagonist:
            return {
                "question": "主角是什么样的人？",
                "type": "text",
                "options": [],
                "hint": "可以选择下方快捷选项，或自定义输入",
                "suggestions": ["男性青年", "女性学生", "中年商人", "神秘旅人", "退休老兵", "少年天才"]
            }
        elif not has_background:
            return {
                "question": "故事发生在什么时代和地点？",
                "type": "text",
                "options": [],
                "hint": "可以选择下方快捷选项，或自定义输入",
                "suggestions": ["现代都市", "古代江湖", "未来星际", "异世大陆", "民国时期", "赛博朋克"]
            }
        elif not has_conflict:
            return {
                "question": "主角面临的最大挑战或冲突是什么？",
                "type": "text",
                "options": [],
                "hint": "可以选择下方快捷选项，或自定义输入",
                "suggestions": ["生存危机", "身份认同", "爱恨情仇", "权力斗争", "道德抉择", "命运对抗"]
            }
        elif not has_development:
            return {
                "question": "你希望故事如何发展？",
                "type": "choice",
                "options": ["热血成长", "悬疑推理", "情感纠葛", "冒险探索", "权谋斗争", "轻松日常"],
                "hint": "选择故事的主要发展方向",
                "suggestions": []
            }
        else:
            # 所有基础信息都有了，添加深度问题
            fallback_questions = [
                {
                    "question": "故事中是否需要特别的人物关系设定？",
                    "type": "text",
                    "options": [],
                    "hint": "如：师徒、仇敌、青梅竹马等",
                    "suggestions": ["师徒关系", "宿命仇敌", "青梅竹马", "亦师亦友", "血脉相连"]
                },
                {
                    "question": "故事的核心动机是什么？",
                    "type": "choice",
                    "options": ["变强突破", "守护重要的人", "寻找真相", "完成使命", "自由生活"],
                    "hint": "主角行动的根本原因",
                    "suggestions": []
                },
                {
                    "question": "你希望故事的基调是怎样的？",
                    "type": "choice",
                    "options": ["轻松愉快", "紧张刺激", "感人至深", "幽默搞笑", "深沉严肃"],
                    "hint": "选择整体氛围",
                    "suggestions": []
                }
            ]
            # 循环使用备用问题
            return fallback_questions[(step - 2) % len(fallback_questions)]

    async def generate_story_draft(self, session_id: str) -> dict:
        """
        根据对话生成故事雏形（使用 JSON mode + Pydantic 验证）

        Returns:
            StoryDraft 对象的 dict 表示
        """
        # 验证会话（使用带过期检查的方法）
        session = self._get_session(session_id)
        if session is None:
            raise ValueError("会话不存在或已过期")

        answers = session["answers"]

        # 构建用户输入摘要
        user_input = f"""类型：{answers.get(1, '未指定')}
核心主题：{answers.get(2, '未指定')}
主角：{answers.get(3, '未指定')}
背景：{answers.get(4, '未指定')}
核心冲突：{answers.get(5, '未指定')}
发展方向：{answers.get(6, '未指定')}"""

        # 系统提示词（明确要求 JSON 格式）
        system_prompt = """你是一位专业的故事策划师，擅长根据用户的创意构建完整的故事框架。

任务：根据用户提供的信息，生成一个完整的故事雏形。

要求：
1. 标题要吸引人，符合类型特点，提供 3 个不同风格的选择
2. 简介要简洁有力（200字左右），突出核心冲突和吸引点
3. 主角要有鲜明特点，包含姓名、角色定位、详细描述、性格特点（2-5个）、外貌、背景
4. 世界观要合理自洽，包含 2-3 个关键地点、1-2 个派系/组织、2-3 条世界规则、简要时间线
5. 大纲要有起承转合，根据故事类型生成合适的章节数（短篇 3-5 章，中篇 6-10 章，长篇 10-15 章），每章包含标题、大纲（100-200字）、关键事件、出场角色、情节线索
6. 标注 1-2 个关键章节（is_key_chapter=true），通常是开篇、高潮或结局

**重要：必须输出纯 JSON 格式，不要包含任何其他文字。直接从 { 开始，以 } 结束。**

JSON 格式如下：
{
  "title_suggestions": ["标题1", "标题2", "标题3"],
  "description": "故事简介（200字）",
  "protagonist": {
    "name": "建议名称",
    "role": "角色定位",
    "description": "详细描述",
    "traits": ["特点1", "特点2", "特点3"],
    "appearance": "外貌描述",
    "background": "背景故事"
  },
  "world_setting": {
    "locations": [{"name": "地点名", "description": "描述"}],
    "factions": [{"name": "派系名", "description": "描述"}],
    "rules": [{"name": "规则名", "description": "描述"}],
    "timeline": [{"time": "时间点", "event": "事件"}]
  },
  "outline": [
    {
      "chapter_number": 1,
      "title": "第一章：标题",
      "outline": "章节大纲（100-200字）",
      "key_events": ["事件1", "事件2"],
      "characters": ["角色1", "角色2"],
      "plot_lines": ["主线"],
      "is_key_chapter": true
    }
  ]
}"""

        user_prompt = f"""请根据以下信息生成故事雏形：

{user_input}

请生成完整的故事框架，包括标题建议、简介、主角设定、世界观和章节大纲。

记住：只输出 JSON，不要有任何其他文字。"""

        try:
            # 使用标准 JSON mode（兼容第三方端点）
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )

            # 获取响应内容
            content = response.choices[0].message.content

            if not content:
                raise ValueError("LLM 返回了空响应")

            # 清理可能的控制字符
            content = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', content)

            # 尝试提取 JSON（防止 LLM 在前后添加额外文字）
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)

            # 解析 JSON
            try:
                raw_data = json.loads(content)
            except json.JSONDecodeError as json_err:
                logger.error(f"JSON 解析失败: {json_err}")
                logger.error(f"原始内容前 500 字符: {content[:500]}")
                raise ValueError(f"AI 返回的 JSON 格式无效: {str(json_err)}")

            # 使用 Pydantic 验证和清理数据
            try:
                story_draft = StoryDraft.model_validate(raw_data)
                result = story_draft.model_dump()
            except Exception as validation_err:
                logger.error(f"Pydantic 验证失败: {validation_err}")
                logger.error(f"原始数据: {json.dumps(raw_data, ensure_ascii=False, indent=2)}")
                raise ValueError(f"AI 返回的数据结构不符合要求: {str(validation_err)}")

            # 保存生成结果到会话
            session["generated_draft"] = result

            logger.info(f"成功生成故事雏形，会话 ID: {session_id}")
            with _sessions_lock:
                logger.info(f"当前所有会话数: {len(_sessions)}")
            logger.info(f"会话中是否有 generated_draft: {'generated_draft' in session}")
            return result

        except Exception as e:
            logger.error(f"生成故事雏形失败: {str(e)}", exc_info=True)
            raise Exception(f"生成故事雏形失败: {str(e)}")
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """获取会话信息（使用带过期检查的方法）"""
        return self._get_session(session_id)
    
    def clear_session(self, session_id: str):
        """清除会话"""
        with _sessions_lock:
            if session_id in _sessions:
                del _sessions[session_id]
