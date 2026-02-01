"""
数据库模型（映射到 Prisma Schema）
"""
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, Float, JSON, ForeignKey, Index, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
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
    
    # 新增：风格指导文档（由 ProfessionalMode 工作流生成）
    style_guide = Column(JSON)
    
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


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    operation = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    details = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_maintenance_logs_user_time", "user_id", "created_at"),
        Index("idx_maintenance_logs_operation", "operation"),
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


# ============================================
# 世界观记忆库模型
# ============================================

class WorldEntry(Base):
    """世界观条目"""
    __tablename__ = "world_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("novel_projects.id", ondelete="CASCADE"), nullable=False)

    # 基础字段
    type = Column(String(50), nullable=False)  # location/character/event/item/rule/foreshadowing
    name = Column(String(200), nullable=False)
    description = Column(Text)

    # 结构化属性 (按类型不同)
    properties = Column(JSONB, default=dict)

    # 自定义扩展字段
    custom_fields = Column(JSONB, default=dict)

    # 伏笔专用字段 (type='foreshadowing' 时使用)
    foreshadow_status = Column(String(20))  # planted/brewing/revealed
    planted_chapter = Column(Integer)
    planned_reveal_chapter = Column(Integer)
    actual_reveal_chapter = Column(Integer)
    hint_text = Column(Text)

    # 元数据
    tags = Column(ARRAY(Text), default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系: 作为源的关系
    outgoing_relations = relationship(
        "EntryRelation",
        foreign_keys="EntryRelation.source_id",
        back_populates="source",
        cascade="all, delete-orphan"
    )

    # 关系: 作为目标的关系
    incoming_relations = relationship(
        "EntryRelation",
        foreign_keys="EntryRelation.target_id",
        back_populates="target",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_world_entries_project_type", "project_id", "type"),
        Index("idx_world_entries_project_name", "project_id", "name"),
        CheckConstraint(
            "type IN ('location', 'character', 'event', 'item', 'rule', 'foreshadowing')",
            name="chk_entry_type"
        ),
        CheckConstraint(
            "foreshadow_status IS NULL OR foreshadow_status IN ('planted', 'brewing', 'revealed')",
            name="chk_foreshadow_status"
        ),
        {"extend_existing": True}
    )

    def to_dict(self):
        """转换为字典"""
        return {
            "id": str(self.id),
            "project_id": str(self.project_id),
            "type": self.type,
            "name": self.name,
            "description": self.description,
            "properties": self.properties or {},
            "custom_fields": self.custom_fields or {},
            "foreshadow_status": self.foreshadow_status,
            "planted_chapter": self.planted_chapter,
            "planned_reveal_chapter": self.planned_reveal_chapter,
            "actual_reveal_chapter": self.actual_reveal_chapter,
            "hint_text": self.hint_text,
            "tags": self.tags or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class EntryRelation(Base):
    """条目关系"""
    __tablename__ = "entry_relations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("world_entries.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(UUID(as_uuid=True), ForeignKey("world_entries.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String(100), nullable=False)
    description = Column(Text)
    chapter_context = Column(Integer)  # 可选：这个关系在哪章建立
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    source = relationship("WorldEntry", foreign_keys=[source_id], back_populates="outgoing_relations")
    target = relationship("WorldEntry", foreign_keys=[target_id], back_populates="incoming_relations")

    __table_args__ = (
        Index("idx_entry_relations_source", "source_id"),
        Index("idx_entry_relations_target", "target_id"),
        Index("idx_entry_relations_type", "relation_type"),
        UniqueConstraint("source_id", "target_id", "relation_type", name="uq_entry_relation"),
        {"extend_existing": True}
    )

    def to_dict(self):
        """转换为字典"""
        return {
            "id": str(self.id),
            "source_id": str(self.source_id),
            "target_id": str(self.target_id),
            "relation_type": self.relation_type,
            "description": self.description,
            "chapter_context": self.chapter_context,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 常用关系类型常量
class RelationType:
    """关系类型枚举"""
    # 地点相关
    LOCATION = "发生地点"
    BIRTHPLACE = "出生地"
    RESIDENCE = "居住地"
    TERRITORY = "势力范围"

    # 人物相关
    PARTICIPANT = "参与者"
    CREATOR = "创造者"
    OWNER = "拥有者"
    MASTER_APPRENTICE = "师徒关系"
    ENEMY = "敌对关系"
    ALLY = "同盟关系"
    FAMILY = "家族关系"

    # 事件相关
    TRIGGER = "触发事件"
    RESULT = "导致结果"
    PREREQUISITE = "前置事件"
    SEQUEL = "后续事件"

    # 伏笔相关
    FORESHADOW_LINK = "关联伏笔"
    FORESHADOW_CLUE = "伏笔线索"
    FORESHADOW_REVEAL = "伏笔揭示"

    @classmethod
    def all_types(cls) -> list:
        """获取所有关系类型"""
        return [
            cls.LOCATION, cls.BIRTHPLACE, cls.RESIDENCE, cls.TERRITORY,
            cls.PARTICIPANT, cls.CREATOR, cls.OWNER, cls.MASTER_APPRENTICE,
            cls.ENEMY, cls.ALLY, cls.FAMILY,
            cls.TRIGGER, cls.RESULT, cls.PREREQUISITE, cls.SEQUEL,
            cls.FORESHADOW_LINK, cls.FORESHADOW_CLUE, cls.FORESHADOW_REVEAL
        ]


# 条目类型的默认属性结构
ENTRY_TYPE_SCHEMAS = {
    "location": {
        "label": "地点",
        "icon": "map-pin",
        "required": ["name"],
        "properties": {
            "region": {"label": "所属区域", "type": "string"},
            "terrain": {"label": "地形特征", "type": "string"},
            "population": {"label": "人口规模", "type": "string"},
            "significance": {"label": "剧情重要性", "type": "string"},
        }
    },
    "character": {
        "label": "人物",
        "icon": "user",
        "required": ["name"],
        "properties": {
            "role": {"label": "角色定位", "type": "string"},
            "affiliation": {"label": "所属势力", "type": "string"},
            "ability": {"label": "能力特长", "type": "string"},
            "personality": {"label": "性格特点", "type": "string"},
        }
    },
    "event": {
        "label": "事件",
        "icon": "calendar",
        "required": ["name"],
        "properties": {
            "time_period": {"label": "发生时间", "type": "string"},
            "scale": {"label": "规模", "type": "string"},
            "outcome": {"label": "结果影响", "type": "string"},
        }
    },
    "item": {
        "label": "物品",
        "icon": "package",
        "required": ["name"],
        "properties": {
            "rarity": {"label": "稀有度", "type": "string"},
            "power": {"label": "能力效果", "type": "string"},
            "origin": {"label": "来源背景", "type": "string"},
        }
    },
    "rule": {
        "label": "规则",
        "icon": "book-open",
        "required": ["name"],
        "properties": {
            "category": {"label": "规则类别", "type": "string"},
            "scope": {"label": "适用范围", "type": "string"},
            "exceptions": {"label": "例外情况", "type": "string"},
        }
    },
    "foreshadowing": {
        "label": "伏笔",
        "icon": "eye",
        "required": ["name", "planted_chapter"],
        "properties": {
            "importance": {"label": "重要程度", "type": "string"},
            "reveal_hint": {"label": "揭示时机建议", "type": "string"},
        }
    }
}
