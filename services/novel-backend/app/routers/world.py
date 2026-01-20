"""
世界观记忆库 - API 路由
包含条目CRUD、关系管理、伏笔专用API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID

from ..database import get_db
from ..middleware.auth import get_current_user_id
from ..models import NovelProject, WorldEntry, EntryRelation, ENTRY_TYPE_SCHEMAS, RelationType
from ..schemas.world_schemas import (
    CreateEntryRequest,
    UpdateEntryRequest,
    EntryResponse,
    EntryListResponse,
    EntryBrief,
    CreateRelationRequest,
    RelationResponse,
    UpdateForeshadowStatusRequest,
    ForeshadowingStats,
    ForeshadowingListResponse,
    PendingForeshadowingResponse,
    RelationTypeInfo,
    RelationTypesResponse,
    EntryTypesResponse,
)


router = APIRouter(prefix="/world", tags=["World Building - Memory Bank"])


# ============================================
# 辅助函数
# ============================================

async def verify_project_ownership(
    project_id: UUID,
    user_id: str,
    db: AsyncSession
) -> NovelProject:
    """验证项目所有权"""
    query = select(NovelProject).where(
        NovelProject.id == project_id,
        NovelProject.user_id == user_id
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在或无权访问")
    return project


async def get_entry_with_relations(
    entry_id: UUID,
    db: AsyncSession
) -> WorldEntry:
    """获取条目及其关系"""
    query = select(WorldEntry).where(
        WorldEntry.id == entry_id
    ).options(
        selectinload(WorldEntry.outgoing_relations).selectinload(EntryRelation.target),
        selectinload(WorldEntry.incoming_relations).selectinload(EntryRelation.source)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


def build_entry_response(entry: WorldEntry) -> EntryResponse:
    """构建条目响应"""
    # 构建出向关系
    relations = []
    for rel in (entry.outgoing_relations or []):
        relations.append(RelationResponse(
            id=rel.id,
            source_id=rel.source_id,
            target_id=rel.target_id,
            relation_type=rel.relation_type,
            description=rel.description,
            chapter_context=rel.chapter_context,
            created_at=rel.created_at,
            source_name=entry.name,
            source_type=entry.type,
            target_name=rel.target.name if rel.target else None,
            target_type=rel.target.type if rel.target else None,
        ))

    # 构建入向关系
    referenced_by = []
    for rel in (entry.incoming_relations or []):
        referenced_by.append(RelationResponse(
            id=rel.id,
            source_id=rel.source_id,
            target_id=rel.target_id,
            relation_type=rel.relation_type,
            description=rel.description,
            chapter_context=rel.chapter_context,
            created_at=rel.created_at,
            source_name=rel.source.name if rel.source else None,
            source_type=rel.source.type if rel.source else None,
            target_name=entry.name,
            target_type=entry.type,
        ))

    return EntryResponse(
        id=entry.id,
        project_id=entry.project_id,
        type=entry.type,
        name=entry.name,
        description=entry.description,
        properties=entry.properties or {},
        custom_fields=entry.custom_fields or {},
        tags=entry.tags or [],
        foreshadow_status=entry.foreshadow_status,
        planted_chapter=entry.planted_chapter,
        planned_reveal_chapter=entry.planned_reveal_chapter,
        actual_reveal_chapter=entry.actual_reveal_chapter,
        hint_text=entry.hint_text,
        relations=relations,
        referenced_by=referenced_by,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


# ============================================
# 条目 CRUD
# ============================================

@router.post("/projects/{project_id}/entries", response_model=EntryResponse)
async def create_entry(
    project_id: UUID,
    request: CreateEntryRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """创建世界观条目"""
    await verify_project_ownership(project_id, user_id, db)

    # 创建条目
    entry = WorldEntry(
        project_id=project_id,
        type=request.type,
        name=request.name,
        description=request.description,
        properties=request.properties or {},
        custom_fields=request.custom_fields or {},
        tags=request.tags or [],
    )

    # 伏笔特殊处理
    if request.type == "foreshadowing":
        if not request.planted_chapter:
            raise HTTPException(status_code=400, detail="伏笔必须指定埋设章节")
        entry.foreshadow_status = "planted"
        entry.planted_chapter = request.planted_chapter
        entry.planned_reveal_chapter = request.planned_reveal_chapter
        entry.hint_text = request.hint_text

    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    # 重新获取带关系的条目
    entry = await get_entry_with_relations(entry.id, db)
    return build_entry_response(entry)


@router.get("/projects/{project_id}/entries", response_model=EntryListResponse)
async def list_entries(
    project_id: UUID,
    type: Optional[str] = Query(None, description="条目类型过滤"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    tags: Optional[str] = Query(None, description="标签过滤，逗号分隔"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目的世界观条目列表"""
    await verify_project_ownership(project_id, user_id, db)

    # 构建查询
    query = select(WorldEntry).where(WorldEntry.project_id == project_id)

    # 类型过滤
    if type:
        query = query.where(WorldEntry.type == type)

    # 搜索
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                WorldEntry.name.ilike(search_pattern),
                WorldEntry.description.ilike(search_pattern)
            )
        )

    # 标签过滤
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            query = query.where(WorldEntry.tags.overlap(tag_list))

    # 统计总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页
    query = query.order_by(WorldEntry.type, WorldEntry.name).offset(offset).limit(limit)
    query = query.options(
        selectinload(WorldEntry.outgoing_relations).selectinload(EntryRelation.target),
        selectinload(WorldEntry.incoming_relations).selectinload(EntryRelation.source)
    )

    result = await db.execute(query)
    entries = result.scalars().all()

    # 按类型统计
    type_count_query = select(
        WorldEntry.type,
        func.count().label("count")
    ).where(
        WorldEntry.project_id == project_id
    ).group_by(WorldEntry.type)

    type_count_result = await db.execute(type_count_query)
    by_type = {row.type: row.count for row in type_count_result}

    return EntryListResponse(
        entries=[build_entry_response(e) for e in entries],
        total=total,
        by_type=by_type
    )


