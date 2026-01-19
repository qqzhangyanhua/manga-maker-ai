"""
世界观记忆库 - Pydantic Schemas
包含输入验证和 XSS 防护
"""
import re
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal, Any
from uuid import UUID
from datetime import datetime

try:
    import bleach
    BLEACH_AVAILABLE = True
except ImportError:
    BLEACH_AVAILABLE = False


# ============ 安全工具函数 ============

def sanitize_html(value: str) -> str:
    """
    净化 HTML 内容，移除所有标签防止 XSS
    """
    if not value:
        return value
    if BLEACH_AVAILABLE:
        return bleach.clean(value, tags=[], strip=True)
    # 降级方案：使用正则移除 HTML 标签
    return re.sub(r'<[^>]+>', '', value)


def sanitize_dict_values(d: dict) -> dict:
    """
    递归净化字典中的字符串值
    """
    if not d:
        return d
    result = {}
    for key, value in d.items():
        if isinstance(value, str):
            result[key] = sanitize_html(value)
        elif isinstance(value, dict):
            result[key] = sanitize_dict_values(value)
        elif isinstance(value, list):
            result[key] = [
                sanitize_html(v) if isinstance(v, str) else v
                for v in value
            ]
        else:
            result[key] = value
    return result


# ============ 类型定义 ============

EntryType = Literal["location", "character", "event", "item", "rule", "foreshadowing"]
ForeshadowStatus = Literal["planted", "brewing", "revealed"]


# ============ 基础验证 Mixin ============

class SanitizedTextMixin:
    """文本字段净化 Mixin"""

    @field_validator('name', 'description', 'hint_text', mode='before', check_fields=False)
    @classmethod
    def sanitize_text_fields(cls, v: Any) -> Any:
        if isinstance(v, str):
            return sanitize_html(v.strip())
        return v

    @field_validator('properties', 'custom_fields', mode='before', check_fields=False)
    @classmethod
    def sanitize_dict_fields(cls, v: Any) -> Any:
        if isinstance(v, dict):
            return sanitize_dict_values(v)
        return v

    @field_validator('tags', mode='before', check_fields=False)
    @classmethod
    def sanitize_tags(cls, v: Any) -> Any:
        if isinstance(v, list):
            return [sanitize_html(tag.strip()) if isinstance(tag, str) else tag for tag in v]
        return v


# ============ 关系 Schemas ============

class CreateRelationRequest(BaseModel):
    """创建关系请求"""
    source_id: UUID
    target_id: UUID
    relation_type: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    chapter_context: Optional[int] = Field(None, ge=1, le=10000)

    @field_validator('relation_type', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: Any) -> Any:
        if isinstance(v, str):
            return sanitize_html(v.strip())
        return v


class RelationResponse(BaseModel):
    """关系响应"""
    id: UUID
    source_id: UUID
    target_id: UUID
    relation_type: str
    description: Optional[str]
    chapter_context: Optional[int]
    created_at: datetime

    # 关联的条目信息（简化）
    source_name: Optional[str] = None
    source_type: Optional[str] = None
    target_name: Optional[str] = None
    target_type: Optional[str] = None

    class Config:
        from_attributes = True


# ============ 条目 Schemas ============

class CreateEntryRequest(SanitizedTextMixin, BaseModel):
    """创建条目请求"""
    type: EntryType
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    properties: Optional[dict] = Field(default_factory=dict)
    custom_fields: Optional[dict] = Field(default_factory=dict)
    tags: Optional[List[str]] = Field(default_factory=list, max_length=20)

    # 伏笔专用
    planted_chapter: Optional[int] = Field(None, ge=1, le=10000)
    planned_reveal_chapter: Optional[int] = Field(None, ge=1, le=10000)
    hint_text: Optional[str] = Field(None, max_length=2000)

    @field_validator('tags', mode='after')
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        if v:
            # 每个标签最大 50 字符
            return [tag[:50] for tag in v if tag and len(tag.strip()) > 0]
        return v


