"""
大纲智能分析服务
提供爽点密度检测、节奏分析、开篇吸引力评分等功能
"""
from openai import AsyncOpenAI
from typing import Dict, Any, List
from ..config import settings
from .prompt_templates import NovelPromptTemplates
import logging
import json

logger = logging.getLogger(__name__)


class OutlineAnalyzer:
    """大纲智能分析器"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
        )
        self.model = settings.OPENAI_MODEL

    async def analyze_cool_points_density(
        self,
        chapters: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        分析爽点密度

        Args:
            chapters: 章节大纲列表

        Returns:
            {
                "overall_score": 85,
                "density_score": 90,
                "variety_score": 80,
                "rhythm_score": 85,
                "issues": [...],
                "suggestions": [...]
            }
        """
        try:
            system_prompt = NovelPromptTemplates.COOL_POINT_ANALYSIS

            # 构建章节上下文
            chapters_context = self._build_chapters_context(chapters)

            user_prompt = f"""章节大纲：
{chapters_context}

请分析爽点密度并给出评分和建议。"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            logger.info(f"爽点密度分析完成，总分：{result.get('overall_score', 0)}")
            return result

        except Exception as e:
            logger.error(f"爽点密度分析失败: {str(e)}", exc_info=True)
            raise Exception(f"爽点密度分析失败: {str(e)}")

    async def analyze_pacing(
        self,
        chapters: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        分析剧情节奏

        Args:
            chapters: 章节大纲列表

        Returns:
            {
                "overall_score": 80,
                "opening_pace": "快速",
                "middle_pace": "有张有弛",
                "climax_buildup": "充分",
                "issues": [...],
                "suggestions": [...]
            }
        """
        try:
            system_prompt = NovelPromptTemplates.PACING_ANALYSIS

            chapters_context = self._build_chapters_context(chapters)

            user_prompt = f"""章节大纲：
{chapters_context}

请分析剧情节奏并给出评分和建议。"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            logger.info(f"节奏分析完成，总分：{result.get('overall_score', 0)}")
            return result

        except Exception as e:
            logger.error(f"节奏分析失败: {str(e)}", exc_info=True)
            raise Exception(f"节奏分析失败: {str(e)}")

    async def analyze_opening_hook(
        self,
        chapters: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        评估开篇吸引力（黄金三章）

        Args:
            chapters: 章节大纲列表（至少前3章）

        Returns:
            {
                "overall_score": 85,
                "protagonist_appeal": 90,
                "golden_finger_reveal": 85,
                "conflict_setup": 80,
                "cool_points_density": 85,
                "hook_effectiveness": 90,
                "issues": [...],
                "suggestions": [...]
            }
        """
        try:
            system_prompt = NovelPromptTemplates.OPENING_HOOK_ANALYSIS

            # 只分析前三章
            first_three_chapters = chapters[:3]
            chapters_context = self._build_chapters_context(first_three_chapters)

            user_prompt = f"""前三章大纲：
{chapters_context}

请评估开篇吸引力（黄金三章法则）。"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            logger.info(f"开篇吸引力评估完成，总分：{result.get('overall_score', 0)}")
            return result

        except Exception as e:
            logger.error(f"开篇吸引力评估失败: {str(e)}", exc_info=True)
            raise Exception(f"开篇吸引力评估失败: {str(e)}")

    async def comprehensive_analysis(
        self,
        chapters: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        综合分析（爽点密度 + 节奏 + 开篇吸引力）

        Args:
            chapters: 章节大纲列表

        Returns:
            {
                "cool_points_analysis": {...},
                "pacing_analysis": {...},
                "opening_hook_analysis": {...},
                "overall_summary": {...}
            }
        """
        try:
            # 并发执行三项分析
            import asyncio

            cool_points_task = self.analyze_cool_points_density(chapters)
            pacing_task = self.analyze_pacing(chapters)
            opening_hook_task = self.analyze_opening_hook(chapters)

            cool_points_result, pacing_result, opening_hook_result = await asyncio.gather(
                cool_points_task,
                pacing_task,
                opening_hook_task
            )

            # 计算综合评分
            overall_score = round(
                (cool_points_result.get("overall_score", 0) +
                 pacing_result.get("overall_score", 0) +
                 opening_hook_result.get("overall_score", 0)) / 3
            )

            # 汇总所有问题和建议
            all_issues = (
                cool_points_result.get("issues", []) +
                pacing_result.get("issues", []) +
                opening_hook_result.get("issues", [])
            )

            all_suggestions = (
                cool_points_result.get("suggestions", []) +
                pacing_result.get("suggestions", []) +
                opening_hook_result.get("suggestions", [])
            )

            return {
                "cool_points_analysis": cool_points_result,
                "pacing_analysis": pacing_result,
                "opening_hook_analysis": opening_hook_result,
                "overall_summary": {
                    "overall_score": overall_score,
                    "total_issues": len(all_issues),
                    "total_suggestions": len(all_suggestions),
                    "recommendation": self._get_recommendation(overall_score)
                }
            }

        except Exception as e:
            logger.error(f"综合分析失败: {str(e)}", exc_info=True)
            raise Exception(f"综合分析失败: {str(e)}")

    def _build_chapters_context(self, chapters: List[Dict[str, Any]]) -> str:
        """构建章节上下文字符串"""
        context = ""
        for ch in chapters:
            context += f"\n第{ch.get('chapter_number', '?')}章《{ch.get('title', '未命名')}》\n"
            context += f"大纲：{ch.get('outline', '')}\n"

            key_events = ch.get('key_events', [])
            if key_events:
                context += f"关键事件：{', '.join(key_events)}\n"

            cool_points = ch.get('cool_points', [])
            if cool_points:
                context += "爽点："
                for cp in cool_points:
                    if isinstance(cp, dict):
                        context += f" [{cp.get('type', '')}] {cp.get('description', '')}"
                context += "\n"

            context += "\n"

        return context

    def _get_recommendation(self, score: int) -> str:
        """根据综合评分给出建议"""
        if score >= 90:
            return "优秀！大纲质量很高，可以直接开始创作。"
        elif score >= 80:
            return "良好！大纲基本合格，根据建议微调后即可开始创作。"
        elif score >= 70:
            return "及格！大纲存在一些问题，建议修改后再开始创作。"
        elif score >= 60:
            return "勉强及格！大纲问题较多，强烈建议重新规划。"
        else:
            return "不及格！大纲存在严重问题，建议推倒重来。"
