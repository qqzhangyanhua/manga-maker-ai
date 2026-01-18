"""
小说项目管理 - AI 生成
包含角色分析、世界观分析、描述优化、大纲生成等 AI 功能
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import logging
import json

from ..database import get_db
from ..models import NovelProject
from ..middleware.auth import get_current_user_id
from ..services.generation_service import NovelGenerationService
from ..services.rag_service import NovelRAGService  # 新增: RAG 服务
from .project_models import (
    AnalyzeChaptersCharactersRequest,
    AnalyzeWorldSettingRequest,
    OptimizeDescriptionRequest,
    GenerateOutlineRequest,
)

router = APIRouter(prefix="/projects", tags=["projects-generation"])
logger = logging.getLogger(__name__)


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
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        result_text = completion.choices[0].message.content

        # 尝试解析JSON
        try:
            result = json.loads(result_text)
        except json.JSONDecodeError as json_err:
            logger.error(f"JSON解析失败: {json_err}")
            logger.error(f"LLM返回内容: {result_text[:500]}...")  # 只记录前500字符
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"JSON解析失败: {str(json_err)}"
            )

        logger.info(f"分析世界观成功，项目ID: {project_id}")

        return result

    except HTTPException:
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


@router.post("/{project_id}/generate-outline")
async def generate_outline(
    project_id: str,
    request_body: GenerateOutlineRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    生成章节大纲

    支持两种模式：
    - full: 完整生成（基于项目描述、角色、世界观）
    - continue: 续写模式（基于现有章节续写后续章节，使用 RAG 增强上下文）
    """
    try:
        # 验证项目归属并获取项目信息
        result = await db.execute(
            select(NovelProject).where(
                NovelProject.id == UUID(project_id),
                NovelProject.user_id == user_id
            )
        )
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="项目不存在"
            )

        # 获取生成服务实例
        generation_service = NovelGenerationService()

        # 构建故事前提
        premise = project.description or project.title or "未命名故事"

        # ✨ 新增: 续写模式下使用 RAG 增强上下文
        rag_context = None
        if request_body.mode == "continue":
            try:
                rag_service = NovelRAGService(db)

                # 基于最后一章大纲检索相关历史章节
                if request_body.existing_outlines and len(request_body.existing_outlines) > 0:
                    last_outline = request_body.existing_outlines[-1].get("outline", "")

                    # 使用 RAG 服务检索语义相关章节
                    rag_context = await rag_service.search_relevant_chapters(
                        project_id=project_id,
                        query=last_outline,
                        current_chapter_number=request_body.start_chapter - 1,
                        k=3  # 检索 Top-3 相关章节
                    )

                    logger.info(
                        f"📚 RAG 检索完成 - "
                        f"项目ID: {project_id}, "
                        f"查询章节号: {request_body.start_chapter - 1}, "
                        f"检索结果: {len(rag_context)} 条"
                    )
            except Exception as rag_error:
                # RAG 失败不阻塞流程，降级到基础续写
                logger.warning(f"⚠️ RAG 检索失败，降级到基础续写: {str(rag_error)}")
                rag_context = None

        # 调用生成服务 - 传递完整参数
        result_data = await generation_service.generate_outline(
            premise=premise,
            characters=project.characters,
            world_setting=project.world_setting,
            chapter_count=request_body.chapter_count,
            style=request_body.style_prompt,
            mode=request_body.mode,
            existing_outlines=request_body.existing_outlines,
            start_chapter=request_body.start_chapter,
            rag_context=rag_context,  # 新增: RAG 检索结果
        )

        logger.info(
            f"✅ 大纲生成成功 - "
            f"项目ID: {project_id}, "
            f"模式: {request_body.mode}, "
            f"章节数: {request_body.chapter_count}, "
            f"起始章节: {request_body.start_chapter}, "
            f"RAG 增强: {'是' if rag_context else '否'}"
        )

        return result_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"大纲生成失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成失败: {str(e)}"
        )
