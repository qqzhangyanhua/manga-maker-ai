"""
搜索系统数据库模型
"""
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class SearchHistory(Base):
    """搜索历史记录"""
    __tablename__ = "search_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    query = Column(Text, nullable=False)
    filters = Column(JSONB)
    result_count = Column(Integer, default=0)
    clicked_result_id = Column(UUID(as_uuid=True))  # 用户点击的结果
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_search_history_user_created", "user_id", "created_at desc"),
        # GIN索引用于搜索建议
        Index("idx_search_history_query", "query", postgresql_using="gin",
              postgresql_ops={"query": "gin_trgm_ops"}),
    )


class SavedFilter(Base):
    """保存的搜索过滤器"""
    __tablename__ = "saved_filter"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    filters = Column(JSONB, nullable=False)
    is_pinned = Column(Boolean, default=False)
    use_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_saved_filter_user", "user_id"),
        Index("idx_saved_filter_pinned", "user_id", "is_pinned",
              postgresql_where="is_pinned = true"),
    )
