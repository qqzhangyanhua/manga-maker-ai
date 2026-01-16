"""
Canvas API Router
无限画布生成 API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from ..services.canvas import (
    ScriptAnalyzer,
    ShotPlanner,
    SceneComposer,
    ShotInput,
    ComicGenerator,
    SceneInput,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/canvas", tags=["canvas"])


class AnalyzeScriptRequest(BaseModel):
    """分析剧本请求"""
    chapter_content: str
    chapter_number: int = 1


class PlanShotsRequest(BaseModel):
    """规划镜头请求"""
    script_content: str
    scene_description: str
    character_actions: str
    available_characters: Optional[List[dict]] = None


class GenerateScenesRequest(BaseModel):
    """生成场景图请求"""
    shots: List[ShotInput]
    style: Optional[str] = None


class GenerateFinalsRequest(BaseModel):
    """生成最终漫画图请求"""
    scenes: List[SceneInput]
    comic_style: str = "manga"
    add_speech_bubbles: bool = True


@router.post("/analyze-script")
async def analyze_script(request: AnalyzeScriptRequest):
    """
    分析章节文本，生成剧本片段
    """
    try:
        analyzer = ScriptAnalyzer()
        segments = await analyzer.analyze_chapter(
            chapter_content=request.chapter_content,
            chapter_number=request.chapter_number,
        )
        return {
            "success": True,
            "segments": [s.model_dump() for s in segments],
        }
    except Exception as e:
        logger.error(f"剧本分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plan-shots")
async def plan_shots(request: PlanShotsRequest):
    """
    为剧本片段规划镜头
    """
    try:
        planner = ShotPlanner()
        shots = await planner.plan_shots(
            script_content=request.script_content,
            scene_description=request.scene_description,
            character_actions=request.character_actions,
            available_characters=request.available_characters,
        )
        return {
            "success": True,
            "shots": [s.model_dump() for s in shots],
        }
    except Exception as e:
        logger.error(f"镜头规划失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-scenes")
async def generate_scenes(request: GenerateScenesRequest):
    """
    为镜头列表生成场景图
    """
    try:
        logger.info(f"接收到场景图生成请求: {len(request.shots)} 个镜头")
        composer = SceneComposer()
        scenes = await composer.generate_scenes(
            shots=request.shots,
            style=request.style,
        )
        return {
            "success": True,
            "scenes": [s.model_dump() for s in scenes],
        }
    except Exception as e:
        logger.error(f"场景图生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-finals")
async def generate_finals(request: GenerateFinalsRequest):
    """
    为场景图列表生成最终漫画图
    """
    try:
        logger.info(f"接收到漫画图生成请求: {len(request.scenes)} 个场景, 风格={request.comic_style}")
        generator = ComicGenerator()
        panels = await generator.generate_finals(
            scenes=request.scenes,
            comic_style=request.comic_style,
            add_speech_bubbles=request.add_speech_bubbles,
        )
        return {
            "success": True,
            "panels": [p.model_dump() for p in panels],
        }
    except Exception as e:
        logger.error(f"漫画图生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
