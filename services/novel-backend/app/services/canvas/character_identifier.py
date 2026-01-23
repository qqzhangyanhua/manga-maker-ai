"""
Character Identifier Service
使用 LLM 从对话/描述中自动识别角色
"""

import logging
import json
from typing import List, Optional
from pydantic import BaseModel
from openai import AsyncOpenAI
from ...config import settings
from ...utils import extract_json_from_llm_response

logger = logging.getLogger(__name__)


class CharacterIdentification(BaseModel):
    """角色识别结果"""
    character_name: str
    confidence: float  # 0.0 - 1.0
    reason: str  # 识别依据


class CharacterIdentificationResult(BaseModel):
    """角色识别响应"""
    identified_characters: List[CharacterIdentification]
    unmatched_names: List[str]  # 未能匹配到已知角色的名字
    matched_character_ids: List[str]  # 成功匹配的角色 ID


class CharacterIdentifier:
    """角色识别器"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
        self.model = settings.LLM_MODEL

    async def identify_characters(
        self,
        dialogue: Optional[str],
        scene_description: str,
        available_characters: List[dict],  # [{"id": "uuid", "name": "小明", "description": "..."}]
    ) -> CharacterIdentificationResult:
        """
        从对话和场景描述中识别角色

        Args:
            dialogue: 对话内容
            scene_description: 场景描述
            available_characters: 可用角色列表 (包含 id, name, description)

        Returns:
            角色识别结果
        """
        if not available_characters:
            return CharacterIdentificationResult(
                identified_characters=[],
                unmatched_names=[],
                matched_character_ids=[],
            )

        # 构建角色名称映射
        character_name_map = {
            char["name"].lower(): char for char in available_characters
        }
        # 也添加原始名称映射（不转小写）
        character_name_exact_map = {
            char["name"]: char for char in available_characters
        }

        system_prompt = """你是漫画制作助手，负责从对话和场景描述中识别出场角色。

给定一段对话和场景描述，以及可用的角色列表，请识别出在场的角色。

注意：
1. 只识别明确出现或被提及的角色
2. 对话中说话的角色一定在场
3. 被呼唤名字的角色很可能在场
4. 场景描述中提到的角色在场
5. 不要凭空猜测，只识别有明确依据的角色

输出 JSON 格式：
{
  "characters": [
    {
      "name": "角色名",
      "confidence": 0.95,
      "reason": "在对话中说了'...'"
    }
  ],
  "unknown_names": ["未知角色A"]  // 提到但不在角色列表中的名字
}"""

        character_list_text = "\n".join([
            f"- {char['name']}: {char.get('description', '无描述')[:100]}"
            for char in available_characters
        ])

        user_prompt = f"""场景描述：{scene_description or '无'}

对话内容：
{dialogue or '无对话'}

可用角色列表：
{character_list_text}

请识别在场的角色（仅输出 JSON）："""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                logger.warning("LLM 返回空内容")
                return self._empty_result()

            result = extract_json_from_llm_response(content)
            characters_data = result.get("characters", [])
            unknown_names = result.get("unknown_names", [])

            # 匹配角色 ID
            identified = []
            matched_ids = []

            for char_data in characters_data:
                char_name = char_data.get("name", "")
                confidence = float(char_data.get("confidence", 0.5))
                reason = char_data.get("reason", "")

                # 尝试匹配角色
                matched_char = (
                    character_name_exact_map.get(char_name) or
                    character_name_map.get(char_name.lower())
                )

                if matched_char:
                    identified.append(CharacterIdentification(
                        character_name=matched_char["name"],
                        confidence=confidence,
                        reason=reason,
                    ))
                    matched_ids.append(matched_char["id"])
                else:
                    # 未能匹配，加入未知列表
                    if char_name and char_name not in unknown_names:
                        unknown_names.append(char_name)

            logger.info(f"角色识别完成: 识别={len(identified)}, 未匹配={len(unknown_names)}")

            return CharacterIdentificationResult(
                identified_characters=identified,
                unmatched_names=unknown_names,
                matched_character_ids=matched_ids,
            )

        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}")
            return self._empty_result()
        except Exception as e:
            logger.error(f"角色识别失败: {e}")
            return self._empty_result()

    def _empty_result(self) -> CharacterIdentificationResult:
        """返回空结果"""
        return CharacterIdentificationResult(
            identified_characters=[],
            unmatched_names=[],
            matched_character_ids=[],
        )

    async def batch_identify(
        self,
        shots: List[dict],  # [{"shot_id": "...", "dialogue": "...", "description": "..."}]
        available_characters: List[dict],
    ) -> dict:
        """
        批量识别多个镜头中的角色

        Args:
            shots: 镜头列表
            available_characters: 可用角色列表

        Returns:
            {shot_id: CharacterIdentificationResult}
        """
        results = {}

        for shot in shots:
            shot_id = shot.get("shot_id", "")
            dialogue = shot.get("dialogue")
            description = shot.get("description", "")

            result = await self.identify_characters(
                dialogue=dialogue,
                scene_description=description,
                available_characters=available_characters,
            )
            results[shot_id] = result

        return results
