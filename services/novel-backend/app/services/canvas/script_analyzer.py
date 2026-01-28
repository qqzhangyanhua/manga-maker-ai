"""
Script Analyzer Service
将章节文本分析为剧本片段

P0-2: 支持长章节分段处理，避免截断丢失内容
"""

import logging
import re
from typing import List, Tuple
from pydantic import BaseModel
from openai import AsyncOpenAI
from ...config import settings
from ...utils import extract_json_from_llm_response

logger = logging.getLogger(__name__)

# P0-2: 分段处理配置
MAX_CHUNK_SIZE = 6000  # 每个分段的最大字符数（留余量给系统提示词）
MIN_CHUNK_SIZE = 1000  # 分段的最小字符数
OVERLAP_SIZE = 200     # 分段之间的重叠字符数，保证上下文连贯


from enum import Enum
from typing import Literal

# P2-3: 定义有效的情感基调枚举
VALID_EMOTION_TONES = ["紧张", "温馨", "激烈", "悲伤", "幽默", "平静", "神秘", "浪漫", "恐怖", "欢快"]

def normalize_emotion_tone(tone: str) -> str:
    """
    P2-3: 规范化情感基调字段
    
    Args:
        tone: 原始情感基调
        
    Returns:
        规范化后的情感基调（如果无法识别则返回 "平静"）
    """
    if not tone:
        return "平静"
    
    tone = tone.strip()
    
    # 直接匹配
    if tone in VALID_EMOTION_TONES:
        return tone
    
    # 尝试部分匹配
    tone_lower = tone.lower()
    mappings = {
        "紧张": ["紧张", "tension", "tense", "nervous"],
        "温馨": ["温馨", "温暖", "warm", "heartwarming"],
        "激烈": ["激烈", "激动", "intense", "exciting", "action"],
        "悲伤": ["悲伤", "悲痛", "sad", "sorrowful", "melancholy"],
        "幽默": ["幽默", "搞笑", "funny", "humor", "comedy"],
        "平静": ["平静", "平和", "calm", "peaceful", "quiet"],
        "神秘": ["神秘", "mysterious", "mystery"],
        "浪漫": ["浪漫", "romantic", "romance"],
        "恐怖": ["恐怖", "horror", "scary", "frightening"],
        "欢快": ["欢快", "欢乐", "happy", "joyful", "cheerful"],
    }
    
    for normalized, keywords in mappings.items():
        for keyword in keywords:
            if keyword in tone_lower:
                return normalized
    
    # 无法识别，返回默认值
    logger.warning(f"P2-3: 无法识别的 emotion_tone '{tone}'，使用默认值 '平静'")
    return "平静"


class ScriptSegmentOutput(BaseModel):
    """剧本片段输出"""
    segment_order: int
    content: str
    scene_description: str
    character_actions: str
    dialogue: str | None = None
    estimated_duration: int = 30
    emotion_tone: str = "平静"  # P2-3: 默认值改为有效值
    source_text_start: int = 0
    source_text_end: int = 0
    
    def __init__(self, **data):
        # P2-3: 在初始化时规范化 emotion_tone
        if "emotion_tone" in data:
            data["emotion_tone"] = normalize_emotion_tone(data["emotion_tone"])
        super().__init__(**data)


