"""
世界观 AI 提取 - API 路由
包含流式提取、批量保存和伏笔生成端点
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional
from openai import AsyncOpenAI
import logging

from ..database import get_db
from ..middleware.auth import get_current_user_id
from ..models import NovelProject, NovelChapter, WorldEntry
from ..schemas.extraction_schemas import (
    ExtractionRequest,
    BatchSaveRequest,
    BatchSaveResponse,
)
from ..services.world_extractor_service import WorldExtractorService
from ..services.prompt_templates import NovelPromptTemplates
from ..config import settings


router = APIRouter(prefix="/world", tags=["World Building - AI Extraction"])
logger = logging.getLogger(__name__)


async def verify_project_ownership(
    project_id: UUID,
    user_id: str,
    db: AsyncSession,
) -> NovelProject:
    """验证项目所有权"""
    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id,
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在或无权访问")
    return project


@router.post("/projects/{project_id}/extract/stream")
async def extract_world_entries_stream(
    project_id: UUID,
    request: ExtractionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    流式提取世界观条目 (SSE)

    从指定章节中使用 AI 提取世界观条目，实时返回提取结果。

    SSE 事件类型：
    - progress: 提取进度更新
    - entry: 提取到的条目
    - complete: 提取完成
    - error: 错误信息
    """
    await verify_project_ownership(project_id, user_id, db)

    if str(request.project_id) != str(project_id):
        raise HTTPException(status_code=400, detail="项目 ID 不匹配")

    extractor = WorldExtractorService(db)

    async def event_generator():
        """SSE 事件生成器"""
        try:
            async for event_data in extractor.extract_from_chapters(
                project_id=project_id,
                chapter_ids=request.chapter_ids,
                entry_types=request.entry_types,
                min_confidence=request.min_confidence,
            ):
                event_type = event_data.get("event", "message")
                data = event_data.get("data", {})
                yield f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.error(f"提取流出错: {e}", exc_info=True)
            error_data = {"message": str(e)}
            yield f"event: error\ndata: {json.dumps(error_data, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/projects/{project_id}/extract/batch-save", response_model=BatchSaveResponse)
async def batch_save_extracted_entries(
    project_id: UUID,
    request: BatchSaveRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    批量保存提取的条目

    将 AI 提取的条目批量保存到世界观记忆库。
    """
    await verify_project_ownership(project_id, user_id, db)

    if str(request.project_id) != str(project_id):
        raise HTTPException(status_code=400, detail="项目 ID 不匹配")

    saved_count = 0
    failed_count = 0
    saved_ids: list[str] = []
    errors: list[str] = []

    for entry_data in request.entries:
        try:
            entry = WorldEntry(
                project_id=project_id,
                type=entry_data.type,
                name=entry_data.name,
                description=entry_data.description,
                properties=entry_data.properties,
                custom_fields={},
                tags=[],
            )

            if entry_data.type == "foreshadowing":
                entry.foreshadow_status = "planted"
                entry.planted_chapter = entry_data.planted_chapter
                entry.planned_reveal_chapter = entry_data.planned_reveal_chapter
                entry.hint_text = entry_data.hint_text

            db.add(entry)
            await db.flush()
            saved_ids.append(str(entry.id))
            saved_count += 1

        except Exception as e:
            failed_count += 1
            errors.append(f"保存 '{entry_data.name}' 失败: {str(e)}")
            logger.warning(f"保存条目失败: {e}")

    await db.commit()

    return BatchSaveResponse(
        saved_count=saved_count,
        failed_count=failed_count,
        saved_ids=saved_ids,
        errors=errors,
    )


# ============================================
# 伏笔生成
# ============================================

class GenerateForeshadowingRequest(BaseModel):
    """伏笔生成请求"""
    chapter_id: Optional[int] = Field(None, description="基于特定章节生成")
    context_hint: Optional[str] = Field(None, max_length=500, description="用户额外提示")
    count: int = Field(default=1, ge=1, le=3, description="生成数量")


class ForeshadowingSuggestion(BaseModel):
    """伏笔建议"""
    name: str
    description: str
    hint_text: str
    planted_chapter: int
    planned_reveal_chapter: int
    properties: dict
    reasoning: str


class GenerateForeshadowingResponse(BaseModel):
    """伏笔生成响应"""
    suggestions: list[ForeshadowingSuggestion]


@router.post(
    "/projects/{project_id}/generate-foreshadowing",
    response_model=GenerateForeshadowingResponse,
)
async def generate_foreshadowing(
    project_id: UUID,
    request: GenerateForeshadowingRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    AI 生成伏笔建议

    根据项目背景和章节内容，生成伏笔建议供用户参考。
    用户确认后才会保存到世界观记忆库。
    """
    project = await verify_project_ownership(project_id, user_id, db)

    chapter_number = request.chapter_id or 1
    chapter_content = ""
    project_context = ""

    if request.chapter_id:
        chapter_query = select(NovelChapter).where(
            NovelChapter.project_id == project_id,
            NovelChapter.chapter_number == request.chapter_id,
        )
        chapter_result = await db.execute(chapter_query)
        chapter = chapter_result.scalar_one_or_none()
        if chapter and chapter.content:
            chapter_content = chapter.content[:4000]
            chapter_number = chapter.chapter_number

    if project.description:
        project_context = f"故事背景：{project.description}\n"
    if project.genre:
        project_context += f"类型：{project.genre}\n"

    system_prompt = NovelPromptTemplates.get_foreshadowing_generation_prompt(
        chapter_number=chapter_number,
        context_hint=request.context_hint,
    )

    user_prompt = f"""{project_context}

【章节内容参考】
{chapter_content if chapter_content else "（无章节内容，请根据故事背景生成通用伏笔建议）"}

请生成 {request.count} 个伏笔建议。
如果生成多个，请返回 JSON 数组格式。"""

    try:
        client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
        )

        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.8,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        if not content:
            raise HTTPException(status_code=500, detail="AI 返回空内容")

        result = json.loads(content)

        if isinstance(result, dict):
            if "suggestions" in result:
                suggestions_data = result["suggestions"]
            elif "name" in result:
                suggestions_data = [result]
            else:
                suggestions_data = [result]
        elif isinstance(result, list):
            suggestions_data = result
        else:
            raise HTTPException(status_code=500, detail="AI 返回格式异常")

        suggestions = []
        for item in suggestions_data:
            suggestion = ForeshadowingSuggestion(
                name=item.get("name", "未命名伏笔"),
                description=item.get("description", ""),
                hint_text=item.get("hint_text", ""),
                planted_chapter=item.get("planted_chapter", chapter_number),
                planned_reveal_chapter=item.get(
                    "planned_reveal_chapter", chapter_number + 10
                ),
                properties=item.get("properties", {
                    "importance": "中",
                    "reveal_hint": "待定",
                }),
                reasoning=item.get("reasoning", ""),
            )
            suggestions.append(suggestion)

        return GenerateForeshadowingResponse(suggestions=suggestions)

    except json.JSONDecodeError as e:
        logger.error(f"JSON 解析失败: {e}")
        raise HTTPException(status_code=500, detail="AI 返回格式解析失败")
    except Exception as e:
        logger.error(f"伏笔生成失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")
