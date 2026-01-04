"""
灵感模式 Pydantic Schemas
用于 API 请求/响应验证和 OpenAI 结构化输出
"""
from pydantic import BaseModel, Field
from typing import List


class Location(BaseModel):
    """地点"""
    name: str = Field(..., description="地点名称")
    description: str = Field(..., description="地点描述")


class Faction(BaseModel):
    """派系/组织"""
    name: str = Field(..., description="派系名称")
    description: str = Field(..., description="派系描述")


class WorldRule(BaseModel):
    """世界规则"""
    name: str = Field(..., description="规则名称")
    description: str = Field(..., description="规则描述")


class TimelineEvent(BaseModel):
    """时间线事件"""
    time: str = Field(..., description="时间点")
    event: str = Field(..., description="事件描述")


class WorldSetting(BaseModel):
    """世界观设定"""
    locations: List[Location] = Field(
        default_factory=list,
        description="关键地点列表（2-3个）"
    )
    factions: List[Faction] = Field(
        default_factory=list,
        description="派系/组织列表（1-2个）"
    )
    rules: List[WorldRule] = Field(
        default_factory=list,
        description="世界规则列表（2-3条）"
    )
    timeline: List[TimelineEvent] = Field(
        default_factory=list,
        description="简要时间线"
    )


class Protagonist(BaseModel):
    """主角设定"""
    name: str = Field(..., description="建议的主角名称")
    role: str = Field(..., description="角色定位（如：天才少年、落魄侠客）")
    description: str = Field(..., description="详细描述（性格、动机、成长轨迹）")
    traits: List[str] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="性格特点列表（2-5个）"
    )
    appearance: str = Field(..., description="外貌描述")
    background: str = Field(..., description="背景故事")


class ChapterOutline(BaseModel):
    """章节大纲"""
    chapter_number: int = Field(..., ge=1, description="章节序号")
    title: str = Field(..., description="章节标题")
    outline: str = Field(..., description="章节大纲（100-200字）")
    key_events: List[str] = Field(
        default_factory=list,
        description="关键事件列表"
    )
    characters: List[str] = Field(
        default_factory=list,
        description="出场角色列表"
    )
    plot_lines: List[str] = Field(
        default_factory=list,
        description="情节线索"
    )
    is_key_chapter: bool = Field(
        default=False,
        description="是否是关键章节（开篇/高潮/结局）"
    )


class StoryDraft(BaseModel):
    """故事雏形（完整结构化输出）"""
    title_suggestions: List[str] = Field(
        ...,
        min_length=3,
        max_length=3,
        description="3个不同风格的标题建议"
    )
    description: str = Field(
        ...,
        description="故事简介（约200字，突出核心冲突和吸引点）"
    )
    protagonist: Protagonist = Field(..., description="主角设定")
    world_setting: WorldSetting = Field(..., description="世界观设定")
    outline: List[ChapterOutline] = Field(
        ...,
        min_length=8,
        max_length=12,
        description="章节大纲（8-12章）"
    )


class QuestionResponse(BaseModel):
    """问题响应"""
    step: int = Field(..., ge=1, description="当前步骤")
    question: str = Field(..., description="问题文本")
    type: str = Field(..., pattern="^(choice|text)$", description="问题类型")
    options: List[str] | None = Field(None, description="选项列表（仅choice类型）")
    hint: str = Field(..., description="提示文本")
    is_last: bool = Field(default=False, description="是否是最后一个问题")
    total_steps: int = Field(default=6, description="总步骤数")


class StartSessionResponse(BaseModel):
    """开始会话响应"""
    session_id: str = Field(..., description="会话ID")
    step: int = Field(..., description="当前步骤")
    question: str = Field(..., description="问题文本")
    type: str = Field(..., description="问题类型")
    options: List[str] | None = Field(None, description="选项列表")
    hint: str = Field(..., description="提示文本")
    total_steps: int = Field(default=6, description="总步骤数")


class SubmitAnswerRequest(BaseModel):
    """提交答案请求"""
    session_id: str = Field(..., description="会话ID")
    answer: str = Field(..., min_length=1, description="用户答案")


class GenerateRequest(BaseModel):
    """生成故事雏形请求"""
    session_id: str = Field(..., description="会话ID")
