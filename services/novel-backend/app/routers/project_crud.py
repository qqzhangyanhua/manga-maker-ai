"""
小说项目管理 - CRUD 操作
包含项目的创建、查询、更新、删除、统计、导出等功能
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging

from ..database import get_db
from ..models import NovelProject, NovelChapter
from ..middleware.auth import get_current_user_id
from ..services.export_service import ExportService
from .project_models import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["Projects - CRUD"])
logger = logging.getLogger(__name__)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建新项目",
    description="""
创建一个新的小说项目。

**功能**：
- 初始化项目基础信息（标题、简介、类型等）
- 设置世界观和主要角色
- 设定目标字数
- 项目默认状态为 draft（草稿）

**后续操作**：
- 使用 `/projects/{project_id}/generate-characters` 生成角色
- 使用 `/projects/{project_id}/generate-outline` 生成章节大纲
- 使用 `/chapters/generate` 开始创作章节
""",
    responses={
        201: {
            "description": "项目创建成功",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "user_id": "987fcdeb-51a2-43d7-8f9e-0123456789ab",
                        "title": "修仙传说：逆天改命",
                        "status": "draft",
                        "total_words": 0,
                        "chapter_count": 0
                    }
                }
            }
        },
        400: {"description": "请求参数无效"},
        401: {"description": "未授权（Token 无效或过期）"},
    }
)
async def create_project(
    project_data: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """创建新的小说项目"""

    # 创建项目
    new_project = NovelProject(
        user_id=user_id,
        title=project_data.title,
        description=project_data.description,
        genre=project_data.genre,
        world_setting=project_data.world_setting,
        characters=project_data.characters,
        target_words=project_data.target_words or 100000,
        status="draft"
    )

    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)

    # 手动构造响应,确保UUID转换为字符串
    return {
        "id": str(new_project.id),
        "user_id": str(new_project.user_id),
        "title": new_project.title,
        "description": new_project.description,
        "genre": new_project.genre,
        "world_setting": new_project.world_setting,
        "characters": new_project.characters,
        "outlines": new_project.outlines,
        "target_words": new_project.target_words,
        "status": new_project.status,
        "total_words": 0,
        "chapter_count": 0,
        "created_at": new_project.created_at,
        "updated_at": new_project.updated_at,
    }


@router.get(
    "",
    response_model=List[ProjectResponse],
    summary="列出项目",
    description="""
列出当前用户的所有小说项目。

**功能**：
- 支持分页查询
- 支持按状态过滤（draft, in_progress, completed, archived）
- 支持关键词搜索（标题、简介）
- 按更新时间倒序排列

**查询参数**：
- `skip`: 跳过的记录数（用于分页，默认 0）
- `limit`: 每页记录数（默认 20，最大 100）
- `status_filter`: 状态过滤（可选）
- `search`: 搜索关键词（可选）
""",
    responses={
        200: {"description": "项目列表获取成功"},
        401: {"description": "未授权"},
    }
)
async def list_projects(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """列出用户的所有项目"""

    # 基础查询
    query = select(NovelProject).where(NovelProject.user_id == user_id)

    # 状态过滤
    if status_filter:
        query = query.where(NovelProject.status == status_filter)

    # 搜索过滤
    if search:
        query = query.where(
            or_(
                NovelProject.title.ilike(f"%{search}%"),
                NovelProject.description.ilike(f"%{search}%")
            )
        )

    # 排序和分页
    query = query.order_by(NovelProject.updated_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    projects = result.scalars().all()

    # 为每个项目添加统计信息并转换UUID
    response_projects = []
    for project in projects:
        # 查询章节统计
        stats_query = select(
            func.count(NovelChapter.id).label("chapter_count"),
            func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words")
        ).where(NovelChapter.project_id == project.id)

        stats_result = await db.execute(stats_query)
        stats = stats_result.one()

        # 手动构造响应对象
        response_projects.append({
            "id": str(project.id),
            "user_id": str(project.user_id),
            "title": project.title,
            "description": project.description,
            "genre": project.genre,
            "world_setting": project.world_setting,
            "characters": project.characters,
            "outlines": project.outlines,
            "target_words": project.target_words,
            "status": project.status,
            "total_words": stats.total_words,
            "chapter_count": stats.chapter_count,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
        })

    return response_projects


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="获取项目详情",
    description="""
