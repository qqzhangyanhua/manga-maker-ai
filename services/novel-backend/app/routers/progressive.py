"""
渐进式大纲生成与智能分析 API
支持10步工作流和大纲质量分析
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID

from ..database import get_db
from ..models import NovelProject
from ..middleware.auth import get_current_user_id
from ..services.progressive_outline_service import ProgressiveOutlineService
from ..services.outline_analyzer import OutlineAnalyzer

router = APIRouter(prefix="/progressive", tags=["progressive-outline"])


# ============ Pydantic Models ============

class GenerateConceptRequest(BaseModel):
    """生成概念请求"""
    project_id: str
    premise: str
    genre: Optional[str] = None


class GenerateStructureRequest(BaseModel):
    """生成结构请求"""
    project_id: str
    concept: str
    premise: str
    genre: Optional[str] = None


class GenerateDetailedOutlineRequest(BaseModel):
    """生成详细大纲请求"""
    project_id: str
    structure: Dict[str, Any]
    premise: str
    characters: Optional[List[Dict]] = None
    world_setting: Optional[Dict] = None
    chapter_count: int = 10
    style: Optional[str] = None


class GenerateSceneBreakdownRequest(BaseModel):
    """生成场景清单请求"""
    project_id: str
    chapters: List[Dict[str, Any]]


class AnalyzeOutlineRequest(BaseModel):
    """分析大纲请求"""
    chapters: List[Dict[str, Any]]
    analysis_type: str = Field(
        default="comprehensive",
        description="分析类型: cool_points | pacing | opening_hook | comprehensive"
    )


# ============ API Endpoints ============

@router.post("/concept")
async def generate_concept(
    request: GenerateConceptRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 1: 生成一句话概念

    Returns:
        {"concept": "一句话概括"}
    """
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == request.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    try:
        service = ProgressiveOutlineService()
        result = await service.generate_concept(
            premise=request.premise,
            genre=request.genre
        )

        return {"success": True, "data": result}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/structure")
async def generate_structure(
    request: GenerateStructureRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: 生成三幕式结构

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
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == request.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    try:
        service = ProgressiveOutlineService()
        result = await service.generate_structure(
            concept=request.concept,
            premise=request.premise,
            genre=request.genre
        )

        return {"success": True, "data": result}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/detailed-outline")
async def generate_detailed_outline(
    request: GenerateDetailedOutlineRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 3: 生成详细章节大纲

    Returns:
        {
            "chapters": [
                {
                    "chapter_number": 1,
                    "title": "...",
                    "outline": "...",
                    "key_events": [...],
                    "characters": [...],
                    "plot_lines": [...],
                    "is_key_chapter": false,
                    "word_count_target": 6000,
                    "cool_points": [...],
                    "pacing": "快速",
                    "scene_allocation": "..."
                }
            ]
        }
    """
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == request.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    try:
        service = ProgressiveOutlineService()
        result = await service.generate_detailed_outline(
            structure=request.structure,
            premise=request.premise,
            characters=request.characters,
            world_setting=request.world_setting,
            chapter_count=request.chapter_count,
            style=request.style
        )

        # 保存大纲到项目
        project.outlines = result["chapters"]
        await db.commit()

        return {"success": True, "data": result}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/scene-breakdown")
async def generate_scene_breakdown(
    request: GenerateSceneBreakdownRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 4: 生成场景清单

    Returns:
        {
            "scenes": [
                {
                    "scene_number": 1,
                    "chapter_number": 1,
                    "title": "...",
                    "location": "...",
                    "viewpoint_character": "...",
                    "scene_type": "主动" | "被动",
                    ...
                }
            ]
        }
    """
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == request.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    try:
        service = ProgressiveOutlineService()
        result = await service.generate_scene_breakdown(
            chapters=request.chapters
        )

        return {"success": True, "data": result}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/analyze")
async def analyze_outline(
    request: AnalyzeOutlineRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    智能分析大纲

    analysis_type:
    - cool_points: 爽点密度分析
    - pacing: 节奏分析
    - opening_hook: 开篇吸引力评估
    - comprehensive: 综合分析（以上三项）

    Returns:
        根据 analysis_type 返回不同的分析结果
    """
    try:
        analyzer = OutlineAnalyzer()

        if request.analysis_type == "cool_points":
            result = await analyzer.analyze_cool_points_density(request.chapters)
        elif request.analysis_type == "pacing":
            result = await analyzer.analyze_pacing(request.chapters)
        elif request.analysis_type == "opening_hook":
            result = await analyzer.analyze_opening_hook(request.chapters)
        elif request.analysis_type == "comprehensive":
            result = await analyzer.comprehensive_analysis(request.chapters)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的分析类型: {request.analysis_type}"
            )

        return {"success": True, "data": result}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
