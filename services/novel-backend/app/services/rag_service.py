"""
混合 RAG 服务
主要策略:向量检索(语义理解)
降级策略:PostgreSQL 关键词匹配(容错保障)
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, text
from typing import List, Dict, Optional
from ..models import NovelProject, NovelChapter
from .vector_service import get_vector_service
import logging

logger = logging.getLogger(__name__)


class NovelRAGService:
    """小说 RAG 服务 - 混合检索(向量 + 关键词)"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.vector_service = get_vector_service()

    @staticmethod
    def _safe_extract_names(items: List, key: str = "name") -> List[str]:
        """
        安全提取名称列表，兼容多种数据格式

        Args:
            items: 可能是 List[str] 或 List[Dict] 或混合列表
            key: 从字典中提取的键名(默认 "name")

        Returns:
            字符串列表
        """
        if not items:
            return []

        result = []
        for item in items:
            if isinstance(item, str):
                result.append(item)
            elif isinstance(item, dict):
                name = item.get(key) or item.get("description") or ""
                if name:
                    result.append(str(name))
            else:
                result.append(str(item))

        return result

    async def search_relevant_chapters(
        self,
        project_id: str,
        query: str,
        current_chapter_number: Optional[int] = None,
        k: int = 3
    ) -> List[Dict]:
        """
        检索相关章节内容

        策略:
        1. 优先使用向量检索(语义理解)
        2. 降级到关键词匹配(容错保障)
        3. 优先关键章节 (is_key_chapter=True)

        Args:
            project_id: 项目 ID
            query: 查询文本(当前章节的大纲或关键词)
            current_chapter_number: 当前章节号(排除自己)
            k: 返回结果数量

        Returns:
            相关章节列表
        """
        try:
            # ===== 策略 1: 向量检索 =====
            if self.vector_service.enabled:
                try:
                    # 获取当前章节 ID(用于排除)
                    exclude_chapter_id = None
                    if current_chapter_number is not None:
                        chapter_stmt = select(NovelChapter.id).where(
                            NovelChapter.project_id == project_id,
                            NovelChapter.chapter_number == current_chapter_number
                        )
                        chapter_result = await self.db.execute(chapter_stmt)
                        chapter_row = chapter_result.scalar_one_or_none()
                        if chapter_row:
                            exclude_chapter_id = str(chapter_row)

                    # 向量检索
                    vector_results = await self.vector_service.search_similar_chapters(
                        query_text=query,
                        project_id=project_id,
                        exclude_chapter_id=exclude_chapter_id,
                        k=k
                    )

                    if vector_results:
                        # 从数据库获取完整章节信息
                        chapter_ids = [r["chapter_id"] for r in vector_results]
                        chapters_stmt = select(NovelChapter).where(
                            NovelChapter.id.in_(chapter_ids)
                        )
                        db_result = await self.db.execute(chapters_stmt)
                        chapters_map = {str(ch.id): ch for ch in db_result.scalars().all()}

                        # 合并结果(保持向量检索的顺序)
                        relevant_chapters = []
                        for vec_result in vector_results:
                            chapter = chapters_map.get(vec_result["chapter_id"])
                            if chapter:
                                relevant_chapters.append({
                                    "chapter_number": chapter.chapter_number,
                                    "title": chapter.title,
                                    "outline": chapter.outline or "",
                                    "content_preview": (chapter.content or "")[:500],
                                    "is_key_chapter": chapter.is_key_chapter,
                                    "word_count": chapter.word_count,
                                    "similarity": vec_result["similarity"],
                                    # ✨ Solution 3: 添加剧情连贯性字段
                                    "summary_preview": chapter.summary_preview or "",
                                })

                        logger.info(
                            f"🔍 向量检索成功 - 项目: {project_id}, "
                            f"结果数: {len(relevant_chapters)}, "
                            f"平均相似度: {sum(r['similarity'] for r in relevant_chapters) / len(relevant_chapters):.3f}"
                        )
                        return relevant_chapters

                except Exception as vec_error:
                    logger.warning(f"⚠️ 向量检索失败，降级到关键词匹配: {str(vec_error)}")

            # ===== 策略 2: 关键词匹配(降级) =====
            logger.info("📝 使用关键词匹配模式")

            conditions = [NovelChapter.project_id == project_id]

            if current_chapter_number is not None:
                conditions.append(NovelChapter.chapter_number != current_chapter_number)

            search_keywords = query.split()[:5]

            if search_keywords:
                keyword_conditions = []
                for keyword in search_keywords:
                    keyword_conditions.append(
                        or_(
                            NovelChapter.outline.ilike(f"%{keyword}%"),
                            NovelChapter.content.ilike(f"%{keyword}%"),
                            NovelChapter.title.ilike(f"%{keyword}%")
                        )
                    )

                if keyword_conditions:
                    conditions.append(or_(*keyword_conditions))

            query_stmt = (
                select(NovelChapter)
                .where(*conditions)
                .order_by(
                    NovelChapter.is_key_chapter.desc(),
                    NovelChapter.chapter_number.desc()
                )
                .limit(k)
            )

            result = await self.db.execute(query_stmt)
            chapters = result.scalars().all()

            relevant_chapters = []
            for chapter in chapters:
                relevant_chapters.append({
                    "chapter_number": chapter.chapter_number,
                    "title": chapter.title,
                    "outline": chapter.outline or "",
                    "content_preview": (chapter.content or "")[:500],
                    "is_key_chapter": chapter.is_key_chapter,
                    "word_count": chapter.word_count,
                    # ✨ Solution 3: 添加剧情连贯性字段
                    "summary_preview": chapter.summary_preview or "",
                })

            logger.info(f"📝 关键词匹配完成 - 结果数: {len(relevant_chapters)}")
            return relevant_chapters

        except Exception as e:
            logger.error(f"❌ RAG 检索失败: {str(e)}")
            return []

    async def get_previous_chapters(
        self,
        project_id: str,
        current_chapter_number: int,
        count: int = 2
    ) -> List[Dict]:
        """
        获取前 N 个章节(用于连续性上下文)

        Args:
            project_id: 项目 ID
            current_chapter_number: 当前章节号
            count: 获取数量

        Returns:
            前 N 个章节列表
        """
        try:
            query_stmt = (
                select(NovelChapter)
                .where(
                    NovelChapter.project_id == project_id,
                    NovelChapter.chapter_number < current_chapter_number
                )
                .order_by(NovelChapter.chapter_number.desc())
                .limit(count)
            )

            result = await self.db.execute(query_stmt)
            chapters = result.scalars().all()

            chapters = list(reversed(chapters))

            return [
                {
                    "chapter_number": ch.chapter_number,
                    "title": ch.title,
                    "outline": ch.outline or "",
                    "content": ch.content or "",
                    "word_count": ch.word_count,
                    # ✨ Solution 3: 添加剧情连贯性字段
                    "summary_preview": ch.summary_preview or "",
                    "ending_state": ch.ending_state or {},
                }
                for ch in chapters
            ]

        except Exception as e:
            logger.error(f"获取前序章节失败: {str(e)}")
            return []

    async def build_context_for_generation(
        self,
        project_id: str,
        chapter_number: int,
        chapter_outline: str
    ) -> str:
        """
        构建章节生成的完整上下文

        策略:
        1. 获取项目的世界观和角色设定
        2. 获取前 2 个章节内容(连续性)
        3. 检索相关章节(RAG - 向量或关键词)
        4. 拼接成结构化 Prompt

        Args:
            project_id: 项目 ID
            chapter_number: 当前章节号
            chapter_outline: 当前章节大纲

        Returns:
            结构化上下文字符串
        """
        try:
            # 1. 获取项目信息
            project_stmt = select(NovelProject).where(NovelProject.id == project_id)
            project_result = await self.db.execute(project_stmt)
            project = project_result.scalar_one_or_none()

            if not project:
                return ""

            # 2. 获取前序章节
            previous_chapters = await self.get_previous_chapters(
                project_id, chapter_number, count=2
            )

            # 3. RAG 检索相关章节(向量或关键词)
            relevant_chapters = await self.search_relevant_chapters(
                project_id, chapter_outline, chapter_number, k=3
            )

            # 4. 构建上下文
            context_parts = []

            # 世界观设定
            if project.world_setting:
                context_parts.append("【世界观设定】")
                world_setting = project.world_setting
                if isinstance(world_setting, dict):
                    if world_setting.get("locations"):
                        locations = self._safe_extract_names(world_setting['locations'], key="name")
                        if locations:
                            context_parts.append(f"地点: {', '.join(locations)}")

                    if world_setting.get("rules"):
                        rules = self._safe_extract_names(world_setting['rules'], key="name")
                        if rules:
                            context_parts.append(f"规则: {', '.join(rules)}")
                context_parts.append("")

            # 角色设定
            if project.characters:
                context_parts.append("【角色设定】")
                characters = project.characters
                if isinstance(characters, list):
                    for char in characters[:5]:
                        if isinstance(char, dict):
                            name = char.get("name", "")
                            desc = char.get("description", "")
                            if name:
                                context_parts.append(f"- {name}: {desc[:100]}")
                context_parts.append("")

            # 前序章节
            if previous_chapters:
                context_parts.append("【前序章节内容摘要】")
                for prev_ch in previous_chapters:
                    context_parts.append(
                        f"第{prev_ch['chapter_number']}章 - {prev_ch['title']}"
                    )
                    # ✨ Solution 3: 优先使用 summary_preview（详细剧情描述）
                    if prev_ch.get('summary_preview'):
                        context_parts.append(f"剧情详情: {prev_ch['summary_preview']}")
                    else:
                        # 兼容旧数据：回退到 content 摘要
                        context_parts.append(f"大纲: {prev_ch['outline'][:200]}")
                        context_parts.append(f"内容摘要: {prev_ch['content'][:300]}...")

                    # ✨ Solution 3: 添加 ending_state（章节结束状态）
                    if prev_ch.get('ending_state'):
                        ending = prev_ch['ending_state']
                        if ending.get('location'):
                            context_parts.append(f"结束地点: {ending['location']}")
                        if ending.get('protagonist_status'):
                            context_parts.append(f"主角状态: {ending['protagonist_status']}")
                        if ending.get('plot_progress'):
                            context_parts.append(f"剧情进展: {ending['plot_progress']}")
                    context_parts.append("")

            # 相关章节(RAG)
            if relevant_chapters:
                context_parts.append("【相关章节参考】")
                for rel_ch in relevant_chapters:
                    similarity_info = f" (相似度: {rel_ch.get('similarity', 0):.2f})" if 'similarity' in rel_ch else ""
                    context_parts.append(
                        f"第{rel_ch['chapter_number']}章 - {rel_ch['title']}{similarity_info}"
                    )
                    # ✨ Solution 3: 优先使用 summary_preview
                    if rel_ch.get('summary_preview'):
                        context_parts.append(f"剧情详情: {rel_ch['summary_preview'][:200]}...")
                    else:
                        context_parts.append(f"大纲: {rel_ch['outline'][:150]}")
                    context_parts.append("")

            # 当前章节大纲
            context_parts.append("【当前章节大纲】")
            context_parts.append(chapter_outline)

            final_context = "\n".join(context_parts)

            logger.info(
                f"📋 上下文构建成功 - "
                f"项目ID: {project_id}, "
                f"章节号: {chapter_number}, "
                f"上下文长度: {len(final_context)} 字符, "
                f"包含组件: "
                f"世界观={'✅' if project.world_setting else '❌'}, "
                f"角色={'✅' if project.characters else '❌'}, "
                f"前序章节={len(previous_chapters)}, "
                f"相关章节={len(relevant_chapters)}, "
                f"检索模式={'🔍向量' if self.vector_service.enabled else '📝关键词'}"
            )

            return final_context

        except Exception as e:
            logger.error(
                f"❌ 构建上下文失败 - "
                f"项目ID: {project_id}, "
                f"章节号: {chapter_number}, "
                f"错误: {str(e)}, "
                f"错误类型: {type(e).__name__}"
            )
            logger.warning(f"⚠️ 降级模式:仅使用章节大纲作为上下文")
            return chapter_outline
