"""
世界观 AI 提取服务
从小说章节中提取地点、人物、事件、物品、规则和伏笔
"""
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import AsyncGenerator
from uuid import UUID
import json
import logging

from ..config import settings
from ..models import NovelChapter, WorldEntry
from ..schemas.extraction_schemas import (
    ExtractedEntry,
    ExtractionProgressEvent,
    ExtractionEntryEvent,
    ExtractionCompleteEvent,
    ExtractionErrorEvent,
)
from .prompt_templates import NovelPromptTemplates


logger = logging.getLogger(__name__)


class WorldExtractorService:
    """世界观提取服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
        )
        self.model = settings.OPENAI_MODEL

    async def extract_from_chapters(
        self,
        project_id: UUID,
        chapter_ids: list[int],
        entry_types: list[str],
        min_confidence: float = 0.6,
    ) -> AsyncGenerator[dict, None]:
        """
        从章节中提取世界观条目（SSE 流式返回）

        Args:
            project_id: 项目 ID
            chapter_ids: 要分析的章节 ID 列表
            entry_types: 要提取的条目类型
            min_confidence: 最低置信度阈值

        Yields:
            SSE 事件数据
        """
        total_extracted = 0
        by_type: dict[str, int] = {}
        duplicates_found = 0

        try:
            yield self._format_event(
                "progress",
                ExtractionProgressEvent(
                    phase="preparing",
                    progress=0.0,
                    message="正在准备提取...",
                ).model_dump()
            )

            chapters = await self._get_chapters(project_id, chapter_ids)
            if not chapters:
                yield self._format_event(
                    "error",
                    ExtractionErrorEvent(message="未找到有效章节").model_dump()
                )
                return

            existing_entries = await self._get_existing_entries(project_id)

            total_chapters = len(chapters)
            for idx, chapter in enumerate(chapters):
                progress = (idx + 1) / total_chapters

                yield self._format_event(
                    "progress",
                    ExtractionProgressEvent(
                        phase="analyzing",
                        chapter_id=chapter.chapter_number,
                        chapter_title=chapter.title,
                        progress=progress * 0.5,
                        message=f"正在分析第 {chapter.chapter_number} 章...",
                    ).model_dump()
                )

                # 检查章节内容：必须有正文或大纲
                has_content = chapter.content and len(chapter.content.strip()) > 0
                has_outline = chapter.outline and len(chapter.outline.strip()) > 0

                if not has_content and not has_outline:
                    logger.warning(f"章节 {chapter.chapter_number} 无任何内容，跳过")
                    yield self._format_event(
                        "progress",
                        ExtractionProgressEvent(
                            phase="skipping",
                            chapter_id=chapter.chapter_number,
                            progress=progress * 0.5,
                            message=f"第 {chapter.chapter_number} 章无内容，已跳过",
                        ).model_dump()
                    )
                    continue

                # 优先使用正文，其次使用大纲
                if has_content:
                    chapter_text = chapter.content
                    content_source = "正文"
                    logger.info(f"章节 {chapter.chapter_number} 使用正文提取 ({len(chapter_text)} 字)")
                else:
                    chapter_text = chapter.outline
                    content_source = "大纲"
                    logger.warning(f"章节 {chapter.chapter_number} 仅有大纲，提取效果可能有限 ({len(chapter_text)} 字)")
                    yield self._format_event(
                        "progress",
                        ExtractionProgressEvent(
                            phase="warning",
                            chapter_id=chapter.chapter_number,
                            progress=progress * 0.5,
                            message=f"第 {chapter.chapter_number} 章仅有大纲，提取效果可能有限",
                        ).model_dump()
                    )

                try:
                    extracted = await self._extract_from_chapter(
                        chapter=chapter,
                        entry_types=entry_types,
                    )

                    yield self._format_event(
                        "progress",
                        ExtractionProgressEvent(
                            phase="extracting",
                            chapter_id=chapter.chapter_number,
                            progress=0.5 + progress * 0.4,
                            message=f"从第 {chapter.chapter_number} 章提取了 {len(extracted)} 个条目",
                        ).model_dump()
                    )

                    for entry in extracted:
                        if entry.confidence < min_confidence:
                            continue

                        is_duplicate, similar_name = self._check_duplicate(
                            entry, existing_entries
                        )

                        if is_duplicate:
                            duplicates_found += 1

                        yield self._format_event(
                            "entry",
                            ExtractionEntryEvent(
                                entry=entry,
                                chapter_id=chapter.chapter_number,
                                is_duplicate=is_duplicate,
                                similar_entry_name=similar_name,
                            ).model_dump()
                        )

                        total_extracted += 1
                        by_type[entry.type] = by_type.get(entry.type, 0) + 1

                except Exception as e:
                    logger.error(f"提取章节 {chapter.chapter_number} 失败: {e}")
                    yield self._format_event(
                        "error",
                        ExtractionErrorEvent(
                            message=f"提取第 {chapter.chapter_number} 章失败: {str(e)}",
                            chapter_id=chapter.chapter_number,
                        ).model_dump()
                    )

            yield self._format_event(
                "complete",
                ExtractionCompleteEvent(
                    total_extracted=total_extracted,
                    by_type=by_type,
                    duplicates_found=duplicates_found,
                ).model_dump()
            )

        except Exception as e:
            logger.error(f"提取过程出错: {e}", exc_info=True)
            yield self._format_event(
                "error",
                ExtractionErrorEvent(message=f"提取失败: {str(e)}").model_dump()
            )

    async def _get_chapters(
        self, project_id: UUID, chapter_ids: list[int]
    ) -> list[NovelChapter]:
        """获取指定章节"""
        query = select(NovelChapter).where(
            NovelChapter.project_id == project_id,
            NovelChapter.chapter_number.in_(chapter_ids),
        ).order_by(NovelChapter.chapter_number)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _get_existing_entries(self, project_id: UUID) -> list[WorldEntry]:
        """获取项目现有条目（用于去重）"""
        query = select(WorldEntry).where(WorldEntry.project_id == project_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _extract_from_chapter(
        self,
        chapter: NovelChapter,
        entry_types: list[str],
    ) -> list[ExtractedEntry]:
        """从单个章节提取条目"""
        system_prompt = NovelPromptTemplates.get_world_extraction_prompt(
            chapter_number=chapter.chapter_number,
            entry_types=entry_types,
        )

        # 优先使用正文，其次使用大纲
        has_content = chapter.content and len(chapter.content.strip()) > 0
        if has_content:
            chapter_text = chapter.content.strip()
            content_type = "正文"
        elif chapter.outline and len(chapter.outline.strip()) > 0:
            chapter_text = chapter.outline.strip()
            content_type = "大纲"
        else:
            return []  # 无内容则返回空列表

        content_preview = chapter_text[:8000]

        user_prompt = f"""【章节{content_type}】
