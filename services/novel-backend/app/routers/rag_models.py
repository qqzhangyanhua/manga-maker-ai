"""
RAG 索引管理 - Pydantic 模型定义
"""
from pydantic import BaseModel, Field
from typing import List, Optional


# ============ Request Models ============


class IndexChapterRequest(BaseModel):
    """索引章节请求"""
    chapter_id: str = Field(..., description="章节 ID（UUID 格式）")

    class Config:
        json_schema_extra = {
            "example": {
                "chapter_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class BatchIndexRequest(BaseModel):
    """批量索引请求"""
    project_id: str = Field(..., description="项目 ID（UUID 格式）")
    chapter_ids: Optional[List[str]] = Field(None, description="章节 ID 列表（为空则索引项目下所有章节）")

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "chapter_ids": ["550e8400-e29b-41d4-a716-446655440000", "660f9511-f39c-52e5-b827-557766551111"]
            }
        }


class RebuildIndexRequest(BaseModel):
    """批量重建索引请求"""
    scope: str = Field(..., description="重建范围：all（全部）| project（单个项目）| date_range（日期范围）")
    project_id: Optional[str] = Field(None, description="项目 ID（scope=project 时必填）")
    start_date: Optional[str] = Field(None, description="开始日期（scope=date_range 时必填，格式：YYYY-MM-DD）")
    end_date: Optional[str] = Field(None, description="结束日期（scope=date_range 时必填，格式：YYYY-MM-DD）")

    class Config:
        json_schema_extra = {
            "example": {
                "scope": "project",
                "project_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class ConsistencyCheckRequest(BaseModel):
    """一致性检查请求"""
    project_id: Optional[str] = Field(None, description="项目 ID（为空则检查所有项目）")

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class ExportRequest(BaseModel):
    """导出向量数据请求"""
    format: str = Field("json", description="导出格式：json | pickle")
    project_id: Optional[str] = Field(None, description="项目 ID（为空则导出所有数据）")

    class Config:
        json_schema_extra = {
            "example": {
                "format": "json",
                "project_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class ImportRequest(BaseModel):
    """导入向量数据请求"""
    file_path: str = Field(..., description="导入文件路径（服务器本地路径）")
    merge_mode: str = Field("replace", description="合并模式：replace（替换）| merge（合并）")

    class Config:
        json_schema_extra = {
            "example": {
                "file_path": "/tmp/rag_export_20250115.json",
                "merge_mode": "merge"
            }
        }


class CleanupRequest(BaseModel):
    """数据清理请求"""
    remove_orphaned: bool = Field(True, description="是否移除孤立文档（数据库中不存在的章节）")
    compact_db: bool = Field(False, description="是否压缩数据库（清理碎片空间）")

    class Config:
        json_schema_extra = {
            "example": {
                "remove_orphaned": True,
                "compact_db": False
            }
        }


# ============ Response Models ============


class RAGStatsData(BaseModel):
    """RAG 统计数据"""
    enabled: bool = Field(..., description="RAG 服务是否启用")
    collectionName: Optional[str] = Field(None, description="ChromaDB collection 名称")
    totalDocuments: Optional[int] = Field(None, description="已索引文档总数", ge=0)
    embeddingModel: Optional[str] = Field(None, description="使用的 Embedding 模型（如 text-embedding-3-small）")
    dbSize: Optional[int] = Field(None, description="数据库大小（字节）", ge=0)
    indexSuccessRate: Optional[float] = Field(None, description="索引成功率（0.0-1.0）", ge=0.0, le=1.0)
    avgSimilarityScore: Optional[float] = Field(None, description="平均相似度得分（0.0-1.0）", ge=0.0, le=1.0)

    class Config:
        json_schema_extra = {
            "example": {
                "enabled": True,
                "collectionName": "novel_chapters",
                "totalDocuments": 358,
                "embeddingModel": "text-embedding-3-small",
                "dbSize": 104857600,
                "indexSuccessRate": 0.98,
                "avgSimilarityScore": 0.75
            }
        }


class RecentActivityData(BaseModel):
    """最近活动数据"""
    timestamp: str = Field(..., description="活动时间（ISO 8601 格式）")
    projectName: str = Field(..., description="项目名称")
    chapterNumber: int = Field(..., description="章节号", ge=1)
    chapterTitle: str = Field(..., description="章节标题")
    status: str = Field(..., description="索引状态：success（成功）| failed（失败）")

    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": "2025-01-15T14:30:00Z",
                "projectName": "修仙传说",
                "chapterNumber": 15,
                "chapterTitle": "第十五章：突破金丹",
                "status": "success"
            }
        }


class RAGStatsResponse(BaseModel):
    """RAG 统计信息响应"""
    stats: RAGStatsData = Field(..., description="RAG 统计数据")
    recentActivity: List[RecentActivityData] = Field(..., description="最近索引活动列表（最多 10 条）")

    class Config:
        json_schema_extra = {
            "example": {
                "stats": {
                    "enabled": True,
                    "collectionName": "novel_chapters",
                    "totalDocuments": 358
                },
                "recentActivity": [
                    {
                        "timestamp": "2025-01-15T14:30:00Z",
                        "projectName": "修仙传说",
                        "chapterNumber": 15,
                        "chapterTitle": "第十五章：突破金丹",
                        "status": "success"
                    }
                ]
            }
        }


class ChapterDetailResponse(BaseModel):
    """章节索引详情响应"""
    chapter_id: str = Field(..., description="章节 ID")
    indexed: bool = Field(..., description="是否已索引")
    metadata: Optional[dict] = Field(None, description="章节元数据（项目名、章节号、标题等）")
    embedding_dim: Optional[int] = Field(None, description="Embedding 向量维度", ge=0)
    similarity_test: Optional[float] = Field(None, description="相似度测试得分（0.0-1.0）", ge=0.0, le=1.0)
    error: Optional[str] = Field(None, description="错误信息（如果索引失败）")

    class Config:
        json_schema_extra = {
            "example": {
                "chapter_id": "550e8400-e29b-41d4-a716-446655440000",
                "indexed": True,
                "metadata": {
                    "project_name": "修仙传说",
                    "chapter_number": 1,
                    "chapter_title": "第一章：穿越异界",
                    "word_count": 6580
                },
                "embedding_dim": 1536,
                "similarity_test": 0.92,
                "error": None
            }
        }
