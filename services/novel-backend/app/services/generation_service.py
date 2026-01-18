"""
AI 文本生成服务
"""
from openai import AsyncOpenAI
from typing import AsyncGenerator, Optional
from ..config import settings
from .prompt_templates import NovelPromptTemplates
import logging

logger = logging.getLogger(__name__)


class NovelGenerationService:
    """小说生成服务"""
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
        )
        self.model = settings.OPENAI_MODEL
    
    async def generate_chapter_stream(
        self,
        context: str,
        chapter_outline: str,
        chapter_number: int = 1,
        style_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 12000,  # ✨ 提升到12000以确保6000字中文的输出空间
    ) -> AsyncGenerator[str, None]:
        """
        流式生成章节内容

        Args:
            context: 上下文（世界观、角色、前序章节等）
            chapter_outline: 当前章节大纲
            chapter_number: 章节号（用于判断是否前三章）
            style_prompt: 风格提示（可选）
            temperature: 温度参数
            max_tokens: 最大 token 数（12000 tokens ≈ 6000-9000 中文字）

        Yields:
            生成的文本片段
        """
        try:
            # 使用新的提示词模板
            system_prompt = NovelPromptTemplates.get_chapter_generation_prompt(
                chapter_number=chapter_number,
                style_prompt=style_prompt
            )

            # 构建用户提示词
            user_prompt = f"""{context}

【当前章节大纲】
{chapter_outline}

【写作约束】
1. 严格按大纲顺序完成关键事件，不新增主线或关键反转
2. 必须承接上下文设定，人物动机与因果链一致
3. 节奏紧凑，避免空转、重复回忆或纯描写拖字数
4. 本章正文不少于 6000 字（不含符号）

现在开始输出本章节正文：
"""

            # ✨ 添加调试日志：记录 prompt 详情
            logger.info(
                f"🤖 准备调用 LLM 生成章节 - "
                f"章节号: {chapter_number}, "
                f"system_prompt 长度: {len(system_prompt)} 字符, "
                f"user_prompt 长度: {len(user_prompt)} 字符, "
                f"context 长度: {len(context)} 字符, "
                f"max_tokens: {max_tokens}, "
                f"temperature: {temperature}"
            )

            # 📝 完整提示词日志（便于调试和审查）
            logger.info("=" * 80)
            logger.info("📋 System Prompt:")
            logger.info("-" * 80)
            logger.info(system_prompt)
            logger.info("=" * 80)
            logger.info("📋 User Prompt:")
            logger.info("-" * 80)
            logger.info(user_prompt)
            logger.info("=" * 80)
            logger.info(f"⚙️  API 参数: model={self.model}, temperature={temperature}, max_tokens={max_tokens}")
            logger.info("=" * 80)

            # 调用 OpenAI API（流式）
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            # 逐块返回
            async for chunk in stream:
                # 安全检查：确保 choices 列表不为空
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield delta.content

        except Exception as e:
            logger.error(f"章节生成失败: {str(e)}", exc_info=True)
            yield f"[生成失败: {str(e)}]"
    
    async def generate_outline(
        self,
        premise: str,
        characters: Optional[list] = None,
        world_setting: Optional[dict] = None,
        chapter_count: int = 10,
    ) -> str:
        """
        生成小说大纲
        
        Args:
            premise: 故事前提
            characters: 角色列表
            world_setting: 世界观设定
            chapter_count: 目标章节数
        
        Returns:
            生成的大纲（JSON 字符串）
        """
        try:
            system_prompt = """你是一位资深编剧，擅长构建故事大纲。

任务：根据故事前提，生成详细的章节大纲。

输出格式（JSON）：
{
  "chapters": [
    {
      "chapter_number": 1,
      "title": "章节标题",
      "outline": "章节大纲（100-200字）",
      "key_events": ["关键事件1", "关键事件2"],
      "characters": ["出场角色"]
    }
  ]
}"""
            
            # 构建上下文
            context_parts = [f"故事前提：{premise}"]
            
            if characters:
                context_parts.append(f"\n角色：{', '.join([c.get('name', '') for c in characters if isinstance(c, dict)])}")
            
            if world_setting:
                context_parts.append(f"\n世界观：{world_setting}")
            
            context_parts.append(f"\n目标章节数：{chapter_count}")
            
            user_prompt = "\n".join(context_parts)

            # 📝 记录大纲生成的完整提示词
            logger.info("=" * 80)
            logger.info(f"📋 生成大纲 - 章节数: {chapter_count}")
            logger.info("-" * 80)
            logger.info("System Prompt:")
            logger.info(system_prompt)
            logger.info("-" * 80)
            logger.info("User Prompt:")
            logger.info(user_prompt)
            logger.info("=" * 80)

            # 调用 API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
                max_tokens=3000,
            )
            
            return response.choices[0].message.content or ""
            
        except Exception as e:
            logger.error(f"大纲生成失败: {str(e)}")
            raise
    
    async def revise_content(
        self,
        original_content: str,
        revision_instruction: str,
    ) -> AsyncGenerator[str, None]:
        """
        修改章节内容（流式）
        
        Args:
            original_content: 原始内容
            revision_instruction: 修改指令
        
        Yields:
            修改后的文本片段
        """
        try:
            system_prompt = """你是一位专业的文字编辑，擅长根据指令修改文本。

任务：根据用户的修改指令，对原文进行调整。

要求：
1. 准确理解修改意图
2. 保持原文风格和基调
3. 只修改需要修改的部分
4. 确保修改后的内容流畅自然
5. **保持原文的段落格式**：段落之间用单个换行符（\n）分隔"""
            
            user_prompt = f"""原文：
{original_content}

修改指令：
{revision_instruction}

请输出修改后的完整内容。"""

            # 📝 记录内容修订的完整提示词
            logger.info("=" * 80)
            logger.info("📋 修订章节内容")
            logger.info("-" * 80)
            logger.info("System Prompt:")
            logger.info(system_prompt)
            logger.info("-" * 80)
            logger.info(f"User Prompt (原文长度: {len(original_content)} 字符):")
            logger.info(user_prompt[:500] + "..." if len(user_prompt) > 500 else user_prompt)
            logger.info("=" * 80)

            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
                max_tokens=4000,
                stream=True,
            )
            
            async for chunk in stream:
                # 安全检查：确保 choices 列表不为空
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield delta.content
                    
        except Exception as e:
            logger.error(f"内容修改失败: {str(e)}", exc_info=True)
            yield f"[修改失败: {str(e)}]"
    
    async def generate_outline(
        self,
        premise: str,
        characters: Optional[list] = None,
        world_setting: Optional[dict] = None,
        chapter_count: int = 10,
        style: Optional[str] = None,
        mode: str = "full",
        existing_outlines: Optional[list] = None,
        start_chapter: int = 1
    ) -> dict:
        """
        生成小说大纲

        Args:
            premise: 故事前提/描述
            characters: 角色列表
            world_setting: 世界观设定
            chapter_count: 期望章节数
            style: 风格偏好（可选）
            mode: 生成模式（"full" 完整生成 | "continue" 续写模式）
            existing_outlines: 现有章节大纲（续写模式使用）
            start_chapter: 起始章节号（续写模式使用）

        Returns:
            {
                "chapters": [
                    {
                        "chapter_number": 1,
                        "title": "章节标题",
                        "outline": "章节大纲（100-200字）",
                        "key_events": ["关键事件1", "关键事件2"],
                        "characters": ["出场角色"],
                        "plot_lines": ["主线1", "主线2"],
                        "is_key_chapter": false
                    }
                ]
            }
        """
        try:
            # 使用新的提示词模板
            chapter_range = (start_chapter, start_chapter + chapter_count - 1)
            system_prompt = NovelPromptTemplates.get_outline_system_prompt(
                mode=mode,
                chapter_range=chapter_range,
                style=style,
                include_golden_rules=True
            )

            # 构建用户提示词
            if mode == "continue" and existing_outlines:
                # 续写模式：包含现有章节上下文
                user_prompt = f"""故事背景：
{premise}

现有章节（参考上下文）：
"""
                for outline in existing_outlines:
                    ch_num = outline.get("chapter_number", "?")
                    ch_title = outline.get("title", "未命名")
                    ch_outline = outline.get("outline", "")
                    user_prompt += f"\n第 {ch_num} 章《{ch_title}》：\n{ch_outline}\n"

                user_prompt += f"\n\n续写要求：\n"
                user_prompt += f"- 从第 {start_chapter} 章开始生成\n"
                user_prompt += f"- 生成 {chapter_count} 个新章节\n"
                user_prompt += f"- 承接上述章节的剧情，保持连贯性\n"
                user_prompt += f"- 推进故事发展，不要重复现有内容\n"
            else:
                # 完整生成模式
                user_prompt = f"""故事前提：
{premise}

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

            user_prompt += "\n\n请生成详细的章节大纲。"

            # 📝 记录大纲生成的完整提示词
            logger.info("=" * 80)
            logger.info(f"📋 生成章节大纲 - 模式: {mode}, 章节数: {chapter_count}, 起始章节: {start_chapter}")
            logger.info("-" * 80)
            logger.info("System Prompt:")
            logger.info(system_prompt)
            logger.info("-" * 80)
            logger.info("User Prompt:")
            logger.info(user_prompt)
            logger.info("=" * 80)
            logger.info(f"⚙️  API 参数: model={self.model}, temperature=0.8, max_tokens=4000, response_format=json_object")
            logger.info("=" * 80)

            # 调用 OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
                max_tokens=4000,
                response_format={"type": "json_object"}  # 强制 JSON 输出
            )

            # 解析响应
            import json
            content = response.choices[0].message.content
            result = json.loads(content)

            # 验证和规范化数据
            if "chapters" not in result:
                raise ValueError("AI 返回的数据格式不正确")

            # 确保每章都有必需的字段，并修正章节号
            for i, chapter in enumerate(result["chapters"]):
                chapter["chapter_number"] = start_chapter + i  # 使用起始章节号
                chapter.setdefault("title", f"第{start_chapter + i}章")
                chapter.setdefault("outline", "")
                chapter.setdefault("key_events", [])
                chapter.setdefault("characters", [])
                chapter.setdefault("plot_lines", [])
                chapter.setdefault("is_key_chapter", False)

                # 新增网文字段
                chapter.setdefault("word_count_target", 6000)
                chapter.setdefault("cool_points", [])
                chapter.setdefault("pacing", "适中")
                chapter.setdefault("scene_allocation", "")

                # 剧情连贯性字段（Solution 2）
                chapter.setdefault("summary_preview", "")
                chapter.setdefault("ending_state", {
                    "location": "",
                    "protagonist_status": "",
                    "plot_progress": ""
                })

            logger.info(f"成功生成 {len(result['chapters'])} 章大纲（模式: {mode}, 起始章节: {start_chapter}）")
            return result

        except Exception as e:
            logger.error(f"大纲生成失败: {str(e)}", exc_info=True)
            raise Exception(f"大纲生成失败: {str(e)}")

    async def analyze_chapters_characters(
        self,
        chapters_context: str,
        genre: Optional[str] = None
    ) -> list:
        """
        分析章节内容并提取角色信息

        Args:
            chapters_context: 章节内容文本
            genre: 作品类型（可选）

        Returns:
            [
                {
                    "name": "角色名",
                    "role": "主角/配角/反派",
                    "description": "角色简介",
                    "traits": ["性格特征1", "性格特征2"],
                    "appearance": "外貌描述",
                    "background": "背景故事"
                }
            ]
        """
        try:
            # 构建系统提示词
            system_prompt = """你是一位专业的小说角色分析师，擅长从章节大纲中提取角色信息。