第 {chapter.chapter_number} 章：{chapter.title}

{content_preview}

请从上述章节{content_type}中提取世界观条目。只返回 JSON 数组，不要其他内容。"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                return []

            result = json.loads(content)

            if isinstance(result, dict) and "entries" in result:
                entries_data = result["entries"]
            elif isinstance(result, list):
                entries_data = result
            else:
                entries_data = result.get("items", [])

            entries = []
            for item in entries_data:
                try:
                    entry = ExtractedEntry(
                        type=item.get("type", "item"),
                        name=item.get("name", "未命名"),
                        description=item.get("description", ""),
                        properties=item.get("properties", {}),
                        confidence=float(item.get("confidence", 0.5)),
                        source_text=item.get("source_text", "")[:1000],
                        planted_chapter=item.get("planted_chapter"),
                        planned_reveal_chapter=item.get("planned_reveal_chapter"),
                        hint_text=item.get("hint_text"),
                    )
                    entries.append(entry)
                except Exception as e:
                    logger.warning(f"解析条目失败: {e}, item={item}")

            return entries

        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}")
            return []
        except Exception as e:
            logger.error(f"API 调用失败: {e}")
            raise

    def _check_duplicate(
        self,
        entry: ExtractedEntry,
        existing_entries: list[WorldEntry],
    ) -> tuple[bool, str | None]:
        """检查是否与现有条目重复"""
        entry_name_lower = entry.name.lower().strip()

        for existing in existing_entries:
            existing_name_lower = existing.name.lower().strip()

            if entry_name_lower == existing_name_lower:
                return True, existing.name

            if (
                entry_name_lower in existing_name_lower
                or existing_name_lower in entry_name_lower
            ):
                if len(entry_name_lower) > 2 and len(existing_name_lower) > 2:
                    return True, existing.name

        return False, None

    @staticmethod
    def _format_event(event_type: str, data: dict) -> dict:
        """格式化 SSE 事件"""
        return {
            "event": event_type,
            "data": data,
        }
