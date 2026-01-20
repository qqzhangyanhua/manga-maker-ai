"""
RAG 索引管理 - 索引操作
包含章节索引、批量索引、删除索引、重建索引等功能
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import logging
from datetime import datetime

from ..database import get_db
from ..models import NovelProject, NovelChapter
from ..middleware.auth import get_current_user_id
from ..services.vector_service import get_vector_service
from .rag_models import (
    IndexChapterRequest,
    BatchIndexRequest,
    RebuildIndexRequest,
)

router = APIRouter(prefix="/rag", tags=["RAG - Index Management"])
logger = logging.getLogger(__name__)


async def record_maintenance_log(
    db: AsyncSession,
    user_id: str,
    operation: str,
    status: str,
    details: dict = None,
) -> None:
    """记录维护日志"""
    try:
        from ..models import MaintenanceLog
        log = MaintenanceLog(
            user_id=UUID(user_id),
            operation=operation,
            status=status,
            details=details or {},
        )
        db.add(log)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.warning(f"维护日志写入失败: {str(e)}")


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


@router.post("/rebuild-index")
async def rebuild_index(
    request: RebuildIndexRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    批量重建索引

    - 支持全量、按项目、按时间范围重建
    - 提供成本和耗时估算
    - 后台异步执行
    """
    try:
        logger.info(f"🔨 批量重建索引请求 - 用户: {user_id}, 范围: {request.scope}")

        # 构建查询条件
        conditions = []

        if request.scope == "project":
            if not request.project_id:
                raise HTTPException(status_code=400, detail="project_id 必填")
            conditions.append(NovelChapter.project_id == request.project_id)
            logger.info(f"   范围: 项目ID = {request.project_id}")

        elif request.scope == "date_range":
            if not request.start_date or not request.end_date:
                raise HTTPException(status_code=400, detail="start_date 和 end_date 必填")

            start = datetime.fromisoformat(request.start_date)
            end = datetime.fromisoformat(request.end_date)
            conditions.append(NovelChapter.updated_at.between(start, end))
            logger.info(f"   范围: {request.start_date} 至 {request.end_date}")

        elif request.scope == "all":
            logger.info("   范围: 全量重建")

        else:
            raise HTTPException(
                status_code=400,
                detail=f"无效的 scope: {request.scope}，必须是 'all', 'project', 或 'date_range'"
            )

        # 获取章节列表
        chapters_stmt = select(NovelChapter).where(*conditions)
        result = await db.execute(chapters_stmt)
        chapters = result.scalars().all()

        if not chapters:
            logger.info("   ℹ️  没有需要重建的章节")
            return {
                "success": True,
                "message": "没有需要重建的章节",
                "estimated_count": 0,
                "estimated_cost": 0.0,
                "estimated_time": "0 分钟"
            }

        # 估算成本和时间
        count = len(chapters)
        estimated_cost = count * 0.00005  # $0.00005 per chapter
        estimated_time = f"{max(1, count // 60)}-{max(2, count // 30)} 分钟"

        # 异步执行重建
        vector_service = get_vector_service()

        async def rebuild_task():
            success_count = 0
            for chapter in chapters:
                try:
                    await vector_service.index_chapter(
                        chapter_id=str(chapter.id),
                        project_id=str(chapter.project_id),
                        chapter_number=chapter.chapter_number,
                        title=chapter.title,
                        outline=chapter.outline or "",
                        content=chapter.content,
                    )
                    success_count += 1
                except Exception as e:
                    logger.error(f"   ❌ 重建章节失败 - ID: {chapter.id}, 错误: {str(e)}")

            logger.info(
                f"✅ 批量重建完成 - 总数: {count}, 成功: {success_count}, 失败: {count - success_count}"
            )

        background_tasks.add_task(rebuild_task)

        logger.info(
            f"📌 批量重建任务已创建 - 范围: {request.scope}, 章节数: {count}, "
            f"预估成本: ${estimated_cost:.4f}, 预估时间: {estimated_time}"
        )

        await record_maintenance_log(
            db=db,
            user_id=user_id,
            operation="rebuild",
            status="queued",
            details={
                "scope": request.scope,
                "project_id": request.project_id,
                "start_date": request.start_date,
                "end_date": request.end_date,
                "estimated_count": count,
                "estimated_cost": estimated_cost,
                "estimated_time": estimated_time,
            },
        )

        return {
            "success": True,
            "message": "批量重建任务已创建",
            "estimated_count": count,
            "estimated_cost": estimated_cost,
            "estimated_time": estimated_time
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 批量重建索引失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"批量重建索引失败: {str(e)}")
