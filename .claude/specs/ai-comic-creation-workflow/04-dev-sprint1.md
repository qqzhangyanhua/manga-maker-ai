# Sprint 1 开发实施报告
## 全文搜索 + 内容修订前端接入

---

## 📋 Sprint 信息

| 项目 | 内容 |
|------|------|
| **Sprint** | Sprint 1 |
| **周期** | Week 1-2 |
| **开始时间** | 2026-01-05 |
| **Story Points** | 6 SP |
| **预计工作量** | 3-4 小时 |
| **状态** | 🚧 进行中 |

---

## 🎯 Sprint 目标

实现全文搜索和内容修订前端接入，提升用户内容管理效率。

---

## 📝 任务列表

### REQ-002: 全文搜索 ⭐⭐⭐⭐

**Story Points**: 3 SP  
**预计工作量**: 1-2 小时  
**状态**: 🚧 进行中

#### 后端实现
- [ ] 创建 PostgreSQL GIN 索引
- [ ] 实现 `SearchService` 类
- [ ] 实现搜索 API 路由
- [ ] 添加高亮和摘要提取功能
- [ ] 单元测试

#### 前端实现
- [ ] 创建 `SearchDialog` 组件
- [ ] 实现搜索输入框（防抖 300ms）
- [ ] 实现搜索结果列表（高亮显示）
- [ ] 集成到项目详情页
- [ ] 添加快捷键 `Ctrl/⌘ + K`

---

### REQ-003: 内容修订前端接入 ⭐⭐⭐⭐

**Story Points**: 3 SP  
**预计工作量**: 2 小时  
**状态**: ⏳ 待开始

#### 前端实现
- [ ] 创建 `RevisionDialog` 组件
- [ ] 实现文本选择监听
- [ ] 实现右键菜单集成
- [ ] 实现预设指令选择
- [ ] 实现自定义指令输入
- [ ] 实现修订结果展示
- [ ] 实现接受/拒绝修订
- [ ] 集成到 `ChapterEditor`

---

## 📊 进度跟踪

### 总体进度
- **已完成**: 0/11 任务（0%）
- **进行中**: 0 任务
- **待开始**: 11 任务

### 时间跟踪
- **已用时间**: 0 小时
- **预计剩余**: 3-4 小时

---

## 🔧 实施细节

### 1. 全文搜索 - 后端实现

#### 1.1 创建数据库索引

**文件**: `prisma/migrations/add_search_indexes/migration.sql`

```sql
-- 创建 GIN 索引用于全文搜索
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 为章节标题创建索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_title_gin 
ON novel_chapters USING gin(to_tsvector('simple', title));

-- 为章节内容创建索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_content_gin 
ON novel_chapters USING gin(to_tsvector('simple', content));

-- 为章节大纲创建索引
CREATE INDEX IF NOT EXISTS idx_novel_chapters_outline_gin 
ON novel_chapters USING gin(to_tsvector('simple', outline));
```

#### 1.2 实现搜索服务

**文件**: `services/novel-backend/app/services/search_service.py`

```python
from sqlalchemy import text
from typing import List, Dict, Literal
import re

class SearchService:
    """全文搜索服务"""
    
    def __init__(self, db):
        self.db = db
    
    async def search(
        self,
        project_id: str,
        query: str,
        search_type: Literal["all", "title", "content", "character"] = "all",
        limit: int = 20
    ) -> List[Dict]:
        """
        全文搜索
        
        Args:
            project_id: 项目 ID
            query: 搜索关键词
            search_type: 搜索类型
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
        results.sort(key=lambda x: x["relevance"], reverse=True)
        
        return results[:limit]
    
    async def _search_titles(
        self,
        project_id: str,
        query: str,
        limit: int
    ) -> List[Dict]:
        """搜索章节标题"""
        sql = text("""
            SELECT 
                id,
                chapter_number,
                title,
                ts_rank(to_tsvector('simple', title), to_tsquery('simple', :query)) as relevance,
                'title' as match_type
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
        
        return [
            {
                "chapter_id": row.id,
                "chapter_number": row.chapter_number,
                "title": row.title,
                "snippet": self._highlight(row.title, query),
                "relevance": float(row.relevance),
                "match_type": "title"
            }
            for row in result.fetchall()
        ]
    
    async def _search_content(
        self,
        project_id: str,
        query: str,
        limit: int
    ) -> List[Dict]:
        """搜索章节内容"""
        sql = text("""
            SELECT 
                id,
                chapter_number,
                title,
                content,
                ts_rank(to_tsvector('simple', content), to_tsquery('simple', :query)) as relevance,
                'content' as match_type
            FROM novel_chapters
            WHERE project_id = :project_id
              AND to_tsvector('simple', content) @@ to_tsquery('simple', :query)
            ORDER BY relevance DESC
            LIMIT :limit
        """)
        
        result = await self.db.execute(
            sql,
            {"project_id": project_id, "query": query, "limit": limit}
        )
        
        return [
            {
                "chapter_id": row.id,
                "chapter_number": row.chapter_number,
                "title": row.title,
                "snippet": self._extract_snippet(row.content, query),
                "relevance": float(row.relevance),
                "match_type": "content"
            }
            for row in result.fetchall()
        ]
    
    def _highlight(self, text: str, query: str) -> str:
        """高亮显示关键词"""
        pattern = re.compile(f"({re.escape(query)})", re.IGNORECASE)
        return pattern.sub(r"<mark>\1</mark>", text)
    
    def _extract_snippet(self, content: str, query: str, context_length: int = 100) -> str:
        """提取包含关键词的片段"""
        # 查找关键词位置
        match = re.search(re.escape(query), content, re.IGNORECASE)
        if not match:
            return content[:context_length] + "..."
        
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
```

