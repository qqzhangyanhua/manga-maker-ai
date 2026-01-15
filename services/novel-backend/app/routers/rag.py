"""
RAG 索引管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import logging
from datetime import datetime

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


@router.get("/chapters")
async def get_chapters_list(
    page: int = 1,
    limit: int = 20,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    获取章节索引列表（分页）

    - 支持按项目、状态、标题搜索过滤
    - 返回章节的索引状态
    """
    try:
        logger.info(f"📋 获取章节索引列表 - 用户: {user_id}, 页码: {page}, 每页: {limit}")

        # 构建基础查询条件
        conditions = []

        if project_id:
            conditions.append(NovelChapter.project_id == project_id)
            logger.info(f"   过滤项目ID: {project_id}")

        if search:
            conditions.append(NovelChapter.title.ilike(f"%{search}%"))
            logger.info(f"   搜索关键词: {search}")

        # 获取总数（不包含状态过滤）
        count_stmt = select(func.count(NovelChapter.id)).where(*conditions)
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # 分页查询
        offset = (page - 1) * limit
        chapters_stmt = (
            select(NovelChapter, NovelProject.title.label("project_name"))
            .join(NovelProject, NovelChapter.project_id == NovelProject.id)
            .where(*conditions)
            .order_by(NovelChapter.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(chapters_stmt)
        chapters = result.all()

        # 获取 ChromaDB 索引状态
        vector_service = get_vector_service()
        items = []
        filtered_count = 0

        for chapter, project_name in chapters:
            # 检查 ChromaDB 中是否存在
            indexed_at = None
            status_value = "not_indexed"

            try:
                if vector_service.enabled and vector_service.collection:
                    chroma_result = vector_service.collection.get(
                        ids=[str(chapter.id)],
                        include=["metadatas"]
                    )

                    if chroma_result["ids"]:
                        metadata = chroma_result["metadatas"][0] if chroma_result["metadatas"] else {}
                        indexed_at = metadata.get("indexed_at")

                        # 判断是否需要重建
                        if indexed_at and chapter.updated_at:
                            indexed_time = datetime.fromisoformat(indexed_at.replace("Z", "+00:00"))
                            # Make chapter.updated_at timezone-aware if it isn't
                            chapter_updated = chapter.updated_at
                            if chapter_updated.tzinfo is None:
                                from datetime import timezone
                                chapter_updated = chapter_updated.replace(tzinfo=timezone.utc)

                            if chapter_updated > indexed_time:
                                status_value = "need_rebuild"
                            else:
                                status_value = "indexed"
                        else:
                            status_value = "indexed"
                    else:
                        status_value = "not_indexed"
                        indexed_at = None
            except Exception as e:
                logger.warning(f"检查章节索引状态失败 - 章节ID: {chapter.id}, 错误: {str(e)}")
                status_value = "not_indexed"
                indexed_at = None

            # 状态过滤
            if status and status_value != status:
                filtered_count += 1
                continue

            items.append({
                "chapter_id": str(chapter.id),
                "project_id": str(chapter.project_id),
                "project_name": project_name,
                "chapter_number": chapter.chapter_number,
                "title": chapter.title,
                "word_count": chapter.word_count or 0,
                "indexed_at": indexed_at,
                "updated_at": chapter.updated_at.isoformat() if chapter.updated_at else None,
                "status": status_value
            })

        # 调整总数（如果有状态过滤）
        if status:
            total = len(items)

        logger.info(
            f"✅ 章节索引列表获取成功 - "
            f"总数: {total}, "
            f"返回: {len(items)}, "
            f"状态过滤: {status or '无'}"
        )

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "items": items
        }

    except Exception as e:
        logger.error(f"❌ 获取章节列表失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取章节列表失败: {str(e)}")
