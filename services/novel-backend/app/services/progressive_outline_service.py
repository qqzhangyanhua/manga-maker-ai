"""
渐进式大纲生成服务
实现10步工作流的前半段（概念 -> 结构 -> 详细大纲 -> 场景清单）
"""
from openai import AsyncOpenAI
from typing import Optional, Dict, Any
from ..config import settings
from .prompt_templates import NovelPromptTemplates
import logging
import json

logger = logging.getLogger(__name__)


class ProgressiveOutlineService:
    """渐进式大纲生成服务"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
        )
        self.model = settings.OPENAI_MODEL

    async def generate_concept(
        self,
        premise: str,
        genre: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Step 1: 生成一句话概念

        Args:
            premise: 故事前提/描述
            genre: 类型（可选）

        Returns:
            {"concept": "一句话概括"}
        """
        try:
            system_prompt = NovelPromptTemplates.get_progressive_prompt("concept")

            user_prompt = f"""故事前提：{premise}"""
            if genre:
                user_prompt += f"\n类型：{genre}"

            user_prompt += "\n\n请生成一句话概括。"

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
                max_tokens=200,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            logger.info(f"成功生成概念：{result.get('concept', '')}")
            return result

        except Exception as e:
            logger.error(f"概念生成失败: {str(e)}", exc_info=True)
            raise Exception(f"概念生成失败: {str(e)}")

    async def generate_structure(
        self,
        concept: str,
        premise: str,
        genre: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Step 2: 生成三幕式结构（五句话）

        Args:
            concept: 一句话概念
            premise: 故事前提
            genre: 类型（可选）

        Returns:
            {
                "structure": {
                    "act1_setup": "...",
                    "act2_disaster1": "...",
                    "act2_disaster2": "...",
                    "act2_disaster3": "...",
                    "act3_resolution": "...",
                    "moral_premise": "..."
                }
            }
        """
        try:
            system_prompt = NovelPromptTemplates.get_progressive_prompt("structure")

            user_prompt = f"""故事概念：{concept}

故事前提：{premise}"""
            if genre:
                user_prompt += f"\n类型：{genre}"

            user_prompt += "\n\n请生成三幕式结构。"

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
                max_tokens=1000,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            logger.info(f"成功生成三幕式结构")
            return result

        except Exception as e:
            logger.error(f"结构生成失败: {str(e)}", exc_info=True)
            raise Exception(f"结构生成失败: {str(e)}")

    async def generate_detailed_outline(
        self,
        structure: Dict[str, Any],
        premise: str,
        characters: Optional[list] = None,
        world_setting: Optional[Dict] = None,
        chapter_count: int = 10,
        style: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Step 3: 生成详细章节大纲

        Args:
            structure: 三幕式结构
            premise: 故事前提
            characters: 角色列表
            world_setting: 世界观
            chapter_count: 目标章节数
            style: 风格要求

        Returns:
            {"chapters": [...]}
        """
        try:
            system_prompt = NovelPromptTemplates.get_progressive_prompt("detailed")

            # 构建用户提示词
            user_prompt = f"""故事前提：{premise}

三幕式结构：
- 第一幕（建立）：{structure['structure']['act1_setup']}
- 困境1：{structure['structure']['act2_disaster1']}
- 困境2：{structure['structure']['act2_disaster2']}
- 困境3：{structure['structure']['act2_disaster3']}
- 第三幕（解决）：{structure['structure']['act3_resolution']}
- 道德主题：{structure['structure']['moral_premise']}

期望章节数：{chapter_count}"""

            # 添加角色信息
            if characters and len(characters) > 0:
                user_prompt += "\n\n角色设定：\n"
                for char in characters:
                    if isinstance(char, dict):
                        name = char.get("name", "未命名")
                        role = char.get("role", "")
                        description = char.get("description", "")
                        user_prompt += f"- {name}（{role}）：{description}\n"

            # 添加世界观信息
            if world_setting and isinstance(world_setting, dict):
                # ✨ 地点 - 包含详细描述
                if world_setting.get("locations"):
                    user_prompt += "\n\n世界观-地点：\n"
                    for loc in world_setting["locations"]:
                        if isinstance(loc, dict):
                            name = loc.get('name', '')
                            description = loc.get('description', '')
                            if name:
                                user_prompt += f"- {name}：{description}\n"

                # ✨ 派系/组织
                if world_setting.get("factions"):
                    user_prompt += "\n\n世界观-派系/组织：\n"
                    for faction in world_setting["factions"]:
                        if isinstance(faction, dict):
                            name = faction.get('name', '')
                            description = faction.get('description', '')
                            leader = faction.get('leader', '')
                            if name:
                                faction_text = f"- {name}：{description}"
                                if leader:
                                    faction_text += f" (领导: {leader})"
                                user_prompt += faction_text + "\n"

                # ✨ 规则 - 兼容 title/content 和 name/description 字段
                if world_setting.get("rules"):
                    user_prompt += "\n\n世界观-规则：\n"
                    for rule in world_setting["rules"]:
                        if isinstance(rule, dict):
                            # 兼容前端的 title/content 字段
                            name = rule.get('name') or rule.get('title', '')
                            description = rule.get('description') or rule.get('content', '')
                            if name:
                                user_prompt += f"- {name}：{description}\n"

                # ✨ 时间线
                if world_setting.get("timeline"):
                    user_prompt += "\n\n世界观-时间线：\n"
                    for event in world_setting["timeline"]:
                        if isinstance(event, dict):
                            date = event.get('date') or event.get('year', '')
                            evt = event.get('event', '')
                            if date and evt:
                                user_prompt += f"- {date}: {evt}\n"

            if style:
                user_prompt += f"\n\n风格要求：{style}"

            user_prompt += "\n\n请生成详细的章节大纲。"

            # 调用 OpenAI API
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

            result = json.loads(response.choices[0].message.content)

            # 验证和规范化数据
            if "chapters" not in result:
                raise ValueError("AI 返回的数据格式不正确")

            # 确保每章都有必需的字段
            for i, chapter in enumerate(result["chapters"]):
                chapter["chapter_number"] = i + 1
                chapter.setdefault("title", f"第{i + 1}章")
                chapter.setdefault("outline", "")
                chapter.setdefault("key_events", [])
                chapter.setdefault("characters", [])
                chapter.setdefault("plot_lines", [])
                chapter.setdefault("is_key_chapter", False)
                chapter.setdefault("word_count_target", 6000)
                chapter.setdefault("cool_points", [])
                chapter.setdefault("pacing", "适中")
                chapter.setdefault("scene_allocation", "")

            logger.info(f"成功生成 {len(result['chapters'])} 章详细大纲")
            return result

        except Exception as e:
            logger.error(f"详细大纲生成失败: {str(e)}", exc_info=True)
            raise Exception(f"详细大纲生成失败: {str(e)}")

    async def generate_scene_breakdown(
        self,
        chapters: list
    ) -> Dict[str, Any]:
        """
        Step 4: 将章节大纲拆分为场景清单

        Args:
            chapters: 章节大纲列表

        Returns:
            {"scenes": [...]}
        """
        try:
            system_prompt = NovelPromptTemplates.get_progressive_prompt("scene")

            # 构建章节上下文
            chapters_context = ""
            for ch in chapters[:10]:  # 限制前10章避免上下文过长
                chapters_context += f"\n第{ch['chapter_number']}章《{ch['title']}》\n"
                chapters_context += f"大纲：{ch['outline']}\n"
                chapters_context += f"关键事件：{', '.join(ch.get('key_events', []))}\n"

            user_prompt = f"""章节大纲：
{chapters_context}

请将上述章节拆分为场景清单。"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)

            # 验证数据
            if "scenes" not in result:
                raise ValueError("AI 返回的数据格式不正确")

            logger.info(f"成功生成 {len(result['scenes'])} 个场景")
            return result

        except Exception as e:
            logger.error(f"场景拆分失败: {str(e)}", exc_info=True)
            raise Exception(f"场景拆分失败: {str(e)}")
