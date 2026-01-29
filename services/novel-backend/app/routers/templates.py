"""
写作提示词模板 API 路由
提供模板查询、渲染等功能
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.template_service import template_service
from app.middleware.auth import get_current_user_id
from app.database import get_db

router = APIRouter(prefix="/templates", tags=["templates"])


class RenderTemplateRequest(BaseModel):
    """渲染模板请求"""
    variables: dict = Field(default_factory=dict, description="变量键值对")


class RenderTemplateResponse(BaseModel):
    """渲染模板响应"""
    template_id: str
    template_name: str
    system_prompt: str
    output_schema: Optional[dict] = None
    variables_used: list


@router.get("")
async def get_templates(
    phase: Optional[str] = Query(None, description="阶段过滤"),
    category: Optional[str] = Query(None, description="分类过滤"),
    genre: Optional[str] = Query(None, description="专题过滤，general 表示通用模板"),
    search: Optional[str] = Query(None, description="关键词搜索"),
    limit: int = Query(50, ge=1, le=100, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    user_id: str = Depends(get_current_user_id),
):
    """
    获取模板列表

    支持多种过滤条件：
    - phase: 阶段（creative, setting, framework, writing, advanced, analysis, commercial, auxiliary）
    - category: 分类（inspiration, character, outline 等）
    - genre: 专题（玄幻小说, 规则怪谈 等），使用 "general" 获取通用模板
    - search: 关键词搜索（搜索名称和描述）

    返回分页结果，包含模板基本信息
    """
    result = await template_service.get_templates(
        phase=phase,
        category=category,
        genre=genre,
        search=search,
        limit=limit,
        offset=offset,
    )
    return result


@router.get("/phases")
async def get_phases(
    genre: Optional[str] = Query(None, description="专题过滤"),
    user_id: str = Depends(get_current_user_id),
):
    """
    获取所有阶段及其模板数量

    用于前端展示阶段导航
    """
    phases = await template_service.get_phases_with_templates(genre=genre)
    return {"phases": phases}


@router.get("/genres")
async def get_genres(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    获取所有可用的专题类型

    返回专题列表及每个专题的模板数量
    """
    genres = await template_service.get_genres(session=db)
    return {"genres": genres}


@router.get("/{template_id}")
async def get_template(
    template_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    获取单个模板详情

    包含：
    - 模板基本信息
    - 系统角色定义
    - 思维链指令
    - 输入/输出插槽定义
    """
    template = await template_service.get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"template": template}


@router.post("/{template_id}/render", response_model=RenderTemplateResponse)
async def render_template(
    template_id: str,
    request: RenderTemplateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    渲染模板

    将用户提供的变量填充到模板中，生成可直接用于 LLM 调用的提示词

    Args:
        template_id: 模板ID
        request: 包含变量键值对的请求体

    Returns:
        渲染后的系统提示词和相关信息
    """
    try:
        result = await template_service.render_template(
            template_id=template_id,
            variables=request.variables,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render failed: {str(e)}")


@router.get("/workflow/templates")
async def get_workflow_templates(
    genre: Optional[str] = Query(None, description="专题过滤"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    获取工作流推荐模板

    按 4 个核心阶段（创意、设定、框架、创作）返回推荐的模板列表
    用于专业创作工作流的向导界面
    """
    templates = await template_service.get_workflow_templates(genre=genre, session=db)
    return templates
