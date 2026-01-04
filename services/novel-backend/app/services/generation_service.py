"""
AI 文本生成服务
"""
from openai import AsyncOpenAI
from typing import AsyncGenerator, Optional
from ..config import settings
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
        style_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ) -> AsyncGenerator[str, None]:
        """
        流式生成章节内容
        
        Args:
            context: 上下文（世界观、角色、前序章节等）
            chapter_outline: 当前章节大纲
            style_prompt: 风格提示（可选）
            temperature: 温度参数
            max_tokens: 最大 token 数
        
        Yields:
            生成的文本片段
        """
        try:
            # 构建系统提示词
            system_prompt = """你是一位专业的小说作家，擅长创作引人入胜的故事内容。

任务：根据提供的上下文和章节大纲，生成详细的章节内容。

要求：
1. 内容要生动具体，包含场景描写、人物对话、心理活动
2. 保持与前文的连贯性和一致性
3. 充分利用世界观和角色设定
4. 情节推进自然，节奏把控得当
5. 语言流畅优美，富有感染力
6. 章节长度控制在 2000-4000 字

输出格式：
直接输出章节正文内容，不需要标题和其他格式。"""
            
            if style_prompt:
                system_prompt += f"\n\n风格要求：{style_prompt}"
            
            # 构建用户提示词
            user_prompt = f"""{context}

请根据以上信息，生成本章节的详细内容。"""
            
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
4. 确保修改后的内容流畅自然"""
            
            user_prompt = f"""原文：
{original_content}

修改指令：
{revision_instruction}

请输出修改后的完整内容。"""
            
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
            # 根据模式构建不同的系统提示词
            if mode == "continue" and existing_outlines:
                system_prompt = """你是一位专业的小说策划师，擅长续写和扩展故事大纲。

任务：基于现有章节的剧情发展，生成后续章节的大纲，确保剧情连贯、逻辑合理。

要求：
1. 仔细分析现有章节的情节走向、角色发展和线索铺垫
2. 后续章节要自然承接现有内容，保持剧情连贯性
3. 延续已有的情节线索，推进故事发展
4. 保持角色性格和行为的一致性
5. 每章大纲要包含：章节标题、大纲摘要（100-200字）、关键事件、出场角色、涉及的情节线索
6. 标注关键章节（如转折点、高潮、结局）

输出格式：
返回 JSON 格式的章节大纲列表，严格按照以下格式：
{
  "chapters": [
    {
      "chapter_number": 起始章节号,
      "title": "第N章：标题",
      "outline": "章节大纲描述...",
      "key_events": ["事件1", "事件2"],
      "characters": ["角色A", "角色B"],
      "plot_lines": ["主线", "支线"],
      "is_key_chapter": true
    }
  ]
}"""
            else:
                system_prompt = """你是一位专业的小说策划师，擅长构建完整的故事大纲。

任务：根据提供的故事前提、角色和世界观，生成详细的章节大纲。

要求：
1. 每章大纲要包含：章节标题、大纲摘要（100-200字）、关键事件、出场角色、涉及的情节线索
2. 整体结构要完整：起承转合，高潮迭起
3. 情节要有逻辑性和连贯性
4. 充分利用角色和世界观设定
5. 标注关键章节（如开篇、高潮、结局）
6. 每章大纲要具体明确，便于后续创作

输出格式：
返回 JSON 格式的章节大纲列表，严格按照以下格式：
{
  "chapters": [
    {
      "chapter_number": 1,
      "title": "第一章：标题",
      "outline": "章节大纲描述...",
      "key_events": ["事件1", "事件2"],
      "characters": ["角色A", "角色B"],
      "plot_lines": ["主线", "支线"],
      "is_key_chapter": true
    }
  ]
}"""

            if style:
                system_prompt += f"\n\n风格要求：{style}"

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
                if world_setting.get("locations"):
                    user_prompt += "\n\n世界观-地点：\n"
                    for loc in world_setting["locations"]:
                        if isinstance(loc, dict):
                            user_prompt += f"- {loc.get('name', '')}：{loc.get('description', '')}\n"

                if world_setting.get("rules"):
                    user_prompt += "\n\n世界观-规则：\n"
                    for rule in world_setting["rules"]:
                        if isinstance(rule, dict):
                            user_prompt += f"- {rule.get('name', '')}：{rule.get('description', '')}\n"

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

