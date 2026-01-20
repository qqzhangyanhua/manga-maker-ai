"""
章节管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
import logging

from ..database import get_db
from ..models import NovelProject, NovelChapter, NovelChapterVersion
from sqlalchemy import func as sql_func
from ..middleware.auth import get_current_user_id
from ..services.rag_service import NovelRAGService
from ..services.generation_service import NovelGenerationService

router = APIRouter(prefix="/chapters", tags=["Chapters - Generation & Management"])
logger = logging.getLogger(__name__)  # ✨ 添加日志记录器


# ============ Pydantic Models ============

class ChapterCreate(BaseModel):
    """创建章节请求"""
    project_id: str = Field(..., description="项目 ID (UUID)")
    chapter_number: int = Field(..., description="章节序号（从 1 开始）", ge=1)
    title: str = Field(..., max_length=200, description="章节标题", min_length=1)
    outline: Optional[str] = Field(None, description="章节大纲（可选）", max_length=5000)

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "chapter_number": 1,
                "title": "第一章：穿越异界",
                "outline": "主角林枫意外穿越到修仙世界，发现自己拥有金手指系统..."
            }
        }


class ChapterUpdate(BaseModel):
    """更新章节请求"""
    title: Optional[str] = Field(None, max_length=200, description="章节标题", min_length=1)
    outline: Optional[str] = Field(None, description="章节大纲", max_length=5000)
    content: Optional[str] = Field(None, description="章节正文内容")
    status: Optional[str] = Field(None, description="章节状态：draft | published")
    is_key_chapter: Optional[bool] = Field(None, description="是否为关键章节")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "第一章：穿越异界（修订版）",
                "status": "published",
                "is_key_chapter": True
            }
        }


class ChapterResponse(BaseModel):
    """章节响应"""
    id: str = Field(..., description="章节 ID (UUID)")
    project_id: str = Field(..., description="项目 ID (UUID)")
    chapter_number: int = Field(..., description="章节序号", ge=1)
    title: str = Field(..., description="章节标题")
    outline: Optional[str] = Field(None, description="章节大纲")
    content: Optional[str] = Field(None, description="章节正文内容")
    word_count: int = Field(0, description="字数", ge=0)
    prompt_used: Optional[str] = Field(None, description="生成时使用的 Prompt")
    model_used: Optional[str] = Field(None, description="生成时使用的 AI 模型")
    status: str = Field(..., description="章节状态")
    is_key_chapter: bool = Field(False, description="是否为关键章节")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="最后更新时间")

    class Config:
        from_attributes = True
        # 自动转换 UUID 为字符串
        json_encoders = {
            UUID: str
        }
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "chapter_number": 1,
                "title": "第一章：穿越异界",
                "content": "天地玄黄，宇宙洪荒...",
                "word_count": 6580,
                "status": "published",
                "is_key_chapter": True
            }
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
    chapter_id: str = Field(..., description="章节 ID (UUID)")
    style_prompt: Optional[str] = Field(None, description="风格提示（如：热血、悬疑等）", max_length=500)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="生成温度（0.0-2.0，越高越随机）")
    use_rag: bool = Field(True, description="是否使用 RAG 检索相关章节作为上下文")

    class Config:
        json_schema_extra = {
            "example": {
                "chapter_id": "550e8400-e29b-41d4-a716-446655440000",
                "style_prompt": "热血修仙",
                "temperature": 0.8,
                "use_rag": True
            }
        }


class ReviseContentRequest(BaseModel):
    """修订内容请求"""
    original_text: str = Field(..., min_length=1, description="原始文本（待修改的内容）")
    instruction: str = Field(..., min_length=1, description="修改指令（如：增加细节描写、修改人物对话等）", max_length=1000)

    class Config:
        json_schema_extra = {
            "example": {
                "original_text": "林枫走进了房间。",
                "instruction": "增加环境描写和心理活动"
            }
        }


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
    status_filter: Optional[str] = Query(
        "all",
        regex="^(all|completed|draft|pending)$",
        description="状态过滤: all(全部) | completed(已完成) | draft(草稿) | pending(待生成)"
    ),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    获取项目的章节列表

    Args:
        project_id: 项目 ID
        status_filter: 状态过滤
            - all: 返回所有章节（默认）
            - completed: 只返回已完成章节
            - draft: 只返回草稿章节
            - pending: 只返回待生成章节

    Returns:
        章节列表
    """

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

    # 构建查询条件
    query = select(NovelChapter).where(NovelChapter.project_id == project_id)

    # 根据状态过滤
    if status_filter == "completed":
        query = query.where(
            NovelChapter.status == "completed",
            NovelChapter.content.isnot(None),
            NovelChapter.content != ""
        )
    elif status_filter == "draft":
        query = query.where(NovelChapter.status == "draft")
    elif status_filter == "pending":
        query = query.where(
            or_(
                NovelChapter.status == "pending",
                NovelChapter.content.is_(None),
                NovelChapter.content == ""
            )
        )
    # status_filter == "all" 不添加额外条件，返回所有章节

    # 排序
    query = query.order_by(NovelChapter.chapter_number)

    result = await db.execute(query)
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
                chapter_number=chapter.chapter_number,  # 新增参数
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

            # ✨ 字数监控：记录实际生成字数并在不足时发出警告
            actual_word_count = len(accumulated_content)
            if actual_word_count < 5500:
                logger.warning(
                    f"⚠️ 章节字数不足警告 - "
                    f"章节ID: {chapter.id}, "
                    f"章节号: {chapter.chapter_number}, "
                    f"实际字数: {actual_word_count}, "
                    f"目标字数: 6000+, "
                    f"差距: {6000 - actual_word_count} 字"
                )
            else:
                logger.info(
                    f"✅ 章节生成成功 - "
                    f"章节ID: {chapter.id}, "
                    f"章节号: {chapter.chapter_number}, "
                    f"字数: {actual_word_count}"
                )

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
            chapter_number=chapter.chapter_number,  # 新增参数
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


