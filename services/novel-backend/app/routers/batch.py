"""
批量操作 API 路由
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel, Field

from ..database import get_db
from ..middleware.auth import get_current_user_id
from ..models import NovelProject, NovelChapter
from ..services.batch_service import BatchService


router = APIRouter(prefix="/batch", tags=["Batch Operations"])


class BatchImportRequest(BaseModel):
    """批量导入请求"""
    project_id: str = Field(..., description="项目 ID")
    text: str = Field(..., description="要导入的文本", min_length=10)
    auto_parse: bool = Field(True, description="是否自动解析章节")
    start_number: int = Field(1, ge=1, description="起始章节号")

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "550e8400-e29b-41d4-a716-446655440000",
                "text": "第一章 初入江湖\n\n李明从小生长在边陲小镇...\n\n第二章 奇遇\n\n一日，李明在山中采药...",
                "auto_parse": True,
                "start_number": 1
            }
        }


class BatchGenerateRequest(BaseModel):
    """批量生成请求"""
    project_id: str = Field(..., description="项目 ID")
    outlines: List[dict] = Field(..., description="章节大纲列表")
    mode: str = Field("sequential", description="生成模式（sequential/parallel）")

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "550e8400-e29b-41d4-a716-446655440000",
                "outlines": [
                    {"chapter_number": 1, "title": "初入江湖", "outline": "主角踏入武林的第一步"},
                    {"chapter_number": 2, "title": "奇遇", "outline": "主角遇到神秘高人"}
                ],
                "mode": "sequential"
            }
        }


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    chapter_ids: List[str] = Field(..., description="章节 ID 列表")
    soft_delete: bool = Field(True, description="是否软删除")

    class Config:
        json_schema_extra = {
            "example": {
                "chapter_ids": [
                    "660e8400-e29b-41d4-a716-446655440001",
                    "660e8400-e29b-41d4-a716-446655440002"
                ],
                "soft_delete": True
            }
        }


class PreviewImportRequest(BaseModel):
    """预览导入请求"""
    text: str = Field(..., description="要导入的文本", min_length=10)

    class Config:
        json_schema_extra = {
            "example": {
                "text": "第一章 序幕\n\n故事开始于...\n\n第二章 启程\n\n主角踏上了..."
            }
        }


class ChapterPreview(BaseModel):
    """章节预览"""
    chapter_number: int = Field(..., description="章节号")
    title: str = Field(..., description="章节标题")
    content: str = Field(..., description="章节内容")
    word_count: int = Field(..., description="字数")


class BatchImportResponse(BaseModel):
    """批量导入响应"""
    success: bool = Field(..., description="是否成功")
    chapters_created: int = Field(..., description="创建的章节数量")
    chapters: List[dict] = Field(..., description="创建的章节列表")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "chapters_created": 2,
                "chapters": [
                    {
                        "id": "660e8400-e29b-41d4-a716-446655440001",
                        "chapter_number": 1,
                        "title": "初入江湖",
                        "word_count": 3200
                    },
                    {
                        "id": "660e8400-e29b-41d4-a716-446655440002",
                        "chapter_number": 2,
                        "title": "奇遇",
                        "word_count": 3500
                    }
                ]
            }
        }


class BatchDeleteResponse(BaseModel):
    """批量删除响应"""
    success: bool = Field(..., description="是否成功")
    chapters_deleted: int = Field(..., description="删除的章节数量")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "chapters_deleted": 2
            }
        }


class PreviewImportResponse(BaseModel):
    """预览导入响应"""
    chapters: List[ChapterPreview] = Field(..., description="解析出的章节列表")
    total: int = Field(..., description="章节总数")

    class Config:
        json_schema_extra = {
            "example": {
                "chapters": [
                    {
                        "chapter_number": 1,
                        "title": "序幕",
                        "content": "故事开始于...",
                        "word_count": 2800
                    },
                    {
                        "chapter_number": 2,
                        "title": "启程",
                        "content": "主角踏上了...",
                        "word_count": 3100
                    }
                ],
                "total": 2
            }
        }


@router.post(
    "/import",
    response_model=BatchImportResponse,
    status_code=200,
    summary="批量导入章节",
    responses={
        400: {"description": "文本格式错误或解析失败"},
        404: {"description": "项目不存在"},
        500: {"description": "导入失败"}
    }
)
async def batch_import_chapters(
    request: BatchImportRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    批量导入章节

    支持自动识别章节分隔符，将长文本拆分为多个章节。

    支持的格式：
    - 第X章 标题
    - Chapter X: 标题
    - X. 标题
    - 【第X章】标题

    Args:
        request: 批量导入请求
        user_id: 当前用户 ID
        db: 数据库会话

    Returns:
        BatchImportResponse: 导入结果，包含创建的章节列表
    """
    try:
        project_query = select(NovelProject).where(
            NovelProject.id == request.project_id,
            NovelProject.user_id == user_id
        )
        project_result = await db.execute(project_query)
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="项目不存在")

        batch_service = BatchService(db)
        result = await batch_service.batch_import(
            project_id=request.project_id,
            text=request.text,
            auto_parse=request.auto_parse,
            start_number=request.start_number
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量导入失败: {str(e)}"
        )


