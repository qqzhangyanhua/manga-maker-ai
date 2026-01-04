"""
结构化数据 RAG 服务
使用 PostgreSQL 全文搜索 + 上下文拼接，无需向量数据库
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, text
from typing import List, Dict, Optional
from ..models import NovelProject, NovelChapter
import logging

logger = logging.getLogger(__name__)


class NovelRAGService:
    """小说 RAG 服务 - 基于结构化数据的上下文检索"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def search_relevant_chapters(
        self,
        project_id: str,
        query: str,
        current_chapter_number: Optional[int] = None,
        k: int = 3
    ) -> List[Dict]:
        """
        检索相关章节内容
        
        策略：
        1. 优先检索关键章节（is_key_chapter=True）
        2. 使用 PostgreSQL 全文搜索匹配 outline 和 content
        3. 排除当前章节
        4. 按相关性排序
        
        Args:
            project_id: 项目 ID
            query: 查询文本（当前章节的大纲或关键词）
            current_chapter_number: 当前章节号（排除自己）
            k: 返回结果数量
        
        Returns:
            相关章节列表
        """
        try:
            # 构建查询条件
            conditions = [NovelChapter.project_id == project_id]
            
            # 排除当前章节
            if current_chapter_number is not None:
                conditions.append(NovelChapter.chapter_number != current_chapter_number)
            
            # 简单的关键词匹配（使用 ILIKE）
            # 生产环境可升级为 PostgreSQL 的 ts_vector 全文搜索
            search_keywords = query.split()[:5]  # 取前5个关键词
            
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
                
                # 至少匹配一个关键词
                if keyword_conditions:
                    conditions.append(or_(*keyword_conditions))
            
            # 执行查询
            query_stmt = (
                select(NovelChapter)
                .where(*conditions)
                .order_by(
                    NovelChapter.is_key_chapter.desc(),  # 关键章节优先
                    NovelChapter.chapter_number.desc()   # 最近章节优先
                )
                .limit(k)
            )
            
            result = await self.db.execute(query_stmt)
            chapters = result.scalars().all()
            
            # 格式化返回结果
            relevant_chapters = []
            for chapter in chapters:
                relevant_chapters.append({
                    "chapter_number": chapter.chapter_number,
                    "title": chapter.title,
                    "outline": chapter.outline or "",
                    "content_preview": (chapter.content or "")[:500],  # 只取前500字
                    "is_key_chapter": chapter.is_key_chapter,
                    "word_count": chapter.word_count,
                })
            
            logger.info(f"RAG 检索到 {len(relevant_chapters)} 个相关章节")
            return relevant_chapters
            
        except Exception as e:
            logger.error(f"RAG 检索失败: {str(e)}")
            return []
    
    async def get_previous_chapters(
        self,
        project_id: str,
        current_chapter_number: int,
        count: int = 2
    ) -> List[Dict]:
        """
        获取前 N 个章节（用于连续性上下文）
        
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
            
            # 倒序排列（从旧到新）
            chapters = list(reversed(chapters))
            
            return [
                {
                    "chapter_number": ch.chapter_number,
                    "title": ch.title,
                    "outline": ch.outline or "",
                    "content": ch.content or "",
                    "word_count": ch.word_count,
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
        
        策略：
        1. 获取项目的世界观和角色设定
        2. 获取前 2 个章节内容（连续性）
        3. 检索相关章节（RAG）
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
            
            # 3. RAG 检索相关章节
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
                        context_parts.append(f"地点: {', '.join(world_setting['locations'])}")
                    if world_setting.get("rules"):
                        context_parts.append(f"规则: {', '.join(world_setting['rules'])}")
                context_parts.append("")
            
            # 角色设定
            if project.characters:
                context_parts.append("【角色设定】")
                characters = project.characters
                if isinstance(characters, list):
                    for char in characters[:5]:  # 最多5个主要角色
                        if isinstance(char, dict):
                            name = char.get("name", "")
                            desc = char.get("description", "")
                            context_parts.append(f"- {name}: {desc[:100]}")
                context_parts.append("")
            
            # 前序章节
            if previous_chapters:
                context_parts.append("【前序章节】")
                for prev_ch in previous_chapters:
                    context_parts.append(
                        f"第{prev_ch['chapter_number']}章 - {prev_ch['title']}"
                    )
                    context_parts.append(f"大纲: {prev_ch['outline'][:200]}")
                    context_parts.append(f"内容摘要: {prev_ch['content'][:300]}...")
                    context_parts.append("")
            
            # 相关章节（RAG）
            if relevant_chapters:
                context_parts.append("【相关章节参考】")
                for rel_ch in relevant_chapters:
                    context_parts.append(
                        f"第{rel_ch['chapter_number']}章 - {rel_ch['title']}"
                    )
                    context_parts.append(f"大纲: {rel_ch['outline'][:150]}")
                    context_parts.append("")
            
            # 当前章节大纲
            context_parts.append("【当前章节大纲】")
            context_parts.append(chapter_outline)
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"构建上下文失败: {str(e)}")
            return chapter_outline  # 降级：只返回大纲