任务：严格分析提供的章节大纲，只提取大纲中明确出现的角色，不要凭空创造角色。

核心原则：
1. **只提取大纲中明确提到的角色** - 角色名称必须在大纲中直接出现
2. **不要创造新角色** - 即使觉得应该有某个角色，如果大纲中没有提到，也不要添加
3. **不要过度推断** - 只基于大纲中明确的描述来填写角色信息
4. **如果大纲中某个角色信息不完整** - 相应字段可以留空或使用"暂无描述"

具体要求：
1. 仔细阅读每一章的大纲，识别所有被明确提到的角色名字
2. 对于每个角色，只提取大纲中明确描述的信息：
   - 名称：必须在大纲中明确出现
   - 角色定位：根据大纲中的描述判断（主角、配角、反派、路人）
   - 角色简介：概括该角色在大纲中的作用和特点
   - 性格特征：只提取大纲中明确描述的性格词（如果没有则留空）
   - 外貌描述：只提取大纲中明确的外貌描写（如果没有则留空）
   - 背景故事：只提取大纲中明确的背景信息（如果没有则留空）
3. 优先提取有具体行动、台词或情节推动作用的角色
4. 提取 3-10 个角色（如果大纲中角色少于3个，就提取实际数量）
5. 按角色在大纲中的重要性排序（主角优先，然后配角、反派等）

