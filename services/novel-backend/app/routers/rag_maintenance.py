"""
RAG 索引管理 - 维护与一致性
包含一致性检查、导出导入、数据清理、维护日志等功能
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
import logging
from datetime import datetime, timezone

from ..database import get_db
from ..models import NovelProject, NovelChapter, MaintenanceLog
from ..middleware.auth import get_current_user_id
from ..services.vector_service import get_vector_service
from .rag_models import (
    ConsistencyCheckRequest,
    ExportRequest,
    ImportRequest,
    CleanupRequest,
)

router = APIRouter(prefix="/rag", tags=["rag-maintenance"])
logger = logging.getLogger(__name__)


async def record_maintenance_log(
    db: AsyncSession,
    user_id: str,
    operation: str,
    status: str,
    details: Optional[dict] = None,
) -> None:
    """记录维护日志"""
    try:
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


@router.post("/consistency-check")
async def consistency_check(
    request: ConsistencyCheckRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    数据一致性检查

    - 对比 PostgreSQL 和 ChromaDB
    - 识别未索引、孤立、需重建的章节
    - 计算系统健康度评分
    """
    try:
        logger.info(f"🔍 执行一致性检查 - 用户: {user_id}, 项目过滤: {request.project_id or '无'}")

        # 1. 从 PostgreSQL 获取所有章节
        conditions = []
        if request.project_id:
            conditions.append(NovelChapter.project_id == request.project_id)

        chapters_stmt = select(NovelChapter, NovelProject.title.label("project_name")).join(
            NovelProject, NovelChapter.project_id == NovelProject.id
        )
        if conditions:
            chapters_stmt = chapters_stmt.where(*conditions)

        result = await db.execute(chapters_stmt)
        pg_chapters = result.all()
        pg_ids = {str(ch.id): (ch, project_name) for ch, project_name in pg_chapters}

        logger.info(f"   📊 PostgreSQL 章节总数: {len(pg_ids)}")

        # 2. 从 ChromaDB 获取所有索引
        vector_service = get_vector_service()
        chroma_ids = set()
        chroma_metadata = {}

        try:
            where_filter = None
            if request.project_id:
                where_filter = {"project_id": request.project_id}

            chroma_result = vector_service.collection.get(
                where=where_filter,
                include=["metadatas"]
            )
            chroma_ids = set(chroma_result["ids"])
            chroma_metadata = {
                id: meta for id, meta in zip(chroma_result["ids"], chroma_result["metadatas"])
            }

            logger.info(f"   📊 ChromaDB 索引总数: {len(chroma_ids)}")

        except Exception as e:
            logger.error(f"   ❌ ChromaDB 查询失败: {str(e)}")
            chroma_ids = set()
            chroma_metadata = {}

        # 3. 分析差异
        not_indexed = []
        orphaned = []
        need_rebuild = []

        # 3.1 未索引章节（在 PG 中但不在 ChromaDB 中）
        for chapter_id, (chapter, project_name) in pg_ids.items():
            if chapter_id not in chroma_ids:
                not_indexed.append({
                    "chapterId": chapter_id,
                    "projectId": str(chapter.project_id),
                    "projectName": project_name,
                    "chapterNumber": chapter.chapter_number,
                    "title": chapter.title,
                    "wordCount": chapter.word_count or 0,
                    "indexedAt": None,
                    "updatedAt": chapter.updated_at.isoformat() if chapter.updated_at else None,
                    "status": "not_indexed"
                })

        # 3.2 孤立索引（在 ChromaDB 中但不在 PG 中）
        orphaned = list(chroma_ids - set(pg_ids.keys()))

        # 3.3 需要重建的索引（内容已更新但索引未同步）
        for chapter_id in chroma_ids & set(pg_ids.keys()):
            chapter, project_name = pg_ids[chapter_id]
            metadata = chroma_metadata.get(chapter_id, {})
            indexed_at_str = metadata.get("indexed_at")

            if indexed_at_str and chapter.updated_at:
                try:
                    indexed_at = datetime.fromisoformat(indexed_at_str.replace("Z", "+00:00"))
                    # Make chapter.updated_at timezone-aware if it isn't
                    chapter_updated = chapter.updated_at
                    if chapter_updated.tzinfo is None:
                        chapter_updated = chapter_updated.replace(tzinfo=timezone.utc)

                    if chapter_updated > indexed_at:
                        need_rebuild.append({
                            "chapterId": chapter_id,
                            "projectId": str(chapter.project_id),
                            "projectName": project_name,
                            "chapterNumber": chapter.chapter_number,
                            "title": chapter.title,
                            "wordCount": chapter.word_count or 0,
                            "indexedAt": indexed_at_str,
                            "updatedAt": chapter.updated_at.isoformat(),
                            "status": "need_rebuild"
                        })
                except Exception as e:
                    logger.error(
                        f"章节重建检测失败 - chapter_id={chapter_id}, "
                        f"indexed_at={indexed_at_str}, error={e}",
                        exc_info=True
                    )
                    # 将该章节标记为需要重建（安全策略）
                    need_rebuild.append({
                        "chapterId": chapter_id,
                        "projectId": str(chapter.project_id) if chapter else "unknown",
                        "projectName": project_name,
                        "chapterNumber": chapter.chapter_number if chapter else 0,
                        "title": chapter.title if chapter else "未知章节",
                        "wordCount": 0,
                        "indexedAt": indexed_at_str,
                        "updatedAt": "unknown",
                        "status": "error_need_check"
                    })

        # 4. 计算健康度评分
        total_chapters = len(pg_ids)
        issues_count = len(not_indexed) + len(orphaned) + len(need_rebuild)

        if total_chapters > 0:
            health_score = max(0, min(100, 100 - (issues_count / total_chapters * 100)))
        else:
            health_score = 100.0

        logger.info(
            f"   ✅ 一致性检查完成 - "
            f"未索引: {len(not_indexed)}, "
            f"孤立: {len(orphaned)}, "
            f"需重建: {len(need_rebuild)}, "
            f"健康度: {health_score:.2f}%"
        )

        await record_maintenance_log(
            db=db,
            user_id=user_id,
            operation="consistency_check",
            status="success",
            details={
                "project_id": request.project_id,
                "total_in_pg": total_chapters,
                "total_in_chroma": len(chroma_ids),
                "not_indexed": len(not_indexed),
                "orphaned": len(orphaned),
                "need_rebuild": len(need_rebuild),
                "health_score": round(health_score, 2),
            },
        )

        return {
            "totalInPg": total_chapters,
            "totalInChroma": len(chroma_ids),
            "notIndexed": not_indexed,
            "orphaned": orphaned,
            "needRebuild": need_rebuild,
            "healthScore": round(health_score, 2)
        }

    except Exception as e:
        logger.exception(f"❌ 一致性检查失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"一致性检查失败: {str(e)}")


@router.post("/export")
async def export_vector_data(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    导出向量数据到 JSON/Pickle 格式

    - 支持按项目过滤
    - 返回下载链接或文件流
    """
    try:
        logger.info(
            f"📥 导出向量数据 - 用户: {user_id}, 格式: {request.format}, "
            f"项目: {request.project_id or '全部'}"
        )

        vector_service = get_vector_service()

        if not vector_service.enabled:
            raise HTTPException(status_code=400, detail="向量服务未启用")

        # 构建过滤条件
        where_filter = None
        if request.project_id:
            where_filter = {"project_id": request.project_id}

        # 从 ChromaDB 获取数据
        chroma_result = vector_service.collection.get(
            where=where_filter,
            include=["metadatas", "documents", "embeddings"]
        )

        export_data = {
            "version": "1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "collection_name": vector_service.collection_name,
            "total_count": len(chroma_result["ids"]),
            "project_id": request.project_id,
            "data": {
                "ids": chroma_result["ids"],
                "metadatas": chroma_result["metadatas"],
                "documents": chroma_result["documents"],
                "embeddings": chroma_result["embeddings"] if request.format == "pickle" else None
            }
        }

        # 格式验证
        if request.format not in ["json", "pickle"]:
            raise HTTPException(status_code=400, detail="不支持的导出格式，仅支持 json 或 pickle")

        logger.info(f"   ✅ 导出完成 - 总数: {export_data['total_count']}")

        await record_maintenance_log(
            db=db,
            user_id=user_id,
            operation="export",
            status="success",
            details={
                "format": request.format,
                "project_id": request.project_id,
                "total_count": export_data["total_count"],
            },
        )

        return {
            "success": True,
            "format": request.format,
            "total_count": export_data["total_count"],
            "exported_at": export_data["exported_at"],
            "data": export_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ 导出向量数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/import")
async def import_vector_data(
    request: ImportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    导入向量数据

    - 支持替换/合并模式
    - 后台异步执行
    """
    try:
        logger.info(
            f"📤 导入向量数据 - 用户: {user_id}, 文件: {request.file_path}, "
            f"模式: {request.merge_mode}"
        )

        vector_service = get_vector_service()

        if not vector_service.enabled:
            raise HTTPException(status_code=400, detail="向量服务未启用")

        # 验证合并模式
        if request.merge_mode not in ["replace", "merge"]:
            raise HTTPException(
                status_code=400,
                detail="无效的合并模式，仅支持 'replace' 或 'merge'"
            )

        # 异步导入任务
        async def import_task():
            import json
            try:
                # 读取导入文件
                with open(request.file_path, "r", encoding="utf-8") as f:
                    import_data = json.load(f)

                # 验证数据格式
                if "data" not in import_data:
                    logger.error("   ❌ 无效的导入文件格式")
                    return

                data = import_data["data"]
                ids = data.get("ids", [])
                metadatas = data.get("metadatas", [])
                documents = data.get("documents", [])

                if not ids or len(ids) != len(metadatas) or len(ids) != len(documents):
                    logger.error(f"   ❌ 数据不一致: ids={len(ids)}, metadatas={len(metadatas)}, documents={len(documents)}")
                    return

                # 替换模式：先清空
                if request.merge_mode == "replace":
                    logger.info("   🗑️  替换模式 - 清空现有数据")
                    existing_ids = vector_service.collection.get()["ids"]
                    if existing_ids:
                        vector_service.collection.delete(ids=existing_ids)

                # 批量添加数据
                batch_size = 100
                imported_count = 0

                for i in range(0, len(ids), batch_size):
                    batch_ids = ids[i:i + batch_size]
                    batch_metadatas = metadatas[i:i + batch_size]
                    batch_documents = documents[i:i + batch_size]

                    vector_service.collection.add(
                        ids=batch_ids,
                        metadatas=batch_metadatas,
                        documents=batch_documents
                    )
                    imported_count += len(batch_ids)
                    logger.info(f"   进度: {imported_count}/{len(ids)}")

                logger.info(f"✅ 导入完成 - 总数: {imported_count}")

            except Exception as e:
                logger.error(f"   ❌ 导入失败: {str(e)}")

        background_tasks.add_task(import_task)

        logger.info("📌 导入任务已创建")

        await record_maintenance_log(
            db=db,
            user_id=user_id,
            operation="import",
            status="queued",
            details={
                "file_path": request.file_path,
                "merge_mode": request.merge_mode,
            },
        )

        return {
            "success": True,
            "message": "导入任务已创建",
            "merge_mode": request.merge_mode
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ 导入向量数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@router.post("/cleanup")
async def cleanup_vector_data(
    request: CleanupRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    数据清理工具

    - 移除孤立索引（ChromaDB 中存在但 PostgreSQL 中不存在）
    - 压缩数据库
    """
    try:
        logger.info(
            f"🧹 数据清理 - 用户: {user_id}, "
            f"移除孤立: {request.remove_orphaned}, "
            f"压缩数据库: {request.compact_db}"
        )

        vector_service = get_vector_service()

        if not vector_service.enabled:
            raise HTTPException(status_code=400, detail="向量服务未启用")

        removed_count = 0
        space_saved_mb = 0.0

        # 移除孤立索引
        if request.remove_orphaned:
            # 获取所有 ChromaDB 中的 ID
            chroma_ids = set(vector_service.collection.get()["ids"])

            # 获取所有 PostgreSQL 中的章节 ID
            chapters_stmt = select(NovelChapter.id)
            result = await db.execute(chapters_stmt)
            pg_ids = {str(ch_id) for (ch_id,) in result.all()}

            # 计算孤立的 ID
            orphaned_ids = list(chroma_ids - pg_ids)

            if orphaned_ids:
                logger.info(f"   发现孤立索引: {len(orphaned_ids)} 条")

                # 删除孤立索引
                vector_service.collection.delete(ids=orphaned_ids)
                removed_count = len(orphaned_ids)

                # 估算释放空间（假设每条 1536 维向量约 6KB）
                space_saved_mb = round(removed_count * 0.006, 2)

                logger.info(f"   ✅ 已清理孤立索引: {removed_count} 条, 释放空间: {space_saved_mb} MB")
            else:
                logger.info("   ℹ️  无孤立索引")

        # 压缩数据库（ChromaDB 不直接支持，占位功能）
        if request.compact_db:
            logger.info("   ⚠️  ChromaDB 不支持手动压缩，跳过")

        logger.info("✅ 数据清理完成")

        await record_maintenance_log(
            db=db,
            user_id=user_id,
            operation="cleanup",
            status="success",
            details={
                "removed_count": removed_count,
                "space_saved_mb": space_saved_mb,
                "remove_orphaned": request.remove_orphaned,
                "compact_db": request.compact_db,
            },
        )

        return {
            "success": True,
            "removed_count": removed_count,
            "space_saved_mb": space_saved_mb
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ 数据清理失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"数据清理失败: {str(e)}")


@router.get("/maintenance-logs")
async def get_maintenance_logs(
    limit: int = 50,
    operation: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    获取维护操作日志

    - 支持按操作类型过滤
    - 返回最近 N 条记录
    """
    try:
        logger.info(
            f"📜 获取维护日志 - 用户: {user_id}, "
            f"限制: {limit}, "
            f"操作类型: {operation or '全部'}"
        )

        query = select(MaintenanceLog).where(MaintenanceLog.user_id == UUID(user_id))

        if operation:
            query = query.where(MaintenanceLog.operation == operation)

        query = query.order_by(MaintenanceLog.created_at.desc()).limit(limit)

        result = await db.execute(query)
        logs = result.scalars().all()

        response_logs = [
            {
                "id": str(log.id),
                "operation": log.operation,
                "status": log.status,
                "details": log.details,
                "createdAt": log.created_at.isoformat()
            }
            for log in logs
        ]

        logger.info(f"   ✅ 返回日志: {len(response_logs)} 条")

        return {
            "logs": response_logs
        }

    except Exception as e:
        logger.exception(f"❌ 获取维护日志失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取维护日志失败: {str(e)}")
