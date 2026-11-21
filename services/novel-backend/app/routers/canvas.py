"""
Canvas API Router
无限画布生成 API
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID
import logging
import asyncio
import json
from datetime import datetime

from ..database import AsyncSessionLocal
from ..middleware.auth import get_current_user_id
from ..services.canvas import (
    ScriptAnalyzer,
    ShotPlanner,
    ComicGenerator,
    SceneInput,
)
from ..services.canvas.character_identifier import CharacterIdentifier

logger = logging.getLogger(__name__)
# 路由级依赖：之后新增的画布接口默认要求有效用户身份。
router = APIRouter(
    prefix="/canvas",
    tags=["Canvas - Novel to Comic"],
    dependencies=[Depends(get_current_user_id)],
)


class AnalyzeScriptRequest(BaseModel):
    """分析剧本请求"""
    chapter_content: str
    chapter_number: int = 1


class PlanShotsRequest(BaseModel):
    """规划镜头请求"""
    script_content: str
    scene_description: str
    character_actions: str
    available_characters: Optional[List[dict]] = None


class GenerateFinalsRequest(BaseModel):
    """生成最终漫画图请求"""
    scenes: List[SceneInput]
    comic_style: str = "manga"
    add_speech_bubbles: bool = True


class IdentifyCharactersRequest(BaseModel):
    """识别角色请求"""
    dialogue: Optional[str] = None
    scene_description: str = ""
    available_characters: List[dict]  # [{"id": "uuid", "name": "小明", "description": "..."}]


class BatchIdentifyCharactersRequest(BaseModel):
    """批量识别角色请求"""
    shots: List[dict]  # [{"shot_id": "...", "dialogue": "...", "description": "..."}]
    available_characters: List[dict]


@router.post("/analyze-script")
async def analyze_script(request: AnalyzeScriptRequest):
    """
    分析章节文本，生成剧本片段
    """
    try:
        analyzer = ScriptAnalyzer()
        segments = await analyzer.analyze_chapter(
            chapter_content=request.chapter_content,
            chapter_number=request.chapter_number,
        )
        return {
            "success": True,
            "segments": [s.model_dump() for s in segments],
        }
    except Exception as e:
        logger.error(f"剧本分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plan-shots")
async def plan_shots(request: PlanShotsRequest):
    """
    为剧本片段规划镜头
    """
    try:
        planner = ShotPlanner()
        shots = await planner.plan_shots(
            script_content=request.script_content,
            scene_description=request.scene_description,
            character_actions=request.character_actions,
            available_characters=request.available_characters,
        )
        return {
            "success": True,
            "shots": [s.model_dump() for s in shots],
        }
    except Exception as e:
        logger.error(f"镜头规划失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-finals")
async def generate_finals(request: GenerateFinalsRequest):
    """
    为场景图列表生成最终漫画图
    """
    try:
        logger.info(f"接收到漫画图生成请求: {len(request.scenes)} 个场景, 风格={request.comic_style}")
        generator = ComicGenerator()
        panels = await generator.generate_finals(
            scenes=request.scenes,
            comic_style=request.comic_style,
            add_speech_bubbles=request.add_speech_bubbles,
        )
        return {
            "success": True,
            "panels": [p.model_dump() for p in panels],
        }
    except Exception as e:
        logger.error(f"漫画图生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/identify-characters")
async def identify_characters(request: IdentifyCharactersRequest):
    """
    从对话和场景描述中识别角色

    使用 LLM 分析文本，匹配可用角色列表中的角色
    """
    try:
        identifier = CharacterIdentifier()
        result = await identifier.identify_characters(
            dialogue=request.dialogue,
            scene_description=request.scene_description,
            available_characters=request.available_characters,
        )
        return {
            "success": True,
            "identified_characters": [c.model_dump() for c in result.identified_characters],
            "unmatched_names": result.unmatched_names,
            "matched_character_ids": result.matched_character_ids,
        }
    except Exception as e:
        logger.error(f"角色识别失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-identify-characters")
async def batch_identify_characters(request: BatchIdentifyCharactersRequest):
    """
    批量识别多个镜头中的角色

    为每个镜头独立识别在场角色，返回 shot_id -> 角色列表 的映射
    """
    try:
        identifier = CharacterIdentifier()
        results = await identifier.batch_identify(
            shots=request.shots,
            available_characters=request.available_characters,
        )

        # 转换结果格式
        formatted_results = {}
        for shot_id, result in results.items():
            formatted_results[shot_id] = {
                "identified_characters": [c.model_dump() for c in result.identified_characters],
                "unmatched_names": result.unmatched_names,
                "matched_character_ids": result.matched_character_ids,
            }

        return {
            "success": True,
            "results": formatted_results,
            "summary": {
                "total_shots": len(request.shots),
                "shots_with_characters": len([r for r in results.values() if r.matched_character_ids]),
            },
        }
    except Exception as e:
        logger.error(f"批量角色识别失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def find_canvas_timeline_owner_id(timeline_id: str) -> str | None:
    """读取共享库 canvas_timelines.user_id。没有这条时间线时返回 None。

    小说后端没有时间线模型。id 用绑定参数传入，不拼进 SQL。
    测试替换本函数，因此不需要真实数据库。
    """
    try:
        UUID(timeline_id)
    except ValueError:
        return None

    statement = text(
        "SELECT CAST(user_id AS text) FROM canvas_timelines WHERE id = CAST(:timeline_id AS uuid)"
    )
    async with AsyncSessionLocal() as session:
        result = await session.execute(statement, {"timeline_id": timeline_id})
        row = result.first()
    if row is None or row[0] is None:
        return None
    return str(row[0])


async def timeline_event_generator(timeline_id: str):
    """
    SSE 事件生成器 - 实时推送时间轴更新

    TODO: 当前为示例实现,实际应该:
    1. 监听 Redis/消息队列的更新事件
    2. 查询数据库获取实际状态
    3. 推送真实的章节状态变化
    """
    try:
        # Send initial connection message
        yield f"data: {json.dumps({'type': 'connected', 'timeline_id': timeline_id, 'timestamp': datetime.now().isoformat()})}\n\n"

        # Keep connection alive with heartbeat
        while True:
            await asyncio.sleep(30)
            yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"

    except asyncio.CancelledError:
        logger.info(f"SSE connection closed for timeline {timeline_id}")
        raise
    except Exception as e:
        logger.error(f"SSE error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


@router.get("/timeline/{timeline_id}/stream")
async def stream_timeline_updates(
    timeline_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    SSE 端点 - 实时推送时间轴章节状态更新

    客户端通过 EventSource 连接此端点接收实时更新。
    建立连接前确认时间线属于当前用户；不存在或不属于时返回 404，不打开推送。

    事件格式:
    - type: 'connected' | 'status_update' | 'count_update' | 'heartbeat' | 'error'
    - chapterId: 章节ID (status_update/count_update 时)
    - stage: 'script' | 'shot' | 'scene' | 'final'
    - status: 'pending' | 'generating' | 'completed' | 'error'
    - count: 数量
    """
    owner_id = await find_canvas_timeline_owner_id(timeline_id)
    # 不存在与非所有者同一 404，避免泄露时间线是否存在。
    if owner_id is None or owner_id != user_id:
        raise HTTPException(status_code=404, detail="时间线不存在")

    return StreamingResponse(
        timeline_event_generator(timeline_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
