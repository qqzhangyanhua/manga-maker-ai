"""
全局搜索系统 - API 路由
包含向后兼容的项目搜索 + 新的全局搜索功能
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Literal, Optional
from uuid import UUID

from ..database import get_db
from ..middleware.auth import get_current_user_id
from ..models import NovelProject
from ..schemas.search_schemas import (
    GlobalSearchRequest,
    GlobalSearchResponse,
    SearchSuggestRequest,
    SearchSuggestResponse,
    SaveFilterRequest,
    SavedFiltersResponse,
    SearchHistoryResponse,
)
from ..services.search_service import SearchService


router = APIRouter(prefix="/search", tags=["search"])


# ============================================
# 向后兼容: 旧的项目内搜索端点
# ============================================

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
    项目内搜索 (旧端点 - 保留向后兼容)

    ⚠️ 推荐使用 POST /search/global 进行全局搜索

    搜索指定项目的章节标题和内容
    """
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="项目不存在")

    # 使用全局搜索,限定项目ID
    search_service = SearchService(db)
    request = GlobalSearchRequest(
        query=q,
        filters={"project_ids": [UUID(project_id)]},
        page_size=limit
    )

    result = await search_service.global_search(
        user_id=UUID(user_id),
        request=request
    )

    # 转换为旧格式(简化)
    return {
        "total": result.total_count,
        "results": [
            {
                "chapter_id": str(r.chapter_id),
                "chapter_number": r.chapter_number,
                "title": r.title,
                "snippet": r.content_snippet,
                "relevance": r.relevance_score
            }
            for r in result.results
        ]
    }


# ============================================
# 新功能: 全局搜索端点
# ============================================

@router.post("/global", response_model=GlobalSearchResponse)
async def global_search(
    request: GlobalSearchRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    全局搜索 (推荐使用)

    **功能**:
    - 🔍 跨所有项目搜索章节内容
    - 🎯 高级过滤(日期/字数/状态/爽点类型)
    - 📊 聚合统计数据
    - 🕐 自动保存搜索历史

    **示例请求**:
    ```json
    {
      "query": "主角觉醒",
      "filters": {
        "status": ["completed"],
        "cool_point_types": ["能力展示"],
        "word_count_range": {"min": 5000, "max": 7000}
      },
      "sort_by": "relevance",
      "page": 1,
      "page_size": 20
    }
    ```

    **响应说明**:
    - `results`: 搜索结果列表(包含高亮片段)
    - `aggregations`: 聚合数据(按项目/状态/爽点类型分组统计)
    - `total_count`: 总结果数(用于分页)
    """
    try:
        search_service = SearchService(db)
        result = await search_service.global_search(
            user_id=UUID(user_id),
            request=request
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@router.get("/suggest", response_model=SearchSuggestResponse)
async def search_suggest(
    query: str = Query(..., min_length=1, max_length=100, description="搜索关键词"),
    limit: int = Query(default=5, ge=1, le=20, description="建议数量"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    搜索建议 (自动补全)

    **功能**:
    - 基于搜索历史提供建议
    - 基于项目标题匹配
    - 实时响应(用于输入框)

    **使用场景**:
    用户输入 "主" 时,返回 ["主角觉醒", "主角成长", "主线任务"]

    **示例**:
    ```
    GET /search/suggest?query=主&limit=5
    ```
    """
    try:
        search_service = SearchService(db)
        result = await search_service.get_search_suggestions(
            user_id=UUID(user_id),
            query=query,
            limit=limit
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取建议失败: {str(e)}")


# ============================================
# 搜索历史管理
# ============================================

@router.get("/history", response_model=SearchHistoryResponse)
async def get_search_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    获取搜索历史

    **返回**:
    - 最近的搜索记录
    - 包含搜索词、过滤器、结果数
    - 按时间倒序排列
    """
    try:
        search_service = SearchService(db)
        result = await search_service.get_search_history(
            user_id=UUID(user_id),
            limit=limit,
            offset=offset
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取历史失败: {str(e)}")


@router.delete("/history/{history_id}")
async def delete_search_history(
    history_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """删除单条搜索历史记录"""
    try:
        search_service = SearchService(db)
        await search_service.delete_search_history(
            user_id=UUID(user_id),
            history_id=history_id
        )
        return {"success": True, "message": "删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.delete("/history")
async def clear_search_history(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """清空所有搜索历史"""
    try:
        search_service = SearchService(db)
        # TODO: 实现清空所有历史的方法
        return {"success": True, "message": "清空成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空失败: {str(e)}")


# ============================================
# 保存的过滤器管理
# ============================================

@router.post("/saved-filters")
async def save_filter(
    request: SaveFilterRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    保存过滤器

    **使用场景**:
    用户经常搜索"已完成的打脸章节",可以保存此过滤条件

    **示例**:
    ```json
    {
      "name": "已完成的打脸章节",
      "description": "查找所有已完成且包含打脸爽点的章节",
      "filters": {
        "status": ["completed"],
        "cool_point_types": ["打脸"]
      },
      "is_pinned": true
    }
    ```
    """
    try:
        search_service = SearchService(db)
        result = await search_service.save_filter(
            user_id=UUID(user_id),
            name=request.name,
            description=request.description,
            filters=request.filters.model_dump() if request.filters else {},
            is_pinned=request.is_pinned
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")


@router.get("/saved-filters", response_model=SavedFiltersResponse)
async def get_saved_filters(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    获取所有保存的过滤器

    **返回**:
    - 按置顶状态、使用次数、创建时间排序
    - 置顶的过滤器优先显示
    """
    try:
        search_service = SearchService(db)
        result = await search_service.get_saved_filters(
            user_id=UUID(user_id)
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@router.delete("/saved-filters/{filter_id}")
async def delete_saved_filter(
    filter_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """删除保存的过滤器"""
    try:
        search_service = SearchService(db)
        await search_service.delete_saved_filter(
            user_id=UUID(user_id),
            filter_id=filter_id
        )
        return {"success": True, "message": "删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.patch("/saved-filters/{filter_id}/pin")
async def toggle_filter_pin(
    filter_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """切换过滤器的置顶状态"""
    try:
        # TODO: 实现切换置顶的方法
        return {"success": True, "message": "更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


# ============================================
# 健康检查 & 调试端点
# ============================================

@router.get("/health")
async def search_health_check():
    """搜索系统健康检查"""
    return {
        "status": "healthy",
        "service": "global_search",
        "version": "1.0.0",
        "features": [
            "global_search",
            "search_suggestions",
            "search_history",
            "saved_filters"
        ]
    }


@router.get("/stats")
async def search_stats(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    搜索统计信息 (调试用)

    **返回**:
    - 总搜索次数
    - 最常搜索的关键词
    - 保存的过滤器数量
    """
    try:
        # TODO: 实现统计功能
        return {
            "total_searches": 0,
            "saved_filters_count": 0,
            "top_keywords": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计失败: {str(e)}")