获取指定项目的详细信息。

**功能**：
- 返回项目基础信息（标题、描述、类型等）
- 返回项目统计数据（总字数、章节数）
- 可选返回完整章节列表（含正文内容）

**查询参数**：
- `include_chapters`: 是否包含完整章节列表（默认 true）
  - true: 返回章节列表及正文内容（适用于编辑器加载）
  - false: 仅返回项目信息（适用于列表页预览）

**注意**：如果章节数量很大，建议设置 `include_chapters=false` 以提高响应速度。
""",
    responses={
        200: {"description": "项目详情获取成功"},
        404: {"description": "项目不存在"},
        401: {"description": "未授权"},
    }
)
async def get_project(
    project_id: UUID,
    include_chapters: bool = True,  # ✅ 新增参数：是否包含章节列表
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    获取项目详情

    Args:
        project_id: 项目ID
        include_chapters: 是否包含完整章节列表（包括content）, 默认True
    """

    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 查询统计信息
    stats_query = select(
        func.count(NovelChapter.id).label("chapter_count"),
        func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words")
    ).where(NovelChapter.project_id == project_id)

    stats_result = await db.execute(stats_query)
    stats = stats_result.one()

    # ✅ 查询完整章节列表（包含content）
    chapters_data = None
    if include_chapters:
        chapters_query = select(NovelChapter).where(
            NovelChapter.project_id == project_id
        ).order_by(NovelChapter.chapter_number)

        chapters_result = await db.execute(chapters_query)
        chapters = chapters_result.scalars().all()

        # 转换为响应格式
        chapters_data = [
            {
                "id": str(ch.id),
                "chapter_number": ch.chapter_number,
                "title": ch.title,
                "outline": ch.outline,
                "content": ch.content,
                "word_count": ch.word_count,
                "status": ch.status,
                "is_key_chapter": ch.is_key_chapter,
                "created_at": ch.created_at,
                "updated_at": ch.updated_at,
            }
            for ch in chapters
        ]

    # 手动构造响应,确保UUID转换为字符串
    return {
        "id": str(project.id),
        "user_id": str(project.user_id),
        "title": project.title,
        "description": project.description,
        "genre": project.genre,
        "world_setting": project.world_setting,
        "characters": project.characters,
        "outlines": project.outlines,
        "target_words": project.target_words,
        "status": project.status,
        "total_words": stats.total_words,
        "chapter_count": stats.chapter_count,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "chapters": chapters_data,  # ✅ 返回完整章节列表
    }


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_update: ProjectUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新项目"""

    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 更新字段
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    project.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(project)

    # 添加统计信息
    stats_query = select(
        func.count(NovelChapter.id).label("chapter_count"),
        func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words")
    ).where(NovelChapter.project_id == project_id)

    stats_result = await db.execute(stats_query)
    stats = stats_result.one()

    # 手动构造响应,确保UUID转换为字符串
    return {
        "id": str(project.id),
        "user_id": str(project.user_id),
        "title": project.title,
        "description": project.description,
        "genre": project.genre,
        "world_setting": project.world_setting,
        "characters": project.characters,
        "outlines": project.outlines,
        "target_words": project.target_words,
        "status": project.status,
        "total_words": stats.total_words,
        "chapter_count": stats.chapter_count,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """删除项目"""

    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    await db.delete(project)
    await db.commit()

    return None


@router.get("/{project_id}/stats")
async def get_project_detailed_stats(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    获取项目详细统计信息

    Returns:
        {
            "basic": {
                "total_words": 50000,
                "chapter_count": 8,
                "target_words": 100000,
                "completion_rate": 0.5
            },
            "chapters": {
                "completed": 7,
                "draft": 1,
                "pending": 2,
                "avg_words_per_chapter": 6250
            },
            "rag": {
                "indexed_chapters": 7,
                "index_rate": 0.875
            },
            "timeline": {
                "created_at": "...",
                "updated_at": "...",
                "last_generated_at": "..."
            }
        }
    """
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 基础统计
    basic_stats_query = select(
        func.count(NovelChapter.id).label("total_count"),
        func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words"),
        func.avg(NovelChapter.word_count).label("avg_words")
    ).where(
        NovelChapter.project_id == project_id,
        NovelChapter.content.isnot(None),
        NovelChapter.content != ""
    )
    basic_result = await db.execute(basic_stats_query)
    basic = basic_result.one()

    # 章节状态统计
    status_query = select(
        NovelChapter.status,
        func.count(NovelChapter.id).label("count")
    ).where(
        NovelChapter.project_id == project_id
    ).group_by(NovelChapter.status)
    status_result = await db.execute(status_query)
    status_counts = {row.status: row.count for row in status_result}

    # 最后生成时间
    last_generated_query = select(
        func.max(NovelChapter.updated_at)
    ).where(
        NovelChapter.project_id == project_id,
        NovelChapter.status == "completed"
    )
    last_generated_result = await db.execute(last_generated_query)
    last_generated_at = last_generated_result.scalar()

    # RAG 索引统计（简化版，实际可查询 ChromaDB）
    completed_chapters = status_counts.get("completed", 0)

    return {
        "basic": {
            "total_words": int(basic.total_words),
            "chapter_count": int(basic.total_count),
            "target_words": project.target_words or 0,
            "completion_rate": round(
                int(basic.total_words) / project.target_words, 2
            ) if project.target_words else 0
        },
        "chapters": {
            "completed": status_counts.get("completed", 0),
            "draft": status_counts.get("draft", 0),
            "pending": status_counts.get("pending", 0),
            "avg_words_per_chapter": round(float(basic.avg_words)) if basic.avg_words else 0
        },
        "rag": {
            "indexed_chapters": completed_chapters,
            "index_rate": round(
                completed_chapters / int(basic.total_count), 2
            ) if int(basic.total_count) > 0 else 0
        },
        "timeline": {
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            "last_generated_at": last_generated_at.isoformat() if last_generated_at else None
        }
    }


