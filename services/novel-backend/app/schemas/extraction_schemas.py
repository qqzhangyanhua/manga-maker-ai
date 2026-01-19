"""
世界观 AI 提取 - Pydantic Schemas
包含提取请求、响应和 SSE 事件定义
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from uuid import UUID


EntryTypeExtract = Literal["location", "character", "event", "item", "rule", "foreshadowing"]


class ExtractedEntry(BaseModel):
    """AI 提取的条目结构"""
    type: EntryTypeExtract
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=2000)
    properties: dict = Field(default_factory=dict)
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_text: str = Field(..., max_length=1000)
    planted_chapter: Optional[int] = Field(None, ge=1, le=10000)
    planned_reveal_chapter: Optional[int] = Field(None, ge=1, le=10000)
    hint_text: Optional[str] = Field(None, max_length=500)


class ExtractionRequest(BaseModel):
    """提取请求"""
    project_id: UUID
    chapter_ids: List[int] = Field(..., min_length=1, max_length=50)
    entry_types: List[EntryTypeExtract] = Field(
        default=["location", "character", "event", "item", "rule", "foreshadowing"]
    )
    min_confidence: float = Field(default=0.6, ge=0.0, le=1.0)


class ExtractionProgressEvent(BaseModel):
    """提取进度事件"""
    phase: Literal["preparing", "analyzing", "extracting", "deduplicating"]
    chapter_id: Optional[int] = None
    chapter_title: Optional[str] = None
    progress: float = Field(..., ge=0.0, le=1.0)
    message: Optional[str] = None


class ExtractionEntryEvent(BaseModel):
    """提取到的条目事件"""
    entry: ExtractedEntry
    chapter_id: int
    is_duplicate: bool = False
    similar_entry_name: Optional[str] = None


class ExtractionCompleteEvent(BaseModel):
    """提取完成事件"""
    total_extracted: int
    by_type: dict
    duplicates_found: int


class ExtractionErrorEvent(BaseModel):
    """提取错误事件"""
    message: str
    chapter_id: Optional[int] = None


class BatchSaveRequest(BaseModel):
    """批量保存提取结果请求"""
    project_id: UUID
    entries: List[ExtractedEntry]


class BatchSaveResponse(BaseModel):
    """批量保存响应"""
    saved_count: int
    failed_count: int
    saved_ids: List[str]
    errors: List[str] = Field(default_factory=list)
