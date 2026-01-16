"""
RAG 索引管理 - Pydantic 模型定义
"""
from pydantic import BaseModel
from typing import List, Optional


# ============ Request Models ============


class IndexChapterRequest(BaseModel):
    """索引章节请求"""
    chapter_id: str


class BatchIndexRequest(BaseModel):
    """批量索引请求"""
    project_id: str
    chapter_ids: Optional[List[str]] = None


class RebuildIndexRequest(BaseModel):
    """批量重建索引请求"""
    scope: str  # "all" | "project" | "date_range"
    project_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ConsistencyCheckRequest(BaseModel):
    """一致性检查请求"""
    project_id: Optional[str] = None


class ExportRequest(BaseModel):
    """导出向量数据请求"""
    format: str = "json"  # "json" | "pickle"
    project_id: Optional[str] = None


class ImportRequest(BaseModel):
    """导入向量数据请求"""
    file_path: str
    merge_mode: str = "replace"  # "replace" | "merge"


class CleanupRequest(BaseModel):
    """数据清理请求"""
    remove_orphaned: bool = True
    compact_db: bool = False


# ============ Response Models ============


class RAGStatsData(BaseModel):
    """RAG 统计数据"""
    enabled: bool
    collectionName: Optional[str] = None
    totalDocuments: Optional[int] = None
    embeddingModel: Optional[str] = None
    dbSize: Optional[int] = None
    indexSuccessRate: Optional[float] = None
    avgSimilarityScore: Optional[float] = None


class RecentActivityData(BaseModel):
    """最近活动数据"""
    timestamp: str
    projectName: str
    chapterNumber: int
    chapterTitle: str
    status: str  # "success" | "failed"


class RAGStatsResponse(BaseModel):
    """RAG 统计信息响应"""
    stats: RAGStatsData
    recentActivity: List[RecentActivityData]


class ChapterDetailResponse(BaseModel):
    """章节索引详情响应"""
    chapter_id: str
    indexed: bool
    metadata: Optional[dict] = None
    embedding_dim: Optional[int] = None
    similarity_test: Optional[float] = None
    error: Optional[str] = None
