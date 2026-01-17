"""
Script Analyzer Service
将章节文本分析为剧本片段
"""

import logging
from typing import List
from pydantic import BaseModel
from openai import AsyncOpenAI
from ...config import settings

logger = logging.getLogger(__name__)


class ScriptSegmentOutput(BaseModel):
    """剧本片段输出"""
    segment_order: int
    content: str
    scene_description: str
    character_actions: str
    dialogue: str | None = None
    estimated_duration: int = 30
    emotion_tone: str = ""
    source_text_start: int = 0
    source_text_end: int = 0


class ScriptAnalyzer:
    """剧本分析器"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
        self.model = settings.LLM_MODEL

    async def analyze_chapter(
        self,
        chapter_content: str,
        chapter_number: int = 1,
    ) -> List[ScriptSegmentOutput]:
        """
        将章节文本分析为剧本片段

        Args:
            chapter_content: 章节文本内容
            chapter_number: 章节号

        Returns:
            剧本片段列表
        """
        system_prompt = """你是专业的漫画剧本编剧，擅长将小说文本转化为适合漫画表现的剧本片段。

任务：将给定的小说章节文本拆分为3-8个剧本片段，每个片段应该：
1. 包含一个完整的场景或动作序列
2. 适合用2-5个漫画分镜来表现
3. 有清晰的视觉描述

输出格式（JSON数组）：
[
  {
    "segment_order": 1,
    "content": "剧本文本概述",
    "scene_description": "场景描述（地点、时间、氛围）",
    "character_actions": "角色动作描述",
    "dialogue": "对白内容（如有）",
    "estimated_duration": 30,
    "emotion_tone": "紧张/温馨/激烈/悲伤/幽默"
  }
]

要求：
- 保持故事的连贯性
- 每个片段独立但相互关联
- 对白要精简，适合漫画气泡
- 动作描述要具体，便于绘制"""

        user_prompt = f"""请分析以下第{chapter_number}章的内容，将其拆分为剧本片段：

{chapter_content[:8000]}"""

        try:
            logger.info(f"开始剧本分析 - 章节{chapter_number}，内容长度: {len(chapter_content)}")

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            logger.info(f"LLM 响应内容长度: {len(content) if content else 0}")

            if not content:
                logger.warning("LLM 返回空内容")
                return []

            import json
            data = json.loads(content)
            logger.info(f"解析 JSON 成功，数据类型: {type(data)}, 键: {data.keys() if isinstance(data, dict) else 'N/A'}")

            segments = data.get("segments", data) if isinstance(data, dict) else data
            logger.info(f"提取片段，类型: {type(segments)}, 长度: {len(segments) if isinstance(segments, (list, dict)) else 'N/A'}")

            if isinstance(segments, dict):
                logger.warning(f"segments 是字典而非列表，尝试转换。字典键: {segments.keys()}")
                # 如果 segments 本身是字典，可能需要再取一次
                segments = list(segments.values()) if segments else []

            parsed_segments = [
                ScriptSegmentOutput(**seg)
                for seg in segments
                if isinstance(seg, dict)
            ]

            logger.info(f"剧本分析完成，生成 {len(parsed_segments)} 个片段")
            return parsed_segments

        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}, 原始内容: {content[:500] if content else 'None'}")
            raise
        except Exception as e:
            logger.error(f"剧本分析失败: {e}", exc_info=True)
            raise