#### 1.3 实现搜索 API 路由

**文件**: `services/novel-backend/app/routers/search.py`

```python
from fastapi import APIRouter, Depends, Query
from typing import Literal
from ..services.search_service import SearchService
from ..middleware.auth import get_current_user_id
from ..database import get_db

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/projects/{project_id}")
async def search_project(
    project_id: str,
    q: str = Query(..., description="搜索关键词"),
    type: Literal["all", "title", "content", "character"] = "all",
    limit: int = Query(20, le=100),
    user_id: str = Depends(get_current_user_id),
    db = Depends(get_db)
):
    """全文搜索"""
    
    # 检查权限（简化版，实际应检查项目所有权）
    # await check_project_permission(project_id, user_id, db)
    
    # 执行搜索
    search_service = SearchService(db)
    results = await search_service.search(
        project_id=project_id,
        query=q,
        search_type=type,
        limit=limit
    )
    
    return {
        "query": q,
        "total": len(results),
        "results": results
    }
```

#### 1.4 注册路由

**文件**: `services/novel-backend/app/main.py`

```python
# 在现有代码中添加
from .routers import search

# 注册搜索路由
app.include_router(search.router)
```

---

### 2. 全文搜索 - 前端实现

#### 2.1 创建搜索对话框组件

**文件**: `src/app/(novel)/novel/[id]/components/SearchDialog.tsx`

```typescript
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface SearchResult {
  chapter_id: string
  chapter_number: number
  title: string
  snippet: string
  relevance: number
  match_type: "title" | "content"
}

interface SearchDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectChapter: (chapterId: string) => void
}

export function SearchDialog({
  projectId,
  open,
  onOpenChange,
  onSelectChapter,
}: SearchDialogProps) {
  const [query, setQuery] = useState("")
  const [searchType, setSearchType] = useState<"all" | "title" | "content">("all")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // 防抖搜索
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(() => {
      handleSearch()
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchType])

  const handleSearch = async () => {
    setLoading(true)

    try {
      const response = await fetch(
        `/api/novel/search/projects/${projectId}?q=${encodeURIComponent(query)}&type=${searchType}`
      )

      if (!response.ok) throw new Error("搜索失败")

      const data = await response.json()
      setResults(data.results)
    } catch (error) {
      console.error("Search error:", error)
      toast.error("搜索失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>搜索章节</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="输入关键词搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1"
            />
          </div>

          {/* 搜索类型 */}
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="title">标题</TabsTrigger>
              <TabsTrigger value="content">内容</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 搜索结果 */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                搜索中...
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query ? "未找到相关结果" : "输入关键词开始搜索"}
              </div>
            ) : (
              results.map((result) => (
                <div
                  key={result.chapter_id}
                  className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    onSelectChapter(result.chapter_id)
                    onOpenChange(false)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          第{result.chapter_number}章 {result.title}
                        </span>
                      </div>
                      <div
                        className="mt-1 text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: result.snippet }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {result.match_type === "title" ? "标题匹配" : "内容匹配"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 搜索统计 */}
          {results.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              找到 {results.length} 个结果
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

#### 2.2 集成到项目详情页

**文件**: `src/app/(novel)/novel/[id]/page.tsx`

修改现有文件，添加搜索功能：

```typescript
// 在现有代码中添加
import { SearchDialog } from "./components/SearchDialog"
import { useState } from "react"

export default function NovelProjectPage({ params }: { params: { id: string } }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)

  // 添加快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSelectChapter = (chapterId: string) => {
    setSelectedChapterId(chapterId)
    // 滚动到对应章节或切换到章节标签页
    // 实现逻辑根据现有页面结构调整
  }

  return (
    <>
      {/* 现有页面内容 */}
      
      {/* 添加搜索按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSearchOpen(true)}
        className="gap-2"
      >
        <Search className="w-4 h-4" />
        搜索
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* 搜索对话框 */}
      <SearchDialog
        projectId={params.id}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectChapter={handleSelectChapter}
      />
    </>
  )
}
```

---

## 🧪 测试计划

### 后端测试
- [ ] 测试 GIN 索引创建
- [ ] 测试搜索服务（标题搜索）
- [ ] 测试搜索服务（内容搜索）
- [ ] 测试高亮功能
- [ ] 测试摘要提取
- [ ] 测试 API 路由

### 前端测试
- [ ] 测试搜索输入（防抖）
- [ ] 测试搜索结果显示
- [ ] 测试高亮显示
- [ ] 测试章节跳转
- [ ] 测试快捷键 `Ctrl/⌘ + K`
- [ ] 测试搜索类型切换

---

## 📈 进度更新

### 2026-01-05 - 开始实施
- ✅ 创建 Sprint 1 开发文档
- 🚧 准备开始后端实现

---

## 🎯 下一步

1. 创建数据库迁移文件
2. 实现搜索服务
3. 实现搜索 API 路由
4. 创建前端搜索组件
5. 集成到项目详情页
6. 测试功能
7. 开始 REQ-003 实施

---

**状态**: 🚧 进行中  
**已完成**: 0/11 任务（0%）  
**预计完成时间**: 3-4 小时
