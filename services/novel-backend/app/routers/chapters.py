"""
章节管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

from ..database import get_db
from ..models import NovelProject, NovelChapter, NovelChapterVersion
from sqlalchemy import func as sql_func
from ..middleware.auth import get_current_user_id
from ..services.rag_service import NovelRAGService
from ..services.generation_service import NovelGenerationService

router = APIRouter(prefix="/chapters", tags=["chapters"])


# ============ Pydantic Models ============

class ChapterCreate(BaseModel):
    """创建章节请求"""
    project_id: str
    chapter_number: int
    title: str = Field(..., max_length=200)
    outline: Optional[str] = None


class ChapterUpdate(BaseModel):
    """更新章节请求"""
    title: Optional[str] = Field(None, max_length=200)
    outline: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    is_key_chapter: Optional[bool] = None


class ChapterResponse(BaseModel):
    """章节响应"""
    id: str
    project_id: str
    chapter_number: int
    title: str
    outline: Optional[str]
    content: Optional[str]
    word_count: int
    prompt_used: Optional[str]
    model_used: Optional[str]
    status: str
    is_key_chapter: bool
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


class GenerateChapterRequest(BaseModel):
    """生成章节请求"""
    chapter_id: str
    style_prompt: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    use_rag: bool = True  # 是否使用 RAG 增强


# ============ API Endpoints ============

@router.post("", response_model=ChapterResponse, status_code=status.HTTP_201_CREATED)
async def create_chapter(
    chapter_data: ChapterCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """创建新章节"""
    
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == chapter_data.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 检查章节号是否重复
    existing_query = select(NovelChapter).where(
        NovelChapter.project_id == chapter_data.project_id,
        NovelChapter.chapter_number == chapter_data.chapter_number
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="章节号已存在"
        )
    
    # 创建章节
    new_chapter = NovelChapter(
        project_id=chapter_data.project_id,
        chapter_number=chapter_data.chapter_number,
        title=chapter_data.title,
        outline=chapter_data.outline,
    )
    
    db.add(new_chapter)
    await db.commit()
    await db.refresh(new_chapter)
    
    return ChapterResponse.model_validate(new_chapter)


@router.get("/project/{project_id}", response_model=List[ChapterResponse])
async def list_chapters(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目的章节列表"""
    
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 查询章节
    chapters_query = select(NovelChapter).where(
        NovelChapter.project_id == project_id
    ).order_by(NovelChapter.chapter_number)
    
    result = await db.execute(chapters_query)
    chapters = result.scalars().all()
    
    return [ChapterResponse.model_validate(ch) for ch in chapters]


@router.get("/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(
    chapter_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取章节详情"""
    
    query = select(NovelChapter).where(NovelChapter.id == chapter_id)
    result = await db.execute(query)
    chapter = result.scalar_one_or_none()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == chapter.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此章节"
        )
    
    return ChapterResponse.model_validate(chapter)


@router.patch("/{chapter_id}", response_model=ChapterResponse)
async def update_chapter(
    chapter_id: UUID,
    chapter_data: ChapterUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新章节"""
    
    # 查询章节
    query = select(NovelChapter).where(NovelChapter.id == chapter_id)
    result = await db.execute(query)
    chapter = result.scalar_one_or_none()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == chapter.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权修改此章节"
        )
    
    # 更新字段
    update_data = chapter_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(chapter, field, value)
    
    # 更新字数统计
    if "content" in update_data and chapter.content:
        chapter.word_count = len(chapter.content)
    
    await db.commit()
    await db.refresh(chapter)
    
    return ChapterResponse.model_validate(chapter)


@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """删除章节"""
    
    query = select(NovelChapter).where(NovelChapter.id == chapter_id)
    result = await db.execute(query)
    chapter = result.scalar_one_or_none()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == chapter.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除此章节"
        )
    
    await db.delete(chapter)
    await db.commit()
    
    return None


@router.post("/generate/stream")
async def generate_chapter_stream(
    request: GenerateChapterRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """流式生成章节内容"""
    
    # 查询章节
    chapter_query = select(NovelChapter).where(NovelChapter.id == request.chapter_id)
    chapter_result = await db.execute(chapter_query)
    chapter = chapter_result.scalar_one_or_none()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == chapter.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此章节"
        )
    
    # 构建上下文
    context = ""
    if request.use_rag:
        rag_service = NovelRAGService(db)
        context = await rag_service.build_context_for_generation(
            str(chapter.project_id),
            chapter.chapter_number,
            chapter.outline or ""
        )
    else:
        context = chapter.outline or ""
    
    # 生成内容
    generation_service = NovelGenerationService()
    
    async def event_generator():
        """SSE 事件生成器"""
        accumulated_content = ""
        
        try:
            async for chunk in generation_service.generate_chapter_stream(
                context=context,
                chapter_outline=chapter.outline or "",
                style_prompt=request.style_prompt,
                temperature=request.temperature,
            ):
                accumulated_content += chunk
                # 发送 SSE 事件
                yield f"data: {chunk}\n\n"
            
            # 生成完成后保存到数据库
            chapter.content = accumulated_content
            chapter.word_count = len(accumulated_content)
            chapter.model_used = generation_service.model
            await db.commit()
            
            # 发送完成信号
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: [ERROR: {str(e)}]\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# ============ 版本管理 API ============

