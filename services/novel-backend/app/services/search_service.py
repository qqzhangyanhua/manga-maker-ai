"""
全文搜索服务
提供章节标题、内容的快速搜索功能
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Literal
import re


class SearchResult:
    """搜索结果数据类"""
    
    def __init__(
        self,
        chapter_id: str,
        chapter_number: int,
        title: str,
        snippet: str,
        relevance: float,
        match_type: str
    ):
        self.chapter_id = chapter_id
        self.chapter_number = chapter_number
        self.title = title
        self.snippet = snippet
        self.relevance = relevance
        self.match_type = match_type
    
    def to_dict(self) -> Dict:
        return {
            "chapter_id": self.chapter_id,
            "chapter_number": self.chapter_number,
            "title": self.title,
            "snippet": self.snippet,
            "relevance": self.relevance,
            "match_type": self.match_type
        }


class SearchService:
    """全文搜索服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def search(
        self,
        project_id: str,
        query: str,
        search_type: Literal["all", "title", "content"] = "all",
        limit: int = 20
    ) -> List[Dict]:
        """
        全文搜索
        
        Args:
            project_id: 项目 ID
            query: 搜索关键词
            search_type: 搜索类型（all/title/content）
            limit: 结果数量限制
            
        Returns:
            搜索结果列表
        """
        results = []
        
        # 搜索章节标题
        if search_type in ["all", "title"]:
            title_results = await self._search_titles(project_id, query, limit)
            results.extend(title_results)
        
        # 搜索章节内容
        if search_type in ["all", "content"]:
            content_results = await self._search_content(project_id, query, limit)
            results.extend(content_results)
        
        # 按相关度排序
        results.sort(key=lambda x: x.relevance, reverse=True)
        
        # 转换为字典并限制数量
        return [r.to_dict() for r in results[:limit]]
    
    async def _search_titles(
        self,
        project_id: str,
        query: str,
        limit: int
    ) -> List[SearchResult]:
        """搜索章节标题"""
        sql = text("""
            SELECT 
                id,
                chapter_number,
                title,
                ts_rank(to_tsvector('simple', title), to_tsquery('simple', :query)) as relevance
            FROM novel_chapters
            WHERE project_id = :project_id
              AND to_tsvector('simple', title) @@ to_tsquery('simple', :query)
            ORDER BY relevance DESC
            LIMIT :limit
        """)
        
        result = await self.db.execute(
            sql,
            {"project_id": project_id, "query": query, "limit": limit}
        )
        
        rows = result.fetchall()
        return [
            SearchResult(
                chapter_id=str(row.id),
                chapter_number=row.chapter_number,
                title=row.title,
                snippet=self._highlight(row.title, query),
                relevance=float(row.relevance),
                match_type="title"
            )
            for row in rows
        ]
    
    async def _search_content(
        self,
        project_id: str,
        query: str,
        limit: int
    ) -> List[SearchResult]:
        """搜索章节内容"""
        sql = text("""
            SELECT 
                id,
                chapter_number,
                title,
                content,
                ts_rank(to_tsvector('simple', content), to_tsquery('simple', :query)) as relevance
            FROM novel_chapters
            WHERE project_id = :project_id
              AND content IS NOT NULL
              AND to_tsvector('simple', content) @@ to_tsquery('simple', :query)
            ORDER BY relevance DESC
            LIMIT :limit
        """)
        
        result = await self.db.execute(
            sql,
            {"project_id": project_id, "query": query, "limit": limit}
        )
        
        rows = result.fetchall()
        return [
            SearchResult(
                chapter_id=str(row.id),
                chapter_number=row.chapter_number,
                title=row.title,
                snippet=self._extract_snippet(row.content or "", query),
                relevance=float(row.relevance),
                match_type="content"
            )
            for row in rows
        ]
    
    def _highlight(self, text: str, query: str) -> str:
        """高亮显示关键词"""
        if not text or not query:
            return text
        
        # 使用正则表达式进行不区分大小写的替换
        pattern = re.compile(f"({re.escape(query)})", re.IGNORECASE)
        return pattern.sub(r"<mark>\1</mark>", text)
    
    def _extract_snippet(self, content: str, query: str, context_length: int = 100) -> str:
        """提取包含关键词的片段"""
        if not content:
            return ""
        
        if not query:
            return content[:context_length] + ("..." if len(content) > context_length else "")
        
        # 查找关键词位置
        match = re.search(re.escape(query), content, re.IGNORECASE)
        if not match:
            return content[:context_length] + ("..." if len(content) > context_length else "")
        
        # 提取前后文
        start = max(0, match.start() - context_length)
        end = min(len(content), match.end() + context_length)
        snippet = content[start:end]
        
        # 添加省略号
        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."
        
        # 高亮关键词
        return self._highlight(snippet, query)