@router.get("/projects/{project_id}/entries/{entry_id}", response_model=EntryResponse)
async def get_entry(
    project_id: UUID,
    entry_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取单个条目详情"""
    await verify_project_ownership(project_id, user_id, db)

    entry = await get_entry_with_relations(entry_id, db)
    if not entry or entry.project_id != project_id:
        raise HTTPException(status_code=404, detail="条目不存在")

    return build_entry_response(entry)


@router.patch("/projects/{project_id}/entries/{entry_id}", response_model=EntryResponse)
async def update_entry(
    project_id: UUID,
    entry_id: UUID,
    request: UpdateEntryRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新条目"""
    await verify_project_ownership(project_id, user_id, db)

    # 获取条目
    query = select(WorldEntry).where(
        WorldEntry.id == entry_id,
        WorldEntry.project_id == project_id
    )
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="条目不存在")

    # 更新字段
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(entry, field):
            setattr(entry, field, value)

    await db.commit()

    # 重新获取带关系的条目
    entry = await get_entry_with_relations(entry_id, db)
    return build_entry_response(entry)


@router.delete("/projects/{project_id}/entries/{entry_id}")
async def delete_entry(
    project_id: UUID,
    entry_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """删除条目"""
    await verify_project_ownership(project_id, user_id, db)

    query = select(WorldEntry).where(
        WorldEntry.id == entry_id,
        WorldEntry.project_id == project_id
    )
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="条目不存在")

    await db.delete(entry)
    await db.commit()

    return {"success": True, "message": "删除成功"}


# ============================================
# 关系管理
# ============================================

