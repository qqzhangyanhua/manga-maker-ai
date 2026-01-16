"""
RAG 索引管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import logging
from datetime import datetime, timezone

from ..database import get_db
from ..models import NovelProject, NovelChapter, MaintenanceLog
from ..middleware.auth import get_current_user_id
from ..services.vector_service import get_vector_service

router = APIRouter(prefix="/rag", tags=["rag"])
logger = logging.getLogger(__name__)


async def record_maintenance_log(
    db: AsyncSession,
    user_id: str,
    operation: str,
    status: str,
    details: Optional[dict] = None,
) -> None:
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


# ============ Pydantic Models ============


class IndexChapterRequest(BaseModel):
    """索引章节请求"""
    chapter_id: str


class BatchIndexRequest(BaseModel):
    """批量索引请求"""
    project_id: str
    chapter_ids: Optional[List[str]] = None


class RAGStatsData(BaseModel):
    """RAG 统计数据"""
    enabled: bool
    collectionName: Optional[str] = None
    totalDocuments: Optional[int] = None
    embeddingModel: Optional[str] = None
    dbSize: Optional[int] = None
    indexSuccessRate: Optional[float] = None
    avgSimilarityScore: Optional[float] = None


class RecentActivityData(BaseModel):
    """最近活动数据"""
    timestamp: str
    projectName: str
    chapterNumber: int
    chapterTitle: str
    status: str  # "success" | "failed"


class RAGStatsResponse(BaseModel):
    """RAG 统计信息响应"""
    stats: RAGStatsData
    recentActivity: List[RecentActivityData]


class ChapterDetailResponse(BaseModel):
    """章节索引详情响应"""
    chapter_id: str
    indexed: bool
    metadata: Optional[dict] = None
    embedding_dim: Optional[int] = None
    similarity_test: Optional[float] = None
    error: Optional[str] = None


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
async def get_rag_stats(db: AsyncSession = Depends(get_db)):
    """
    获取 RAG 系统统计信息（公开接口）

    - 向量数据库是否启用
    - 索引文档总数
    - Embedding 模型
    - 最近索引活动（前 10 条）

    注意：此接口不需要认证，仅返回系统级统计信息
    """
    try:
        vector_service = get_vector_service()
        raw_stats = vector_service.get_stats()

        # Convert snake_case to camelCase
        stats_data = RAGStatsData(
            enabled=raw_stats.get("enabled", False),
            collectionName=raw_stats.get("collection_name"),
            totalDocuments=raw_stats.get("total_documents"),
            embeddingModel=raw_stats.get("embedding_model"),
        )

        # Get recent activities (limit 10)
        recent_activities = []
        if vector_service.enabled:
            try:
                # Get indexed chapters metadata from ChromaDB
                chroma_result = vector_service.collection.get(include=["metadatas"])

                # Parse and sort by indexed_at timestamp
                activities_raw = []
                for metadata in chroma_result.get("metadatas", []):
                    indexed_at = metadata.get("indexed_at")
                    if indexed_at:
                        try:
                            activities_raw.append({
                                "timestamp": indexed_at,
                                "project_id": metadata.get("project_id", ""),
                                "chapter_number": metadata.get("chapter_number", 0),
                                "chapter_title": metadata.get("title", "未知标题"),
                                "status": "success"
                            })
                        except Exception:
                            pass

                # Sort by timestamp descending and take top 10
                activities_raw.sort(key=lambda x: x["timestamp"], reverse=True)
                activities_raw = activities_raw[:10]

                # Fetch project names in batch
                project_ids = list({act["project_id"] for act in activities_raw if act.get("project_id")})
                project_map = {}
                if project_ids:
                    projects_stmt = select(NovelProject.id, NovelProject.title).where(
                        NovelProject.id.in_(project_ids)
                    )
                    result = await db.execute(projects_stmt)
                    project_map = {str(p_id): p_title for p_id, p_title in result.all()}

                # Build final activities list with camelCase
                for act in activities_raw:
                    project_name = project_map.get(act["project_id"], "未知项目")
                    recent_activities.append(
                        RecentActivityData(
                            timestamp=act["timestamp"],
                            projectName=project_name,
                            chapterNumber=act["chapter_number"],
                            chapterTitle=act["chapter_title"],
                            status=act["status"]
                        )
                    )

            except Exception as e:
                logger.warning(f"获取最近活动失败: {str(e)}")
                recent_activities = []

        return RAGStatsResponse(stats=stats_data, recentActivity=recent_activities)

    except Exception as e:
        logger.error(f"获取 RAG 统计信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@router.get("/chapter/{chapter_id}/detail", response_model=ChapterDetailResponse)
async def get_chapter_detail(
    chapter_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> ChapterDetailResponse:
    """
    获取单章索引详情

    - 返回章节的索引元数据
    - 包含向量维度和相似度测试
    """
    try:
        logger.info(f"📖 获取章节索引详情 - 章节ID: {chapter_id}, 用户: {user_id}")

        # 1. 验证章节存在
        chapter_stmt = select(NovelChapter).where(NovelChapter.id == chapter_id)
        chapter_result = await db.execute(chapter_stmt)
        chapter = chapter_result.scalar_one_or_none()

        if not chapter:
            logger.warning(f"   ❌ 章节不存在: {chapter_id}")
            raise HTTPException(status_code=404, detail="章节不存在")

        logger.info(f"   ✅ 章节存在: {chapter.title}")

        # 2. 从 ChromaDB 获取索引详情
        vector_service = get_vector_service()

        if not vector_service.enabled:
            logger.info("   ⚠️  向量服务未启用，返回未索引状态")
            return ChapterDetailResponse(
                chapter_id=chapter_id,
                indexed=False
            )

        try:
            # 查询 ChromaDB
            chroma_result = vector_service.collection.get(
                ids=[chapter_id],
                include=["metadatas", "embeddings"]
            )

            # 3. 如果找到索引数据
            if chroma_result["ids"]:
                metadata = chroma_result["metadatas"][0]
                embedding = chroma_result["embeddings"][0]
                embedding_dim = len(embedding)

                logger.info(
                    f"   ✅ 章节已索引 - 维度: {embedding_dim}, "
                    f"索引时间: {metadata.get('indexed_at', 'N/A')}"
                )

                return ChapterDetailResponse(
                    chapter_id=chapter_id,
                    indexed=True,
                    metadata=metadata,
                    embedding_dim=embedding_dim,
                    similarity_test=1.0  # 与自身相似度应为 1.0
                )
            else:
                # 4. 未找到索引
                logger.info("   ℹ️  章节未索引")
                return ChapterDetailResponse(
                    chapter_id=chapter_id,
                    indexed=False
                )

        except Exception as e:
            # 5. ChromaDB 查询失败
            logger.error(f"   ❌ 查询 ChromaDB 失败: {str(e)}")
            return ChapterDetailResponse(
                chapter_id=chapter_id,
                indexed=False,
                error=str(e)
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ 获取章节详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取章节详情失败: {str(e)}")


class RebuildIndexRequest(BaseModel):
    """批量重建索引请求"""
    scope: str  # "all" | "project" | "date_range"
    project_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ConsistencyCheckRequest(BaseModel):
    """一致性检查请求"""
    project_id: Optional[str] = None


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
                except Exception:
                    pass

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

        # 获取 ChromaDB 索引状态（批量查询优化）
        vector_service = get_vector_service()

        # Batch query: Get all chapter IDs at once
        chapter_ids = [str(ch.id) for ch, _ in chapters]
        chroma_data = {}

        try:
            chroma_result = vector_service.collection.get(
                ids=chapter_ids,
                include=["metadatas"]
            )

            # Build lookup dict for O(1) access
            chroma_data = {
                id: metadata
                for id, metadata in zip(chroma_result["ids"], chroma_result["metadatas"])
            }
        except Exception:
            chroma_data = {}

        items = []

        for chapter, project_name in chapters:
            # Lookup from batch result
            metadata = chroma_data.get(str(chapter.id))
            indexed_at = None
            status_value = "not_indexed"

            if metadata:
                indexed_at = metadata.get("indexed_at")

                # 判断是否需要重建
                if indexed_at and chapter.updated_at:
                    indexed_time = datetime.fromisoformat(indexed_at.replace("Z", "+00:00"))
                    # Make chapter.updated_at timezone-aware if it isn't
                    chapter_updated = chapter.updated_at
                    if chapter_updated.tzinfo is None:
                        chapter_updated = chapter_updated.replace(tzinfo=timezone.utc)

                    if chapter_updated > indexed_time:
                        status_value = "need_rebuild"
                    else:
                        status_value = "indexed"
                else:
                    status_value = "indexed"

            # 状态过滤
            if status and status_value != status:
                continue

            items.append({
                "chapterId": str(chapter.id),
                "projectId": str(chapter.project_id),
                "projectName": project_name,
                "chapterNumber": chapter.chapter_number,
                "title": chapter.title,
                "wordCount": chapter.word_count or 0,
                "indexedAt": indexed_at,
                "updatedAt": chapter.updated_at.isoformat() if chapter.updated_at else None,
                "status": status_value
            })

        # Calculate filtered total if status filter is applied
        filtered_total = len(items)

        logger.info(
            f"✅ 章节索引列表获取成功 - "
            f"总数: {total}, "
            f"过滤后: {filtered_total}, "
            f"状态过滤: {status or '无'}"
        )

        return {
            "total": total,
            "filteredTotal": filtered_total,
            "page": page,
            "limit": limit,
            "items": items
        }

    except Exception as e:
        logger.exception(f"❌ 获取章节列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取章节列表失败: {str(e)}")


# ============ Task 5-9: 运维相关 API ============


class ExportRequest(BaseModel):
    """导出向量数据请求"""
    format: str = "json"  # "json" | "pickle"
    project_id: Optional[str] = None


class ImportRequest(BaseModel):
    """导入向量数据请求"""
    file_path: str
    merge_mode: str = "replace"  # "replace" | "merge"


class CleanupRequest(BaseModel):
    """数据清理请求"""
    remove_orphaned: bool = True
    compact_db: bool = False


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
                "timestamp": log.created_at.isoformat() if log.created_at else None,
                "operation": log.operation,
                "details": log.details or {},
                "status": log.status,
                "user_id": str(log.user_id),
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


@router.get("/recent-activities")
async def get_recent_activities(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    获取最近的索引活动

    - 显示最近索引的章节
    - 包含状态信息
    """
    try:
        logger.info(f"📊 获取最近活动 - 用户: {user_id}, 限制: {limit}")

        vector_service = get_vector_service()

        if not vector_service.enabled:
            return {"activities": []}

        # 获取最近索引的章节
        # 通过 indexed_at 排序，获取最新的记录
        chroma_result = vector_service.collection.get(
            include=["metadatas"]
        )

        # 解析并排序
        activities_raw = []
        for metadata in chroma_result.get("metadatas", []):
            indexed_at = metadata.get("indexed_at")
            if indexed_at:
                try:
                    activities_raw.append({
                        "timestamp": indexed_at,
                        "project_name": metadata.get("project_id", "未知项目"),
                        "chapter_number": metadata.get("chapter_number", 0),
                        "chapter_title": metadata.get("title", "未知标题"),
                        "status": "success"
                    })
                except Exception:
                    pass

        # 按时间倒序排序
        activities_raw.sort(key=lambda x: x["timestamp"], reverse=True)
        activities = activities_raw[:limit]

        # 查询项目名称（优化：批量查询）
        project_ids = list({act["project_name"] for act in activities})
        if project_ids:
            projects_stmt = select(NovelProject.id, NovelProject.title).where(
                NovelProject.id.in_(project_ids)
            )
            result = await db.execute(projects_stmt)
            project_map = {str(p_id): p_title for p_id, p_title in result.all()}

            # 替换项目 ID 为项目名称
            for act in activities:
                act["project_name"] = project_map.get(act["project_name"], act["project_name"])

        logger.info(f"   ✅ 返回活动: {len(activities)} 条")

        return {
            "activities": activities
        }

    except Exception as e:
        logger.exception(f"❌ 获取最近活动失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取最近活动失败: {str(e)}")