@router.get("/{project_id}/outlines")
async def get_project_outlines(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目章节大纲"""

    query = select(NovelProject.outlines).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    result = await db.execute(query)
    outlines = result.scalar_one_or_none()

    if outlines is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    return {"outlines": outlines or []}


@router.put("/{project_id}/outlines")
async def update_project_outlines(
    project_id: UUID,
    outlines: list,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新项目章节大纲"""

    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    project.outlines = outlines
    project.updated_at = datetime.utcnow()

    await db.commit()

    return {"success": True, "outlines": outlines}


@router.get("/{project_id}/statistics")
async def get_project_statistics(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目统计信息"""

    # 验证项目归属
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 查询统计信息
    stats_query = select(
        func.count(NovelChapter.id).label("chapter_count"),
        func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words"),
        func.avg(NovelChapter.word_count).label("avg_words_per_chapter")
    ).where(NovelChapter.project_id == project_id)

    stats_result = await db.execute(stats_query)
    stats = stats_result.one()

    return {
        "project_id": str(project_id),
        "title": project.title,
        "chapter_count": stats.chapter_count,
        "total_words": stats.total_words,
        "avg_words_per_chapter": round(stats.avg_words_per_chapter or 0, 2),
        "target_words": project.target_words,
        "progress_percentage": round((stats.total_words / project.target_words * 100) if project.target_words > 0 else 0, 2)
    }


@router.get("/{project_id}/export")
async def export_project(
    project_id: UUID,
    format: str = "docx",
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """导出项目为文档"""

    # 验证项目归属
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 获取所有章节
    chapters_query = select(NovelChapter).where(
        NovelChapter.project_id == project_id
    ).order_by(NovelChapter.chapter_number)

    chapters_result = await db.execute(chapters_query)
    chapters = chapters_result.scalars().all()

    # 导出服务
    export_service = ExportService()

    if format == "docx":
        file_data = await export_service.export_to_docx(project, chapters)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"{project.title}.docx"
    elif format == "pdf":
        file_data = await export_service.export_to_pdf(project, chapters)
        media_type = "application/pdf"
        filename = f"{project.title}.pdf"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的导出格式"
        )

    return Response(
        content=file_data,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
