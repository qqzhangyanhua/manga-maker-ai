"""
小说项目管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
import logging

from ..database import get_db
from ..models import NovelProject, NovelChapter
from ..middleware.auth import get_current_user_id
from ..services.export_service import ExportService
from ..services.generation_service import NovelGenerationService
from fastapi.responses import Response

router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger(__name__)


# ============ Pydantic Models ============

class ProjectCreate(BaseModel):
    """创建项目请求"""
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    genre: Optional[str] = None
    world_setting: Optional[dict] = None
    characters: Optional[list] = None
    target_words: Optional[int] = None


class ProjectUpdate(BaseModel):
    """更新项目请求"""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    genre: Optional[str] = None
    world_setting: Optional[dict] = None
    characters: Optional[list] = None
    outlines: Optional[list] = None
    target_words: Optional[int] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    """项目响应"""
    id: str
    user_id: str
    title: str
    description: Optional[str]
    genre: Optional[str]
    world_setting: Optional[dict]
    characters: Optional[list]
    outlines: Optional[list]
    target_words: Optional[int]
    status: str
    total_words: int
    chapter_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        # 自动转换 UUID 为字符串
        json_encoders = {
            UUID: str
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


class AnalyzeChaptersCharactersRequest(BaseModel):
    """分析章节角色请求"""
    chapters_context: str


class AnalyzeWorldSettingRequest(BaseModel):
    """分析世界观设定请求"""
    chapters_context: str


class OptimizeDescriptionRequest(BaseModel):
    """优化/生成描述请求"""
    description: str
    mode: str  # "optimize" or "generate"


# ============ API Endpoints ============

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """创建新的小说项目"""

    # 创建项目
    new_project = NovelProject(
        user_id=user_id,
        title=project_data.title,
        description=project_data.description,
        genre=project_data.genre,
        world_setting=project_data.world_setting,
        characters=project_data.characters,
        target_words=project_data.target_words or 100000,
        status="draft"
    )

    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)

    # 手动构造响应,确保UUID转换为字符串
    return {
        "id": str(new_project.id),
        "user_id": str(new_project.user_id),
        "title": new_project.title,
        "description": new_project.description,
        "genre": new_project.genre,
        "world_setting": new_project.world_setting,
        "characters": new_project.characters,
        "outlines": new_project.outlines,
        "target_words": new_project.target_words,
        "status": new_project.status,
        "total_words": 0,
        "chapter_count": 0,
        "created_at": new_project.created_at,
        "updated_at": new_project.updated_at,
    }


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """列出用户的所有项目"""

    # 基础查询
    query = select(NovelProject).where(NovelProject.user_id == user_id)

    # 状态过滤
    if status_filter:
        query = query.where(NovelProject.status == status_filter)

    # 搜索过滤
    if search:
        query = query.where(
            or_(
                NovelProject.title.ilike(f"%{search}%"),
                NovelProject.description.ilike(f"%{search}%")
            )
        )

    # 排序和分页
    query = query.order_by(NovelProject.updated_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    projects = result.scalars().all()

    # 为每个项目添加统计信息并转换UUID
    response_projects = []
    for project in projects:
        # 查询章节统计
        stats_query = select(
            func.count(NovelChapter.id).label("chapter_count"),
            func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words")
        ).where(NovelChapter.project_id == project.id)

        stats_result = await db.execute(stats_query)
        stats = stats_result.one()

        # 手动构造响应对象
        response_projects.append({
            "id": str(project.id),
            "user_id": str(project.user_id),
            "title": project.title,
            "description": project.description,
            "genre": project.genre,
            "world_setting": project.world_setting,
            "characters": project.characters,
            "outlines": project.outlines,
            "target_words": project.target_words,
            "status": project.status,
            "total_words": stats.total_words,
            "chapter_count": stats.chapter_count,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
        })

    return response_projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目详情"""

    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 查询统计信息
    stats_query = select(
        func.count(NovelChapter.id).label("chapter_count"),
        func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words")
    ).where(NovelChapter.project_id == project_id)

    stats_result = await db.execute(stats_query)
    stats = stats_result.one()

    # 手动构造响应,确保UUID转换为字符串
    return {
        "id": str(project.id),
        "user_id": str(project.user_id),
        "title": project.title,
        "description": project.description,
        "genre": project.genre,
        "world_setting": project.world_setting,
        "characters": project.characters,
        "outlines": project.outlines,
        "target_words": project.target_words,
        "status": project.status,
        "total_words": stats.total_words,
        "chapter_count": stats.chapter_count,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_update: ProjectUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新项目"""

    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 更新字段
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    project.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(project)

    # 添加统计信息
    stats_query = select(
        func.count(NovelChapter.id).label("chapter_count"),
        func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words")
    ).where(NovelChapter.project_id == project_id)

    stats_result = await db.execute(stats_query)
    stats = stats_result.one()

    # 手动构造响应,确保UUID转换为字符串
    return {
        "id": str(project.id),
        "user_id": str(project.user_id),
        "title": project.title,
        "description": project.description,
        "genre": project.genre,
        "world_setting": project.world_setting,
        "characters": project.characters,
        "outlines": project.outlines,
        "target_words": project.target_words,
        "status": project.status,
        "total_words": stats.total_words,
        "chapter_count": stats.chapter_count,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """删除项目"""

    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )

    result = await db.execute(query)
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    await db.delete(project)
    await db.commit()

    return None


@router.get("/{project_id}/outlines")
async def get_project_outlines(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目大纲"""

    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 返回大纲数据
    return {
        "outlines": project.outlines or []
    }


@router.put("/{project_id}/outlines")
async def update_project_outlines(
    project_id: UUID,
    outlines: list,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新项目大纲"""

    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 更新大纲
    project.outlines = outlines
    await db.commit()
    await db.refresh(project)

    return {
        "message": "大纲已更新",
        "outlines": project.outlines
    }


@router.get("/{project_id}/statistics")
async def get_project_statistics(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目统计信息"""

    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 统计章节信息
    stats_query = select(
        func.count(NovelChapter.id).label("total_chapters"),
        func.sum(NovelChapter.word_count).label("total_words"),
        func.count(NovelChapter.id).filter(NovelChapter.status == "completed").label("completed_chapters")
    ).where(NovelChapter.project_id == project_id)

    stats_result = await db.execute(stats_query)
    stats = stats_result.one()

    return {
        "total_chapters": stats.total_chapters or 0,
        "total_words": stats.total_words or 0,
        "completed_chapters": stats.completed_chapters or 0,
        "target_words": project.target_words,
        "progress_percentage": round((stats.total_words or 0) / project.target_words * 100, 2) if project.target_words else 0,
    }


@router.get("/{project_id}/export")
async def export_project(
    project_id: UUID,
    format: str = "txt",  # txt, docx, pdf
    include_outline: bool = False,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    导出项目为文件

    Args:
        project_id: 项目 ID
        format: 导出格式（txt, docx, pdf）
        include_outline: 是否包含章节大纲
    """

    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 查询所有章节（按章节号排序）
    chapters_query = select(NovelChapter).where(
        NovelChapter.project_id == project_id
    ).order_by(NovelChapter.chapter_number)

    chapters_result = await db.execute(chapters_query)
    chapters = chapters_result.scalars().all()

    # 调用导出服务
    export_service = ExportService()
    file_content, content_type, filename = await export_service.export_project(
        project=project,
        chapters=chapters,
        format=format,
        include_outline=include_outline
    )

    return Response(
        content=file_content,
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/{project_id}/analyze-chapters-characters")
async def analyze_chapters_characters(
    project_id: UUID,
    request_body: AnalyzeChaptersCharactersRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    分析章节内容并生成角色建议

    Args:
        project_id: 项目 ID
        request_body: 包含章节内容的请求体
    """
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 调用生成服务分析角色
    generation_service = NovelGenerationService()

    system_prompt = """你是一位资深的小说编辑，擅长分析故事中的角色设定。

任务：根据章节内容，提取并分析主要角色，生成结构化的角色信息。

输出格式（JSON）：
{
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/反派",
      "description": "角色简介（中文，50字内）",
      "traits": ["性格特点1", "性格特点2"],
      "appearance": "外貌描述（英文，用于图像生成）",
      "background": "背景故事（中文，100字内）"
    }
  ]
}

要求：
1. 提取3-8个主要角色
2. description 用中文，appearance 用英文
3. traits 包含2-4个性格特点
4. 角色设定要符合故事情节"""

    user_prompt = f"""章节内容：
{request_body.chapters_context}

请分析以上内容，提取主要角色信息。"""

    try:
        completion = await generation_service.client.chat.completions.create(
            model=generation_service.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        import json
        result = json.loads(completion.choices[0].message.content)

        logger.info(f"分析章节角色成功，项目ID: {project_id}，角色数: {len(result.get('characters', []))}")

        return result

    except Exception as e:
        logger.error(f"分析章节角色失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分析失败: {str(e)}"
        )


@router.post("/{project_id}/analyze-world-setting")
async def analyze_world_setting(
    project_id: UUID,
    request_body: AnalyzeWorldSettingRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    分析章节内容并生成世界观设定建议

    Args:
        project_id: 项目 ID
        request_body: 包含章节内容的请求体

    Returns:
        {
          "locations": [...],
          "factions": [...],
          "rules": [...],
          "timeline": [...]
        }
    """
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 调用生成服务分析世界观
    generation_service = NovelGenerationService()

    system_prompt = """你是一位资深的世界观设定专家，擅长从故事中提取并构建完整的世界观体系。

任务：根据章节内容，提取世界观设定，包括地点、派系、规则、时间线。

输出要求：
1. 必须严格输出JSON格式
2. 每个数组提取3-5个条目即可（不要太多）
3. 描述要简洁，不要包含特殊字符和换行符
4. 派系members可以为空数组

输出格式（严格的JSON）：
{
  "locations": [
    {
      "name": "地点名称",
      "description": "地点描述",
      "type": "城市"
    }
  ],
  "factions": [
    {
      "name": "派系名称",
      "description": "派系描述",
      "leader": "领导者",
      "members": []
    }
  ],
  "rules": [
    {
      "title": "规则标题",
      "description": "规则描述",
      "category": "魔法"
    }
  ],
  "timeline": [
    {
      "year": "时间",
      "event": "事件描述",
      "importance": "high"
    }
  ]
}

注意：
- type只能是：城市/村庄/森林/山脉/海洋/沙漠/平原/洞穴/遗迹/其他
- category只能是：魔法/科技/社会/政治/经济/宗教/军事/其他
- importance只能是：high/medium/low
- 所有文本不要包含引号、换行符等特殊字符"""

    user_prompt = f"""章节内容：
{request_body.chapters_context}

请分析以上内容，严格按照JSON格式输出世界观设定。"""

    try:
        completion = await generation_service.client.chat.completions.create(
            model=generation_service.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.5,  # 降低温度提高稳定性
            response_format={"type": "json_object"}
        )

        import json

        # 获取LLM返回的内容
        llm_response = completion.choices[0].message.content
        logger.info(f"LLM返回内容长度: {len(llm_response)}")

        # 尝试解析JSON
        try:
            result = json.loads(llm_response)
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {str(e)}")
            logger.error(f"LLM返回内容: {llm_response[:500]}...")  # 只记录前500字符
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LLM返回的JSON格式无效: {str(e)}"
            )

        # 确保所有字段都存在
        result.setdefault("locations", [])
        result.setdefault("factions", [])
        result.setdefault("rules", [])
        result.setdefault("timeline", [])

        logger.info(f"分析世界观成功，项目ID: {project_id}，地点: {len(result['locations'])}，派系: {len(result['factions'])}")

        return result

    except HTTPException:
        # 重新抛出HTTP异常
        raise
    except Exception as e:
        logger.error(f"分析世界观失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分析失败: {str(e)}"
        )


@router.post("/{project_id}/optimize-description")
async def optimize_description(
    project_id: UUID,
    request_body: OptimizeDescriptionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    AI优化或生成项目描述

    Args:
        project_id: 项目 ID
        request_body: 包含描述内容和模式的请求体

    Returns:
        {
          "optimized_description": "优化后的描述"
        }
    """
    # 验证项目所有权
    project_query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 调用生成服务
    generation_service = NovelGenerationService()

    if request_body.mode == "optimize":
        system_prompt = """你是一位专业的文案编辑，擅长优化文字描述。

任务：优化小说项目描述，使其更加清晰、吸引人。

要求：
1. 保留原意，提升表达质量
2. 突出故事亮点和创作意图
3. 语言简洁有力，富有吸引力
4. 长度控制在100-200字
5. 只输出优化后的描述，不要其他内容"""

        user_prompt = f"""原描述：
{request_body.description}

请优化这段描述。"""

    else:  # generate
        system_prompt = """你是一位专业的文案创作者，擅长创作引人入胜的小说简介。

任务：根据用户提供的关键词或简要信息，生成完整的小说项目描述。

要求：
1. 描述清晰，突出故事核心
2. 富有吸引力，激发阅读兴趣
3. 包含故事背景、主题、亮点
4. 长度控制在100-200字
5. 只输出描述内容，不要其他内容"""

        user_prompt = f"""关键词/简要信息：
{request_body.description if request_body.description.strip() else "创作一个有趣的故事"}

请生成项目描述。"""

    try:
        completion = await generation_service.client.chat.completions.create(
            model=generation_service.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
        )

        optimized_description = completion.choices[0].message.content.strip()

        logger.info(f"描述优化成功，项目ID: {project_id}，模式: {request_body.mode}")

        return {
            "optimized_description": optimized_description
        }

    except Exception as e:
        logger.error(f"描述优化失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理失败: {str(e)}"
        )