@router.post(
    "/generate",
    status_code=200,
    summary="批量生成章节（SSE 流式）",
    responses={
        400: {"description": "请求参数错误"},
        404: {"description": "项目不存在"},
        500: {"description": "生成失败"}
    }
)
async def batch_generate_chapters(
    request: BatchGenerateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    批量生成章节（流式返回进度）

    基于章节大纲批量生成章节内容，使用 SSE 流式返回进度。

    Args:
        request: 批量生成请求
        user_id: 当前用户 ID
        db: 数据库会话

    Returns:
        SSE 流（Server-Sent Events）

    事件格式：
    ```
    data: {"type": "progress", "current": 1, "total": 10, "chapter": {...}}
    data: {"type": "error", "current": 2, "error": "..."}
    data: {"type": "complete", "total": 10}
    ```
    """
    try:
        project_query = select(NovelProject).where(
            NovelProject.id == request.project_id,
            NovelProject.user_id == user_id
        )
        project_result = await db.execute(project_query)
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="项目不存在")

        batch_service = BatchService(db)
        
        async def generate_stream():
            """生成 SSE 流"""
            try:
                async for event in batch_service.batch_generate(
                    project_id=request.project_id,
                    outlines=request.outlines,
                    mode=request.mode
                ):
                    yield f"data: {json.dumps(event)}\n\n"
            except Exception as e:
                error_event = {
                    "type": "error",
                    "error": str(e)
                }
                yield f"data: {json.dumps(error_event)}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量生成失败: {str(e)}"
        )


@router.delete(
    "/delete",
    response_model=BatchDeleteResponse,
    status_code=200,
    summary="批量删除章节",
    responses={
        404: {"description": "章节不存在或无权访问"},
        500: {"description": "删除失败"}
    }
)
async def batch_delete_chapters(
    request: BatchDeleteRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    批量删除章节

    支持软删除（标记为已删除）和硬删除（物理删除）。

    Args:
        request: 批量删除请求
        user_id: 当前用户 ID
        db: 数据库会话

    Returns:
        BatchDeleteResponse: 删除结果，包含删除的章节数量
    """
    try:
        chapter_query = select(NovelChapter.id).join(NovelProject).where(
            NovelChapter.id.in_(request.chapter_ids),
            NovelProject.user_id == user_id
        )
        chapter_result = await db.execute(chapter_query)
        allowed_ids = {str(chapter_id) for (chapter_id,) in chapter_result.all()}
        request_ids = set(request.chapter_ids)
        if len(allowed_ids) != len(request_ids):
            raise HTTPException(status_code=404, detail="章节不存在或无权访问")

        batch_service = BatchService(db)
        result = await batch_service.batch_delete(
            chapter_ids=request.chapter_ids,
            soft_delete=request.soft_delete
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量删除失败: {str(e)}"
        )


@router.post(
    "/preview-import",
    response_model=PreviewImportResponse,
    status_code=200,
    summary="预览导入章节",
    responses={
        500: {"description": "预览失败"}
    }
)
async def preview_import(
    request: PreviewImportRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    预览导入（不实际创建章节）

    解析文本并返回识别出的章节列表，用于用户预览和确认。

    Args:
        request: 预览导入请求
        user_id: 当前用户 ID
        db: 数据库会话

    Returns:
        PreviewImportResponse: 解析出的章节列表
    """
    try:
        batch_service = BatchService(db)
        result = await batch_service.preview_import(request.text)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"预览失败: {str(e)}"
        )
