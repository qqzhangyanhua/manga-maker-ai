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


class BatchGenerateRequest(BaseModel):
    """批量生成请求"""
    project_id: str = Field(..., description="项目 ID")
    outlines: List[dict] = Field(..., description="章节大纲列表")
    mode: str = Field("sequential", description="生成模式（sequential/parallel）")


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    chapter_ids: List[str] = Field(..., description="章节 ID 列表")
    soft_delete: bool = Field(True, description="是否软删除")


class PreviewImportRequest(BaseModel):
    """预览导入请求"""
    text: str = Field(..., description="要导入的文本", min_length=10)


@router.post("/import")
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
        {"success": True, "chapters_created": 10, "chapters": [...]}
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


@router.post("/generate")
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


@router.delete("/delete")
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
        {"success": True, "chapters_deleted": 5}
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


@router.post("/preview-import")
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
        {"chapters": [...], "total": 10}
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
