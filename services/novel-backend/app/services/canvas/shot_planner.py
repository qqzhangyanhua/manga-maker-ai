"""
Shot Planner Service
为剧本片段规划镜头
"""

import logging
from typing import List
from pydantic import BaseModel
from openai import AsyncOpenAI
from ...config import settings

logger = logging.getLogger(__name__)


class ShotDesignOutput(BaseModel):
    """镜头设计输出"""
    shot_order: int
    camera_angle: str = "平视"
    shot_size: str = "中景"
    panel_type: str = "dialogue"
    shot_description: str
    composition_hint: str = ""
    character_ids: List[str] = []
    expression_types: List[str] = []
    prompt: str
    negative_prompt: str = ""
    location_key: str = ""  # 场景位置标识，用于去重（如 "classroom_A", "hallway_1F"）


class ShotPlanner:
    """镜头规划器"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
        self.model = settings.LLM_MODEL

    async def plan_shots(
        self,
        script_content: str,
        scene_description: str,
        character_actions: str,
        available_characters: List[dict] | None = None,
    ) -> List[ShotDesignOutput]:
        """
        为剧本片段规划镜头

        Args:
            script_content: 剧本内容
            scene_description: 场景描述
            character_actions: 角色动作
            available_characters: 可用角色列表

        Returns:
            镜头设计列表
        """
        char_info = ""
        if available_characters:
            char_info = "\n可用角色：\n" + "\n".join(
                f"- {c.get('name', 'Unknown')}: {c.get('description', '')}"
                for c in available_characters
            )

        system_prompt = """你是专业的漫画分镜师。

任务：为给定的剧本片段设计2-5个漫画镜头。

镜头参数说明：
- camera_angle: 俯视/仰视/平视/荷兰角
- shot_size: 特写/近景/中景/全景/远景
- panel_type: wide/medium/closeup/action/dialogue/transition
- location_key: 场景位置标识符，用于场景去重
  - 使用简洁的英文标识，格式：location_type
  - 例如：classroom, hallway, rooftop, street, cafe, bedroom
  - 同一场景的不同角度使用相同的 location_key
  - 不同地点必须使用不同的 location_key

输出格式（JSON数组）：
[
  {
    "shot_order": 1,
    "camera_angle": "平视",
    "shot_size": "中景",
    "panel_type": "dialogue",
    "shot_description": "镜头内容描述",
    "composition_hint": "构图建议",
    "location_key": "classroom",
    "prompt": "图像生成提示词（英文）",
    "negative_prompt": "负面提示词"
  }
]

要求：
- 镜头之间要有节奏变化
- 重要情节用特写强调
- 动作场景多用动态角度
- 提示词要具体、详细、英文
- location_key 必须填写，同一地点的镜头使用相同的 key"""

        user_prompt = f"""剧本内容：
{script_content}

场景：{scene_description}
动作：{character_actions}
{char_info}

请设计分镜。"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=3000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                return []

            import json
            data = json.loads(content)
            shots = data.get("shots", data) if isinstance(data, dict) else data

            return [
                ShotDesignOutput(**shot)
                for shot in shots
                if isinstance(shot, dict)
            ]

        except Exception as e:
            logger.error(f"镜头规划失败: {e}")
            raise
