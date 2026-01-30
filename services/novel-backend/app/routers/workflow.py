"""
专业创作工作流 API 路由
提供工作流会话管理和阶段执行功能
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.services.workflow_service import workflow_service
from app.middleware.auth import get_current_user_id
from app.utils.genre_utils import clean_genre
from app.database import get_db

router = APIRouter(prefix="/workflow", tags=["workflow"])


class CreateSessionRequest(BaseModel):
    """创建会话请求"""
    genre: Optional[str] = Field(None, description="小说类型")
    
    @field_validator("genre", mode="before")
    @classmethod
    def validate_genre(cls, v):
        """清理 genre 字段，去除括号内容"""
        return clean_genre(v)


class ExecutePhaseRequest(BaseModel):
    """执行阶段请求"""
    template_id: str = Field(..., description="模板 ID")
    input_data: dict = Field(default_factory=dict, description="输入数据")


class OptimizeResultRequest(BaseModel):
    """优化结果请求"""
    current_result: str = Field(..., description="当前生成结果")
    optimization_instruction: Optional[str] = Field(None, description="优化指令（可选）")


class CompleteWorkflowRequest(BaseModel):
    """完成工作流请求"""
    project_title: str = Field(..., description="项目标题", min_length=1)
    project_description: Optional[str] = Field(None, description="项目描述")


class GenerateOptionsRequest(BaseModel):
    """生成方案请求 - 无需用户输入，后端自动构建"""
    pass  # 后端根据 session 上下文自动生成


class GenerateOptionsResponse(BaseModel):
    """生成方案响应"""
    options: List[dict] = Field(..., description="3 个方案")
    phase: str = Field(..., description="当前阶段")


class SelectOptionRequest(BaseModel):
    """选择方案请求"""
    option_id: str = Field(..., description="选中的方案 ID")
    edited_content: Optional[str] = Field(None, description="用户编辑后的内容（可选）")


class SelectOptionResponse(BaseModel):
    """选择方案响应"""
    saved: bool = Field(True, description="是否保存成功")
    current_phase: str = Field(..., description="当前阶段")
    completed_phases: List[str] = Field(..., description="已完成阶段")


class RedoPhaseRequest(BaseModel):
    """重做阶段请求"""
    phase: str = Field(..., description="要重做的阶段")


class RedoPhaseResponse(BaseModel):
    """重做阶段响应"""
    current_phase: str = Field(..., description="当前阶段")
    completed_phases: List[str] = Field(..., description="已完成阶段")


@router.get("/pending")
async def get_pending_session(
    user_id: str = Depends(get_current_user_id),
):
    """
    获取用户未完成的工作流会话
    
    检查是否存在活跃且未过期的会话，用于会话恢复功能
    
    Returns:
        如果存在未完成会话，返回会话详情；否则返回 null
    """
    try:
        session = await workflow_service.get_pending_session(user_id=user_id)
        if session:
            return session
        return {"session_id": None}
    except Exception as e:
        logger.exception(f"[get_pending_session] 失败: {e}")
        return {"session_id": None}


@router.post("/start")
async def start_workflow(
    request: CreateSessionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    启动创作工作流

    创建新的工作流会话，返回 session_id 和可用模板列表

    Args:
        request: 创建会话请求，包含 genre 参数

    Returns:
        包含 session_id、当前阶段和可用模板列表
    """
    try:
        # 创建工作流会话
        logger.info(f"[start_workflow] 创建会话: genre={repr(request.genre)}, user_id={user_id}")
        
        session = await workflow_service.create_session(
            user_id=user_id,
            genre=request.genre,
            session=db,
        )
        
        logger.info(f"[start_workflow] 返回 available_templates: {len(session.get('available_templates', []))} 个")
        
        return session
    except Exception as e:
        logger.exception(f"[start_workflow] 失败: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.get("/{session_id}")
async def get_workflow(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    获取工作流会话状态

    Args:
        session_id: 会话 ID

    Returns:
        工作流会话详情，包含当前阶段、进度和可用模板
    """
    session = await workflow_service.get_session(session_id=session_id, user_id=user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return session


@router.post("/{session_id}/execute")
async def execute_phase(
    session_id: str,
    request: ExecutePhaseRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    执行当前阶段的模板

    使用指定模板和输入数据调用 LLM 生成内容

    Args:
        session_id: 会话 ID
        request: 执行请求，包含模板 ID 和输入数据

    Returns:
        LLM 生成结果
    """
    try:
        result = await workflow_service.execute_phase(
            session_id=session_id,
            user_id=user_id,
            template_id=request.template_id,
            input_data=request.input_data,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Workflow execute_phase failed for session {session_id}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.post("/{session_id}/optimize")
async def optimize_result(
    session_id: str,
    request: OptimizeResultRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    优化当前阶段的结果
    
    使用 AI 根据用户指令优化生成的内容
    
    Args:
        session_id: 会话 ID
        request: 优化请求，包含当前结果和优化指令
        
    Returns:
        优化后的结果
    """
    try:
        result = await workflow_service.optimize_result(
            session_id=session_id,
            user_id=user_id,
            current_result=request.current_result,
            optimization_instruction=request.optimization_instruction,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Workflow optimize_result failed for session {session_id}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@router.post("/{session_id}/next")
async def next_phase(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    进入下一阶段

    完成当前阶段并进入工作流的下一个阶段

    Args:
        session_id: 会话 ID

    Returns:
        下一阶段的信息，包含阶段名称和可用模板
    """
    try:
        result = await workflow_service.next_phase(
            session_id=session_id,
            user_id=user_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move to next phase: {str(e)}")


@router.post("/{session_id}/previous")
async def previous_phase(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    返回上一阶段

    返回工作流的上一个阶段

    Args:
        session_id: 会话 ID

    Returns:
        上一阶段的信息，包含阶段名称和历史数据
    """
    try:
        result = await workflow_service.previous_phase(
            session_id=session_id,
            user_id=user_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move to previous phase: {str(e)}")


@router.post("/{session_id}/complete")
async def complete_workflow(
    session_id: str,
    request: CompleteWorkflowRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    完成工作流并创建项目

    将工作流结果保存为小说项目

    Args:
        session_id: 会话 ID
        request: 完成请求，包含项目标题和描述

    Returns:
        创建的项目信息
    """
    try:
        result = await workflow_service.complete_workflow(
            session_id=session_id,
            user_id=user_id,
            project_title=request.project_title,
            project_description=request.project_description,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete workflow: {str(e)}")


@router.delete("/{session_id}")
async def abandon_workflow(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    放弃工作流

    将工作流状态标记为 abandoned

    Args:
        session_id: 会话 ID

    Returns:
        操作结果
    """
    # 暂时使用 workflow_service 的逻辑，或抛出未实现
    raise HTTPException(status_code=501, detail="Not implemented yet")
