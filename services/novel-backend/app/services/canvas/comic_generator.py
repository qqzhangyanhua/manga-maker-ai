"""
Comic Generator Service
将场景图转化为最终漫画图（添加对话框、特效等）
"""

import logging
from typing import List, Optional
from pydantic import BaseModel
from openai import AsyncOpenAI
from ...config import settings

logger = logging.getLogger(__name__)


class SceneInput(BaseModel):
    """场景输入"""
    scene_id: str
    shot_id: str
    image_url: str
    dialogue: Optional[str] = None
    character_names: List[str] = []


class ComicPanelOutput(BaseModel):
    """漫画面板输出"""
    scene_id: str
    shot_id: str
    image_url: str
    generation_prompt: str
    has_dialogue: bool = False
    status: str = "completed"


class ComicGenerator:
    """漫画图生成器"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
        self.model = settings.LLM_MODEL
        # TODO: 集成图像后处理 API (添加对话框、音效字、特效线等)

    async def generate_finals(
        self,
        scenes: List[SceneInput],
        comic_style: str = "manga",
        add_speech_bubbles: bool = True,
    ) -> List[ComicPanelOutput]:
        """
        为场景列表生成最终漫画图

        Args:
            scenes: 场景图列表
            comic_style: 漫画风格 (manga, webtoon, american)
            add_speech_bubbles: 是否添加对话框

        Returns:
            最终漫画图列表
        """
        logger.info(f"开始生成最终漫画图: {len(scenes)} 个场景, 风格={comic_style}")

        panels = []
        for scene in scenes:
            try:
                panel = await self._generate_single_panel(
                    scene,
                    comic_style,
                    add_speech_bubbles,
                )
                panels.append(panel)
                logger.info(f"漫画图生成成功: scene_id={scene.scene_id}")
            except Exception as e:
                logger.error(f"漫画图生成失败: scene_id={scene.scene_id}, error={e}")
                panels.append(ComicPanelOutput(
                    scene_id=scene.scene_id,
                    shot_id=scene.shot_id,
                    image_url="https://placehold.co/1024x768/png?text=Comic+Generation+Failed",
                    generation_prompt="",
                    status="error",
                ))

        logger.info(f"漫画图生成完成: 成功={len([p for p in panels if p.status == 'completed'])}/{len(scenes)}")
        return panels

    async def _generate_single_panel(
        self,
        scene: SceneInput,
        comic_style: str,
        add_speech_bubbles: bool,
    ) -> ComicPanelOutput:
        """
        为单个场景生成最终漫画图

        TODO: 集成图像后处理 API
        当前实现：
        1. 分析对话内容和位置
        2. 返回占位图片 URL
        3. 生产环境需要调用图像后处理服务

        未来集成示例：
        ```python
        # 图像后处理 API
        response = await self.postprocess_client.add_elements({
            "base_image_url": scene.image_url,
            "comic_style": comic_style,
            "elements": [
                {
                    "type": "speech_bubble",
                    "text": scene.dialogue,
                    "position": dialogue_position,
                    "character": scene.character_names[0],
                },
                {
                    "type": "effect_lines",
                    "style": "speed_lines",
                }
            ]
        })
        final_url = await self._upload_to_storage(response.image_data)
        ```
        """
        # 分析对话和布局
        dialogue_layout = None
        if add_speech_bubbles and scene.dialogue:
            dialogue_layout = await self._analyze_dialogue_layout(scene)

        # TODO: 调用图像后处理 API
        # 当前返回占位符
        image_url = f"https://placehold.co/1024x768/png?text=Comic_{scene.scene_id[:8]}"

        generation_prompt = self._build_generation_prompt(
            scene,
            comic_style,
            dialogue_layout,
        )

        return ComicPanelOutput(
            scene_id=scene.scene_id,
            shot_id=scene.shot_id,
            image_url=image_url,
            generation_prompt=generation_prompt,
            has_dialogue=bool(scene.dialogue),
            status="completed",
        )

    async def _analyze_dialogue_layout(
        self,
        scene: SceneInput,
    ) -> dict:
        """
        使用 LLM 分析对话框最佳位置

        Args:
            scene: 场景信息

        Returns:
            对话框布局建议
        """
        system_prompt = """你是漫画排版专家，负责分析对话框的最佳位置。

根据角色和对话内容，建议对话框的位置和样式。

输出 JSON 格式：
{
  "bubbles": [
    {
      "text": "对话内容",
      "position": "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
      "style": "speech" | "thought" | "shout" | "whisper"
    }
  ]
}"""

        user_prompt = f"""场景信息：
- 角色: {', '.join(scene.character_names) if scene.character_names else '未知'}
- 对话: {scene.dialogue}

请分析对话框布局（仅输出 JSON）："""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
                max_tokens=300,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                return self._default_dialogue_layout(scene.dialogue)

            import json
            layout = json.loads(content)
            return layout

        except Exception as e:
            logger.error(f"对话框布局分析失败: {e}")
            return self._default_dialogue_layout(scene.dialogue)

    def _default_dialogue_layout(self, dialogue: str) -> dict:
        """默认对话框布局"""
        return {
            "bubbles": [
                {
                    "text": dialogue,
                    "position": "top-right",
                    "style": "speech",
                }
            ]
        }

    def _build_generation_prompt(
        self,
        scene: SceneInput,
        comic_style: str,
        dialogue_layout: Optional[dict],
    ) -> str:
        """构建生成提示词"""
        prompt_parts = [
            f"comic panel, {comic_style} style",
            f"scene from {scene.image_url}",
        ]

        if dialogue_layout and dialogue_layout.get("bubbles"):
            bubble_count = len(dialogue_layout["bubbles"])
            prompt_parts.append(f"{bubble_count} speech bubble(s)")

        return ", ".join(prompt_parts)
