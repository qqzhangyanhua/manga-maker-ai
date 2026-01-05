"""
批量操作服务
支持批量导入、批量生成、批量删除章节
"""
import re
from typing import List, Dict, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import NovelProject, NovelChapter
from ..services.generation_service import NovelGenerationService


class ChapterParser:
    """章节解析器"""
    
    # 支持的章节标题格式
    PATTERNS = [
        # 第X章 标题
        (r'第([零一二三四五六七八九十百千\d]+)章[：:\s]*(.*?)(?=\n|$)', 'chinese'),
        # Chapter X: 标题
        (r'Chapter\s+(\d+)[：:\s]*(.*?)(?=\n|$)', 'english'),
        # X. 标题
        (r'^(\d+)\.\s*(.*?)(?=\n|$)', 'number'),
        # 【第X章】标题
        (r'【第(\d+)章】(.*?)(?=\n|$)', 'bracket'),
    ]
    
    # 中文数字映射
    CHINESE_NUM_MAP = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '百': 100, '千': 1000
    }
    
    @classmethod
    def chinese_to_arabic(cls, chinese: str) -> int:
        """中文数字转阿拉伯数字"""
        if chinese.isdigit():
            return int(chinese)
        
        result = 0
        temp = 0
        
        for char in chinese:
            if char in cls.CHINESE_NUM_MAP:
                num = cls.CHINESE_NUM_MAP[char]
                if num >= 10:
                    if temp == 0:
                        temp = 1
                    result += temp * num
                    temp = 0
                else:
                    temp = num
        
        result += temp
        return result if result > 0 else 1
    
    @classmethod
    def parse(cls, text: str) -> List[Dict]:
        """
        解析文本为章节列表
        
        Args:
            text: 要解析的文本
            
        Returns:
            章节列表 [{"chapter_number": 1, "title": "...", "content": "..."}, ...]
        """
        chapters = []
        
        # 尝试每个模式
        for pattern, pattern_type in cls.PATTERNS:
            matches = list(re.finditer(pattern, text, re.MULTILINE))
            if len(matches) >= 2:  # 至少匹配到2章才认为有效
                chapters = cls._extract_chapters(text, matches, pattern_type)
                if chapters:
                    break
        
        if not chapters:
            # 如果没有匹配到，尝试按双换行分割
            chapters = cls._split_by_paragraphs(text)
        
        return chapters
    
    @classmethod
    def _extract_chapters(
        cls,
        text: str,
        matches: List,
        pattern_type: str
    ) -> List[Dict]:
        """从匹配结果提取章节"""
        chapters = []
        
        for i, match in enumerate(matches):
            try:
                chapter_num_str = match.group(1)
                title = match.group(2).strip() if len(match.groups()) > 1 else ""
                
                # 转换章节号
                if pattern_type == 'chinese':
                    chapter_num = cls.chinese_to_arabic(chapter_num_str)
                else:
                    chapter_num = int(chapter_num_str)
                
                # 提取内容（从当前标题到下一个标题）
                start = match.end()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
                content = text[start:end].strip()
                
                # 跳过内容过短的章节
                if len(content) < 10:
                    continue
                
                chapters.append({
                    "chapter_number": chapter_num,
                    "title": title or f"第{chapter_num}章",
                    "content": content
                })
            except (ValueError, IndexError) as e:
                # 跳过解析失败的章节
                continue
        
        return chapters
    
    @classmethod
    def _split_by_paragraphs(cls, text: str) -> List[Dict]:
        """按段落分割（后备方案）"""
        paragraphs = re.split(r'\n\n+', text.strip())
        
        # 过滤掉过短的段落
        valid_paragraphs = [p.strip() for p in paragraphs if len(p.strip()) > 50]
        
        if not valid_paragraphs:
            return []
        
        chapters = []
        for i, content in enumerate(valid_paragraphs, 1):
            # 尝试从第一行提取标题
            lines = content.split('\n', 1)
            if len(lines) > 1 and len(lines[0]) < 50:
                title = lines[0].strip()
                chapter_content = lines[1].strip()
            else:
                title = f"第{i}章"
                chapter_content = content
            
            chapters.append({
                "chapter_number": i,
                "title": title,
                "content": chapter_content
            })
        
        return chapters


