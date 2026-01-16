"""
章节版本管理 API 路由
实现「生成 → 评分 → 修改 → 重新生成 → 对比 → 选择」循环
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import difflib

from ..database import get_db
from ..models import NovelChapter, NovelChapterVersion, QualityScore
from ..middleware.auth import get_current_user_id
from ..services.quality_service import QualityService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/versions", tags=["versions"])


# ============ Pydantic Models ============

class DimensionScore(BaseModel):
    """单个维度评分"""
    score: int = Field(..., ge=0, le=100, description="维度评分 0-100")
    details: str = Field(..., description="评分详情说明")


class QualityDimensions(BaseModel):
    """多维度质量评分"""
    readability: DimensionScore = Field(..., description="可读性")
    emotional_depth: DimensionScore = Field(..., description="情感深度")
    pacing: DimensionScore = Field(..., description="节奏把控")
    originality: DimensionScore = Field(..., description="原创性")
    coherence: DimensionScore = Field(..., description="逻辑连贯性")


class ImprovementSuggestion(BaseModel):
    """改进建议"""
    dimension: str = Field(..., description="维度名称")
    suggestion: str = Field(..., description="具体建议")
    priority: str = Field(..., description="优先级: high/medium/low")


class QualityScoreResponse(BaseModel):
    """质量评分响应"""
    id: str
    version_id: str
    overall_score: int = Field(..., ge=0, le=100)
    dimensions: QualityDimensions
    suggestions: List[ImprovementSuggestion]
    analyzed_at: datetime
    analyzer_version: str


class ChapterVersionResponse(BaseModel):
    """章节版本响应"""
    id: str
    chapter_id: str
    version_number: int
    content: str
    word_count: int
    prompt_used: Optional[str] = None
    model_used: Optional[str] = None
    temperature: Optional[float] = 0.7
    is_selected: bool
    user_rating: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    quality_score: Optional[QualityScoreResponse] = None


class CreateVersionRequest(BaseModel):
    """创建新版本请求"""
    content: str = Field(..., min_length=100, description="章节内容")
    prompt_used: Optional[str] = None
    model_used: Optional[str] = None
    temperature: Optional[float] = 0.7
    notes: Optional[str] = None
    auto_analyze: bool = Field(default=True, description="自动进行质量分析")


class UpdateVersionRequest(BaseModel):
    """更新版本请求"""
    is_selected: Optional[bool] = None
    user_rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class VersionComparisonRequest(BaseModel):
    """版本对比请求"""
    version_ids: List[str] = Field(..., description="要对比的版本ID列表")


class TextDiff(BaseModel):
    """文本差异"""
    type: str = Field(..., description="diff类型: added/removed/unchanged")
    text: str = Field(..., description="差异文本")


class VersionComparisonResponse(BaseModel):
    """版本对比响应"""
    versions: List[ChapterVersionResponse]
    text_diff: Optional[List[TextDiff]] = None
    score_comparison: Optional[Dict[str, Any]] = None
    ai_recommendation: Optional[str] = None


def build_text_diff(source: str, target: str) -> List[TextDiff]:
    diff_lines = difflib.ndiff(source.splitlines(), target.splitlines())
    diffs: List[TextDiff] = []
    for line in diff_lines:
        prefix = line[:2]
        text = line[2:]
        if prefix == "  ":
            diffs.append(TextDiff(type="unchanged", text=text))
        elif prefix == "+ ":
            diffs.append(TextDiff(type="added", text=text))
        elif prefix == "- ":
            diffs.append(TextDiff(type="removed", text=text))
    return diffs


# ============ API Endpoints ============

@router.get("/{chapter_id}/list", response_model=List[ChapterVersionResponse])
async def list_chapter_versions(
    chapter_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取章节所有版本列表"""
    try:
        # 验证章节所有权
        chapter_result = await db.execute(
            select(NovelChapter)
            .join(NovelChapter.project)
            .where(
                NovelChapter.id == chapter_id,
                NovelChapter.project.has(user_id=user_id)
            )
        )
        chapter = chapter_result.scalar_one_or_none()

        if not chapter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="章节不存在或无权访问"
            )

        # 获取所有版本（包括质量评分）
        result = await db.execute(
            select(NovelChapterVersion)
            .where(NovelChapterVersion.chapter_id == chapter_id)
            .order_by(NovelChapterVersion.version_number.desc())
        )
        versions = result.scalars().all()

        # 转换为响应格式
        response_list = []
        for version in versions:
            # 获取质量评分
            score_result = await db.execute(
                select(QualityScore).where(QualityScore.version_id == version.id)
            )
            quality_score = score_result.scalar_one_or_none()

            response_list.append(ChapterVersionResponse(
                id=str(version.id),
                chapter_id=str(version.chapter_id),
                version_number=version.version_number,
                content=version.content,
                word_count=version.word_count,
                prompt_used=version.prompt_used,
                model_used=version.model_used,
                temperature=version.temperature,
                is_selected=version.is_selected,
                user_rating=version.user_rating,
                notes=version.notes,
                created_at=version.created_at,
                quality_score=QualityScoreResponse(
                    id=str(quality_score.id),
                    version_id=str(quality_score.version_id),
                    overall_score=quality_score.overall_score,
                    dimensions=quality_score.dimensions,
                    suggestions=quality_score.suggestions or [],
                    analyzed_at=quality_score.analyzed_at,
                    analyzer_version=quality_score.analyzer_version
                ) if quality_score else None
            ))

        return response_list

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取版本列表失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取版本列表失败: {str(e)}"
        )


