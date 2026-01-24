"""
Shot Planner Service
为剧本片段规划镜头
"""

import logging
from typing import List
from pydantic import BaseModel
from openai import AsyncOpenAI
from ...config import settings
from ...utils import extract_json_from_llm_response

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
        # 构建角色信息，包含 ID 用于 LLM 匹配
        char_info = ""
        char_id_instruction = ""
        if available_characters:
            char_lines = []
            for c in available_characters:
                char_id = c.get('id', '')
                char_name = c.get('name', 'Unknown')
                char_desc = c.get('description', '')
                char_ref = c.get('reference_image', '')
                ref_hint = " [有参考图]" if char_ref else ""
                char_lines.append(f"- ID: {char_id} | 名称: {char_name}{ref_hint} | 描述: {char_desc}")
            char_info = "\n【可用角色列表】\n" + "\n".join(char_lines)
            char_id_instruction = """
【重要】角色匹配规则：
- character_ids 字段必须填写出现在该镜头中的角色 ID（从上方角色列表复制）
- 如果镜头中有角色出现，必须将其 ID 填入 character_ids 数组
- 有 [有参考图] 标记的角色，在 prompt 中详细描述其外观特征
- 确保角色描述在各镜头间保持一致"""

        system_prompt = f"""你是专业的漫画分镜师，擅长将剧本转化为视觉镜头。

任务：为给定的剧本片段设计2-5个漫画镜头。
{char_id_instruction}

【镜头参数说明】
- camera_angle: 俯视/仰视/平视/荷兰角
- shot_size: 特写/近景/中景/全景/远景
- panel_type: wide/medium/closeup/action/dialogue/transition
- character_ids: 出现在镜头中的角色 ID 列表（必填，从角色列表复制 ID）
- expression_types: 角色表情类型（如 happy, sad, angry, surprised）
- location_key: 场景位置标识符，用于场景去重
  - 使用简洁的英文标识，格式：location_type
  - 例如：classroom, hallway, rooftop, street, cafe, bedroom
  - 同一场景的不同角度使用相同的 location_key
  - 不同地点必须使用不同的 location_key

【输出格式】JSON 对象：
{{
  "shots": [
    {{
      "shot_order": 1,
      "camera_angle": "平视",
      "shot_size": "中景",
      "panel_type": "dialogue",
      "shot_description": "镜头内容描述（中文）",
      "composition_hint": "构图建议",
      "character_ids": ["uuid-1", "uuid-2"],
      "expression_types": ["neutral", "happy"],
      "location_key": "classroom",
      "prompt": "detailed image generation prompt in English, including character appearances",
      "negative_prompt": "blurry, low quality, distorted"
    }}
  ]
}}

【提示词撰写要求】
- 使用英文，逗号分隔的关键词格式
- 包含：场景环境、光线氛围、角色外观、动作姿态、构图视角
- 角色描述要具体：发色、服装、表情、姿势
- 保持同一角色在不同镜头中的外观描述一致

【分镜设计原则】
- 镜头之间要有节奏变化（远-中-近交替）
- 重要情节用特写强调情感
- 动作场景多用动态角度（仰视、荷兰角）
- 对话场景注意人物位置关系"""

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
            data = extract_json_from_llm_response(content)
            shots = data.get("shots", data) if isinstance(data, dict) else data

            return [
                ShotDesignOutput(**shot)
                for shot in shots
                if isinstance(shot, dict)
            ]

        except Exception as e:
            logger.error(f"镜头规划失败: {e}")
            raise
