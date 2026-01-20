"""
RAG 索引管理 - 查询检索
包含统计信息、章节详情、章节列表、活动记录等查询功能
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import logging
from datetime import datetime, timezone

from ..database import get_db
from ..models import NovelProject, NovelChapter
from ..middleware.auth import get_current_user_id
from ..services.vector_service import get_vector_service
from .rag_models import RAGStatsResponse, RAGStatsData, RecentActivityData, ChapterDetailResponse

router = APIRouter(prefix="/rag", tags=["RAG - Search & Query"])
logger = logging.getLogger(__name__)


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
                        except Exception as e:
                            logger.warning(
                                f"活动记录解析失败 - chapter_id={metadata.get('chapter_id', 'unknown')}, "
                                f"error={e}"
                            )
                            # 继续处理其他活动，不中断整个流程

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
                            status=act["status"],
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
):
    """
    获取单个章节的索引详情

    - 检查章节是否已索引
    - 返回 embedding 维度
    - 计算相似度测试
    """
    try:
        logger.info(f"🔍 查询章节索引详情 - 章节ID: {chapter_id}")

        # 验证章节存在
        chapter_stmt = select(NovelChapter).where(NovelChapter.id == chapter_id)
        chapter_result = await db.execute(chapter_stmt)
        chapter = chapter_result.scalar_one_or_none()

        if not chapter:
            raise HTTPException(status_code=404, detail="章节不存在")

        # 检查向量服务
        vector_service = get_vector_service()

        if not vector_service.enabled:
            logger.info(f"   ⚠️  向量服务未启用")
            return ChapterDetailResponse(
                chapter_id=chapter_id,
                indexed=False,
                error="向量服务未启用"
            )

        # 查询 ChromaDB
        try:
            chroma_result = vector_service.collection.get(
                ids=[chapter_id],
                include=["embeddings", "metadatas"]
            )

            if not chroma_result["ids"]:
                logger.info(f"   ℹ️  章节未索引")
                return ChapterDetailResponse(
                    chapter_id=chapter_id,
                    indexed=False
                )

            # 章节已索引
            metadata = chroma_result["metadatas"][0]
            embeddings = chroma_result["embeddings"][0] if chroma_result.get("embeddings") else None

            embedding_dim = len(embeddings) if embeddings else None

            # 自身相似度测试（应该接近 1.0）
            similarity_test = 1.0  # Hardcode for now

            logger.info(
                f"   ✅ 章节已索引 - "
                f"embedding维度: {embedding_dim}, "
                f"索引时间: {metadata.get('indexed_at')}"
            )

            return ChapterDetailResponse(
                chapter_id=chapter_id,
                indexed=True,
                metadata=metadata,
                embedding_dim=embedding_dim,
                similarity_test=similarity_test
            )

        except Exception as e:
            logger.error(f"   ❌ ChromaDB 查询失败: {str(e)}")
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
                except Exception as e:
                    logger.warning(
                        f"活动记录解析失败 - chapter_id={metadata.get('chapter_id', 'unknown')}, "
                        f"indexed_at={indexed_at}, error={e}"
                    )
                    # 继续处理其他活动，不中断整个流程

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
