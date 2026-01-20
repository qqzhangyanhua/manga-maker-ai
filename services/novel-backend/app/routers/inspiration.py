"""
灵感模式 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Literal, Union, Annotated
from uuid import UUID

from ..database import get_db
from ..models import NovelProject
from ..middleware.auth import get_current_user_id
from ..services.inspiration_service import InspirationService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inspiration", tags=["Inspiration"])


# ============ Pydantic Models ============

QuestionType = Literal["choice", "text"]


class StartSessionResponse(BaseModel):
    """开始会话响应"""
    session_id: str
    step: int
    question: str
    type: QuestionType
    options: Optional[List[str]] = None
    hint: str
    suggestions: Optional[List[str]] = None
    total_steps: int
    progress: float = Field(description="进度百分比 0-1")


class SubmitAnswerRequest(BaseModel):
    """提交答案请求"""
    session_id: str
    answer: str


class NextQuestionData(BaseModel):
    """下一个问题的数据（is_last=False 时返回）"""
    model_config = ConfigDict(exclude_none=True)

    step: int
    question: str
    type: QuestionType
    options: Optional[List[str]] = None
    hint: str
    suggestions: Optional[List[str]] = None
    is_last: Literal[False] = False
    total_steps: int
    progress: float = Field(description="进度百分比 0-1")


class CompletedData(BaseModel):
    """问答完成的数据（is_last=True 时返回）"""
    step: int
    is_last: Literal[True] = True
    total_steps: int
    progress: Literal[1.0] = 1.0
    completed_message: str = Field(
        default="所有问题已完成，可以生成故事雏形了",
        description="完成提示消息"
    )


NextQuestionResponse = Annotated[
    Union[NextQuestionData, CompletedData],
    Field(discriminator="is_last")
]


class GenerateRequest(BaseModel):
    """生成故事雏形请求"""
    session_id: str


class CreateProjectRequest(BaseModel):
    """创建项目请求"""
    selected_title: str
    draft: dict
    genre: str


# ============ API Endpoints ============

@router.post("/start", response_model=StartSessionResponse)
async def start_inspiration_mode(
    user_id: str = Depends(get_current_user_id)
):
    """开始灵感模式"""
    try:
        service = InspirationService()
        result = service.start_session(user_id)
        return result
    except Exception as e:
        logger.error(f"启动灵感模式失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动失败: {str(e)}"
        )


@router.post("/next", response_model=NextQuestionResponse)
async def submit_answer_and_next(
    request: SubmitAnswerRequest,
    user_id: str = Depends(get_current_user_id)
):
    """提交答案并获取下一个问题"""
    try:
        service = InspirationService()
        
        # 验证会话所有权
        session = service.get_session(request.session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会话不存在或已过期"
            )
        
        if session["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问此会话"
            )

        result = await service.submit_answer_and_next(request.session_id, request.answer)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提交答案失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"提交失败: {str(e)}"
        )


@router.post("/generate")
async def generate_story_draft(
    request: GenerateRequest,
    user_id: str = Depends(get_current_user_id)
):
    """生成故事雏形"""
    try:
        service = InspirationService()
        
        # 验证会话所有权
        session = service.get_session(request.session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会话不存在或已过期"
            )
        
        if session["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问此会话"
            )
        
        # 生成故事雏形
        result = await service.generate_story_draft(request.session_id)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成故事雏形失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成失败: {str(e)}"
        )


@router.post("/create-project")
async def create_project_from_inspiration(
    request: CreateProjectRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """基于灵感模式结果创建项目"""
    try:
        # 直接使用前端传递的 draft 数据，不再依赖会话
        draft = request.draft

        # 创建项目
        new_project = NovelProject(
            user_id=user_id,
            title=request.selected_title,
            description=draft.get("description", ""),
            genre=request.genre,
            world_setting=draft.get("world_setting", {}),
            characters=[draft.get("protagonist", {})],
            outlines=draft.get("outline", []),
            target_words=100000,  # 默认 10 万字
            status="draft"
        )

        db.add(new_project)
        await db.commit()
        await db.refresh(new_project)

        logger.info(f"基于灵感模式创建项目成功: {new_project.id}")

        return {
            "project_id": str(new_project.id),
            "title": new_project.title,
            "message": "项目创建成功"
        }

    except Exception as e:
        logger.error(f"创建项目失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建项目失败: {str(e)}"
        )
