"""
灵感模式服务 - AI 对话式故事构建
"""
from openai import AsyncOpenAI
from typing import Optional, Dict, List
from uuid import uuid4
from datetime import datetime
from ..config import settings
from ..schemas.inspiration import StoryDraft
import logging
import json
import re

logger = logging.getLogger(__name__)


class InspirationService:
    """灵感模式服务"""
    
    # 对话问题配置
    QUESTIONS = [
        {
            "step": 1,
            "question": "你想写什么类型的故事？",
            "type": "choice",
            "options": ["玄幻", "科幻", "现代", "历史", "悬疑", "言情", "武侠", "奇幻", "都市", "其他"],
            "hint": "选择一个最符合你想法的类型"
        },
        {
            "step": 2,
            "question": "这个故事的核心主题是什么？",
            "type": "text",
            "hint": "可以选择下方快捷选项，或自定义输入",
            "suggestions": ["复仇", "成长", "爱情", "探索", "正义", "自由", "救赎", "友情"]
        },
        {
            "step": 3,
            "question": "主角是什么样的人？",
            "type": "text",
            "hint": "可以选择下方快捷选项，或自定义输入",
            "suggestions": ["男性青年", "女性学生", "中年商人", "神秘旅人", "退休老兵", "少年天才"]
        },
        {
            "step": 4,
            "question": "故事发生在什么时代和地点？",
            "type": "text",
            "hint": "可以选择下方快捷选项，或自定义输入",
            "suggestions": ["现代都市", "古代江湖", "未来星际", "异世大陆", "民国时期", "赛博朋克"]
        },
        {
            "step": 5,
            "question": "主角面临的最大挑战或冲突是什么？",
            "type": "text",
            "hint": "可以选择下方快捷选项，或自定义输入",
            "suggestions": ["生存危机", "身份认同", "爱恨情仇", "权力斗争", "道德抉择", "命运对抗"]
        },
        {
            "step": 6,
            "question": "你希望故事如何发展？",
            "type": "choice",
            "options": ["热血成长", "悬疑推理", "情感纠葛", "冒险探索", "权谋斗争", "轻松日常"],
            "hint": "选择故事的主要发展方向"
        }
    ]
    
    # 临时存储会话（生产环境应使用 Redis）
    _sessions: Dict[str, Dict] = {}
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
        )
        self.model = settings.OPENAI_MODEL
    
    def start_session(self, user_id: str) -> dict:
        """
        开始新的灵感会话

        Returns:
            {
                "session_id": "uuid",
                "step": 1,
                "question": "...",
                "type": "choice" | "text",
                "options": [...],  # 仅 choice 类型
                "hint": "...",
                "total_steps": 6
            }
        """
        session_id = str(uuid4())

        # 创建会话
        self._sessions[session_id] = {
            "user_id": user_id,
            "current_step": 1,
            "answers": {},
            "created_at": datetime.now().isoformat()
        }

        # 返回第一个问题
        first_question = self.QUESTIONS[0]

        # 构建返回数据，只包含有值的字段
        result = {
            "session_id": session_id,
            "step": first_question["step"],
            "question": first_question["question"],
            "type": first_question["type"],
            "hint": first_question["hint"],
            "total_steps": len(self.QUESTIONS)
        }

        # 添加可选字段（如果存在）
        if "options" in first_question:
            result["options"] = first_question["options"]
        if "suggestions" in first_question:
            result["suggestions"] = first_question["suggestions"]

        return result
    
    def submit_answer_and_next(self, session_id: str, answer: str) -> dict:
        """
        提交答案并获取下一个问题
        
        Args:
            session_id: 会话 ID
            answer: 用户答案
        
        Returns:
            {
                "step": 2,
                "question": "...",
                "type": "choice" | "text",
                "options": [...],
                "hint": "...",
                "is_last": false
            }
        """
        # 验证会话
        if session_id not in self._sessions:
            raise ValueError("会话不存在或已过期")
        
        session = self._sessions[session_id]
        current_step = session["current_step"]
        
        # 保存答案
        session["answers"][current_step] = answer
        
        # 检查是否是最后一步
        if current_step >= len(self.QUESTIONS):
            return {
                "step": current_step,
                "is_last": True,
                "message": "所有问题已完成，可以生成故事雏形了",
                "total_steps": len(self.QUESTIONS)
            }
        
        # 移动到下一步
        session["current_step"] = current_step + 1
        next_question = self.QUESTIONS[current_step]  # 索引从 0 开始

        # 构建返回数据，只包含有值的字段
        result = {
            "step": next_question["step"],
            "question": next_question["question"],
            "type": next_question["type"],
            "hint": next_question["hint"],
            "is_last": False,  # 只要还在返回问题，就不是最后一步
            "total_steps": len(self.QUESTIONS)
        }

        # 添加可选字段（如果存在）
        if "options" in next_question:
            result["options"] = next_question["options"]
        if "suggestions" in next_question:
            result["suggestions"] = next_question["suggestions"]

        return result
    
    async def generate_story_draft(self, session_id: str) -> dict:
        """
        根据对话生成故事雏形（使用 JSON mode + Pydantic 验证）

        Returns:
            StoryDraft 对象的 dict 表示
        """
        # 验证会话
        if session_id not in self._sessions:
            raise ValueError("会话不存在或已过期")

        session = self._sessions[session_id]
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
            logger.info(f"当前所有会话: {list(self._sessions.keys())}")
            logger.info(f"会话中是否有 generated_draft: {'generated_draft' in session}")
            return result

        except Exception as e:
            logger.error(f"生成故事雏形失败: {str(e)}", exc_info=True)
            raise Exception(f"生成故事雏形失败: {str(e)}")
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """获取会话信息"""
        return self._sessions.get(session_id)
    
    def clear_session(self, session_id: str):
        """清除会话"""
        if session_id in self._sessions:
            del self._sessions[session_id]
