"""
搜索 API 路由
提供全文搜索接口
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..services.search_service import SearchService
from ..middleware.auth import get_current_user_id
from ..database import get_db
from ..models import NovelProject

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/projects/{project_id}")
async def search_project(
    project_id: str,
    q: str = Query(..., description="搜索关键词", min_length=1),
    type: Literal["all", "title", "content"] = Query("all", description="搜索类型"),
    limit: int = Query(20, ge=1, le=100, description="结果数量限制"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    全文搜索
    
    搜索指定项目的章节标题和内容
    
    Args:
        project_id: 项目 ID
        q: 搜索关键词
        type: 搜索类型（all/title/content）
        limit: 结果数量限制（1-100）
        
    Returns:
        搜索结果列表
    """
    
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="项目不存在")

    try:
        # 执行搜索
        search_service = SearchService(db)
        results = await search_service.search(
            project_id=project_id,
            query=q,
            search_type=type,
            limit=limit
        )
        
        return {
            "query": q,
            "search_type": type,
            "total": len(results),
            "results": results
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"搜索失败: {str(e)}"
        )