@router.post("/{chapter_id}/create", response_model=ChapterVersionResponse)
async def create_chapter_version(
    chapter_id: UUID,
    request: CreateVersionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """创建新的章节版本"""
    try:
        # 验证章节所有权
        chapter_result = await db.execute(
            select(NovelChapter)
            .join(NovelChapter.project)
            .where(
                NovelChapter.id == chapter_id,
                NovelChapter.project.has(user_id=user_id)
            )
        )
        chapter = chapter_result.scalar_one_or_none()

        if not chapter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="章节不存在或无权访问"
            )

        # 获取当前最大版本号
        max_version_result = await db.execute(
            select(func.max(NovelChapterVersion.version_number))
            .where(NovelChapterVersion.chapter_id == chapter_id)
        )
        max_version = max_version_result.scalar() or 0

        # 创建新版本
        new_version = NovelChapterVersion(
            chapter_id=chapter_id,
            version_number=max_version + 1,
            content=request.content,
            word_count=len(request.content),
            prompt_used=request.prompt_used,
            model_used=request.model_used,
            temperature=request.temperature,
            notes=request.notes,
            is_selected=False  # 新版本默认不选中
        )

        db.add(new_version)
        await db.commit()
        await db.refresh(new_version)

        logger.info(f"创建新版本成功: chapter_id={chapter_id}, version={new_version.version_number}")

        # 自动进行质量分析
        quality_score = None
        if request.auto_analyze:
            try:
                quality_service = QualityService()
                quality_score = await quality_service.analyze_quality(
                    version_id=new_version.id,
                    content=request.content,
                    db=db
                )
                logger.info(f"质量分析完成: version_id={new_version.id}, score={quality_score.overall_score}")
            except Exception as e:
                logger.error(f"质量分析失败: {str(e)}", exc_info=True)
                # 质量分析失败不影响版本创建

        return ChapterVersionResponse(
            id=str(new_version.id),
            chapter_id=str(new_version.chapter_id),
            version_number=new_version.version_number,
            content=new_version.content,
            word_count=new_version.word_count,
            prompt_used=new_version.prompt_used,
            model_used=new_version.model_used,
            temperature=new_version.temperature,
            is_selected=new_version.is_selected,
            user_rating=new_version.user_rating,
            notes=new_version.notes,
            created_at=new_version.created_at,
            quality_score=QualityScoreResponse(
                id=str(quality_score.id),
                version_id=str(quality_score.version_id),
                overall_score=quality_score.overall_score,
                dimensions=quality_score.dimensions,
                suggestions=quality_score.suggestions or [],
                analyzed_at=quality_score.analyzed_at,
                analyzer_version=quality_score.analyzer_version
            ) if quality_score else None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建版本失败: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建版本失败: {str(e)}"
        )


