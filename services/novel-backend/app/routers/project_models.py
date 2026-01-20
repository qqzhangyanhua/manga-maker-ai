"""
小说项目管理 - Pydantic 模型定义
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime


# ============ 章节简化模型（用于项目详情返回） ============

class ChapterInProject(BaseModel):
    """项目中的章节信息（包含content）"""
    id: str = Field(..., description="章节唯一标识 (UUID)")
    chapter_number: int = Field(..., description="章节序号（从 1 开始）", ge=1)
    title: str = Field(..., description="章节标题", max_length=200)
    outline: Optional[str] = Field(None, description="章节大纲（简要概述）")
    content: Optional[str] = Field(None, description="章节正文内容（完整文本）")
    word_count: int = Field(0, description="章节字数", ge=0)
    status: str = Field(..., description="章节状态：draft（草稿）| published（已发布）")
    is_key_chapter: bool = Field(False, description="是否为关键章节（如开篇、高潮、结局等）")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="最后更新时间")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "chapter_number": 1,
                "title": "第一章：穿越异界",
                "outline": "主角林枫意外穿越到修仙世界，发现自己拥有金手指系统...",
                "content": "天地玄黄，宇宙洪荒。林枫睁开双眼，发现自己身处陌生环境...",
                "word_count": 6580,
                "status": "published",
                "is_key_chapter": True,
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-15T14:20:00Z"
            }
        }


# ============ Request Models ============


class ProjectCreate(BaseModel):
    """创建项目请求"""
    title: str = Field(..., max_length=200, description="项目标题", min_length=1)
    description: Optional[str] = Field(None, description="项目简介/故事梗概", max_length=5000)
    genre: Optional[str] = Field(None, description="小说类型（如：玄幻、都市、科幻等）", max_length=50)
    world_setting: Optional[dict] = Field(None, description="世界观设定（JSON 格式，可包含世界背景、魔法体系、势力分布等）")
    characters: Optional[list] = Field(None, description="主要角色列表（JSON 数组，每个角色包含姓名、性格、背景等）")
    target_words: Optional[int] = Field(None, description="目标字数（默认 100,000）", ge=1000, le=10000000)

    class Config:
        json_schema_extra = {
            "example": {
                "title": "修仙传说：逆天改命",
                "description": "一个关于废柴少年逆袭修仙的故事，主角林枫意外获得远古传承，开启修仙之路...",
                "genre": "玄幻",
                "world_setting": {
                    "world_name": "苍穹大陆",
                    "power_system": "炼气、筑基、金丹、元婴、化神",
                    "factions": ["天剑宗", "魔教", "散修联盟"]
                },
                "characters": [
                    {"name": "林枫", "role": "主角", "personality": "坚韧不拔、聪明机智"},
                    {"name": "苏婉儿", "role": "女主", "personality": "温柔善良、天赋异禀"}
                ],
                "target_words": 500000
            }
        }


class ProjectUpdate(BaseModel):
    """更新项目请求"""
    title: Optional[str] = Field(None, max_length=200, description="项目标题", min_length=1)
    description: Optional[str] = Field(None, description="项目简介/故事梗概", max_length=5000)
    genre: Optional[str] = Field(None, description="小说类型", max_length=50)
    world_setting: Optional[dict] = Field(None, description="世界观设定（JSON 格式）")
    characters: Optional[list] = Field(None, description="主要角色列表（JSON 数组）")
    outlines: Optional[list] = Field(None, description="章节大纲列表（JSON 数组）")
    target_words: Optional[int] = Field(None, description="目标字数", ge=1000, le=10000000)
    status: Optional[str] = Field(None, description="项目状态：draft（草稿）| in_progress（进行中）| completed（已完成）| archived（已归档）")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "修仙传说：逆天改命（修订版）",
                "status": "in_progress",
                "target_words": 800000
            }
        }


class AnalyzeChaptersCharactersRequest(BaseModel):
    """分析章节角色请求"""
    chapters_context: str = Field(..., description="章节上下文内容（用于分析角色出场和性格）", min_length=10)

    class Config:
        json_schema_extra = {
            "example": {
                "chapters_context": "第一章：林枫穿越到修仙世界...\n第二章：遇到师姐苏婉儿..."
            }
        }


class AnalyzeWorldSettingRequest(BaseModel):
    """分析世界观设定请求"""
    chapters_context: str = Field(..., description="章节上下文内容（用于提取世界观设定）", min_length=10)

    class Config:
        json_schema_extra = {
            "example": {
                "chapters_context": "苍穹大陆分为东域、西域、南域、北域四大区域..."
            }
        }


class OptimizeDescriptionRequest(BaseModel):
    """优化/生成描述请求"""
    description: str = Field(..., description="待优化/生成的描述文本", min_length=1, max_length=5000)
    mode: str = Field(..., description="操作模式：optimize（优化现有描述）| generate（基于关键词生成新描述）")

    class Config:
        json_schema_extra = {
            "example": {
                "description": "主角穿越修仙世界",
                "mode": "optimize"
            }
        }


class GenerateOutlineRequest(BaseModel):
    """
    生成大纲请求

    支持两种模式:
    - full: 完整生成（基于项目描述、角色、世界观）
    - continue: 续写模式（基于现有章节续写后续章节）
    """
    chapter_count: int = Field(..., ge=1, le=100, description="章节数量（1-100）")
    style_prompt: Optional[str] = Field(None, alias="style", description="风格提示（如：热血、悬疑、轻松搞笑等）", max_length=500)
    mode: str = Field("full", description="生成模式：full（完整生成）| continue（续写）")
    existing_outlines: Optional[List[dict]] = Field(None, description="现有章节大纲（续写模式使用）")
    start_chapter: int = Field(1, ge=1, description="起始章节号（续写模式使用，表示从第几章开始续写）")

    class Config:
        populate_by_name = True  # 允许同时使用字段名和 alias
        json_schema_extra = {
            "example": {
                "chapter_count": 50,
                "style": "热血修仙",
                "mode": "full"
            }
        }


# ============ Response Models ============


class ProjectResponse(BaseModel):
    """项目响应"""
    id: str = Field(..., description="项目唯一标识 (UUID)")
    user_id: str = Field(..., description="用户 ID (UUID)")
    title: str = Field(..., description="项目标题")
    description: Optional[str] = Field(None, description="项目简介")
    genre: Optional[str] = Field(None, description="小说类型")
    world_setting: Optional[dict] = Field(None, description="世界观设定（JSON）")
    characters: Optional[list] = Field(None, description="主要角色列表（JSON 数组）")
    outlines: Optional[list] = Field(None, description="章节大纲列表（JSON 数组）")
    target_words: Optional[int] = Field(None, description="目标字数")
    status: str = Field(..., description="项目状态：draft | in_progress | completed | archived")
    total_words: int = Field(0, description="当前总字数", ge=0)
    chapter_count: int = Field(0, description="章节总数", ge=0)
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="最后更新时间")
    chapters: Optional[List[ChapterInProject]] = Field(None, description="完整章节列表（可选，仅在需要时返回）")

    class Config:
        from_attributes = True
        # 自动转换 UUID 为字符串
        json_encoders = {
            UUID: str
        }
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "987fcdeb-51a2-43d7-8f9e-0123456789ab",
                "title": "修仙传说：逆天改命",
                "description": "一个关于废柴少年逆袭修仙的故事...",
                "genre": "玄幻",
                "world_setting": {"world_name": "苍穹大陆"},
                "characters": [{"name": "林枫", "role": "主角"}],
                "outlines": [],
                "target_words": 500000,
                "status": "in_progress",
                "total_words": 128000,
                "chapter_count": 20,
                "created_at": "2025-01-10T08:00:00Z",
                "updated_at": "2025-01-15T14:30:00Z",
                "chapters": None
            }
        }

    @classmethod
    def model_validate(cls, obj):
        """重写验证方法，自动转换 UUID 字段"""
        if hasattr(obj, '__dict__'):
            data = {}
            for key, value in obj.__dict__.items():
                if isinstance(value, UUID):
                    data[key] = str(value)
                else:
                    data[key] = value
            return super().model_validate(data)
        return super().model_validate(obj)
