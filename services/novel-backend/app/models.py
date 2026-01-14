"""
数据库模型（映射到 Prisma Schema）
"""
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, Float, JSON, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
import uuid


class NovelProject(Base):
    """小说项目"""
    __tablename__ = "novel_projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    genre = Column(String(50))
    
    # 世界观和角色（JSON）
    world_setting = Column(JSON)
    characters = Column(JSON)
    outlines = Column(JSON)  # 章节大纲
    
    # 项目配置
    target_words = Column(Integer)
    status = Column(String(50), default="draft")
    
    # 统计
    total_words = Column(Integer, default=0)
    chapter_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    chapters = relationship("NovelChapter", back_populates="project", cascade="all, delete-orphan")
    prompts = relationship("NovelPromptTemplate", back_populates="project", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_novel_projects_user_status", "user_id", "status"),
        Index("idx_novel_projects_user_time", "user_id", "updated_at"),
    )


class NovelChapter(Base):
    """小说章节"""
    __tablename__ = "novel_chapters"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("novel_projects.id", ondelete="CASCADE"), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    
    # 内容
    outline = Column(Text)  # 大纲（用于 RAG）
    content = Column(Text)  # 完整内容
    word_count = Column(Integer, default=0)
    
    # AI 生成
    prompt_used = Column(Text)
    model_used = Column(String(100))
    
    # 状态
    status = Column(String(50), default="draft")
    is_key_chapter = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    project = relationship("NovelProject", back_populates="chapters")
    versions = relationship("NovelChapterVersion", back_populates="chapter", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_novel_chapters_project_order", "project_id", "chapter_number"),
        Index("idx_novel_chapters_key", "project_id", "is_key_chapter"),
        {"extend_existing": True}
    )


class NovelChapterVersion(Base):
    """章节版本"""
    __tablename__ = "novel_chapter_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("novel_chapters.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
    
    # 生成参数
    prompt_used = Column(Text)
    model_used = Column(String(100))
    temperature = Column(Float, default=0.7)
    
    # 状态
    is_selected = Column(Boolean, default=False)
    user_rating = Column(Integer)
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    chapter = relationship("NovelChapter", back_populates="versions")
    quality_score = relationship("QualityScore", back_populates="version", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_chapter_versions_selected", "chapter_id", "is_selected"),
    )


class QualityScore(Base):
    """章节质量评分"""
    __tablename__ = "quality_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("novel_chapter_versions.id", ondelete="CASCADE"), nullable=False, unique=True)

    # 评分
    overall_score = Column(Integer, nullable=False)  # 1-100
    dimensions = Column(JSON, nullable=False)  # 多维度评分详情
    suggestions = Column(JSON)  # AI 改进建议

    # 元数据
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())
    analyzer_version = Column(String(50), default="1.0")

    # 关系
    version = relationship("NovelChapterVersion", back_populates="quality_score")


class NovelPromptTemplate(Base):
    """Prompt 模板"""
    __tablename__ = "novel_prompt_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("novel_projects.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True))
    
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    
    # 模板内容
    template = Column(Text, nullable=False)
    variables = Column(JSON)
    
    # 配置
    is_public = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    
    # 统计
    usage_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    project = relationship("NovelProject", back_populates="prompts")
    
    __table_args__ = (
        Index("idx_novel_prompts_category", "category", "is_public"),
        Index("idx_novel_prompts_user", "user_id"),
        Index("idx_novel_prompts_project", "project_id"),
    )


class NovelQuota(Base):
    """用户配额"""
    __tablename__ = "novel_quotas"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    daily_limit = Column(Integer, default=50)
    used_today = Column(Integer, default=0)
    tokens_used_total = Column(Integer, default=0)
    reset_at = Column(DateTime(timezone=True), nullable=False)
    custom_api_key = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
