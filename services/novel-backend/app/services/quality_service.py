"""
质量评分服务 - LLM-based 多维度内容质量分析
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from openai import AsyncOpenAI
import logging
import json
from typing import Dict, Any
from uuid import UUID

from ..models import QualityScore
from ..config import settings

logger = logging.getLogger(__name__)


class QualityService:
    """
    章节质量评分服务

    使用 LLM 进行多维度内容质量分析:
    1. readability (可读性) - 语句流畅度、用词准确性
    2. emotional_depth (情感深度) - 情感描写丰富度、感染力
    3. pacing (节奏把控) - 叙事节奏、场景转换
    4. originality (原创性) - 创新性、重复度检测
    5. coherence (逻辑连贯性) - 情节合理性、前后呼应
    """

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.analyzer_version = "1.0"

    async def analyze_quality(
        self,
        version_id: UUID,
        content: str,
        db: AsyncSession
    ) -> QualityScore:
        """
        分析章节内容质量并保存评分

        Args:
            version_id: 版本ID
            content: 章节内容
            db: 数据库会话

        Returns:
            QualityScore: 质量评分对象
        """
        try:
            # 检查是否已有评分(如果有则更新)
            existing_score_result = await db.execute(
                select(QualityScore).where(QualityScore.version_id == version_id)
            )
            existing_score = existing_score_result.scalar_one_or_none()

            # 调用 LLM 进行质量分析
            analysis_result = await self._analyze_with_llm(content)

            if existing_score:
                # 更新现有评分
                existing_score.overall_score = analysis_result["overall_score"]
                existing_score.dimensions = analysis_result["dimensions"]
                existing_score.suggestions = analysis_result["suggestions"]
                existing_score.analyzer_version = self.analyzer_version

                await db.commit()
                await db.refresh(existing_score)

                return existing_score
            else:
                # 创建新评分
                quality_score = QualityScore(
                    version_id=version_id,
                    overall_score=analysis_result["overall_score"],
                    dimensions=analysis_result["dimensions"],
                    suggestions=analysis_result["suggestions"],
                    analyzer_version=self.analyzer_version
                )

                db.add(quality_score)
                await db.commit()
                await db.refresh(quality_score)

                return quality_score

        except Exception as e:
            logger.error(f"质量分析失败: {str(e)}", exc_info=True)
            raise

    async def _analyze_with_llm(self, content: str) -> Dict[str, Any]:
        """
        使用 LLM 分析内容质量

        Args:
            content: 章节内容

        Returns:
            包含 overall_score, dimensions, suggestions 的字典
        """
        system_prompt = """你是一位专业的小说内容质量评估专家。你需要从以下五个维度对小说章节内容进行评分(0-100分):

1. readability (可读性)
   - 语句流畅度、用词准确性
   - 标点符号使用规范性
   - 段落结构合理性

2. emotional_depth (情感深度)
   - 情感描写的丰富度
   - 人物内心刻画深度
   - 情感感染力

3. pacing (节奏把控)
   - 叙事节奏是否合适
   - 场景转换是否自然
   - 剧情推进速度

4. originality (原创性)
   - 情节创新性
   - 人物塑造独特性
   - 避免陈词滥调

5. coherence (逻辑连贯性)
   - 情节前后呼应
   - 逻辑自洽性
   - 伏笔铺陈合理性

请以 JSON 格式返回评分结果,格式如下:
{
  "overall_score": 85,
  "dimensions": {
    "readability": {
      "score": 90,
      "details": "语句通顺流畅,用词准确,段落结构清晰"
    },
    "emotional_depth": {
      "score": 80,
      "details": "情感描写较为丰富,但人物内心刻画可以更深入"
    },
    "pacing": {
      "score": 85,
      "details": "节奏把控得当,场景转换自然"
    },
    "originality": {
      "score": 75,
      "details": "情节较有新意,但部分桥段略显套路"
    },
    "coherence": {
      "score": 90,
      "details": "逻辑连贯,前后呼应良好"
    }
  },
  "suggestions": [
    {
      "dimension": "emotional_depth",
      "suggestion": "可以增加更多人物内心独白,丰富情感层次",
      "priority": "high"
    },
    {
      "dimension": "originality",
      "suggestion": "避免使用「突然」等过于常见的转折词,尝试更自然的叙事方式",
      "priority": "medium"
    }
  ]
}

注意:
- overall_score 是五个维度的加权平均分(可读性和逻辑连贯性权重更高)
- 每个维度的 score 范围是 0-100
- suggestions 数组包含具体的改进建议,priority 可以是 high/medium/low
- 只返回 JSON,不要包含其他解释性文字
"""

        user_prompt = f"""请对以下小说章节内容进行质量评估:

{content}

字数统计: {len(content)} 字"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # 使用 cost-effective 模型
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # 降低温度保证评分一致性
                max_tokens=1500,
                response_format={"type": "json_object"}  # 强制返回 JSON
            )

            result_text = response.choices[0].message.content
            result = json.loads(result_text)

            # 验证结果格式
            if not all(key in result for key in ["overall_score", "dimensions", "suggestions"]):
                raise ValueError("LLM 返回结果格式不正确")

            # 确保 overall_score 在有效范围内
            result["overall_score"] = max(0, min(100, result["overall_score"]))

            logger.info(f"LLM 质量分析完成: overall_score={result['overall_score']}")

            return result

        except json.JSONDecodeError as e:
            logger.error(f"LLM 返回的 JSON 格式无效: {str(e)}")
            # 返回默认评分
            return self._get_default_score()
        except Exception as e:
            logger.error(f"LLM 调用失败: {str(e)}", exc_info=True)
            # 返回默认评分
            return self._get_default_score()

    def _get_default_score(self) -> Dict[str, Any]:
        """
        获取默认评分(LLM 调用失败时使用)

        Returns:
            默认评分字典
        """
        return {
            "overall_score": 70,
            "dimensions": {
                "readability": {
                    "score": 70,
                    "details": "暂未分析"
                },
                "emotional_depth": {
                    "score": 70,
                    "details": "暂未分析"
                },
                "pacing": {
                    "score": 70,
                    "details": "暂未分析"
                },
                "originality": {
                    "score": 70,
                    "details": "暂未分析"
                },
                "coherence": {
                    "score": 70,
                    "details": "暂未分析"
                }
            },
            "suggestions": [
                {
                    "dimension": "system",
                    "suggestion": "质量分析服务暂时不可用,请稍后重试",
                    "priority": "low"
                }
            ]
        }
