"""
搜索 API 路由
提供全文搜索、全局搜索、搜索建议等接口
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Literal, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from datetime import datetime, timedelta

from ..services.search_service import SearchService
from ..middleware.auth import get_current_user_id
from ..database import get_db
from ..models import NovelProject, NovelChapter

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


@router.get("/global")
async def global_search(
    q: str = Query(..., description="搜索关键词", min_length=1),
    search_type: Literal["all", "title", "content", "project"] = Query("all", description="搜索类型"),
    limit: int = Query(20, ge=1, le=100, description="结果数量限制"),
    skip: int = Query(0, ge=0, description="跳过数量"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    全局搜索 - 跨所有用户项目搜索

    Args:
        q: 搜索关键词
        search_type: 搜索类型
            - all: 搜索项目名称和章节内容
            - title: 仅搜索章节标题
            - content: 仅搜索章节内容
            - project: 仅搜索项目名称
        limit: 结果数量限制
        skip: 分页偏移

    Returns:
        {
            "query": "关键词",
            "total": 100,
            "projects": [...],  # 匹配的项目
            "chapters": [...]   # 匹配的章节
        }
    """
    try:
        results = {
            "query": q,
            "search_type": search_type,
            "projects": [],
            "chapters": []
        }

        # 搜索项目
        if search_type in ["all", "project"]:
            project_query = select(NovelProject).where(
                NovelProject.user_id == user_id,
                or_(
                    NovelProject.title.ilike(f"%{q}%"),
                    NovelProject.description.ilike(f"%{q}%")
                )
            ).limit(limit).offset(skip)

            project_result = await db.execute(project_query)
            projects = project_result.scalars().all()

            results["projects"] = [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "description": p.description,
                    "genre": p.genre,
                    "chapter_count": p.chapter_count,
                    "total_words": p.total_words,
                    "updated_at": p.updated_at.isoformat() if p.updated_at else None
                }
                for p in projects
            ]

        # 搜索章节
        if search_type in ["all", "title", "content"]:
            # 先获取用户的所有项目 ID
            user_projects_query = select(NovelProject.id).where(
                NovelProject.user_id == user_id
            )
            user_projects_result = await db.execute(user_projects_query)
            user_project_ids = [str(pid) for pid in user_projects_result.scalars().all()]

            if user_project_ids:
                chapter_conditions = [
                    NovelChapter.project_id.in_(user_project_ids)
                ]

                if search_type == "title":
                    chapter_conditions.append(NovelChapter.title.ilike(f"%{q}%"))
                elif search_type == "content":
                    chapter_conditions.append(NovelChapter.content.ilike(f"%{q}%"))
                else:  # all
                    chapter_conditions.append(
                        or_(
                            NovelChapter.title.ilike(f"%{q}%"),
                            NovelChapter.content.ilike(f"%{q}%"),
                            NovelChapter.outline.ilike(f"%{q}%")
                        )
                    )

                chapter_query = select(NovelChapter).where(
                    *chapter_conditions
                ).limit(limit).offset(skip)

                chapter_result = await db.execute(chapter_query)
                chapters = chapter_result.scalars().all()

                results["chapters"] = [
                    {
                        "id": str(c.id),
                        "project_id": str(c.project_id),
                        "chapter_number": c.chapter_number,
                        "title": c.title,
                        "outline": c.outline[:200] if c.outline else None,
                        "word_count": c.word_count,
                        "status": c.status,
                        "updated_at": c.updated_at.isoformat() if c.updated_at else None
                    }
                    for c in chapters
                ]

        results["total"] = len(results["projects"]) + len(results["chapters"])

        return results

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"全局搜索失败: {str(e)}"
        )


@router.get("/suggest")
async def search_suggest(
    q: str = Query(..., description="搜索关键词前缀", min_length=1, max_length=50),
    limit: int = Query(10, ge=1, le=20, description="建议数量"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    搜索建议/自动补全

    基于用户输入的前缀，返回可能的搜索建议

    Args:
        q: 搜索前缀
        limit: 建议数量

    Returns:
        {
            "suggestions": [
                {"text": "建议文本", "type": "project|chapter", "count": 3},
                ...
            ]
        }
    """
    try:
        suggestions = []

        # 从项目标题获取建议
        project_query = select(
            NovelProject.title,
            func.count().label("count")
        ).where(
            NovelProject.user_id == user_id,
            NovelProject.title.ilike(f"%{q}%")
        ).group_by(NovelProject.title).limit(limit)

        project_result = await db.execute(project_query)
        for title, count in project_result:
            suggestions.append({
                "text": title,
                "type": "project",
                "count": count
            })

        # 从章节标题获取建议
        user_projects_query = select(NovelProject.id).where(
            NovelProject.user_id == user_id
        )
        user_projects_result = await db.execute(user_projects_query)
        user_project_ids = [str(pid) for pid in user_projects_result.scalars().all()]

        if user_project_ids:
            chapter_query = select(
                NovelChapter.title,
                func.count().label("count")
            ).where(
                NovelChapter.project_id.in_(user_project_ids),
                NovelChapter.title.ilike(f"%{q}%")
            ).group_by(NovelChapter.title).limit(limit)

            chapter_result = await db.execute(chapter_query)
            for title, count in chapter_result:
                suggestions.append({
                    "text": title,
                    "type": "chapter",
                    "count": count
                })

        # 按相关度排序（简单按文本长度）
        suggestions.sort(key=lambda x: (len(x["text"]), -x["count"]))

        return {
            "query": q,
            "suggestions": suggestions[:limit]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取搜索建议失败: {str(e)}"
        )


@router.get("/history")
async def search_history(
    limit: int = Query(20, ge=1, le=100, description="历史记录数量"),
    days: int = Query(7, ge=1, le=30, description="查询最近几天"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    搜索历史

    返回用户最近的搜索历史（基于项目更新时间推断）

    Args:
        limit: 历史记录数量
        days: 查询最近几天

    Returns:
        {
            "history": [
                {"project_id": "...", "title": "...", "last_viewed": "..."},
                ...
            ]
        }
    """
    try:
        # 基于更新时间推断最近访问的项目
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        history_query = select(NovelProject).where(
            NovelProject.user_id == user_id,
            NovelProject.updated_at >= cutoff_date
        ).order_by(NovelProject.updated_at.desc()).limit(limit)

        result = await db.execute(history_query)
        projects = result.scalars().all()

        return {
            "history": [
                {
                    "project_id": str(p.id),
                    "title": p.title,
                    "genre": p.genre,
                    "last_viewed": p.updated_at.isoformat() if p.updated_at else None,
                    "chapter_count": p.chapter_count,
                    "total_words": p.total_words
                }
                for p in projects
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取搜索历史失败: {str(e)}"
        )
