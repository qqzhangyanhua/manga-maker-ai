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


# ============ 错误消息常量 ============
ERROR_MSG_SERVER_BUSY = "服务器繁忙，请稍后重试"
ERROR_MSG_SESSION_NOT_FOUND = "会话不存在或已过期"
ERROR_MSG_NO_PERMISSION = "无权访问此会话"
ERROR_MSG_STEP_MISMATCH = "步骤不匹配，请刷新页面"
ERROR_MSG_DRAFT_NOT_FOUND = "故事雏形未生成，请先完成问答流程"


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
    step: int = Field(..., description="当前步骤编号，用于幂等校验")


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
    """创建项目请求 - 从会话获取 draft，不信任前端传入"""
    session_id: str = Field(..., description="会话 ID，用于获取服务端存储的 draft")
    selected_title: str
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
            detail=ERROR_MSG_SERVER_BUSY
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
                detail=ERROR_MSG_SESSION_NOT_FOUND
            )
        
        if session["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MSG_NO_PERMISSION
            )
        
        # 幂等校验：检查步骤是否匹配
        current_step = session.get("current_step", 1)
        if request.step != current_step:
            logger.warning(
                f"步骤不匹配: 请求 step={request.step}, 当前 step={current_step}, "
                f"session_id={request.session_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": ERROR_MSG_STEP_MISMATCH,
                    "current_step": current_step
                }
            )

        result = await service.submit_answer_and_next(request.session_id, request.answer)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"提交答案失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_MSG_SERVER_BUSY
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
                detail=ERROR_MSG_SESSION_NOT_FOUND
            )
        
        if session["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MSG_NO_PERMISSION
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
            detail=ERROR_MSG_SERVER_BUSY
        )


@router.post("/create-project")
async def create_project_from_inspiration(
    request: CreateProjectRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """基于灵感模式结果创建项目 - 从服务端会话获取 draft，不信任前端"""
    try:
        service = InspirationService()
        
        # 验证会话所有权
        session = service.get_session(request.session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ERROR_MSG_SESSION_NOT_FOUND
            )
        
        if session["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MSG_NO_PERMISSION
            )
        
        # 从会话获取已生成的 draft（不信任前端传入）
        draft = session.get("generated_draft")
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_MSG_DRAFT_NOT_FOUND
            )

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
        
        # 清理会话，防止重复创建
        service.clear_session(request.session_id)
        logger.info(f"已清理灵感模式会话: {request.session_id}")

        return {
            "project_id": str(new_project.id),
            "title": new_project.title,
            "message": "项目创建成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建项目失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ERROR_MSG_SERVER_BUSY
        )