class UpdateEntryRequest(SanitizedTextMixin, BaseModel):
    """更新条目请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    properties: Optional[dict] = None
    custom_fields: Optional[dict] = None
    tags: Optional[List[str]] = Field(None, max_length=20)

    # 伏笔专用
    foreshadow_status: Optional[ForeshadowStatus] = None
    planted_chapter: Optional[int] = Field(None, ge=1, le=10000)
    planned_reveal_chapter: Optional[int] = Field(None, ge=1, le=10000)
    actual_reveal_chapter: Optional[int] = Field(None, ge=1, le=10000)
    hint_text: Optional[str] = Field(None, max_length=2000)

    @field_validator('tags', mode='after')
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            return [tag[:50] for tag in v if tag and len(tag.strip()) > 0]
        return v


class EntryBrief(BaseModel):
    """条目简要信息"""
    id: UUID
    type: str
    name: str
    description: Optional[str]
    foreshadow_status: Optional[str] = None

    class Config:
        from_attributes = True


class EntryResponse(BaseModel):
    """条目完整响应"""
    id: UUID
    project_id: UUID
    type: str
    name: str
    description: Optional[str]
    properties: dict
    custom_fields: dict
    tags: List[str]

    # 伏笔字段
    foreshadow_status: Optional[str]
    planted_chapter: Optional[int]
    planned_reveal_chapter: Optional[int]
    actual_reveal_chapter: Optional[int]
    hint_text: Optional[str]

    # 关系
    relations: List[RelationResponse] = Field(default_factory=list)
    referenced_by: List[RelationResponse] = Field(default_factory=list)

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EntryListResponse(BaseModel):
    """条目列表响应"""
    entries: List[EntryResponse]
    total: int
    by_type: dict  # 按类型统计


# ============ 伏笔 Schemas ============

class UpdateForeshadowStatusRequest(BaseModel):
    """更新伏笔状态请求"""
    status: ForeshadowStatus
    actual_reveal_chapter: Optional[int] = Field(None, ge=1, le=10000)


class ForeshadowingStats(BaseModel):
    """伏笔统计"""
    planted: int = 0
    brewing: int = 0
    revealed: int = 0
    total: int = 0


class ForeshadowingListResponse(BaseModel):
    """伏笔列表响应"""
    stats: ForeshadowingStats
    planted: List[EntryResponse] = Field(default_factory=list)
    brewing: List[EntryResponse] = Field(default_factory=list)
    revealed: List[EntryResponse] = Field(default_factory=list)


class PendingForeshadowingResponse(BaseModel):
    """待揭示伏笔响应"""
    foreshadowing: List[EntryResponse]
    overdue: List[EntryResponse]  # 已超过计划揭示章节


# ============ 查询参数 Schemas ============

class EntryQueryParams(BaseModel):
    """条目查询参数"""
    type: Optional[EntryType] = None
    search: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)

    @field_validator('search', mode='before')
    @classmethod
    def sanitize_search(cls, v: Any) -> Any:
        if isinstance(v, str):
            # 移除特殊 SQL 字符
            return sanitize_html(v.strip())[:100]
        return v


# ============ 关系类型 Schema ============

class RelationTypeInfo(BaseModel):
    """关系类型信息"""
    value: str
    label: str
    category: str  # location/character/event/foreshadow


class RelationTypesResponse(BaseModel):
    """关系类型列表响应"""
    types: List[RelationTypeInfo]


# ============ 条目类型 Schema ============

class PropertySchema(BaseModel):
    """属性定义"""
    label: str
    type: str


class EntryTypeSchema(BaseModel):
    """条目类型定义"""
    label: str
    icon: str
    required: List[str]
    properties: dict


class EntryTypesResponse(BaseModel):
    """条目类型列表响应"""
    types: dict  # {type_name: EntryTypeSchema}
