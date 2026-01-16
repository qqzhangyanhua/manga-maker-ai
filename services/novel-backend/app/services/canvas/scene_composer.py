"""
Scene Composer Service
将镜头设计转化为场景图片
"""

import logging
from typing import List, Optional
from pydantic import BaseModel
from openai import AsyncOpenAI
from ...config import settings

logger = logging.getLogger(__name__)


class ShotInput(BaseModel):
    """镜头输入"""
    shot_id: str
    camera_angle: str
    shot_size: str
    shot_description: str
    prompt: str
    character_ids: List[str] = []


class SceneImageOutput(BaseModel):
    """场景图片输出"""
    shot_id: str
    image_url: str
    generation_prompt: str
    status: str = "completed"


class SceneComposer:
    """场景图生成器"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
        self.model = settings.LLM_MODEL
        # TODO: 集成真实的图像生成 API (Stable Diffusion / DALL-E)
        # 当前使用占位符实现

    async def generate_scenes(
        self,
        shots: List[ShotInput],
        style: Optional[str] = None,
    ) -> List[SceneImageOutput]:
        """
        为镜头列表生成场景图

        Args:
            shots: 镜头设计列表
            style: 可选的视觉风格 (manga, realistic, anime, etc.)

        Returns:
            场景图片列表
        """
        logger.info(f"开始生成场景图: {len(shots)} 个镜头")

        scenes = []
        for shot in shots:
            try:
                scene = await self._generate_single_scene(shot, style)
                scenes.append(scene)
                logger.info(f"场景图生成成功: shot_id={shot.shot_id}")
            except Exception as e:
                logger.error(f"场景图生成失败: shot_id={shot.shot_id}, error={e}")
                # 继续处理其他镜头
                scenes.append(SceneImageOutput(
                    shot_id=shot.shot_id,
                    image_url="https://placehold.co/800x600/png?text=Scene+Generation+Failed",
                    generation_prompt=shot.prompt,
                    status="error",
                ))

        logger.info(f"场景图生成完成: 成功={len([s for s in scenes if s.status == 'completed'])}/{len(shots)}")
        return scenes

    async def _generate_single_scene(
        self,
        shot: ShotInput,
        style: Optional[str] = None,
    ) -> SceneImageOutput:
        """
        为单个镜头生成场景图

        TODO: 集成真实的图像生成 API
        当前实现：
        1. 使用 LLM 优化提示词
        2. 返回占位图片 URL
        3. 生产环境需要调用 Stable Diffusion / DALL-E / Midjourney

        未来集成示例：
        ```python
        # Stable Diffusion API
        response = await self.sd_client.generate({
            "prompt": enhanced_prompt,
            "negative_prompt": "blurry, low quality, distorted",
            "width": 800,
            "height": 600,
            "steps": 30,
            "cfg_scale": 7.5,
        })
        image_url = await self._upload_to_storage(response.image_data)
        ```
        """
        # 使用 LLM 优化提示词
        enhanced_prompt = await self._enhance_prompt(shot, style)

        # TODO: 调用图像生成 API
        # 当前返回占位符
        image_url = f"https://placehold.co/800x600/png?text=Scene_{shot.shot_id[:8]}"

        return SceneImageOutput(
            shot_id=shot.shot_id,
            image_url=image_url,
            generation_prompt=enhanced_prompt,
            status="completed",
        )

    async def _enhance_prompt(
        self,
        shot: ShotInput,
        style: Optional[str] = None,
    ) -> str:
        """
        使用 LLM 优化图像生成提示词

        Args:
            shot: 镜头信息
            style: 视觉风格

        Returns:
            优化后的提示词
        """
        system_prompt = """你是专业的图像生成提示词工程师。
根据镜头描述生成适合 AI 绘画的详细提示词。

要求：
1. 包含场景、角色、动作、光线、构图等元素
2. 使用英文逗号分隔的关键词格式
3. 突出镜头的视觉重点
4. 适合 Stable Diffusion / DALL-E 使用"""

        style_hint = f"\n视觉风格: {style}" if style else ""

        user_prompt = f"""镜头信息：
- 镜头类型: {shot.shot_size}
- 机位角度: {shot.camera_angle}
- 描述: {shot.shot_description}
- 原始提示词: {shot.prompt}{style_hint}

请生成优化后的英文提示词（仅输出提示词，不要解释）："""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=200,
            )

            enhanced = response.choices[0].message.content
            if not enhanced:
                return shot.prompt

            return enhanced.strip()

        except Exception as e:
            logger.error(f"提示词优化失败: {e}")
            # 降级：返回原始提示词
            return f"{shot.prompt}, {shot.camera_angle}, {shot.shot_size}"
