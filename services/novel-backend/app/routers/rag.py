"""
RAG 索引管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import logging

from ..database import get_db
from ..models import NovelProject, NovelChapter
from ..middleware.auth import get_current_user_id
from ..services.vector_service import get_vector_service

router = APIRouter(prefix="/rag", tags=["rag"])
logger = logging.getLogger(__name__)


# ============ Pydantic Models ============


class IndexChapterRequest(BaseModel):
    """索引章节请求"""
    chapter_id: str


class BatchIndexRequest(BaseModel):
    """批量索引请求"""
    project_id: str
    chapter_ids: Optional[List[str]] = None


class RAGStatsResponse(BaseModel):
    """RAG 统计信息响应"""
    enabled: bool
    collection_name: Optional[str] = None
    total_documents: Optional[int] = None
    embedding_model: Optional[str] = None


# ============ API Routes ============


@router.post("/index-chapter")
async def index_chapter(
    request: IndexChapterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    索引单个章节到向量数据库

    - 验证章节所属权限
    - 异步执行向量化
    """
    try:
        # 验证章节存在且属于当前用户
        chapter_stmt = select(NovelChapter).where(NovelChapter.id == request.chapter_id)
        chapter_result = await db.execute(chapter_stmt)
        chapter = chapter_result.scalar_one_or_none()

        if not chapter:
            raise HTTPException(status_code=404, detail="章节不存在")

        # 验证项目权限
        project_stmt = select(NovelProject).where(
            NovelProject.id == chapter.project_id, NovelProject.user_id == UUID(user_id)
        )
        project_result = await db.execute(project_stmt)
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="无权操作此章节")

        # 异步索引
        vector_service = get_vector_service()

        async def index_task():
            await vector_service.index_chapter(
                chapter_id=str(chapter.id),
                project_id=str(chapter.project_id),
                chapter_number=chapter.chapter_number,
                title=chapter.title,
                outline=chapter.outline or "",
                content=chapter.content,
            )

        background_tasks.add_task(index_task)

        logger.info(f"📌 章节索引任务已创建 - 章节ID: {request.chapter_id}")

        return {"success": True, "message": "章节索引任务已创建", "chapter_id": str(chapter.id)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"索引章节失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"索引失败: {str(e)}")


@router.post("/batch-index")
async def batch_index_chapters(
    request: BatchIndexRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    批量索引项目的章节

    - 如果指定 chapter_ids，只索引这些章节
    - 否则索引项目的所有章节
    """
    try:
        # 验证项目权限
        project_stmt = select(NovelProject).where(
            NovelProject.id == request.project_id, NovelProject.user_id == UUID(user_id)
        )
        project_result = await db.execute(project_stmt)
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="无权操作此项目")

        # 构建查询条件
        conditions = [NovelChapter.project_id == request.project_id]
        if request.chapter_ids:
            conditions.append(NovelChapter.id.in_(request.chapter_ids))

        # 获取章节
        chapters_stmt = select(NovelChapter).where(*conditions)
        chapters_result = await db.execute(chapters_stmt)
        chapters = chapters_result.scalars().all()

        if not chapters:
            return {"success": True, "message": "没有需要索引的章节", "count": 0}

        # 异步批量索引
        vector_service = get_vector_service()

        async def batch_index_task():
            chapters_data = [
                {
                    "id": str(ch.id),
                    "project_id": str(ch.project_id),
                    "chapter_number": ch.chapter_number,
                    "title": ch.title,
                    "outline": ch.outline or "",
                    "content": ch.content,
                }
                for ch in chapters
            ]
            await vector_service.batch_index_chapters(chapters_data)

        background_tasks.add_task(batch_index_task)

        logger.info(
            f"📦 批量索引任务已创建 - 项目ID: {request.project_id}, 章节数: {len(chapters)}"
        )

        return {
            "success": True,
            "message": "批量索引任务已创建",
            "count": len(chapters),
            "project_id": request.project_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量索引失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"批量索引失败: {str(e)}")


@router.delete("/chapter/{chapter_id}")
async def delete_chapter_index(
    chapter_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    删除章节的向量索引

    - 验证章节所属权限
    - 从向量数据库中删除
    """
    try:
        # 验证章节存在且属于当前用户
        chapter_stmt = select(NovelChapter).where(NovelChapter.id == chapter_id)
        chapter_result = await db.execute(chapter_stmt)
        chapter = chapter_result.scalar_one_or_none()

        if not chapter:
            raise HTTPException(status_code=404, detail="章节不存在")

        # 验证项目权限
        project_stmt = select(NovelProject).where(
            NovelProject.id == chapter.project_id, NovelProject.user_id == UUID(user_id)
        )
        project_result = await db.execute(project_stmt)
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="无权操作此章节")

        # 删除索引
        vector_service = get_vector_service()
        success = await vector_service.delete_chapter(chapter_id)

        if not success:
            logger.warning(f"删除章节索引失败（可能不存在）- 章节ID: {chapter_id}")

        return {"success": True, "message": "章节索引已删除", "chapter_id": chapter_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除章节索引失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.get("/stats", response_model=RAGStatsResponse)
async def get_rag_stats():
    """
    获取 RAG 系统统计信息（公开接口）

    - 向量数据库是否启用
    - 索引文档总数
    - Embedding 模型

    注意：此接口不需要认证，仅返回系统级统计信息
    """
    try:
        vector_service = get_vector_service()
        stats = vector_service.get_stats()

        return RAGStatsResponse(**stats)

    except Exception as e:
        logger.error(f"获取 RAG 统计信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")