def split_chapter_into_chunks(content: str) -> List[Tuple[str, int, int]]:
    """
    P0-2: 将长章节按段落边界分割为多个分段
    
    Args:
        content: 章节文本内容
        
    Returns:
        分段列表，每个元素为 (chunk_text, start_index, end_index)
    """
    if len(content) <= MAX_CHUNK_SIZE:
        return [(content, 0, len(content))]
    
    chunks: List[Tuple[str, int, int]] = []
    
    # 按段落分割（双换行或单换行）
    paragraphs = re.split(r'\n\n+|\n', content)
    
    current_chunk = ""
    current_start = 0
    current_pos = 0
    
    for para in paragraphs:
        para_with_newline = para + "\n"
        
        # 如果加上这个段落后超过限制
        if len(current_chunk) + len(para_with_newline) > MAX_CHUNK_SIZE:
            # 如果当前分段已有内容，保存它
            if len(current_chunk) >= MIN_CHUNK_SIZE:
                chunk_end = current_pos
                chunks.append((current_chunk.strip(), current_start, chunk_end))
                
                # 新分段从重叠位置开始
                overlap_start = max(0, chunk_end - OVERLAP_SIZE)
                current_chunk = content[overlap_start:current_pos]
                current_start = overlap_start
            else:
                # 当前分段太小，继续添加
                current_chunk += para_with_newline
        else:
            current_chunk += para_with_newline
        
        current_pos += len(para_with_newline)
    
    # 保存最后一个分段
    if current_chunk.strip():
        chunks.append((current_chunk.strip(), current_start, len(content)))
    
    # 如果分段失败，回退到简单切分
    if not chunks:
        logger.warning("段落分割失败，使用简单切分")
        for i in range(0, len(content), MAX_CHUNK_SIZE - OVERLAP_SIZE):
            end = min(i + MAX_CHUNK_SIZE, len(content))
            chunks.append((content[i:end], i, end))
    
    logger.info(f"P0-2: 长章节分段完成，{len(content)} 字符 -> {len(chunks)} 个分段")
    return chunks


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
        
        P0-2: 支持长章节分段处理

        Args:
            chapter_content: 章节文本内容
            chapter_number: 章节号

        Returns:
            剧本片段列表
        """
        logger.info(f"开始剧本分析 - 章节{chapter_number}，内容长度: {len(chapter_content)}")
        
        # P0-2: 长章节分段处理
        chunks = split_chapter_into_chunks(chapter_content)
        
        if len(chunks) == 1:
            # 单个分段，直接处理
            return await self._analyze_single_chunk(
                chunks[0][0], 
                chapter_number, 
                1, 
                1,
                chunks[0][1],
                chunks[0][2]
            )
        
        # 多个分段，依次处理并合并
        logger.info(f"P0-2: 长章节需要分 {len(chunks)} 段处理")
        all_segments: List[ScriptSegmentOutput] = []
        
        for idx, (chunk_text, start_idx, end_idx) in enumerate(chunks):
            chunk_num = idx + 1
            logger.info(f"P0-2: 处理分段 {chunk_num}/{len(chunks)}，字符范围 [{start_idx}, {end_idx}]")
            
            chunk_segments = await self._analyze_single_chunk(
                chunk_text,
                chapter_number,
                chunk_num,
                len(chunks),
                start_idx,
                end_idx
            )
            
            # 调整 segment_order 并合并
            base_order = len(all_segments)
            for seg in chunk_segments:
                seg.segment_order = base_order + seg.segment_order
                seg.source_text_start = start_idx + seg.source_text_start
                seg.source_text_end = min(end_idx, start_idx + seg.source_text_end)
                all_segments.append(seg)
        
        logger.info(f"P0-2: 长章节处理完成，共生成 {len(all_segments)} 个剧本片段")
        return all_segments

    async def _analyze_single_chunk(
        self,
        chunk_content: str,
        chapter_number: int,
        chunk_number: int,
        total_chunks: int,
        source_start: int,
        source_end: int,
    ) -> List[ScriptSegmentOutput]:
        """
        分析单个文本分段
        
        Args:
            chunk_content: 分段文本内容
            chapter_number: 章节号
            chunk_number: 分段序号
            total_chunks: 总分段数
            source_start: 源文本起始位置
            source_end: 源文本结束位置
            
        Returns:
            剧本片段列表
        """
        # 根据是否为多分段调整提示词
        chunk_context = ""
        if total_chunks > 1:
            chunk_context = f"\n\n注意：这是第{chapter_number}章的第{chunk_number}/{total_chunks}部分，请确保与其他部分保持连贯性。"
        
        system_prompt = f"""你是专业的漫画剧本编剧，擅长将小说文本转化为适合漫画表现的剧本片段。

任务：将给定的小说章节文本拆分为3-8个剧本片段，每个片段应该：
1. 包含一个完整的场景或动作序列
2. 适合用2-5个漫画分镜来表现
3. 有清晰的视觉描述

输出格式（JSON对象）：
{{
  "segments": [
    {{
      "segment_order": 1,
      "content": "剧本文本概述",
      "scene_description": "场景描述（地点、时间、氛围）",
      "character_actions": "角色动作描述",
      "dialogue": "对白内容（如有）",
      "estimated_duration": 30,
      "emotion_tone": "紧张/温馨/激烈/悲伤/幽默/平静"
    }}
  ]
}}

要求：
- 保持故事的连贯性
- 每个片段独立但相互关联
- 对白要精简，适合漫画气泡
- 动作描述要具体，便于绘制{chunk_context}"""

        user_prompt = f"""请分析以下第{chapter_number}章的内容，将其拆分为剧本片段：

{chunk_content}"""

        try:
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
            data = extract_json_from_llm_response(content)
            logger.info(f"解析 JSON 成功，数据类型: {type(data)}, 键: {data.keys() if isinstance(data, dict) else 'N/A'}")

            segments = data.get("segments", data) if isinstance(data, dict) else data
            logger.info(f"提取片段，类型: {type(segments)}, 长度: {len(segments) if isinstance(segments, (list, dict)) else 'N/A'}")

            if isinstance(segments, dict):
                logger.warning(f"segments 是字典而非列表，尝试转换。字典键: {segments.keys()}")
                segments = list(segments.values()) if segments else []

            parsed_segments = [
                ScriptSegmentOutput(**seg)
                for seg in segments
                if isinstance(seg, dict)
            ]

            logger.info(f"分段 {chunk_number} 分析完成，生成 {len(parsed_segments)} 个片段")
            return parsed_segments

        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}, 原始内容: {content[:500] if content else 'None'}")
            raise
        except Exception as e:
            logger.error(f"剧本分析失败: {e}", exc_info=True)
            raise