@router.post("/{chapter_id}/revise")
async def revise_content_stream(
    chapter_id: UUID,
    request: ReviseContentRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    AI 修订章节内容（流式）

    Args:
        chapter_id: 章节 ID (路径参数)
        request: 修订请求
            - original_text: 原始文本
            - instruction: 修改指令

    Returns:
        SSE 流式响应（修订后的内容）

    Raises:
        404: 章节不存在
        403: 无权访问此章节
        400: 请求参数无效
    """
    logger.info(f"[章节修订] 开始处理请求 - chapter_id: {chapter_id}, user_id: {user_id}")
    logger.info(f"[章节修订] 修订参数 - instruction: {request.instruction}, original_text_length: {len(request.original_text)}")

    try:
        # 查询章节
        logger.info(f"[章节修订] 查询章节 - chapter_id: {chapter_id}, 类型: {type(chapter_id)}")
        chapter_query = select(NovelChapter).where(NovelChapter.id == chapter_id)
        chapter_result = await db.execute(chapter_query)
        chapter = chapter_result.scalar_one_or_none()

        logger.info(f"[章节修订] 章节查询结果 - found: {chapter is not None}")

        if not chapter:
            logger.warning(f"[章节修订] 章节不存在 - chapter_id: {chapter_id}, user_id: {user_id}")
            # 检查是否存在该 UUID 的任何章节（不限用户）
            all_chapters_query = select(NovelChapter.id, NovelChapter.project_id).where(NovelChapter.id == chapter_id)
            all_chapters_result = await db.execute(all_chapters_query)
            any_chapter = all_chapters_result.first()
            logger.info(f"[章节修订] 全局章节查询结果 - found: {any_chapter is not None}, data: {any_chapter}")

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="章节不存在"
            )

        logger.info(f"[章节修订] 章节信息 - id: {chapter.id}, project_id: {chapter.project_id}, chapter_number: {chapter.chapter_number}, title: {chapter.title}")

        # 验证项目所有权
        logger.info(f"[章节修订] 验证项目所有权 - project_id: {chapter.project_id}, user_id: {user_id}")
        project_query = select(NovelProject).where(
            NovelProject.id == chapter.project_id,
            NovelProject.user_id == user_id
        )
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()

        logger.info(f"[章节修订] 项目查询结果 - found: {project is not None}")

        if not project:
            logger.warning(f"[章节修订] 无权访问章节 - chapter_id: {chapter_id}, project_id: {chapter.project_id}, user_id: {user_id}")
            # 检查项目是否存在但属于其他用户
            project_exists_query = select(NovelProject.id, NovelProject.user_id).where(NovelProject.id == chapter.project_id)
            project_exists_result = await db.execute(project_exists_query)
            project_info = project_exists_result.first()
            logger.info(f"[章节修订] 项目实际所有者 - project_id: {chapter.project_id}, actual_user_id: {project_info[1] if project_info else 'N/A'}")

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问此章节"
            )

        logger.info(f"[章节修订] 权限验证通过 - project_id: {project.id}, title: {project.title}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[章节修订] 数据库查询异常 - chapter_id: {chapter_id}, error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询章节失败: {str(e)}"
        )

    # 执行内容修订
    logger.info(f"[章节修订] 初始化生成服务 - chapter_id: {chapter_id}")
    generation_service = NovelGenerationService()

    async def event_generator():
        """SSE 事件生成器"""
        try:
            logger.info(f"[章节修订] 开始生成修订内容 - chapter_id: {chapter_id}")
            chunk_count = 0
            async for chunk in generation_service.revise_content(
                original_content=request.original_text,
                revision_instruction=request.instruction,
            ):
                chunk_count += 1
                if chunk_count % 10 == 0:  # 每 10 个 chunk 记录一次
                    logger.debug(f"[章节修订] 已生成 {chunk_count} 个 chunks - chapter_id: {chapter_id}")
                yield f"data: {chunk}\n\n"

            logger.info(f"[章节修订] 修订完成 - chapter_id: {chapter_id}, total_chunks: {chunk_count}")
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"[章节修订] 修订失败 - chapter_id: {chapter_id}, error: {str(e)}", exc_info=True)
            yield f"data: [ERROR: {str(e)}]\n\n"

    logger.info(f"[章节修订] 返回 SSE 流 - chapter_id: {chapter_id}")
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
