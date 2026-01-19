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
    id: str
    chapter_number: int
    title: str
    outline: Optional[str]
    content: Optional[str]  # ✅ 包含正文内容
    word_count: int
    status: str
    is_key_chapter: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Request Models ============


class ProjectCreate(BaseModel):
    """创建项目请求"""
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    genre: Optional[str] = None
    world_setting: Optional[dict] = None
    characters: Optional[list] = None
    target_words: Optional[int] = None


class ProjectUpdate(BaseModel):
    """更新项目请求"""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    genre: Optional[str] = None
    world_setting: Optional[dict] = None
    characters: Optional[list] = None
    outlines: Optional[list] = None
    target_words: Optional[int] = None
    status: Optional[str] = None


class AnalyzeChaptersCharactersRequest(BaseModel):
    """分析章节角色请求"""
    chapters_context: str


class AnalyzeWorldSettingRequest(BaseModel):
    """分析世界观设定请求"""
    chapters_context: str


class OptimizeDescriptionRequest(BaseModel):
    """优化/生成描述请求"""
    description: str
    mode: str  # "optimize" or "generate"


class GenerateOutlineRequest(BaseModel):
    """
    生成大纲请求

    支持两种模式:
    - full: 完整生成（基于项目描述、角色、世界观）
    - continue: 续写模式（基于现有章节续写后续章节）
    """
    chapter_count: int = Field(..., ge=1, le=100, description="章节数量")
    style_prompt: Optional[str] = Field(None, alias="style", description="风格提示")
    mode: str = Field("full", description="生成模式: full | continue")
    existing_outlines: Optional[List[dict]] = Field(None, description="现有章节大纲（续写模式使用）")
    start_chapter: int = Field(1, ge=1, description="起始章节号（续写模式使用）")

    class Config:
        populate_by_name = True  # 允许同时使用字段名和 alias


# ============ Response Models ============


class ProjectResponse(BaseModel):
    """项目响应"""
    id: str
    user_id: str
    title: str
    description: Optional[str]
    genre: Optional[str]
    world_setting: Optional[dict]
    characters: Optional[list]
    outlines: Optional[list]
    target_words: Optional[int]
    status: str
    total_words: int
    chapter_count: int
    created_at: datetime
    updated_at: datetime
    chapters: Optional[List[ChapterInProject]] = None  # ✅ 新增：完整章节列表

    class Config:
        from_attributes = True
        # 自动转换 UUID 为字符串
        json_encoders = {
            UUID: str
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