@router.patch("/{version_id}/update", response_model=ChapterVersionResponse)
async def update_chapter_version(
    version_id: UUID,
    request: UpdateVersionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新版本信息（评分、选中状态、备注）"""
    try:
        # 验证版本所有权
        version_result = await db.execute(
            select(NovelChapterVersion)
            .join(NovelChapterVersion.chapter)
            .join(NovelChapter.project)
            .where(
                NovelChapterVersion.id == version_id,
                NovelChapter.project.has(user_id=user_id)
            )
        )
        version = version_result.scalar_one_or_none()

        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="版本不存在或无权访问"
            )

        # 如果设置为选中,需要取消同章节其他版本的选中状态
        if request.is_selected:
            await db.execute(
                update(NovelChapterVersion)
                .where(NovelChapterVersion.chapter_id == version.chapter_id)
                .values(is_selected=False)
            )

        # 更新版本
        if request.is_selected is not None:
            version.is_selected = request.is_selected
        if request.user_rating is not None:
            version.user_rating = request.user_rating
        if request.notes is not None:
            version.notes = request.notes

        await db.commit()
        await db.refresh(version)

        # 获取质量评分
        score_result = await db.execute(
            select(QualityScore).where(QualityScore.version_id == version.id)
        )
        quality_score = score_result.scalar_one_or_none()

        return ChapterVersionResponse(
            id=str(version.id),
            chapter_id=str(version.chapter_id),
            version_number=version.version_number,
            content=version.content,
            word_count=version.word_count,
            prompt_used=version.prompt_used,
            model_used=version.model_used,
            temperature=version.temperature,
            is_selected=version.is_selected,
            user_rating=version.user_rating,
            notes=version.notes,
            created_at=version.created_at,
            quality_score=QualityScoreResponse(
                id=str(quality_score.id),
                version_id=str(quality_score.version_id),
                overall_score=quality_score.overall_score,
                dimensions=quality_score.dimensions,
                suggestions=quality_score.suggestions or [],
                analyzed_at=quality_score.analyzed_at,
                analyzer_version=quality_score.analyzer_version
            ) if quality_score else None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新版本失败: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新版本失败: {str(e)}"
        )


@router.delete("/{version_id}/delete")
async def delete_chapter_version(
    version_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """删除版本（不能删除选中的版本）"""
    try:
        # 验证版本所有权
        version_result = await db.execute(
            select(NovelChapterVersion)
            .join(NovelChapterVersion.chapter)
            .join(NovelChapter.project)
            .where(
                NovelChapterVersion.id == version_id,
                NovelChapter.project.has(user_id=user_id)
            )
        )
        version = version_result.scalar_one_or_none()

        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="版本不存在或无权访问"
            )

        if version.is_selected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不能删除当前选中的版本"
            )

        await db.execute(
            delete(NovelChapterVersion).where(NovelChapterVersion.id == version_id)
        )
        await db.commit()

        return {"message": "版本删除成功", "deleted_version_id": str(version_id)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除版本失败: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除版本失败: {str(e)}"
        )


@router.post("/{version_id}/analyze", response_model=QualityScoreResponse)
async def analyze_version_quality(
    version_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """对版本进行质量分析（或重新分析）"""
    try:
        # 验证版本所有权
        version_result = await db.execute(
            select(NovelChapterVersion)
            .join(NovelChapterVersion.chapter)
            .join(NovelChapter.project)
            .where(
                NovelChapterVersion.id == version_id,
                NovelChapter.project.has(user_id=user_id)
            )
        )
        version = version_result.scalar_one_or_none()

        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="版本不存在或无权访问"
            )

        # 执行质量分析
        quality_service = QualityService()
        quality_score = await quality_service.analyze_quality(
            version_id=version.id,
            content=version.content,
            db=db
        )

        return QualityScoreResponse(
            id=str(quality_score.id),
            version_id=str(quality_score.version_id),
            overall_score=quality_score.overall_score,
            dimensions=quality_score.dimensions,
            suggestions=quality_score.suggestions or [],
            analyzed_at=quality_score.analyzed_at,
            analyzer_version=quality_score.analyzer_version
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"质量分析失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"质量分析失败: {str(e)}"
        )


@router.post("/compare", response_model=VersionComparisonResponse)
async def compare_versions(
    request: VersionComparisonRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """对比多个版本"""
    try:
        # 验证所有版本的所有权并获取版本数据
        versions = []
        version_entities = []
        quality_scores = []
        for version_id in request.version_ids:
            version_result = await db.execute(
                select(NovelChapterVersion)
                .join(NovelChapterVersion.chapter)
                .join(NovelChapter.project)
                .where(
                    NovelChapterVersion.id == UUID(version_id),
                    NovelChapter.project.has(user_id=user_id)
                )
            )
            version = version_result.scalar_one_or_none()

            if not version:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"版本 {version_id} 不存在或无权访问"
                )

            # 获取质量评分
            score_result = await db.execute(
                select(QualityScore).where(QualityScore.version_id == version.id)
            )
            quality_score = score_result.scalar_one_or_none()

            version_entities.append(version)
            quality_scores.append(quality_score)

            versions.append(ChapterVersionResponse(
                id=str(version.id),
                chapter_id=str(version.chapter_id),
                version_number=version.version_number,
                content=version.content,
                word_count=version.word_count,
                prompt_used=version.prompt_used,
                model_used=version.model_used,
                temperature=version.temperature,
                is_selected=version.is_selected,
                user_rating=version.user_rating,
                notes=version.notes,
                created_at=version.created_at,
                quality_score=QualityScoreResponse(
                    id=str(quality_score.id),
                    version_id=str(quality_score.version_id),
                    overall_score=quality_score.overall_score,
                    dimensions=quality_score.dimensions,
                    suggestions=quality_score.suggestions or [],
                    analyzed_at=quality_score.analyzed_at,
                    analyzer_version=quality_score.analyzer_version
                ) if quality_score else None
            ))

        text_diff = None
        if len(version_entities) >= 2:
            text_diff = build_text_diff(version_entities[0].content, version_entities[1].content)

        score_entries = []
        best_version_id = None
        best_score = -1
        for version, quality_score in zip(version_entities, quality_scores):
            score_value = quality_score.overall_score if quality_score else None
            score_entries.append({
                "version_id": str(version.id),
                "overall_score": score_value,
            })
            if score_value is not None and score_value > best_score:
                best_score = score_value
                best_version_id = str(version.id)

        score_comparison = {
            "scores": score_entries,
            "best_version_id": best_version_id,
        }

        if best_version_id is None:
            ai_recommendation = "暂无可用质量评分，暂不推荐版本。"
        else:
            ai_recommendation = f"建议优先采用版本 {best_version_id}，质量评分最高（{best_score}）。"

        return VersionComparisonResponse(
            versions=versions,
            text_diff=text_diff,
            score_comparison=score_comparison,
            ai_recommendation=ai_recommendation
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"版本对比失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"版本对比失败: {str(e)}"
        )