class BatchService:
    """批量操作服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.parser = ChapterParser()
    
    async def batch_import(
        self,
        project_id: str,
        text: str,
        auto_parse: bool = True,
        start_number: int = 1
    ) -> Dict:
        """
        批量导入章节
        
        Args:
            project_id: 项目 ID
            text: 要导入的文本
            auto_parse: 是否自动解析章节
            start_number: 起始章节号
            
        Returns:
            {"success": True, "chapters_created": 10, "chapters": [...]}
        """
        # 检查项目是否存在
        stmt = select(NovelProject).where(NovelProject.id == project_id)
        result = await self.db.execute(stmt)
        project = result.scalar_one_or_none()
        
        if not project:
            raise ValueError(f"项目不存在: {project_id}")
        
        # 解析章节
        if auto_parse:
            parsed_chapters = self.parser.parse(text)
        else:
            # 不自动解析，整个文本作为一章
            parsed_chapters = [{
                "chapter_number": start_number,
                "title": f"第{start_number}章",
                "content": text
            }]
        
        if not parsed_chapters:
            raise ValueError("未能解析出任何章节，请检查文本格式")
        
        # 创建章节
        created_chapters = []
        for chapter_data in parsed_chapters:
            chapter = NovelChapter(
                project_id=project_id,
                chapter_number=chapter_data["chapter_number"] + start_number - 1,
                title=chapter_data["title"],
                content=chapter_data["content"],
                status="draft"
            )
            self.db.add(chapter)
            created_chapters.append(chapter)
        
        # 提交事务
        try:
            await self.db.commit()
            
            # 刷新对象以获取生成的 ID
            for chapter in created_chapters:
                await self.db.refresh(chapter)
            
            return {
                "success": True,
                "chapters_created": len(created_chapters),
                "chapters": [
                    {
                        "id": str(chapter.id),
                        "chapter_number": chapter.chapter_number,
                        "title": chapter.title,
                        "content_length": len(chapter.content)
                    }
                    for chapter in created_chapters
                ]
            }
        except Exception as e:
            await self.db.rollback()
            raise ValueError(f"批量导入失败: {str(e)}")
    
    async def batch_generate(
        self,
        project_id: str,
        outlines: List[Dict],
        mode: str = "sequential"
    ):
        """
        批量生成章节（生成器，用于 SSE 流式返回）
        
        Args:
            project_id: 项目 ID
            outlines: 章节大纲列表
            mode: 生成模式（sequential: 顺序，parallel: 并发）
            
        Yields:
            进度信息 {"type": "progress", "current": 1, "total": 10, "chapter": {...}}
        """
        generation_service = NovelGenerationService(self.db)
        total = len(outlines)
        
        for i, outline in enumerate(outlines):
            try:
                # 生成章节
                chapter = await generation_service.generate_chapter_content(
                    project_id=project_id,
                    chapter_number=outline.get("chapter_number", i + 1),
                    title=outline.get("title", f"第{i + 1}章"),
                    outline=outline.get("summary", "")
                )
                
                # 发送进度
                yield {
                    "type": "progress",
                    "current": i + 1,
                    "total": total,
                    "chapter": {
                        "id": str(chapter.id),
                        "chapter_number": chapter.chapter_number,
                        "title": chapter.title,
                        "content_length": len(chapter.content)
                    }
                }
                
            except Exception as e:
                # 发送错误
                yield {
                    "type": "error",
                    "current": i + 1,
                    "total": total,
                    "chapter_number": outline.get("chapter_number", i + 1),
                    "error": str(e)
                }
        
        # 发送完成
        yield {"type": "complete", "total": total}
    
    async def batch_delete(
        self,
        chapter_ids: List[str],
        soft_delete: bool = True
    ) -> Dict:
        """
        批量删除章节
        
        Args:
            chapter_ids: 章节 ID 列表
            soft_delete: 是否软删除（标记为已删除而不是物理删除）
            
        Returns:
            {"success": True, "chapters_deleted": 5}
        """
        if not chapter_ids:
            raise ValueError("章节 ID 列表不能为空")
        
        try:
            if soft_delete:
                # 软删除：更新状态为 deleted
                stmt = (
                    select(NovelChapter)
                    .where(NovelChapter.id.in_(chapter_ids))
                )
                result = await self.db.execute(stmt)
                chapters = result.scalars().all()
                
                for chapter in chapters:
                    chapter.status = "deleted"
                
                await self.db.commit()
                deleted_count = len(chapters)
            else:
                # 硬删除：物理删除
                stmt = delete(NovelChapter).where(NovelChapter.id.in_(chapter_ids))
                result = await self.db.execute(stmt)
                await self.db.commit()
                deleted_count = result.rowcount
            
            return {
                "success": True,
                "chapters_deleted": deleted_count
            }
        except Exception as e:
            await self.db.rollback()
            raise ValueError(f"批量删除失败: {str(e)}")
    
    async def preview_import(self, text: str) -> Dict:
        """
        预览导入（不实际创建章节）
        
        Args:
            text: 要导入的文本
            
        Returns:
            {"chapters": [...], "total": 10}
        """
        parsed_chapters = self.parser.parse(text)
        
        return {
            "chapters": [
                {
                    "chapter_number": ch["chapter_number"],
                    "title": ch["title"],
                    "content_preview": ch["content"][:200] + "..." if len(ch["content"]) > 200 else ch["content"],
                    "content_length": len(ch["content"])
                }
                for ch in parsed_chapters
            ],
            "total": len(parsed_chapters)
        }
