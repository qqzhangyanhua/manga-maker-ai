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
    character_info: Optional[List[dict]] = None  # 角色详细信息 [{id, name, visual_description}]


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
        pure_scene_mode: bool = True,
    ) -> List[SceneImageOutput]:
        """
        为镜头列表生成场景图

        Args:
            shots: 镜头设计列表
            style: 可选的视觉风格 (manga, realistic, anime, etc.)
            pure_scene_mode: 纯场景模式，不包含人物（用于背景生成）

        Returns:
            场景图片列表
        """
        logger.info(f"开始生成场景图: {len(shots)} 个镜头, pure_scene_mode={pure_scene_mode}")

        scenes = []
        for shot in shots:
            try:
                scene = await self._generate_single_scene(shot, style, pure_scene_mode)
                scenes.append(scene)
                logger.info(f"场景图生成成功: shot_id={shot.shot_id}")
            except Exception as e:
                logger.error(f"场景图生成失败: shot_id={shot.shot_id}, error={e}")
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
        pure_scene_mode: bool = True,
    ) -> SceneImageOutput:
        """
        为单个镜头生成优化的提示词

        职责分离:
        - 后端 (novel-backend): 使用 LLM 优化提示词
        - 前端 (Next.js): 图像生成 + MinIO 上传

        流程:
        1. 后端返回 status="pending" 和优化的提示词
        2. 前端调用 unified-image-generation 系统
        3. 前端将生成的图片 URL 保存到数据库
        """
        enhanced_prompt = await self._enhance_prompt(shot, style, pure_scene_mode)

        logger.info(f"场景图提示词优化完成: shot_id={shot.shot_id}")

        return SceneImageOutput(
            shot_id=shot.shot_id,
            image_url="",
            generation_prompt=enhanced_prompt,
            status="pending",
        )

    async def _enhance_prompt(
        self,
        shot: ShotInput,
        style: Optional[str] = None,
        pure_scene_mode: bool = True,
    ) -> str:
        """
        使用 LLM 优化图像生成提示词

        Args:
            shot: 镜头信息
            style: 视觉风格
            pure_scene_mode: 纯场景模式，不生成人物

        Returns:
            优化后的提示词
        """
        # 构建角色视觉描述（仅在非纯场景模式下使用）
        character_description = ""
        if not pure_scene_mode and shot.character_info:
            char_lines = []
            for c in shot.character_info:
                name = c.get('name', 'Unknown')
                visual_desc = c.get('visual_description', c.get('description', ''))
                if visual_desc:
                    char_lines.append(f"- {name}: {visual_desc}")
            if char_lines:
                character_description = "\n【角色视觉描述】\n" + "\n".join(char_lines)

        # 场景模式指令
        if pure_scene_mode:
            mode_instruction = """
【纯场景模式】
- 这是纯场景/背景图，必须不包含任何人物、角色或人形生物
- 只描述环境、建筑、自然景观、室内装饰等场景元素
- 人物将在后续步骤中单独合成
- 在提示词末尾添加: no people, no characters, empty scene"""
        else:
            mode_instruction = f"""
【完整画面模式】
- 需要在场景中包含角色
- 根据下方角色描述准确描绘人物外观
- 确保角色与环境融合自然
- 保持角色外观与参考图一致{character_description}"""

        # 风格强化指令
        style_instruction = self._get_style_instruction(style)

        system_prompt = f"""你是专业的 AI 图像生成提示词工程师，擅长为 Stable Diffusion / DALL-E 优化提示词。

【你的任务】
根据镜头描述生成高质量的英文图像生成提示词。
{mode_instruction}
{style_instruction}

【提示词结构要求】
1. 主体描述 (subject): 场景/人物的核心内容
2. 环境细节 (environment): 光线、天气、时间、氛围
3. 构图视角 (composition): 镜头类型、角度、景深
4. 风格质量 (quality): 渲染风格、质量标签
5. 负面排除 (如适用): 需要避免的元素

【格式要求】
- 使用英文，逗号分隔的关键词/短语格式
- 重要元素放在前面
- 避免冗余和矛盾描述
- 总长度控制在 100-200 词"""

        style_hint = f"\n指定风格: {style}" if style else ""

        user_prompt = f"""【镜头信息】
- 镜头类型: {shot.shot_size}
- 机位角度: {shot.camera_angle}
- 场景描述: {shot.shot_description}
- 原始提示词: {shot.prompt}{style_hint}

请生成优化后的英文提示词（仅输出提示词本身，不要任何解释或标注）："""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=300,
            )

            enhanced = response.choices[0].message.content
            if not enhanced:
                return shot.prompt

            return enhanced.strip()

        except Exception as e:
            logger.error(f"提示词优化失败: {e}")
            return f"{shot.prompt}, {shot.camera_angle}, {shot.shot_size}"

    def _get_style_instruction(self, style: Optional[str]) -> str:
        """获取风格强化指令"""
        style_map = {
            "manga": """
【风格: 日式漫画】
- 添加: manga style, black and white ink, screentone shading, dynamic lines
- 特点: 高对比度、速度线、漫画式表情夸张""",
            "anime": """
【风格: 日式动画】
- 添加: anime style, cel shading, vibrant colors, clean lines
- 特点: 明亮色彩、平涂上色、大眼睛特征""",
            "realistic": """
【风格: 写实风格】
- 添加: photorealistic, detailed, high resolution, natural lighting
- 特点: 真实质感、自然光影、细节丰富""",
            "watercolor": """
【风格: 水彩插画】
- 添加: watercolor painting, soft edges, pastel colors, artistic
- 特点: 柔和边缘、水彩晕染、艺术感""",
            "comic": """
【风格: 美式漫画】
- 添加: comic book style, bold outlines, dramatic shading, action poses
- 特点: 粗线条、强烈阴影、动态姿势""",
        }

        if style and style.lower() in style_map:
            return style_map[style.lower()]

        return """
【风格: 默认】
- 使用高质量、清晰的图像风格
- 添加: high quality, detailed, professional illustration"""