@router.post("/projects/{project_id}/relations", response_model=RelationResponse)
async def create_relation(
    project_id: UUID,
    request: CreateRelationRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """创建条目关系"""
    await verify_project_ownership(project_id, user_id, db)

    # 验证源条目和目标条目都属于该项目
    source_query = select(WorldEntry).where(
        WorldEntry.id == request.source_id,
        WorldEntry.project_id == project_id
    )
    target_query = select(WorldEntry).where(
        WorldEntry.id == request.target_id,
        WorldEntry.project_id == project_id
    )

    source_result = await db.execute(source_query)
    target_result = await db.execute(target_query)

    source = source_result.scalar_one_or_none()
    target = target_result.scalar_one_or_none()

    if not source:
        raise HTTPException(status_code=404, detail="源条目不存在")
    if not target:
        raise HTTPException(status_code=404, detail="目标条目不存在")
    if source.id == target.id:
        raise HTTPException(status_code=400, detail="不能创建自引用关系")

    # 检查关系是否已存在
    existing_query = select(EntryRelation).where(
        EntryRelation.source_id == request.source_id,
        EntryRelation.target_id == request.target_id,
        EntryRelation.relation_type == request.relation_type
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该关系已存在")

    # 创建关系
    relation = EntryRelation(
        source_id=request.source_id,
        target_id=request.target_id,
        relation_type=request.relation_type,
        description=request.description,
        chapter_context=request.chapter_context
    )

    db.add(relation)
    await db.commit()
    await db.refresh(relation)

    return RelationResponse(
        id=relation.id,
        source_id=relation.source_id,
        target_id=relation.target_id,
        relation_type=relation.relation_type,
        description=relation.description,
        chapter_context=relation.chapter_context,
        created_at=relation.created_at,
        source_name=source.name,
        source_type=source.type,
        target_name=target.name,
        target_type=target.type,
    )


@router.delete("/projects/{project_id}/relations/{relation_id}")
async def delete_relation(
    project_id: UUID,
    relation_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """删除关系"""
    await verify_project_ownership(project_id, user_id, db)

    # 获取关系并验证
    query = select(EntryRelation).where(
        EntryRelation.id == relation_id
    ).options(selectinload(EntryRelation.source))

    result = await db.execute(query)
    relation = result.scalar_one_or_none()

    if not relation:
        raise HTTPException(status_code=404, detail="关系不存在")
    if relation.source.project_id != project_id:
        raise HTTPException(status_code=403, detail="无权删除该关系")

    await db.delete(relation)
    await db.commit()

    return {"success": True, "message": "删除成功"}


@router.get("/relation-types", response_model=RelationTypesResponse)
async def get_relation_types():
    """获取所有关系类型"""
    types = [
        # 地点相关
        RelationTypeInfo(value="发生地点", label="发生地点", category="location"),
        RelationTypeInfo(value="出生地", label="出生地", category="location"),
        RelationTypeInfo(value="居住地", label="居住地", category="location"),
        RelationTypeInfo(value="势力范围", label="势力范围", category="location"),
        # 人物相关
        RelationTypeInfo(value="参与者", label="参与者", category="character"),
        RelationTypeInfo(value="创造者", label="创造者", category="character"),
        RelationTypeInfo(value="拥有者", label="拥有者", category="character"),
        RelationTypeInfo(value="师徒关系", label="师徒关系", category="character"),
        RelationTypeInfo(value="敌对关系", label="敌对关系", category="character"),
        RelationTypeInfo(value="同盟关系", label="同盟关系", category="character"),
        RelationTypeInfo(value="家族关系", label="家族关系", category="character"),
        # 事件相关
        RelationTypeInfo(value="触发事件", label="触发事件", category="event"),
        RelationTypeInfo(value="导致结果", label="导致结果", category="event"),
        RelationTypeInfo(value="前置事件", label="前置事件", category="event"),
        RelationTypeInfo(value="后续事件", label="后续事件", category="event"),
        # 伏笔相关
        RelationTypeInfo(value="关联伏笔", label="关联伏笔", category="foreshadow"),
        RelationTypeInfo(value="伏笔线索", label="伏笔线索", category="foreshadow"),
        RelationTypeInfo(value="伏笔揭示", label="伏笔揭示", category="foreshadow"),
    ]
    return RelationTypesResponse(types=types)


# ============================================
# 伏笔专用
# ============================================

@router.get("/projects/{project_id}/foreshadowing", response_model=ForeshadowingListResponse)
async def list_foreshadowing(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取项目的伏笔列表（按状态分组）"""
    await verify_project_ownership(project_id, user_id, db)

    query = select(WorldEntry).where(
        WorldEntry.project_id == project_id,
        WorldEntry.type == "foreshadowing"
    ).options(
        selectinload(WorldEntry.outgoing_relations).selectinload(EntryRelation.target),
        selectinload(WorldEntry.incoming_relations).selectinload(EntryRelation.source)
    ).order_by(WorldEntry.planted_chapter)

    result = await db.execute(query)
    entries = result.scalars().all()

    # 分组
    planted = []
    brewing = []
    revealed = []

    for entry in entries:
        entry_response = build_entry_response(entry)
        if entry.foreshadow_status == "planted":
            planted.append(entry_response)
        elif entry.foreshadow_status == "brewing":
            brewing.append(entry_response)
        elif entry.foreshadow_status == "revealed":
            revealed.append(entry_response)

    stats = ForeshadowingStats(
        planted=len(planted),
        brewing=len(brewing),
        revealed=len(revealed),
        total=len(entries)
    )

    return ForeshadowingListResponse(
        stats=stats,
        planted=planted,
        brewing=brewing,
        revealed=revealed
    )


@router.patch("/projects/{project_id}/foreshadowing/{entry_id}/status", response_model=EntryResponse)
async def update_foreshadowing_status(
    project_id: UUID,
    entry_id: UUID,
    request: UpdateForeshadowStatusRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """更新伏笔状态"""
    await verify_project_ownership(project_id, user_id, db)

    query = select(WorldEntry).where(
        WorldEntry.id == entry_id,
        WorldEntry.project_id == project_id,
        WorldEntry.type == "foreshadowing"
    )
    result = await db.execute(query)
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="伏笔不存在")

    # 更新状态
    entry.foreshadow_status = request.status
    if request.status == "revealed" and request.actual_reveal_chapter:
        entry.actual_reveal_chapter = request.actual_reveal_chapter

    await db.commit()

    # 重新获取带关系的条目
    entry = await get_entry_with_relations(entry_id, db)
    return build_entry_response(entry)


@router.get("/projects/{project_id}/foreshadowing/pending", response_model=PendingForeshadowingResponse)
async def get_pending_foreshadowing(
    project_id: UUID,
    current_chapter: int = Query(..., ge=1, description="当前章节号"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """获取待揭示的伏笔"""
    await verify_project_ownership(project_id, user_id, db)

    # 获取所有未揭示的伏笔
    query = select(WorldEntry).where(
        WorldEntry.project_id == project_id,
        WorldEntry.type == "foreshadowing",
        WorldEntry.foreshadow_status.in_(["planted", "brewing"])
    ).options(
        selectinload(WorldEntry.outgoing_relations).selectinload(EntryRelation.target),
        selectinload(WorldEntry.incoming_relations).selectinload(EntryRelation.source)
    ).order_by(WorldEntry.planned_reveal_chapter)

    result = await db.execute(query)
    entries = result.scalars().all()

    foreshadowing = []
    overdue = []

    for entry in entries:
        entry_response = build_entry_response(entry)
        if entry.planned_reveal_chapter and entry.planned_reveal_chapter <= current_chapter:
            overdue.append(entry_response)
        else:
            foreshadowing.append(entry_response)

    return PendingForeshadowingResponse(
        foreshadowing=foreshadowing,
        overdue=overdue
    )


# ============================================
# 元数据
# ============================================

@router.get("/entry-types", response_model=EntryTypesResponse)
async def get_entry_types():
    """获取所有条目类型定义"""
    return EntryTypesResponse(types=ENTRY_TYPE_SCHEMAS)


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "world_memory",
        "version": "1.0.0",
        "features": [
            "entry_crud",
            "relations",
            "foreshadowing"
        ]
    }
