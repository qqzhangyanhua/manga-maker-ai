"""
小说项目管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
import logging

from ..database import get_db
from ..models import NovelProject, NovelChapter
from ..middleware.auth import get_current_user_id
from ..services.export_service import NovelExportService
from ..services.generation_service import NovelGenerationService
from fastapi.responses import Response

router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger(__name__)


# ============ Pydantic Models ============

class ProjectCreate(BaseModel):
    """创建项目请求"""
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    genre: Optional[str] = None
    world_setting: Optional[dict] = None
    characters: Optional[list] = None
    target_words: Optional[int] = None


class ProjectUpdate(BaseModel):
    """更新项目请求"""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    genre: Optional[str] = None
    world_setting: Optional[dict] = None
    characters: Optional[list] = None
    outlines: Optional[list] = None
    target_words: Optional[int] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    """项目响应"""
    id: str
    user_id: str
    title: str
    description: Optional[str]
    genre: Optional[str]
    world_setting: Optional[dict]
    characters: Optional[list]
    outlines: Optional[list]
    target_words: Optional[int]
    status: str
    total_words: int
    chapter_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        # 自动转换 UUID 为字符串
        json_encoders = {
            UUID: str
        }
    
    @classmethod
    def model_validate(cls, obj):
        """重写验证方法，自动转换 UUID 字段"""
        if hasattr(obj, '__dict__'):
            data = {}
            for key, value in obj.__dict__.items():
                if isinstance(value, UUID):
                    data[key] = str(value)
                else:
                    data[key] = value
            return super().model_validate(data)
        return super().model_validate(obj)


# ============ API Endpoints ============

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
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
        target_words=project_data.target_words,
    )
    
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    
    return ProjectResponse.model_validate(new_project)


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取用户的项目列表"""
    
    query = select(NovelProject).where(NovelProject.user_id == user_id)
    
    if status_filter:
        query = query.where(NovelProject.status == status_filter)
    
    query = query.order_by(NovelProject.updated_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目详情"""
    
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
    
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新项目信息"""
    
    # 查询项目
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
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse.model_validate(project)


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


@router.get("/{project_id}/statistics")
async def get_project_statistics(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目统计信息"""
    
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
    
    # 统计章节信息
    stats_query = select(
        func.count(NovelChapter.id).label("total_chapters"),
        func.sum(NovelChapter.word_count).label("total_words"),
        func.count(NovelChapter.id).filter(NovelChapter.status == "completed").label("completed_chapters")
    ).where(NovelChapter.project_id == project_id)
    
    stats_result = await db.execute(stats_query)
    stats = stats_result.one()
    
    return {
        "total_chapters": stats.total_chapters or 0,
        "total_words": stats.total_words or 0,
        "completed_chapters": stats.completed_chapters or 0,
        "target_words": project.target_words,
        "progress_percentage": round((stats.total_words or 0) / project.target_words * 100, 2) if project.target_words else 0,
    }


@router.get("/{project_id}/export")
async def export_project(
    project_id: UUID,
    format: str = "txt",  # txt, docx, pdf
    include_outline: bool = False,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    导出项目为文件
    
    Args:
        project_id: 项目 ID
        format: 导出格式（txt, docx, pdf）
        include_outline: 是否包含章节大纲
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
    
    # 查询所有章节（按章节号排序）
    chapters_query = select(NovelChapter).where(
        NovelChapter.project_id == project_id
    ).order_by(NovelChapter.chapter_number)
    
    chapters_result = await db.execute(chapters_query)
    chapters = chapters_result.scalars().all()
    
    if not chapters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="项目没有章节可导出"
        )
    
    # 转换为字典格式
    chapters_data = [
        {
            "chapter_number": ch.chapter_number,
            "title": ch.title,
            "outline": ch.outline,
            "content": ch.content,
        }
        for ch in chapters
    ]
    
    # 导出服务
    export_service = NovelExportService()
    
    try:
        if format == "txt":
            content = export_service.export_to_txt(
                project_title=project.title,
                chapters=chapters_data,
                include_outline=include_outline
            )
            media_type = "text/plain; charset=utf-8"
            filename = f"{project.title}.txt"
            
        elif format == "docx":
            content = export_service.export_to_word(
                project_title=project.title,
                project_description=project.description or "",
                chapters=chapters_data,
                include_outline=include_outline
            )
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"{project.title}.docx"
            
        elif format == "pdf":
            content = export_service.export_to_pdf(
                project_title=project.title,
                project_description=project.description or "",
                chapters=chapters_data,
                include_outline=include_outline
            )
            media_type = "application/pdf"
            filename = f"{project.title}.pdf"
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的导出格式"
            )
        
        # 返回文件
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        logger.error(f"导出失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败: {str(e)}"
        )


@router.get("/{project_id}/search")
async def search_project(
    project_id: UUID,
    q: str,  # 搜索关键词
    type: str = "all",  # all, title, content
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    全文搜索
    
    Args:
        project_id: 项目 ID
        q: 搜索关键词
        type: 搜索类型（all=全部, title=标题, content=内容）
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
    
    if not q or len(q.strip()) == 0:
        return {"results": [], "total": 0}
    
    # 构建搜索条件
    search_keyword = f"%{q}%"
    conditions = [NovelChapter.project_id == project_id]
    
    if type == "title":
        conditions.append(NovelChapter.title.ilike(search_keyword))
    elif type == "content":
        conditions.append(NovelChapter.content.ilike(search_keyword))
    else:  # all
        conditions.append(
            or_(
                NovelChapter.title.ilike(search_keyword),
                NovelChapter.content.ilike(search_keyword),
                NovelChapter.outline.ilike(search_keyword)
            )
        )
    
    # 执行搜索
    search_query = select(NovelChapter).where(*conditions).order_by(
        NovelChapter.chapter_number
    )
    
    result = await db.execute(search_query)
    chapters = result.scalars().all()
    
    # 格式化结果（包含上下文片段）
    results = []
    for chapter in chapters:
        # 查找关键词在内容中的位置
        content = chapter.content or ""
        title = chapter.title or ""
        outline = chapter.outline or ""
        
        # 提取包含关键词的片段
        snippets = []
        
        # 搜索标题
        if q.lower() in title.lower():
            snippets.append({
                "type": "title",
                "text": title,
                "highlight": True
            })
        
        # 搜索大纲
        if outline and q.lower() in outline.lower():
            start = max(0, outline.lower().find(q.lower()) - 50)
            end = min(len(outline), start + 150)
            snippet_text = outline[start:end]
            if start > 0:
                snippet_text = "..." + snippet_text
            if end < len(outline):
                snippet_text = snippet_text + "..."
            snippets.append({
                "type": "outline",
                "text": snippet_text,
                "highlight": True
            })
        
        # 搜索正文（最多3个片段）
        if content:
            content_lower = content.lower()
            q_lower = q.lower()
            start_pos = 0
            for _ in range(3):
                pos = content_lower.find(q_lower, start_pos)
                if pos == -1:
                    break
                start = max(0, pos - 50)
                end = min(len(content), pos + len(q) + 100)
                snippet_text = content[start:end]
                if start > 0:
                    snippet_text = "..." + snippet_text
                if end < len(content):
                    snippet_text = snippet_text + "..."
                snippets.append({
                    "type": "content",
                    "text": snippet_text,
                    "highlight": True
                })
                start_pos = pos + len(q)
        
        results.append({
            "id": str(chapter.id),
            "chapter_number": chapter.chapter_number,
            "title": chapter.title,
            "word_count": chapter.word_count,
            "snippets": snippets[:5]  # 最多5个片段
        })
    
    return {
        "results": results,
        "total": len(results),
        "query": q
    }


@router.get("/{project_id}/outlines")
async def get_project_outlines(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目大纲"""
    # 验证项目所有权
    result = await db.execute(
        select(NovelProject).where(
            NovelProject.id == project_id,
            NovelProject.user_id == user_id
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    return {
        "outlines": project.outlines or []
    }


@router.put("/{project_id}/outlines")
async def save_project_outlines(
    project_id: UUID,
    request: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """保存项目大纲"""
    outlines = request.get("outlines", [])
    
    # 验证项目所有权
    result = await db.execute(
        select(NovelProject).where(
            NovelProject.id == project_id,
            NovelProject.user_id == user_id
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 更新大纲
    project.outlines = outlines
    await db.commit()
    
    return {
        "message": "大纲保存成功",
        "outlines": outlines
    }


@router.post("/{project_id}/analyze-chapters-characters")
async def analyze_chapters_characters(
    project_id: UUID,
    request: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    分析章节内容并提取角色信息

    根据已生成的章节内容，AI 分析并提取出现的角色，
    自动生成角色的性格、外貌、背景等详细设定
    """
    chapters_context = request.get("chapters_context", "")

    if not chapters_context or len(chapters_context.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="章节内容不能为空"
        )

    # 验证项目所有权
    result = await db.execute(
        select(NovelProject).where(
            NovelProject.id == project_id,
            NovelProject.user_id == user_id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 调用生成服务分析角色
    generation_service = NovelGenerationService()

    try:
        characters = await generation_service.analyze_chapters_characters(
            chapters_context=chapters_context,
            genre=project.genre
        )

        return {
            "message": "分析完成",
            "characters": characters
        }

    except Exception as e:
        logger.error(f"分析章节角色失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分析失败: {str(e)}"
        )


@router.post("/{project_id}/generate-outline")
async def generate_project_outline(
    project_id: UUID,
    request: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """AI 生成项目大纲"""
    chapter_count = request.get("chapter_count", 10)
    style = request.get("style")
    mode = request.get("mode", "full")  # "full" 或 "continue"
    existing_outlines = request.get("existing_outlines", [])  # 续写模式的上下文
    start_chapter = request.get("start_chapter", 1)  # 起始章节号

    # 验证项目所有权并获取项目信息
    result = await db.execute(
        select(NovelProject).where(
            NovelProject.id == project_id,
            NovelProject.user_id == user_id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 调用生成服务
    generation_service = NovelGenerationService()

    try:
        result = await generation_service.generate_outline(
            premise=project.description or project.title,
            characters=project.characters,
            world_setting=project.world_setting,
            chapter_count=chapter_count,
            style=style or project.genre,
            mode=mode,
            existing_outlines=existing_outlines,
            start_chapter=start_chapter
        )

        # 根据模式保存大纲
        if mode == "continue":
            # 续写模式：追加到现有大纲
            current_outlines = project.outlines or []
            project.outlines = current_outlines + result["chapters"]
        else:
            # 完整生成模式：覆盖现有大纲
            project.outlines = result["chapters"]

        await db.commit()

        return {
            "message": "大纲生成成功",
            "chapters": result["chapters"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"大纲生成失败: {str(e)}"
        )
