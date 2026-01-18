"""
导出功能的数据模型
"""
from pydantic import BaseModel, Field
from typing import Literal, Optional


class ExportConfig(BaseModel):
    """导出配置"""
    chapter_range: Optional[list[int]] = Field(
        default=None,
        description="章节范围 [起始, 结束]，None 表示全部章节",
        example=[1, 10]
    )
    include_metadata: bool = Field(
        default=True,
        description="是否包含元数据（标题、作者等）"
    )
    include_outline: bool = Field(
        default=False,
        description="是否包含章节大纲"
    )
    chapter_separator: bool = Field(
        default=True,
        description="是否在章节之间添加分隔符或分页"
    )
    font_size: Optional[int] = Field(
        default=12,
        ge=8,
        le=24,
        description="字体大小（仅用于 PDF）"
    )
    font_family: Optional[str] = Field(
        default="SimSun",
        description="字体名称（仅用于 PDF）"
    )


class ExportRequest(BaseModel):
    """导出请求"""
    format: Literal["txt", "docx", "pdf"] = Field(
        ...,
        description="导出格式"
    )
    config: ExportConfig = Field(
        default_factory=ExportConfig,
        description="导出配置"
    )


class ExportResponse(BaseModel):
    """导出响应"""
    success: bool
    message: str
    file_size: Optional[int] = None
    filename: Optional[str] = None