严格禁止的行为：
❌ 不要添加大纲中没有提到的角色
❌ 不要为角色编造大纲中没有的性格特征
❌ 不要为角色编造大纲中没有的外貌描述
❌ 不要为角色编造大纲中没有的背景故事
❌ 不要合理推测或补充信息

输出格式：
返回 JSON 格式的角色列表，严格按照以下格式：
{
  "characters": [
    {
      "name": "角色名（必须在大纲中出现）",
      "role": "主角/配角/反派/路人",
      "description": "角色简介（基于大纲中的描述）",
      "traits": ["性格1", "性格2"],  // 只填大纲中明确提到的
      "appearance": "外貌描述",       // 只填大纲中明确提到的，没有就留空
      "background": "背景故事"        // 只填大纲中明确提到的，没有就留空
    }
  ]
}"""

            if genre:
                system_prompt += f"\n\n作品类型：{genre}\n注意：类型仅供参考，不要据此添加不在大纲中的角色。"

            # 构建用户提示词
            user_prompt = f"""章节大纲：

{chapters_context}

请严格基于上述大纲内容，提取所有明确出现的角色并生成设定。
记住：只提取大纲中明确提到的角色，不要添加任何大纲中没有的角色或信息。"""

            # 调用 OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,  # 降低温度，减少创造性
                max_tokens=3000,
                response_format={"type": "json_object"}  # 强制 JSON 输出
            )

            # 解析响应
            import json
            content = response.choices[0].message.content
            result = json.loads(content)

            # 验证和规范化数据
            if "characters" not in result:
                raise ValueError("AI 返回的数据格式不正确")

            # 确保每个角色都有必需的字段
            for character in result["characters"]:
                character.setdefault("name", "未命名角色")
                character.setdefault("role", "配角")
                character.setdefault("description", "")
                character.setdefault("traits", [])
                character.setdefault("appearance", "")
                character.setdefault("background", "")

            logger.info(f"成功分析章节大纲，提取 {len(result['characters'])} 个角色")
            return result["characters"]

        except Exception as e:
            logger.error(f"分析章节角色失败: {str(e)}", exc_info=True)
            raise Exception(f"分析章节角色失败: {str(e)}")