class VersionResponse(BaseModel):
    """版本响应"""
    id: str
    chapter_id: str
    version_number: int
    content: str
    word_count: int
    model_used: Optional[str]
    temperature: Optional[float]
    is_selected: bool
    user_rating: Optional[int]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {UUID: str}
    
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


@router.get("/{chapter_id}/versions", response_model=List[VersionResponse])
async def list_versions(
    chapter_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取章节的所有版本"""
    
    # 验证章节权限
    chapter_query = select(NovelChapter).where(NovelChapter.id == chapter_id)
    chapter_result = await db.execute(chapter_query)
    chapter = chapter_result.scalar_one_or_none()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == chapter.project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此章节"
        )
    
    # 查询所有版本
    versions_query = select(NovelChapterVersion).where(
        NovelChapterVersion.chapter_id == chapter_id
    ).order_by(NovelChapterVersion.version_number.desc())
    
    result = await db.execute(versions_query)
    versions = result.scalars().all()
    
    return [VersionResponse.model_validate(v) for v in versions]


@router.post("/{chapter_id}/versions/{version_id}/select", response_model=VersionResponse)
async def select_version(
    chapter_id: UUID,
    version_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """选择某个版本作为当前版本"""
    
    # 验证权限（同上）
    chapter_query = select(NovelChapter).where(NovelChapter.id == chapter_id)
    chapter_result = await db.execute(chapter_query)
    chapter = chapter_result.scalar_one_or_none()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    
    # 取消所有版本的选中状态
    await db.execute(
        select(NovelChapterVersion)
        .where(NovelChapterVersion.chapter_id == chapter_id)
    )
    all_versions_query = select(NovelChapterVersion).where(
        NovelChapterVersion.chapter_id == chapter_id
    )
    all_versions_result = await db.execute(all_versions_query)
    all_versions = all_versions_result.scalars().all()
    
    for v in all_versions:
        v.is_selected = False
    
    # 选中目标版本
    version_query = select(NovelChapterVersion).where(
        NovelChapterVersion.id == version_id
    )
    version_result = await db.execute(version_query)
    version = version_result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    version.is_selected = True
    
    # 更新章节内容为选中版本的内容
    chapter.content = version.content
    chapter.word_count = version.word_count
    chapter.model_used = version.model_used
    
    await db.commit()
    await db.refresh(version)
    
    return VersionResponse.model_validate(version)


@router.patch("/{chapter_id}/versions/{version_id}/rate")
async def rate_version(
    chapter_id: UUID,
    version_id: UUID,
    rating: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """给版本评分"""
    
    if rating < 1 or rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="评分必须在 1-5 之间"
        )
    
    version_query = select(NovelChapterVersion).where(
        NovelChapterVersion.id == version_id,
        NovelChapterVersion.chapter_id == chapter_id
    )
    version_result = await db.execute(version_query)
    version = version_result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    version.user_rating = rating
    await db.commit()
    
    return {"message": "评分成功", "rating": rating}


@router.post("/{chapter_id}/generate-versions")
async def generate_multiple_versions(
    chapter_id: UUID,
    count: int = 3,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """生成多个版本用于对比"""
    
    if count < 1 or count > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="生成数量必须在 1-5 之间"
        )
    
    # 查询章节
    chapter_query = select(NovelChapter).where(NovelChapter.id == chapter_id)
    chapter_result = await db.execute(chapter_query)
    chapter = chapter_result.scalar_one_or_none()
    
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    
    # 构建上下文
    rag_service = NovelRAGService(db)
    context = await rag_service.build_context_for_generation(
        str(chapter.project_id),
        chapter.chapter_number,
        chapter.outline or ""
    )
    
    # 获取当前最大版本号
    max_version_query = select(sql_func.max(NovelChapterVersion.version_number)).where(
        NovelChapterVersion.chapter_id == chapter_id
    )
    max_version_result = await db.execute(max_version_query)
    max_version = max_version_result.scalar() or 0
    
    # 生成多个版本
    generation_service = NovelGenerationService()
    created_versions = []
    
    for i in range(count):
        content = ""
        async for chunk in generation_service.generate_chapter_stream(
            context=context,
            chapter_outline=chapter.outline or "",
            temperature=0.7 + (i * 0.1),  # 不同温度产生不同版本
        ):
            content += chunk
        
        # 保存版本
        new_version = NovelChapterVersion(
            chapter_id=chapter_id,
            version_number=max_version + i + 1,
            content=content,
            word_count=len(content),
            model_used=generation_service.model,
            temperature=0.7 + (i * 0.1),
            is_selected=False,
        )
        
        db.add(new_version)
        created_versions.append(new_version)
    
    await db.commit()
    
    return {
        "message": f"成功生成 {count} 个版本",
        "versions": [
            {"id": str(v.id), "version_number": v.version_number}
            for v in created_versions
        ]
    }


@router.post("/revise")
async def revise_content_stream(
    request: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    AI 修订内容（流式）
    
    Args:
        original_content: 原始内容
        revision_instruction: 修改指令
    """
    original_content = request.get("original_content", "")
    revision_instruction = request.get("revision_instruction", "")
    
    if not original_content or not revision_instruction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原始内容和修改指令不能为空"
        )
    
    generation_service = NovelGenerationService()
    
    async def event_generator():
        """SSE 事件生成器"""
        try:
            async for chunk in generation_service.revise_content(
                original_content=original_content,
                revision_instruction=revision_instruction,
            ):
                yield f"data: {chunk}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: [ERROR: {str(e)}]\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
