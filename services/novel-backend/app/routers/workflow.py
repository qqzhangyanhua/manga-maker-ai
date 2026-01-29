"""
??????? API ??
????????????
"""

import logging
from typing import Optional
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
    """??????"""
    genre: Optional[str] = Field(None, description="????")
    
    @field_validator("genre", mode="before")
    @classmethod
    def validate_genre(cls, v):
        """?? genre ???????????"""
        return clean_genre(v)


class ExecutePhaseRequest(BaseModel):
    """??????"""
    template_id: str = Field(..., description="?????ID")
    input_data: dict = Field(default_factory=dict, description="????")


class OptimizeResultRequest(BaseModel):
    """??????"""
    current_result: str = Field(..., description="???????")
    optimization_instruction: Optional[str] = Field(None, description="???????")


class CompleteWorkflowRequest(BaseModel):
    """???????"""
    project_title: str = Field(..., description="????", min_length=1)
    project_description: Optional[str] = Field(None, description="????")


@router.post("/start")
async def start_workflow(
    request: CreateSessionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    ?????????

    ?????????? session_id ??????????

    Args:
        request: ????? genre ??

    Returns:
        ?? session_id????????????
    """
    try:
        # ??????
        logger.info(f"[start_workflow] ????: genre={repr(request.genre)}, user_id={user_id}")
        
        session = await workflow_service.create_session(
            user_id=user_id,
            genre=request.genre,
            session=db,
        )
        
        logger.info(f"[start_workflow] ?? available_templates: {len(session.get('available_templates', []))} ?")
        
        return session
    except Exception as e:
        logger.exception(f"[start_workflow] ??: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.get("/{session_id}")
async def get_workflow(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    ?????????

    Args:
        session_id: ??ID

    Returns:
        ???????????????????????
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
    ???????????

    ??????????????? LLM ????

    Args:
        session_id: ??ID
        request: ????ID?????

    Returns:
        LLM ????
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
    ???????????
    
    ?? AI ?????????????
    
    Args:
        session_id: ??ID
        request: ??????????????
        
    Returns:
        ??????
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
    ??????

    ?????????????????????

    Args:
        session_id: ??ID

    Returns:
        ???????????????????
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
    ??????

    ???????????

    Args:
        session_id: ??ID

    Returns:
        ?????????????????
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
    ????????????

    ???????????????????

    Args:
        session_id: ??ID
        request: ?????????

    Returns:
        ???????
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
    ???????

    ???????? abandoned

    Args:
        session_id: ??ID

    Returns:
        ????
    """
    # ????? workflow_service ????????????
    raise HTTPException(status_code=501, detail="Not implemented yet")
