"""
Canvas API Router
无限画布生成 API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from ..services.canvas import ScriptAnalyzer, ShotPlanner

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
