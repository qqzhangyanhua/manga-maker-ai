"""
搜索系统 Pydantic Schemas
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from uuid import UUID


# ============================================
# Request Schemas
# ============================================

class DateRangeFilter(BaseModel):
    """日期范围过滤器"""
    start: datetime
    end: datetime


class WordCountRangeFilter(BaseModel):
    """字数范围过滤器"""
    min: int = Field(ge=0)
    max: int = Field(ge=0)

    @field_validator('max')
    @classmethod
    def max_must_be_greater_than_min(cls, v: int, info) -> int:
        if 'min' in info.data and v < info.data['min']:
            raise ValueError('max must be greater than or equal to min')
        return v


class ChapterNumberRangeFilter(BaseModel):
    """章节号范围过滤器"""
    min: int = Field(ge=1)
    max: int = Field(ge=1)


class SearchFilters(BaseModel):
    """搜索过滤器"""
    project_ids: Optional[List[UUID]] = None
    date_range: Optional[DateRangeFilter] = None
    word_count_range: Optional[WordCountRangeFilter] = None
    status: Optional[List[str]] = None
    cool_point_types: Optional[List[str]] = None
    chapter_number_range: Optional[ChapterNumberRangeFilter] = None


class GlobalSearchRequest(BaseModel):
    """全局搜索请求"""
    query: str = Field(min_length=1, max_length=500)
    filters: Optional[SearchFilters] = None
    sort_by: Literal["relevance", "date", "word_count"] = "relevance"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @field_validator('query')
    @classmethod
    def query_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('query cannot be empty or whitespace only')
        return v.strip()


class SearchSuggestRequest(BaseModel):
    """搜索建议请求"""
    query: str = Field(min_length=1, max_length=100)
    limit: int = Field(default=5, ge=1, le=20)


class SaveFilterRequest(BaseModel):
    """保存过滤器请求"""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    filters: SearchFilters
    is_pinned: bool = False


# ============================================
# Response Schemas
# ============================================

class CoolPoint(BaseModel):
    """爽点"""
    type: str
    description: str
    position: str


class SearchResultItem(BaseModel):
    """搜索结果项"""
    chapter_id: UUID
    project_id: UUID
    project_title: str
    chapter_number: int
    title: str
    content_snippet: str  # 包含高亮标记的片段
    word_count: int
    status: str
    cool_points: List[CoolPoint] = []
    relevance_score: float = Field(ge=0.0, le=1.0)
    created_at: datetime
    updated_at: datetime

    model_config = {
        "json_schema_extra": {
            "example": {
                "chapter_id": "123e4567-e89b-12d3-a456-426614174000",
                "project_id": "123e4567-e89b-12d3-a456-426614174001",
                "project_title": "修仙之路",
                "chapter_number": 1,
                "title": "第一章:觉醒",
                "content_snippet": "...主角突然<mark>觉醒</mark>了强大的力量...",
                "word_count": 6000,
                "status": "completed",
                "cool_points": [
                    {
                        "type": "能力展示",
                        "description": "主角首次展示穿越者知识",
                        "position": "章节前1/3"
                    }
                ],
                "relevance_score": 0.95,
                "created_at": "2026-01-18T10:00:00Z",
                "updated_at": "2026-01-18T10:00:00Z"
            }
        }
    }


class Aggregation(BaseModel):
    """聚合结果"""
    key: str
    count: int


class SearchAggregations(BaseModel):
    """搜索聚合数据"""
    by_project: List[Aggregation] = []
    by_cool_point_type: List[Aggregation] = []
    by_status: List[Aggregation] = []


class GlobalSearchResponse(BaseModel):
    """全局搜索响应"""
    total_count: int
    page: int
    page_size: int
    results: List[SearchResultItem]
    aggregations: SearchAggregations

    model_config = {
        "json_schema_extra": {
            "example": {
                "total_count": 42,
                "page": 1,
                "page_size": 20,
                "results": [],
                "aggregations": {
                    "by_project": [
                        {"key": "project-uuid", "count": 15}
                    ],
                    "by_cool_point_type": [
                        {"key": "能力展示", "count": 8},
                        {"key": "打脸", "count": 5}
                    ],
                    "by_status": [
                        {"key": "completed", "count": 30},
                        {"key": "draft", "count": 12}
                    ]
                }
            }
        }
    }


class SearchSuggestion(BaseModel):
    """搜索建议项"""
    type: Literal["history", "popular", "project", "character"]
    text: str
    highlight: str
    meta: Optional[Dict[str, Any]] = None


class SearchSuggestResponse(BaseModel):
    """搜索建议响应"""
    suggestions: List[SearchSuggestion]


class SearchHistoryItem(BaseModel):
    """搜索历史项"""
    id: UUID
    query: str
    filters: Optional[Dict[str, Any]] = None
    result_count: int
    created_at: datetime


class SearchHistoryResponse(BaseModel):
    """搜索历史响应"""
    history: List[SearchHistoryItem]
    total_count: int


class SavedFilterItem(BaseModel):
    """保存的过滤器项"""
    id: UUID
    name: str
    description: Optional[str] = None
    filters: Dict[str, Any]
    is_pinned: bool
    use_count: int
    created_at: datetime
    updated_at: datetime


class SavedFiltersResponse(BaseModel):
    """保存的过滤器列表响应"""
    filters: List[SavedFilterItem]
    total_count: int


# ============================================
# Internal Schemas (用于服务层)
# ============================================

class SearchQueryBuilder(BaseModel):
    """搜索查询构建器(内部使用)"""
    tsquery: str  # PostgreSQL tsquery格式
    filters: Optional[SearchFilters] = None
    sort_by: str = "relevance"
    offset: int = 0
    limit: int = 20

    model_config = {
        "arbitrary_types_allowed": True
    }
